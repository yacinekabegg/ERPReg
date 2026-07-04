# Cahier des charges — ERP Reggenerate® (Circul'Egg)

> **TEMPS 1 — Définition du besoin.** Document soumis à validation avant le plan d'exécution (TEMPS 2).
> Version 0.2 — 2026-07-04 — *Décisions actées : socle **Supabase**, approche **simple sans seuils** (contrôle qualité 100 % humain).*

---

## 0. Synthèse & parti-pris

**Socle technique retenu : Supabase (Postgres) comme source de vérité, PWA Next.js comme interface, hébergement Vercel.**

| Brique | Choix | Rôle |
|---|---|---|
| Base de données | **Supabase / Postgres** | Source de vérité unique, aucun plafond d'enregistrements, gratuit à l'échelle actuelle |
| Fichiers (CoA, BL PDF) | **Supabase Storage** | Stockage des PDF fournisseur & Circul'Egg |
| Authentification | **Supabase Auth** | Login + gestion des utilisateurs |
| Permissions par rôle | **Postgres RLS** (Row Level Security) | Qui voit/fait quoi, au niveau base |
| Interface | **Next.js PWA / Vercel** | Écrans terrain (mobile-friendly) |

**Un seul outil, une seule vérité.** Les 3 briques métier (Stock & traçabilité lot · Qualité/CoA · Départs/expéditions) vivent dans **une seule base**, reliées par l'entité pivot **Lot**. Découpage **logique**, pas physique.

