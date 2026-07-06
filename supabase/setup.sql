-- =============================================================================
-- ERP Reggenerate — SETUP COMPLET (a coller en UNE FOIS dans le SQL Editor Supabase)
-- Contient : 0001 schema + 0002 rls + 0003 storage/users + 0004 alignement + 0005 appro + seed
-- Genere automatiquement — ne pas editer a la main.
-- =============================================================================

-- ===== 0001_schema.sql =====
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

-- ===== 0002_rls.sql =====
-- =============================================================================
-- ERP Reggenerate — Sprint 0 : Row Level Security (permissions par rôle)
-- 5 rôles : sales, prod_ops, qualite, depart, admin. Cumul autorisé.
-- Modèle : tout utilisateur authentifié LIT le référentiel/stock ;
--          les écritures sont restreintes par rôle ; admin fait tout.
-- =============================================================================

-- Helpers ---------------------------------------------------------------------
create or replace function public.current_roles()
returns user_role[] language sql stable security definer set search_path = public as $$
  select coalesce(roles, '{}') from public.profils where id = auth.uid();
$$;

create or replace function public.has_role(r user_role)
returns boolean language sql stable security definer set search_path = public as $$
  select r = any(public.current_roles()) or 'admin' = any(public.current_roles());
$$;

create or replace function public.is_authenticated()
returns boolean language sql stable as $$
  select auth.uid() is not null;
$$;

-- Activation RLS --------------------------------------------------------------
alter table public.profils               enable row level security;
alter table public.gammes                enable row level security;
alter table public.origines              enable row level security;
alter table public.emplacements          enable row level security;
alter table public.clients               enable row level security;
alter table public.adresses_livraison    enable row level security;
alter table public.transporteurs         enable row level security;
alter table public.lots                  enable row level security;
alter table public.mouvements_stock      enable row level security;
alter table public.commandes_clients     enable row level security;
alter table public.lignes_commande       enable row level security;
alter table public.commandes_fournisseur enable row level security;
alter table public.demandes_depart       enable row level security;
alter table public.lignes_depart         enable row level security;
alter table public.expeditions           enable row level security;
alter table public.journal_audit         enable row level security;

-- PROFILS : chacun lit son profil ; admin gère tout ---------------------------
create policy profils_self_read on public.profils
  for select using (id = auth.uid() or public.has_role('admin'));
create policy profils_admin_write on public.profils
  for all using (public.has_role('admin')) with check (public.has_role('admin'));

-- RÉFÉRENTIEL (gammes, origines, emplacements, transporteurs) ------------------
-- Lecture : tous authentifiés. Écriture : admin (prod_ops pour emplacements).
do $$
declare t text;
begin
  foreach t in array array['gammes','origines','emplacements','transporteurs']
  loop
    execute format('create policy %I on public.%I for select using (public.is_authenticated());', t || '_read', t);
    execute format('create policy %I on public.%I for all using (public.has_role(''admin'')) with check (public.has_role(''admin''));', t || '_write', t);
  end loop;
end $$;

-- CLIENTS & ADRESSES : lus par tous ; créés/modifiés par sales & admin ---------
create policy clients_read on public.clients for select using (public.is_authenticated());
create policy clients_write on public.clients for all
  using (public.has_role('sales')) with check (public.has_role('sales'));

create policy adresses_read on public.adresses_livraison for select using (public.is_authenticated());
create policy adresses_write on public.adresses_livraison for all
  using (public.has_role('sales')) with check (public.has_role('sales'));

-- LOTS : lus par tous ; créés par prod_ops (réception) ;
--        statut/qualité modifiés par qualite ; admin tout ---------------------
create policy lots_read on public.lots for select using (public.is_authenticated());
create policy lots_insert on public.lots for insert
  with check (public.has_role('prod_ops'));
create policy lots_update on public.lots for update
  using (public.has_role('prod_ops') or public.has_role('qualite'))
  with check (public.has_role('prod_ops') or public.has_role('qualite'));

-- MOUVEMENTS DE STOCK : lus par tous ; écrits par prod_ops & depart -----------
create policy mvt_read on public.mouvements_stock for select using (public.is_authenticated());
create policy mvt_write on public.mouvements_stock for all
  using (public.has_role('prod_ops') or public.has_role('depart'))
  with check (public.has_role('prod_ops') or public.has_role('depart'));

