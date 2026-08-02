-- =============================================================================
-- ERP Reggenerate — 0008 : droit de suppression des lots (nettoyage in-app)
-- Les autres tables (commandes client/fournisseur, analyses, clients) ont déjà
-- une policy "for all" couvrant le DELETE ; les lots n'avaient qu'insert/update.
-- Idempotent.
-- =============================================================================

drop policy if exists lots_delete on public.lots;
create policy lots_delete on public.lots
  for delete using (public.has_role('prod_ops'));  -- has_role() renvoie vrai aussi pour admin
