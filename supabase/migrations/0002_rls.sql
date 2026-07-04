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