-- COMMANDES CLIENTS + lignes : sales (et prod_ops en lecture/maj) --------------
create policy cmd_read on public.commandes_clients for select using (public.is_authenticated());
create policy cmd_write on public.commandes_clients for all
  using (public.has_role('sales') or public.has_role('prod_ops'))
  with check (public.has_role('sales') or public.has_role('prod_ops'));

create policy lcmd_read on public.lignes_commande for select using (public.is_authenticated());
create policy lcmd_write on public.lignes_commande for all
  using (public.has_role('sales') or public.has_role('prod_ops'))
  with check (public.has_role('sales') or public.has_role('prod_ops'));

-- APPRO : lu par tous ; géré par prod_ops -------------------------------------
create policy appro_read on public.commandes_fournisseur for select using (public.is_authenticated());
create policy appro_write on public.commandes_fournisseur for all
  using (public.has_role('prod_ops')) with check (public.has_role('prod_ops'));

-- DÉPARTS : demande créée par sales ; exécutée par depart ---------------------
create policy dep_read on public.demandes_depart for select using (public.is_authenticated());
create policy dep_insert on public.demandes_depart for insert
  with check (public.has_role('sales') or public.has_role('depart'));
create policy dep_update on public.demandes_depart for update
  using (public.has_role('sales') or public.has_role('depart'))
  with check (public.has_role('sales') or public.has_role('depart'));

create policy ldep_read on public.lignes_depart for select using (public.is_authenticated());
create policy ldep_write on public.lignes_depart for all
  using (public.has_role('depart') or public.has_role('prod_ops'))
  with check (public.has_role('depart') or public.has_role('prod_ops'));

create policy exp_read on public.expeditions for select using (public.is_authenticated());
create policy exp_write on public.expeditions for all
  using (public.has_role('depart')) with check (public.has_role('depart'));

-- JOURNAL D'AUDIT : lu par qualite/prod_ops/admin ; écrit par le système -------
create policy audit_read on public.journal_audit for select
  using (public.has_role('qualite') or public.has_role('prod_ops') or public.has_role('admin'));
create policy audit_insert on public.journal_audit for insert
  with check (public.is_authenticated());

-- ===== 0003_storage_and_users.sql =====
-- =============================================================================
-- ERP Reggenerate — Storage (CoA/BL) + création automatique du profil utilisateur
-- À exécuter APRÈS 0001_schema.sql et 0002_rls.sql.
-- (Sur Supabase, le schéma "storage" et la table "auth.users" existent déjà.)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Bucket privé "coa" : CoA fournisseur, CoA Circul'Egg, BL.
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('coa', 'coa', false)
on conflict (id) do nothing;

-- Accès au bucket "coa" : réservé aux utilisateurs authentifiés (outil interne).
drop policy if exists coa_read on storage.objects;
create policy coa_read on storage.objects
  for select to authenticated using (bucket_id = 'coa');

drop policy if exists coa_insert on storage.objects;
create policy coa_insert on storage.objects
  for insert to authenticated with check (bucket_id = 'coa');

drop policy if exists coa_update on storage.objects;
create policy coa_update on storage.objects
  for update to authenticated using (bucket_id = 'coa');

drop policy if exists coa_delete on storage.objects;
create policy coa_delete on storage.objects
  for delete to authenticated using (bucket_id = 'coa');

-- -----------------------------------------------------------------------------
-- Création automatique du profil applicatif à chaque nouvel utilisateur Auth.
-- Le profil est créé SANS rôle ; un admin attribue ensuite le(s) rôle(s).
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profils (id, nom, email, roles)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nom', new.email),
    new.email,
    '{}'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- Premier administrateur : après avoir créé votre utilisateur dans Auth,
