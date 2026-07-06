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
