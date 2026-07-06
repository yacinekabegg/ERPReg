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