-- exécutez (en remplaçant l'email) pour vous donner tous les droits :
--
--   update public.profils set roles = '{admin}' where email = 'vous@circulegg.fr';
--
-- Ensuite, la gestion des rôles se fait depuis l'application (module Admin)
-- ou par des UPDATE similaires, par ex. :
--   update public.profils set roles = '{qualite}'      where email = 'qualite@circulegg.fr';
--   update public.profils set roles = '{sales,depart}' where email = 'ops@circulegg.fr';
-- -----------------------------------------------------------------------------

-- ===== 0004_alignement_reel.sql =====
-- =============================================================================
-- ERP Reggenerate — 0004 : alignement sur la réalité terrain (fichiers Excel)
--   - Fournisseurs (Egglin / Eggnovo / Lessonia)
--   - Lot : fournisseur + granulométrie ; n° fournisseur = identifiant principal
--   - Stock ventilé par FORMAT : sac / échantillon / échantillothèque / NC
--   - Gammes complétées (90% prot, Fine)
-- Idempotent : peut être ré-exécuté sans dommage.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Fournisseurs
-- -----------------------------------------------------------------------------
create table if not exists public.fournisseurs (
  id     uuid primary key default gen_random_uuid(),
  nom    text not null unique,
  pays   text,
  actif  boolean not null default true
);

insert into public.fournisseurs (nom, pays) values
  ('Egglin',  'Turquie'),
  ('Eggnovo', 'Espagne'),
  ('Lessonia','France')
on conflict (nom) do nothing;

alter table public.fournisseurs enable row level security;
drop policy if exists fournisseurs_read on public.fournisseurs;
create policy fournisseurs_read on public.fournisseurs
  for select using (public.is_authenticated());
drop policy if exists fournisseurs_write on public.fournisseurs;
create policy fournisseurs_write on public.fournisseurs
  for all using (public.has_role('prod_ops')) with check (public.has_role('prod_ops'));

-- -----------------------------------------------------------------------------
-- Lot : fournisseur + granulométrie. Le n° fournisseur (numero_lot_fournisseur)
-- devient l'identifiant principal ; numero_lot_ce reste un n° interne facultatif.
-- -----------------------------------------------------------------------------
alter table public.lots add column if not exists fournisseur_id uuid references public.fournisseurs(id);
alter table public.lots add column if not exists granulometrie text;   -- ex. "200-220µm", "90-100µm"
alter table public.lots alter column numero_lot_ce drop not null;

-- -----------------------------------------------------------------------------
-- Format de conditionnement sur chaque mouvement de stock.
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'mouvement_format') then
    create type mouvement_format as enum ('sac', 'echantillon', 'echantillotheque', 'nc');
  end if;
end $$;

alter table public.mouvements_stock
  add column if not exists format mouvement_format not null default 'sac';

-- -----------------------------------------------------------------------------
-- Vue stock : ajoute la ventilation par format.
-- -----------------------------------------------------------------------------
drop view if exists public.v_stock_lot;
create view public.v_stock_lot as
  select
    l.id as lot_id,
    coalesce(sum(m.quantite), 0)                                                     as quantite_stock,
    coalesce(sum(m.quantite) filter (where m.format = 'sac'), 0)                     as stock_sac,
    coalesce(sum(m.quantite) filter (where m.format = 'echantillon'), 0)            as stock_echantillon,
    coalesce(sum(m.quantite) filter (where m.format = 'echantillotheque'), 0)       as stock_echantillotheque,
    coalesce(sum(m.quantite) filter (where m.format = 'nc'), 0)                     as stock_nc,
    l.quantite_reservee,
    (l.statut = 'libere')                                                            as disponible_vente,
    case when l.statut = 'libere'
         then greatest(coalesce(sum(m.quantite), 0) - l.quantite_reservee, 0)
         else 0 end                                                                  as quantite_disponible
  from public.lots l
  left join public.mouvements_stock m on m.lot_id = l.id
  group by l.id;

-- -----------------------------------------------------------------------------
-- Gammes réelles complémentaires (par granulométrie / spec).
-- -----------------------------------------------------------------------------
insert into public.gammes (nom, code) values
  ('Reggenerate® 90% protéines', 'PROT90'),
  ('Reggenerate® Fine (<150µm)', 'FINE')
on conflict (code) do nothing;

-- ===== 0005_appro_reel.sql =====
-- =============================================================================
-- ERP Reggenerate — 0005 : appro alignée sur le vrai workflow Egglin
--   (fichier "Suivi commande Egglin")
--   - Workflow 6 étapes : Demande (WhatsApp) → Proforma → Paiement →
--     Production → Expédition Turquie → Réception Janzé (+ Annulée)
--   - N° bon de commande / proforma, date de paiement, commentaires
--   - Réceptions PARTIELLES : les lots reçus se rattachent à la commande,
--     la vue v_appro calcule reçu / reste / retard
-- Idempotent : peut être ré-exécuté sans dommage.
-- =============================================================================

