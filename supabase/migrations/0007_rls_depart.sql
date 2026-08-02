-- =============================================================================
-- ERP Reggenerate — 0007 : RLS pour le rôle "depart" sur les commandes client
-- Suite à la fusion Commande<->Départ, l'équipe départ doit pouvoir :
--   - faire avancer une commande (en_preparation / expediee)
--   - allouer un lot libéré sur une ligne de commande
-- Sans ceci, l'expédition laissait la commande "à préparer" et le lot non alloué.
-- Idempotent.
-- =============================================================================

drop policy if exists cmd_update_depart on public.commandes_clients;
create policy cmd_update_depart on public.commandes_clients
  for update using (public.has_role('depart')) with check (public.has_role('depart'));

drop policy if exists lcmd_update_depart on public.lignes_commande;
create policy lcmd_update_depart on public.lignes_commande
  for update using (public.has_role('depart')) with check (public.has_role('depart'));
