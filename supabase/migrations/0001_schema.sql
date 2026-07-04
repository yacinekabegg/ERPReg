-- =============================================================================
-- ERP Reggenerate (Circul'Egg) — Sprint 0 : schéma initial
-- Socle : Supabase / Postgres. Approche simple, sans seuils (statut lot manuel).
-- Décisions actées : pas de table Fournisseur (pays d'origine suffit),
-- clients créés dans l'outil, rôles génériques.
-- =============================================================================

create extension if not exists "pgcrypto";      -- gen_random_uuid()

-- -----------------------------------------------------------------------------
-- Types énumérés
-- -----------------------------------------------------------------------------
create type user_role        as enum ('sales', 'prod_ops', 'qualite', 'depart', 'admin');
create type lot_statut       as enum ('en_attente', 'en_cours', 'libere', 'bloque', 'refuse');
create type emplacement_zone as enum ('quarantaine', 'libere', 'bloque', 'expedition');
create type mouvement_type   as enum ('entree', 'sortie', 'ajustement', 'transfert');
create type client_secteur   as enum ('nutraceutique', 'cosmetique', 'petfood', 'autre');
create type commande_statut  as enum ('brouillon', 'confirmee', 'en_preparation', 'expediee', 'cloturee', 'annulee');
create type appro_statut     as enum ('prevue', 'confirmee', 'en_retard', 'recue_partielle', 'recue', 'annulee');
create type depart_type      as enum ('echantillon', 'commande');
create type depart_statut    as enum ('demandee', 'en_preparation', 'expediee', 'livree', 'incident', 'annulee');
create type expedition_statut as enum ('preparee', 'remise', 'en_transit', 'livree', 'incident');
create type priorite         as enum ('normale', 'urgente');

-- -----------------------------------------------------------------------------
-- Profils utilisateurs (adossés à Supabase Auth : auth.users)
-- -----------------------------------------------------------------------------
create table public.profils (
  id          uuid primary key references auth.users(id) on delete cascade,
  nom         text not null,
  email       text,
  roles       user_role[] not null default '{}',   -- cumul de rôles autorisé
  actif       boolean not null default true,
  created_at  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Référentiel
-- -----------------------------------------------------------------------------
create table public.gammes (
  id     uuid primary key default gen_random_uuid(),
  nom    text not null,
  code   text not null unique,            -- STD / PLUS / BIO / PA
  actif  boolean not null default true
);

create table public.origines (
  id     uuid primary key default gen_random_uuid(),
  pays   text not null,
  code   text not null unique,            -- FR / ES / TR
  actif  boolean not null default true
);

create table public.emplacements (
  id     uuid primary key default gen_random_uuid(),
  site   text not null default 'Principal',
  zone   emplacement_zone not null,
  libelle text
);

create table public.clients (
  id             uuid primary key default gen_random_uuid(),
  raison_sociale text not null,
  siret          text,
  secteur        client_secteur not null default 'autre',
  contact        text,
  email          text,
  tel            text,
  created_at     timestamptz not null default now()
);

create table public.adresses_livraison (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid not null references public.clients(id) on delete cascade,
  libelle    text,
  ligne1     text not null,
  ligne2     text,
  cp         text,
  ville      text,
  pays       text default 'France',
  par_defaut boolean not null default false
);

create table public.transporteurs (
  id          uuid primary key default gen_random_uuid(),
  nom         text not null,
  mode        text not null default 'colis',   -- colis / palette
  url_tracking text
);

-- -----------------------------------------------------------------------------
-- Lots (pivot) + génération du n° de lot Circul'Egg
--   Format : REG-{GAMME}-{ORIGINE}-{AAMMJJ}-{seq}
-- -----------------------------------------------------------------------------
create table public.lots (
  id                     uuid primary key default gen_random_uuid(),
  numero_lot_ce          text unique,                 -- généré par trigger
  numero_lot_fournisseur text,                         -- champ libre, pas de table Fournisseur
  gamme_id               uuid not null references public.gammes(id),
  origine_id             uuid not null references public.origines(id),
  date_reception         date not null default current_date,
  dluo                   date,
  quantite_recue         numeric(12,3) not null check (quantite_recue >= 0),  -- kg
  quantite_reservee      numeric(12,3) not null default 0 check (quantite_reservee >= 0),
  statut                 lot_statut not null default 'en_attente',
  emplacement_id         uuid references public.emplacements(id),
  coa_fournisseur_path   text,                          -- Supabase Storage
  coa_circuegg_path      text,                          -- Supabase Storage (uploadé en v1)
  coa_infos              jsonb not null default '{}',   -- champs informatifs, non bloquants
  commentaire_qualite    text,
  created_by             uuid references public.profils(id),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index on public.lots (gamme_id);
create index on public.lots (origine_id);
create index on public.lots (statut);

-- Génération automatique du numéro de lot
create or replace function public.generer_numero_lot()
returns trigger language plpgsql as $$
declare
  v_gamme   text;
  v_origine text;
  v_seq     int;
begin
  if new.numero_lot_ce is not null then
    return new;
  end if;
  select code into v_gamme   from public.gammes   where id = new.gamme_id;
  select code into v_origine from public.origines where id = new.origine_id;
  select count(*) + 1 into v_seq
    from public.lots
    where gamme_id = new.gamme_id
      and origine_id = new.origine_id
      and date_reception = new.date_reception;
  new.numero_lot_ce := format('REG-%s-%s-%s-%s',
                              v_gamme, v_origine,
                              to_char(new.date_reception, 'YYMMDD'),
                              lpad(v_seq::text, 2, '0'));
  return new;
end;
$$;

create trigger trg_generer_numero_lot
  before insert on public.lots
  for each row execute function public.generer_numero_lot();

-- -----------------------------------------------------------------------------
-- Mouvements de stock (journal des flux) + vue stock temps réel
-- -----------------------------------------------------------------------------
create table public.mouvements_stock (
  id           uuid primary key default gen_random_uuid(),
  lot_id       uuid not null references public.lots(id) on delete cascade,
  type         mouvement_type not null,
  quantite     numeric(12,3) not null,          -- signé (+ entrée / - sortie)
  date         timestamptz not null default now(),
  utilisateur  uuid references public.profils(id),
  reference    text,                             -- ex. id expédition / réception
  motif        text
);
create index on public.mouvements_stock (lot_id);

-- Stock physique par lot = somme des mouvements
create view public.v_stock_lot as
  select l.id as lot_id,
         coalesce(sum(m.quantite), 0)                         as quantite_stock,
         l.quantite_reservee,
         (l.statut = 'libere')                                as disponible_vente,
         case when l.statut = 'libere'
              then greatest(coalesce(sum(m.quantite),0) - l.quantite_reservee, 0)
              else 0 end                                      as quantite_disponible
  from public.lots l
  left join public.mouvements_stock m on m.lot_id = l.id
  group by l.id;

-- -----------------------------------------------------------------------------
-- Commandes clients (saisies par les Sales)
-- -----------------------------------------------------------------------------
create table public.commandes_clients (
  id                  uuid primary key default gen_random_uuid(),
  numero              text unique,
  client_id           uuid not null references public.clients(id),
  adresse_id          uuid references public.adresses_livraison(id),
  date_commande       date not null default current_date,
  date_souhaitee      date,
  statut              commande_statut not null default 'brouillon',
  created_by          uuid references public.profils(id),
  created_at          timestamptz not null default now()
);

create table public.lignes_commande (
  id                 uuid primary key default gen_random_uuid(),
  commande_id        uuid not null references public.commandes_clients(id) on delete cascade,
  gamme_id           uuid not null references public.gammes(id),
  origine_id         uuid references public.origines(id),       -- souhaitée (facultatif)
  quantite           numeric(12,3) not null check (quantite > 0),
  lot_alloue_id      uuid references public.lots(id)
);

-- -----------------------------------------------------------------------------
-- Appro (arrivées prévues) — par gamme x origine, pas de Fournisseur
-- -----------------------------------------------------------------------------
create table public.commandes_fournisseur (
  id                 uuid primary key default gen_random_uuid(),
  numero             text unique,
  gamme_id           uuid not null references public.gammes(id),
  origine_id         uuid not null references public.origines(id),
  quantite_attendue  numeric(12,3) not null check (quantite_attendue > 0),
  date_commande      date not null default current_date,
  date_prevue        date,
  date_reelle        date,
  statut             appro_statut not null default 'prevue',
  created_at         timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Départs / expéditions
-- -----------------------------------------------------------------------------
create table public.demandes_depart (
  id             uuid primary key default gen_random_uuid(),
  numero         text unique,
  type           depart_type not null,
  demandeur_id   uuid references public.profils(id),
  client_id      uuid not null references public.clients(id),
  adresse_id     uuid references public.adresses_livraison(id),
  commande_id    uuid references public.commandes_clients(id),   -- si type = commande
  date_demande   date not null default current_date,
  date_souhaitee date,
  priorite       priorite not null default 'normale',
  statut         depart_statut not null default 'demandee',
  commentaire    text,
  created_at     timestamptz not null default now()
);

create table public.lignes_depart (
  id             uuid primary key default gen_random_uuid(),
  demande_id     uuid not null references public.demandes_depart(id) on delete cascade,
  gamme_id       uuid not null references public.gammes(id),
  origine_id     uuid references public.origines(id),
  quantite       numeric(12,3) not null check (quantite > 0),    -- kg (échantillon : 0.050 = 50 g)
  lot_alloue_id  uuid references public.lots(id)                 -- doit être 'libere' au moment de l'expédition
);

create table public.expeditions (
  id              uuid primary key default gen_random_uuid(),
  demande_id      uuid not null references public.demandes_depart(id) on delete cascade,
  transporteur_id uuid references public.transporteurs(id),
  numero_suivi    text,
  date_expedition timestamptz,
  poids           numeric(10,3),
  nb_colis        int default 1,
  bl_path         text,
  coa_joint_path  text,
  statut          expedition_statut not null default 'preparee'
);

-- -----------------------------------------------------------------------------
-- Journal d'audit (actions sensibles : libérations, mouvements, expéditions)
-- -----------------------------------------------------------------------------
create table public.journal_audit (
  id          uuid primary key default gen_random_uuid(),
  date        timestamptz not null default now(),
  utilisateur uuid references public.profils(id),
  action      text not null,
  entite      text not null,
  entite_id   uuid,
  avant       jsonb,
  apres       jsonb
);

-- updated_at auto sur les lots
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end; $$;

create trigger trg_lots_touch
  before update on public.lots
  for each row execute function public.touch_updated_at();