-- Workflow réel (remplace l'ancien statut simple)
do $$
begin
  if not exists (select 1 from pg_type where typname = 'appro_etat') then
    create type appro_etat as enum
      ('demande', 'proforma', 'paiement', 'production', 'expedition', 'recue', 'annulee');
  end if;
end $$;

alter table public.commandes_fournisseur
  add column if not exists etat appro_etat not null default 'demande';
alter table public.commandes_fournisseur
  add column if not exists fournisseur_id uuid references public.fournisseurs(id);
alter table public.commandes_fournisseur
  add column if not exists numero_bdc text;         -- bon de commande (ex. 251119)
alter table public.commandes_fournisseur
  add column if not exists numero_proforma text;
alter table public.commandes_fournisseur
  add column if not exists date_paiement date;
alter table public.commandes_fournisseur
  add column if not exists commentaires text;

-- L'ancien statut simple est remplacé par le workflow etat.
alter table public.commandes_fournisseur drop column if exists statut;
drop type if exists appro_statut;

-- Rattachement d'un lot reçu à sa commande fournisseur (réceptions partielles).
alter table public.lots
  add column if not exists commande_fournisseur_id uuid references public.commandes_fournisseur(id);

-- Vue appro : reçu (somme des lots rattachés), reste à recevoir, retard.
create or replace view public.v_appro as
  select
    cf.id,
    coalesce(sum(l.quantite_recue), 0)                                       as quantite_recue,
    greatest(cf.quantite_attendue - coalesce(sum(l.quantite_recue), 0), 0)   as reste_a_recevoir,
    (cf.etat not in ('recue', 'annulee')
       and cf.date_prevue is not null
       and cf.date_prevue < current_date)                                    as en_retard,
    case when cf.etat not in ('recue', 'annulee')
           and cf.date_prevue is not null
           and cf.date_prevue < current_date
         then (current_date - cf.date_prevue) else 0 end                     as jours_retard
  from public.commandes_fournisseur cf
  left join public.lots l on l.commande_fournisseur_id = cf.id
  group by cf.id;

-- ===== seed.sql =====
-- =============================================================================
-- ERP Reggenerate — Seed initial (données de démarrage)
-- Gammes connues + origines FR/ES/TR + zones de stock + transporteur MVP.
-- Pas de clients (créés dans l'outil), pas de fournisseurs (pays suffit).
-- =============================================================================

insert into public.gammes (nom, code) values
  ('Reggenerate® Standard',   'STD'),
  ('Reggenerate® Plus',       'PLUS'),
  ('Reggenerate® Bio',        'BIO'),
  ('Reggenerate® Plein Air',  'PA')
on conflict (code) do nothing;

insert into public.origines (pays, code) values
  ('France',  'FR'),
  ('Espagne', 'ES'),
  ('Turquie', 'TR')
on conflict (code) do nothing;

insert into public.emplacements (site, zone, libelle) values
  ('Principal', 'quarantaine', 'Zone quarantaine (lots en attente qualité)'),
  ('Principal', 'libere',      'Zone stock libéré (vendable)'),
  ('Principal', 'bloque',      'Zone lots bloqués / refusés'),
  ('Principal', 'expedition',  'Zone préparation expédition');

insert into public.transporteurs (nom, mode, url_tracking) values
  ('Colissimo', 'colis', 'https://www.laposte.fr/outils/suivre-vos-envois?code=');

-- -----------------------------------------------------------------------------
-- RÔLES (définition générique, sans prénom) — pour information.
-- Les utilisateurs sont créés via Supabase Auth, puis on renseigne
-- public.profils.roles avec un ou plusieurs de ces rôles :
--   'sales'    → Dashboard stock + création des demandes de départ + commandes clients
--   'prod_ops' → Réception des lots, gestion stock, appro / arrivées prévues
--   'qualite'  → Validation des lots (upload CoA, Libérer / Bloquer / Refuser)
--   'depart'   → Exécution des demandes : préparation, expédition, tracking
--   'admin'    → Administration : utilisateurs, référentiels, tous droits
-- Exemple d'affectation après création d'un utilisateur :
--   update public.profils set roles = '{qualite}'         where email = 'qualite@circulegg.fr';
--   update public.profils set roles = '{sales,depart}'    where email = 'ops@circulegg.fr';
-- -----------------------------------------------------------------------------

