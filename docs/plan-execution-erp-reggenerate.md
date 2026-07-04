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
- ⬜ Squelette **Next.js PWA** + déploiement **Vercel** (login Supabase).
- **Jalon J1** : socle en ligne, login OK, référentiel en base.
- *Décisions actées : rôles génériques (sans prénom), pas de table Fournisseur (pays suffit), clients créés dans l'outil, n° de lot `REG-{GAMME}-{ORIGINE}-{AAMMJJ}-{seq}`.*

### Sprint 1 — Stock & Réception *(rôle Prod/Ops)*
**But :** on entre des lots et on voit le stock.
- Écran **Réception** : saisie lot (n° CE auto, fournisseur, gamme, origine, qté, DLUO, emplacement) + **upload CoA fournisseur**.
- Table **MouvementStock** (entrée) + vue **stock temps réel** par gamme×origine.
- Vue stock détaillée par lot.
- **Jalon J2** : réception + stock opérationnels.

### Sprint 2 — Qualité & Libération *(rôle Qualité)* — cœur de la valeur
**But :** un humain libère un lot, et ça débloque la vente.
- **File des lots** (`en_attente`/`en_cours`).
- **Fiche lot qualité** : CoA fournisseur, **upload CoA Circul'Egg**, champs infos facultatifs.
- Boutons **Libérer / Bloquer / Refuser** + commentaire.
- Règle auto **`disponible_vente = (statut = libéré)`** propagée au stock/aux allocations.
- **Journal d'audit** (libérations, mouvements).
- **Jalon J3** : boucle qualité complète (réception → libération).

### Sprint 3 — Départs & Commandes *(rôles Sales + Équipe départ)* → **MVP complet**
**But :** boucle bout-en-bout, produit utilisable en prod.
- **Sales** : créer **commande client** ; créer **demande de départ** (type échantillon/commande, client, adresse, lignes ; échantillon **pré-rempli 50 g, modifiable**, gratuit).
- **Équipe départ** : file des demandes → **allocation de lots `libérés` uniquement** → **expédition** (transporteur, poids/colis, **n° de suivi manuel**) → **décrément stock**.
- Contrôle bloquant expédition (lot non libéré / stock insuffisant).
- Dashboard stock disponible (Sales).
- **Jalon J4 : MVP LIVRÉ** — l'outil remplace la gestion artisanale.

### Sprint 4 — Appro & Dashboards *(V1.1)*
**But :** anticiper les ruptures, confort par rôle.
- **Commandes fournisseur** / arrivées prévues + calcul **retard**.
- Vue **anti-rupture** (stock dispo + appro − commandes).
- **Dashboards par rôle** + **alertes** (stock bas, DLUO, lots en attente trop anciens).
- **Jalon J5 : V1.1**.

### Au-delà — V2 (backlog priorisable)
Génération **PDF CoA charté** & BL · **API transporteur**/étiquettes · module **rappel/retrait** · analytics · portail client.

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
