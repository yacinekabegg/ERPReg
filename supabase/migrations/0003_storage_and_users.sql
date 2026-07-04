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
