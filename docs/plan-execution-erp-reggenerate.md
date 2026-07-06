# Plan d'exécution — ERP Reggenerate® (Circul'Egg)

> **TEMPS 2 — Plan d'exécution.** Fait suite au cahier des charges v0.2 (validé).
> Version 0.1 — 2026-07-04. Socle : **Supabase (Postgres) + Next.js PWA / Vercel**, approche simple sans seuils.

---

## 0. Principes du plan

- **Livrer la boucle utile le plus vite possible** : Réception → Qualité (libération) → Départ. C'est le MVP.
- **Une seule base Supabase**, une seule PWA. Pas de big-bang : on met en prod à chaque sprint.
- **Chaque sprint = un incrément utilisable** par au moins un rôle.
- Estimation de référence : **1 développeur, sprints de 2 semaines**. À ajuster selon la ressource réelle.

---

## 1. Périmètre MVP vs V2

| Domaine | **MVP (v1)** | **V1.1 (fast-follow)** | **V2** |
|---|---|---|---|
| Auth & rôles | Login Supabase + 5 rôles (RLS) | — | SSO éventuel |
| Référentiel | Gammes, origines, fournisseurs, clients, adresses | — | Import en masse |
| Réception & stock | Saisie lot, upload CoA fournisseur, stock dispo par gamme×origine, mouvements | Emplacements/zones fins | Codes-barres/étiquettes lot |
| Qualité | File lots, upload CoA CE, **statut manuel** (Libérer/Bloquer/Refuser), journal | Champs infos structurés (facultatifs) | **Génération PDF CoA charté**, contrôles seuils optionnels |
| Départs | Demande (échantillon 50 g défaut / commande), file départ, allocation lots libérés, expédition + décrément stock, **tracking manuel** | BL PDF simple | **API transporteur** (Colissimo/Boxtal), étiquettes auto |
| Commandes clients | Saisie par Sales, allocation, lien départ | — | Portail client |
| Appro | — | Commandes fournisseur, arrivées prévues, **retards**, aide anti-rupture | — |
| Dashboards & alertes | Dashboard stock (Sales) | Dashboards par rôle, alertes stock bas / DLUO / lots en attente | Analytics (rendement, délais) |
| Conformité | Journal d'audit actions sensibles | — | Module **rappel/retrait** de lot |

---

## 2. Découpage en sprints

### Sprint 0 — Fondations *(socle technique)*
**But :** l'app est en ligne, on se logue, le référentiel existe.
- ✅ **Schéma Postgres livré** (`supabase/migrations/0001_schema.sql`) : toutes les tables, types énumérés, génération auto du n° de lot, vue stock, triggers.
- ✅ **RLS des 5 rôles livrée** (`0002_rls.sql`) + **seed** gammes/origines/zones/transporteur (`seed.sql`). *Validé sur un vrai Postgres.*
- ⬜ Créer le **projet Supabase** distant + appliquer les migrations (`supabase db push`) + bucket **Storage** `coa`.
- ⬜ Créer les **utilisateurs** (Supabase Auth) et affecter leurs rôles.
- ✅ **Squelette Next.js PWA livré** : auth Supabase (login + middleware), shell protégé, **navigation filtrée par rôle**, 1 page par module, manifest + service worker. *Typecheck + build Next.js OK ; routes vérifiées en mode démo.*
- ⬜ Déploiement **Vercel** + branchement des variables Supabase (`.env`).
- **Jalon J1** : socle en ligne, login OK, référentiel en base.
- *Décisions actées : rôles génériques (sans prénom), pas de table Fournisseur (pays suffit), clients créés dans l'outil, n° de lot `REG-{GAMME}-{ORIGINE}-{AAMMJJ}-{seq}`.*

