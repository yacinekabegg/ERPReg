-- =============================================================================
-- ERP Reggenerate — 0006 : retours de la revue commanditaire (30/07/2026)
--   - N° de lot interne à origine masquée (CE-{code}-{seq})
--   - note interne (dérogation, hors PDF)
--   - documents lot (BL / ATR / CoA multi-fichiers)  -> table lot_documents
--   - suivi des analyses (registre libre)            -> table suivi_analyses
--   - commande client enrichie (type, priorité, remarques, origine par ligne)
--   - fusion Commande<->Départ : expéditions rattachables à une commande client
--   - zones réduites (Quarantaine + Stock libéré)
--   - fournisseur Innain ; PDF bon de commande fournisseur
-- Idempotent.
-- =============================================================================

-- --- N° de lot interne masqué : CE-{code}-{seq}, code non lisible par origine ---
-- Mapping (configurable) : Turquie=X, Espagne=J, France=P, autre=Z.
create or replace function public.generer_numero_lot()
returns trigger language plpgsql as $$
declare
  v_origine text;
  v_code    text;
  v_seq     int;
begin
  if new.numero_lot_ce is not null then
    return new;
  end if;
  select code into v_origine from public.origines where id = new.origine_id;
  v_code := case v_origine
              when 'TR' then 'X'
              when 'ES' then 'J'
              when 'FR' then 'P'
              else 'Z' end;
  select count(*) + 1 into v_seq
    from public.lots l
    join public.origines o on o.id = l.origine_id
    where case o.code when 'TR' then 'X' when 'ES' then 'J' when 'FR' then 'P' else 'Z' end = v_code;
  new.numero_lot_ce := format('CE-%s-%s', v_code, lpad(v_seq::text, 4, '0'));
  return new;
end;
$$;

-- --- Lot : note interne (jamais imprimée sur le CoA) ---
alter table public.lots add column if not exists note_interne text;

-- --- Documents rattachés à un lot (BL, ATR, CoA fournisseur/interne, analyses) ---
do $$
begin
  if not exists (select 1 from pg_type where typname = 'document_categorie') then
    create type document_categorie as enum
      ('bl', 'atr', 'coa_fournisseur', 'coa_interne', 'analyse', 'autre');
  end if;
end $$;

create table if not exists public.lot_documents (
  id         uuid primary key default gen_random_uuid(),
  lot_id     uuid not null references public.lots(id) on delete cascade,
  categorie  document_categorie not null,
  path       text not null,
  filename   text,
  created_by uuid references public.profils(id),
  created_at timestamptz not null default now()
);
create index if not exists idx_lot_documents_lot on public.lot_documents (lot_id);

alter table public.lot_documents enable row level security;
drop policy if exists lotdoc_read on public.lot_documents;
create policy lotdoc_read on public.lot_documents for select using (public.is_authenticated());
drop policy if exists lotdoc_write on public.lot_documents;
create policy lotdoc_write on public.lot_documents for all
  using (public.has_role('prod_ops') or public.has_role('qualite'))
  with check (public.has_role('prod_ops') or public.has_role('qualite'));

-- --- Suivi des analyses (registre libre, non exploité automatiquement) ---
create table if not exists public.suivi_analyses (
  id           uuid primary key default gen_random_uuid(),
  lot_id       uuid references public.lots(id) on delete set null,
  type_analyse text not null,          -- ex. Collagène, Microbiologie, Métaux lourds…
  date_analyse date not null default current_date,
  valeurs      text,                   -- saisie libre
  fichier_path text,
  commentaire  text,
  created_by   uuid references public.profils(id),
  created_at   timestamptz not null default now()
);
alter table public.suivi_analyses enable row level security;
drop policy if exists analyses_read on public.suivi_analyses;
create policy analyses_read on public.suivi_analyses for select using (public.is_authenticated());
drop policy if exists analyses_write on public.suivi_analyses;
create policy analyses_write on public.suivi_analyses for all
  using (public.has_role('qualite')) with check (public.has_role('qualite'));

-- --- Commande client enrichie ---
do $$
begin
  if not exists (select 1 from pg_type where typname = 'commande_type') then
    create type commande_type as enum ('echantillon', 'commande');
  end if;
end $$;

alter table public.commandes_clients add column if not exists type commande_type not null default 'commande';
alter table public.commandes_clients add column if not exists priorite priorite not null default 'normale';
alter table public.commandes_clients add column if not exists commentaire text;

alter table public.lignes_commande add column if not exists origine_id uuid references public.origines(id);
alter table public.lignes_commande add column if not exists remarques text;

-- --- Fusion Commande <-> Départ : expédition rattachable à une commande client ---
alter table public.expeditions add column if not exists commande_id uuid references public.commandes_clients(id) on delete cascade;
alter table public.expeditions alter column demande_id drop not null;

-- --- Zones : ne garder que Quarantaine + Stock libéré ---
update public.lots set emplacement_id = null
  where emplacement_id in (select id from public.emplacements where zone in ('bloque', 'expedition'));
delete from public.emplacements where zone in ('bloque', 'expedition');

-- --- Fournisseur Innain ---
insert into public.fournisseurs (nom, pays) values ('Innain', 'France')
on conflict (nom) do nothing;

-- --- Appro : PDF bon de commande fournisseur ---
alter table public.commandes_fournisseur add column if not exists pdf_path text;