**Principe directeur v1 : la simplicité prime. Aucun seuil n'est calculé par le système.**
- Le système ne juge pas la conformité. Il **stocke** les CoA (PDF fournisseur + CoA Circul'Egg) et **centralise** l'information.
- **Un humain (Qualité) lit les valeurs et pose le statut du lot à la main** : `Libéré` / `Bloqué` / `Refusé`.
- La **seule règle automatique** — et c'est le cœur utile de l'outil — : *un lot n'est vendable/expédiable que si un humain l'a passé en `Libéré`.* Rien d'autre n'est automatisé.

---

## 1. Questions à trancher (zones d'ombre)

Mes hypothèses par défaut : `→ défaut proposé`. *(Tout le bloc « seuils / specs / conformité automatique » est retiré : décision actée = contrôle 100 % humain.)*

### 1.1 Référentiel & numérotation
1. **N° de lot Circul'Egg** : format souhaité ? `→ défaut : REG-{GAMME}-{ORIGINE}-{AAMMJJ}-{séquence}` (ex. `REG-PLUS-ES-260704-01`).
2. Un lot Circul'Egg = **un lot fournisseur unique**, ou peut-on **regrouper/scinder** ? `→ défaut : 1 lot fournisseur = 1 lot CE (pas de mélange)`.
3. Maille la plus fine = le **lot**, ou faut-il gérer des sous-conditionnements (sacs, fûts) ? `→ défaut : maille = lot`.

### 1.2 Qualité / CoA (version simple)
4. Le **CoA Circul'Egg** est-il **généré par l'outil** ou **uploadé** ? → **DÉCIDÉ : uploadé/attaché** (c'est toi qui attaches le PDF). Génération PDF chartée renvoyée en V2.
5. Quels **champs veux-tu au minimum voir saisis** sur un lot pour t'aider à décider à l'œil (même sans seuil) ? cf. §4 — liste de champs **informatifs**, non bloquants.
6. Statuts lot suffisants : `En attente` / `En cours` / `Libéré` / `Bloqué` / `Refusé` ? `→ défaut : oui`.

### 1.3 Stock & emplacements
7. **Emplacements** : combien de sites/zones (quarantaine, libéré, bloqué, expédition) ? `→ défaut : 1 site, zones logiques`.
8. **Unité de stock** : kg (affichage g pour échantillons) ? `→ défaut : kg`.
9. **Alerte stock bas** : par gamme×origine, seuil paramétrable saisi à la main ? `→ défaut : oui`. *(C'est une alerte de confort, pas une règle bloquante.)*

### 1.4 Commandes & appro
10. **Commandes clients** : déjà gérées ailleurs, ou créées ici ? → **DÉCIDÉ : saisies directement dans l'outil par les Sales.**
11. **Réservation** de stock à la commande, ou allocation seulement au départ ? `→ défaut : réservation à la commande, décrément au départ`.
12. **Arrivées prévues** : saisie manuelle avec date prévue + suivi retard ? `→ défaut : oui`.

### 1.5 Départs / expéditions
13. **Transporteurs** : Colissimo seul au MVP ? `→ défaut : Colissimo, modèle extensible`.
14. **Tracking** : saisie manuelle du n° de suivi (API transporteur en V2) ? `→ défaut : manuel`.
15. **Échantillons** : → **DÉCIDÉ : gratuits. C'est le demandeur (Sales) qui précise la quantité ; le formulaire propose 50 g par défaut mais reste modifiable (souvent plus).** Prélevés sur un lot Libéré, tracés.
16. Un départ peut **mixer plusieurs lots/gammes** dans un colis ? `→ défaut : oui, multi-lignes`.
17. **Documents joints** au colis : BL + CoA générés/attachés automatiquement ? `→ défaut : BL simple + CoA attaché`.

### 1.6 Rôles & conformité
18. Cumul de rôles (une personne = plusieurs rôles) ? `→ défaut : oui`.
19. **Piste d'audit** (qui a libéré/expédié quoi, quand) ? `→ défaut : oui, journal des actions sensibles`.

---

## 2. Modèle de données (simplifié)

Entité pivot : **Lot**. Clients créés dans l'outil ; pas de table Fournisseur (le n° de lot fournisseur est un champ texte).

### 2.1 Vue d'ensemble

```
Gamme ─┐
Origine─┴─< Lot >─── coa_fournisseur_pdf   (fichier)
           │  └── coa_circuegg_pdf         (fichier)
           │      + statut posé À LA MAIN par Qualité
           │  (n° lot fournisseur = simple texte, pas de table Fournisseur)
           │
           ├──< MouvementStock >── Emplacement
           │
           └──< LigneDepart >── DemandeDepart ──< Expedition >── Transporteur
                                      │
Client ──< AdresseLivraison >─────────┘
Client ──< CommandeClient >──< LigneCommande >
Origine ──< CommandeFournisseur >  (arrivées prévues + retard, par gamme×origine)
Utilisateur (Supabase Auth) ── role
JournalAudit  (actions sensibles)
```

> **Décisions référentiel actées :** pas de table **Fournisseur** (le **pays d'origine** suffit ; le n° de lot fournisseur reste un champ texte libre sur le lot). Pas de **clients** pré-chargés — ils sont créés dans l'outil par les Sales. **Rôles définis génériquement** (par fonction, sans nom de personne).

### 2.2 Tables & attributs

**Gamme** — `id, nom (Standard/Plus/Bio/Plein Air), code, actif`
**Origine** — `id, pays (France/Espagne/Turquie), code, actif`
**Client** — `id, raison_sociale, siret, secteur (nutra/cosméto/petfood), contact, email, tel` *(créés dans l'outil, pas de pré-chargement)*
**AdresseLivraison** — `id, client→, libellé, ligne1, ligne2, cp, ville, pays, par_defaut`

**Lot** *(pivot)*
| Attribut | Type | Notes |
|---|---|---|
| id | PK | |
| numero_lot_CE | texte unique | |
| numero_lot_fournisseur | texte | champ libre (pas de table Fournisseur) |
| gamme, origine | FK | |
| date_reception, dluo | date | |
| quantite_recue | numeric (kg) | |
| quantite_stock | numeric | recalculé depuis MouvementStock (vue) |
| quantite_reservee | numeric | somme des allocations en cours |
| disponible_vente | booléen dérivé | **= (statut = Libéré)** — seule règle auto |
| statut | enum | `en_attente / en_cours / libere / bloque / refuse` — **posé à la main** |
| emplacement | FK | |
| coa_fournisseur_pdf | fichier (Storage) | |
| coa_circuegg_pdf | fichier (Storage) | uploadé en v1 |
| coa_infos | jsonb | champs informatifs saisis (cf. §4), **non bloquants** |
| commentaire_qualite | texte | motif blocage/refus, dérogation |

**Emplacement** — `id, site, zone (quarantaine/libere/bloque/expedition)`
**MouvementStock** *(journal des flux)* — `id, lot→, type (entree/sortie/ajustement/transfert), quantite (±), date, utilisateur, reference, motif`

**CommandeClient** — `id, numero, client→, adresse_livraison→, date_commande, date_souhaitee, statut (brouillon/confirmee/en_preparation/expediee/cloturee/annulee)`
**LigneCommande** — `id, commande→, gamme→, origine_souhaitee→, quantite, lot_alloue→`

**CommandeFournisseur (appro)** — `id, numero, gamme→, origine→, quantite_attendue, date_commande, date_prevue, date_reelle, statut (prevue/confirmee/en_retard/recue_partielle/recue/annulee)`. *Arrivée prévue par gamme×origine (pas de table Fournisseur). Retard = date_prevue dépassée & non reçue (vue).*

**DemandeDepart**
| Attribut | Type | Notes |
|---|---|---|
| id, numero | | |
| type | enum | `echantillon / commande` |
| demandeur | FK utilisateur | (sales) |
| client, adresse_livraison | FK | |
| commande_liee | FK | si type = commande |
| date_demande, date_souhaitee | date | |
| priorite | enum | normale / urgente |
| statut | enum | `demandee / en_preparation / expediee / livree / incident / annulee` |
| commentaire | texte | |

**LigneDepart** — `id, demande→, gamme→, origine_souhaitee→, quantite, lot_alloue→` *(le lot alloué doit être `libere`)*
**Expedition** — `id, demande→, transporteur→, numero_suivi, date_expedition, poids, nb_colis, bl_pdf, coa_joint, statut (preparee/remise/en_transit/livree/incident)`
**Transporteur** — `id, nom, mode (colis/palette), url_tracking`
**Utilisateur** — géré par **Supabase Auth** ; table profil `id, nom, email, roles[]`
**JournalAudit** — `id, date, utilisateur, action, entite, entite_id, avant, apres` *(libérations, mouvements, expéditions)*

---

## 3. Workflows & statuts

### 3.1 Réception → Qualité → Libération (cycle de vie du LOT)

```
[Réception] (Prod/Ops)
   Saisie lot + upload CoA fournisseur → statut = en_attente  (zone Quarantaine)
        │
        ▼
[Qualité] lit le CoA fournisseur, ré-analyse, attache/saisit le CoA Circul'Egg
   → statut = en_cours
        │
   ── DÉCISION 100 % HUMAINE (aucun seuil calculé) ──
        ├─ OK à l'œil ─────────► statut = libere   ✅ vendable  (zone Libéré)
        ├─ doute/attente ──────► reste en_cours / bloque
        └─ non conforme ───────► refuse                          (retour/destruction)
```
**Statuts lot** : `en_attente → en_cours → libere | bloque | refuse`.
**Invariant (seule règle auto)** : `disponible_vente = (statut = libere)`. Toute allocation vérifie ce booléen.

### 3.2 Demande de départ → Expédition

```
[Sales] crée DemandeDepart (type, client, adresse, lignes gamme/qté) → demandee
[Équipe départ] prend en charge, alloue des lots LIBÉRÉS → en_preparation (réservation)
   colis prêt, BL + CoA joints, remise transporteur, saisie n° suivi → expediee
        → décrément stock (MouvementStock sortie)
   suivi tracking → livree | incident | annulee
```
**Contrôle bloquant** : passage `en_preparation → expediee` impossible si un lot alloué n'est pas `libere` ou si stock disponible insuffisant.

### 3.3 Appro
`CommandeFournisseur : prevue → confirmee → (en_retard si date dépassée) → recue → [Réception §3.1]`. Croisement stock dispo + arrivées prévues − commandes = aide à anticiper la rupture (affichage, pas d'alerte bloquante).

---

## 4. Champs informatifs de qualité (aucun seuil, non bloquant)

> On ne calcule rien. Ce sont juste des **cases à remplir** pour que l'humain qui décide ait l'info sous les yeux (stockée dans `coa_infos`). Le PDF du CoA reste la référence. Liste à ajuster selon ce que tu veux voir apparaître.

| Catégorie | Champ (exemples) | Unité (info) |
|---|---|---|
| Micro | Salmonella, Listeria, E. coli, flore totale, entérobactéries, levures/moisissures | présence / UFC/g |
| Physico-chimique | Humidité, protéines, cendres, granulométrie | %, µm |
| Actifs | Collagène, acide hyaluronique, autres actifs membrane | %, mg/g |
| Contaminants | Plomb, cadmium, mercure, arsenic (+ pesticides pour Bio/Plein Air) | mg/kg |
| Organoleptique | Aspect, couleur, odeur | texte libre |
| Décision | **Statut posé par Qualité** + commentaire | enum + texte |

*(En v1, ces champs sont facultatifs : au minimum, on attache les PDF et on pose le statut. On enrichit la saisie plus tard si utile.)*

---

## 5. Matrice rôles / permissions (appliquée via RLS Supabase)

**C** créer · **L** lire · **M** modifier · **V** poser statut/libérer · **X** exécuter · — aucun.

| Fonction | Sales | Prod/Ops/Appro | Qualité | Équipe départ | Admin |
|---|---|---|---|---|---|
| Dashboard stock (dispo par gamme/origine) | L | L | L | L | L |
| Référentiel (gammes, origines, clients) | L | M | L | L | C/M |
| Réception lot + upload CoA fournisseur | — | C/M | L | — | C/M |
| **Poser le statut du lot** (libérer/bloquer/refuser) | L | L | **V** | L | V |
| CoA Circul'Egg (upload/attacher) | — | L | C/M | L | M |
| Commandes clients | C/L | L/M | L | L | M |
| Appro / arrivées / retards | L | **C/M** | L | — | M |
| Créer demande de départ | **C** | C | — | L | C |
| Exécuter/expédier départ | L | L | L | **X** | X |
| Allocation lot → départ/commande | — | M | L | M | M |
| Journal d'audit | — | L | L | — | L |
| Utilisateurs & droits | — | — | — | — | **C/M** |

Cumul de rôles autorisé.

---

## 6. Vues / écrans par rôle

- **Sales** — Dashboard stock **disponible** (par gamme×origine, badge Libéré) ; **Nouvelle demande de départ** (échantillon/commande) ; Mes demandes + tracking ; Commandes en cours.
- **Prod/Ops/Appro** — Réception (saisie lot + upload CoA) ; Tableau appro (arrivées, **retards**) ; Stock détaillé par lot/emplacement/mouvements ; aide anticipation rupture.
- **Qualité** — **File des lots à traiter** (`en_attente`/`en_cours`) ; Fiche lot (CoA fournisseur, upload CoA CE, champs infos facultatifs) ; boutons **Libérer / Bloquer / Refuser** + commentaire ; journal qualité.
- **Équipe départ** — **File des demandes à exécuter** (filtre échantillon/commande, priorité) ; Préparation (allocation lots **Libérés** uniquement) ; Expédition (transporteur, poids/colis, n° suivi) → décrément stock ; suivi.
- **Admin** — Utilisateurs/rôles, référentiels, transporteurs, seuils d'alerte stock, journal global.

---

## 7. Règles de gestion clés (v1)

1. **Disponibilité = statut Libéré**, posé à la main. Un lot non libéré n'est jamais vendable/expédiable.
2. **Aucun seuil calculé** : la conformité est jugée par un humain.
3. **Décrément stock au départ** (`expediee`), réservation possible à l'allocation.
4. **Traçabilité montante & descendante** : quel lot chez quel client ↔ quel fournisseur/origine (socle d'un futur rappel).
5. **Journal d'audit** sur libérations, mouvements, expéditions.
6. **Alertes de confort** (non bloquantes) : stock bas (seuil saisi), appro en retard, lots en attente trop anciens, DLUO approchant.

---

## 8. Hors périmètre MVP (proposé pour V2)

- Génération automatique du **CoA Circul'Egg charté** (PDF) et du **BL**.
- Intégration **API transporteur** (étiquettes Colissimo/Boxtal/Sendcloud).
- Saisie structurée des valeurs + éventuels **contrôles seuils** (si un jour souhaité).
- Module **rappel/retrait** de lot.
- Facturation, portail client, analytics avancés.

---

## 9. Validation

- [ ] Socle **Supabase + PWA Next.js** — validé
- [ ] Approche **sans seuils / statut manuel** — validé
- [ ] Réponses aux questions §1
- [ ] Modèle de données §2
- [ ] Workflows & statuts §3
- [ ] Champs informatifs §4 (ceux que tu veux réellement voir)
- [ ] Périmètre MVP vs V2 §8

**Dès validation → TEMPS 2 : plan d'exécution** (sprints, MVP/V2, roadmap, jalons, dépendances, qui fait quoi).