### Sprint 1 — Stock & Réception *(rôle Prod/Ops)* — ✅ livré (code)
**But :** on entre des lots et on voit le stock.
- ✅ Écran **Réception** : formulaire lot (gamme, origine, qté, DLUO, n° lot fournisseur, emplacement) + **upload CoA fournisseur** (Storage) via server action.
- ✅ **MouvementStock** (entrée automatique) + branchement du dashboard sur la vue **stock temps réel** (`v_stock_lot`).
- ✅ Dashboard : agrégation **disponible par gamme×origine** + liste des lots (stock/dispo réels) + liste des dernières réceptions. *Typecheck + build OK, rendu vérifié.*
- ⬜ Validation end-to-end de l'écriture une fois Supabase branché (bucket `coa`).
- **Jalon J2** : réception + stock opérationnels.

### Sprint 2 — Qualité & Libération *(rôle Qualité)* — ✅ livré (code) — cœur de la valeur
**But :** un humain libère un lot, et ça débloque la vente.
- ✅ **File des lots** (`en_attente`/`en_cours`), les plus anciens d'abord.
- ✅ **Fiche lot qualité** : infos lot + liens de téléchargement signés du CoA fournisseur, **upload CoA Circul'Egg** (passe le lot en « en cours »), champs infos facultatifs (`coa_infos`).
- ✅ Boutons **Libérer / Bloquer / Refuser** + commentaire (server action, déplacement d'emplacement best-effort).
- ✅ Règle **`disponible_vente = (statut = libéré)`** propagée au stock — *validée bout-en-bout sur Postgres réel : avant libération dispo=0, après dispo=quantité.*
- ✅ **Journal d'audit** sur chaque décision (avant/après en jsonb).
- ⬜ Validation end-to-end via l'app une fois Supabase branché.
- **Jalon J3** : boucle qualité complète (réception → libération).

### Sprint 3 — Départs & Commandes *(rôles Sales + Équipe départ)* — ✅ livré (code) → **MVP complet**
**But :** boucle bout-en-bout, produit utilisable en prod.
- ✅ **Sales** : création de **clients** (+ adresse) et de **commandes** ; création de **demande de départ** (échantillon/commande, client, adresse, lignes ; échantillon **pré-rempli 0,050 kg = 50 g, modifiable**).
- ✅ **Équipe départ** : file des demandes → **allocation de lots `libérés` uniquement** (seuls les lots avec dispo>0 sont proposés) → **expédition** (transporteur, poids/colis, **n° de suivi manuel**) → **décrément du stock** (mouvement sortie) + audit.
- ✅ Traçabilité **lot → client** conservée ; dashboard stock branché.
- ✅ *Validé bout-en-bout sur Postgres réel : expédition d'un échantillon 50 g → stock 120 → 119,950 kg, demande `expediee`, lien demande→client→lot.*
- ⬜ Validation end-to-end via l'app une fois Supabase branché.
- **Jalon J4 : MVP LIVRÉ (code)** — boucle Réception → Libération → Départ complète.

### Sprint 4 — Appro & Dashboards *(V1.1)* — ✅ livré (code)
**But :** anticiper les ruptures, confort par rôle.
- ✅ **Commandes fournisseur** avec le **vrai workflow Egglin 6 étapes** (Demande WhatsApp → Proforma → Paiement → Production → Expédition Turquie → Réceptionnée), n° BDC/proforma, date de paiement (migration `0005`).
- ✅ **Réceptions partielles** : les lots reçus se rattachent à la commande ; reçu/reste calculés (vue `v_appro`), passage auto en « Réceptionnée » quand tout est reçu. *Scénario réel validé sur Postgres : 300 kg → reçu 160 → reste 140 → solde 0.*
- ✅ Calcul **retard** (jours) + bandeau d'alerte sur la page Appro.
- ✅ Dashboard : **prévisionnel par gamme** (dispo + en cours de livraison) + **alertes** (appro en retard, lots en attente > 14 j, DLUO < 90 j).
- **Jalon J5 : V1.1 (code)**.

### Au-delà — V2 (backlog priorisable)
- ✅ **Génération PDF CoA charté** livrée : sur la fiche qualité, saisie des paramètres (mesurés + portés pré-remplis) + case « conforme » par paramètre → bouton **Générer le CoA** (actif quand tout est conforme) → PDF bilingue FR/EN (en-tête Circul'Egg, déclaration signée, 3 sections) stocké dans Storage et rattaché au lot. `@react-pdf/renderer`, aucune migration (réutilise `coa_infos` + `coa_circuegg_path`). Rendu validé (PDF valide + mise en page conforme au gabarit Excel).
- Reste V2 : **CoA contaminants**, génération **BL** auto · **API transporteur**/étiquettes · module **rappel/retrait** · analytics · portail client.

---

## 3. Roadmap & jalons

| Jalon | Contenu | Fin (réf. 2 sem./sprint) |
|---|---|---|
| **J1** | Socle en ligne, login, référentiel | fin S0 |
| **J2** | Réception + stock | fin S1 |
| **J3** | Qualité / libération | fin S2 |
| **J4** | **MVP complet (boucle bout-en-bout)** | fin S3 (~8 sem.) |
| **J5** | Appro + dashboards (V1.1) | fin S4 (~10 sem.) |
| V2 | Incréments priorisés | après |

*Chiffrage indicatif : MVP en ~8 semaines à 1 dev. Avec un dev plus rapide ou du no-code assisté, compressible.*

---

## 4. Dépendances

- **S2 dépend de S1** : il faut des lots avant de les libérer.
- **S3 dépend de S2** : seuls les lots `libérés` sont allouables → la règle de libération doit exister.
- **S4 (appro)** est **parallélisable** (peut démarrer dès S1, ne bloque pas le MVP).
- **Transverses dès S0** : Auth/RLS, Storage, schéma — tout le reste en dépend.
- **Inputs métier requis** (voir §6) : sans le référentiel réel et la liste des utilisateurs, S0 ne peut pas se clôturer.

---

## 5. Qui fait quoi (RACI simplifié)

| Activité | Dev | Toi (Circul'Egg) | Qualité | Sales | Équipe départ |
|---|---|---|---|---|---|
| Setup Supabase/Vercel, schéma, RLS | **R** | A | — | — | — |
| Fournir référentiel réel (gammes, origines, fournisseurs, clients) | C | **R** | C | C | — |
| Définir utilisateurs & rôles | C | **R/A** | — | — | — |
| Format n° de lot | C | **A** | C | — | — |
| Valider workflow libération + champs infos | C | A | **R** | — | — |
| Valider formulaire commande & demande de départ | C | A | — | **R** | C |
| Valider écran préparation/expédition | C | A | — | — | **R** |
| Recette & mise en prod de chaque sprint | R | **A** | C | C | C |

R = réalise · A = approuve/décide · C = consulté.

---

## 6. Prérequis à réunir avant / au démarrage du Sprint 0

1. **Accès** : organisation Supabase + compte Vercel (ou je les crée et je te transfère).
2. **Liste des utilisateurs** (nom, email) et **leur(s) rôle(s)**.
3. **Référentiel réel** : gammes (déjà connues), origines (FR/ES/TR), fournisseurs, premiers clients + adresses.
4. **Format du n° de lot** à confirmer (défaut proposé : `REG-{GAMME}-{ORIGINE}-{AAMMJJ}-{seq}`).
5. **Un exemple de PDF de CoA** (fournisseur + ton CoA CE type) — juste pour caler l'upload/affichage.
6. **Transporteur(s)** du MVP (défaut : Colissimo).

---

## 7. Prochaine action proposée

Lancer le **Sprint 0** : je crée le schéma Supabase (toutes les tables + RLS des 5 rôles) et le squelette Next.js PWA déployable sur Vercel, à partir du CDC v0.2. Il me faut surtout les **prérequis §6.2 et §6.3** (utilisateurs + référentiel réel) pour que le socle soit directement exploitable.
