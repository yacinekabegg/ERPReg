# Cahier des charges — ERP Reggenerate® (Circul'Egg)

> **TEMPS 1 — Définition du besoin.** Document soumis à validation avant tout plan d'exécution (TEMPS 2).
> Version 0.1 — 2026-07-04

---

## 0. Synthèse & parti-pris

**Recommandation d'architecture : un seul outil, une seule base de vérité.**
Ne pas créer un ERP séparé. Étendre la base **Airtable existante** (source de vérité) avec un **module « Reggenerate »** (nouvelles tables liées au référentiel commun Clients/Fournisseurs) et exposer les usages terrain via la **même PWA Next.js / Vercel**.

Justification :

| Critère | Mono-outil (recommandé) | Deux ERP séparés |
|---|---|---|
| Fiabilité de la donnée | Une seule vérité, pas de synchro | Risque de désync client/stock |
| Vitesse de déploiement | Réutilise auth, référentiel, hébergement | Tout à refaire |
| Coût d'exploitation | 1 base à maintenir | 2 bases + passerelle |
| Simplicité terrain | 1 login, 1 app | 2 outils = friction |
| Traçabilité réglementaire | Chaîne complète dans un socle | Ruptures de piste d'audit |

**Découpage logique en 3 modules fonctionnels au sein d'une base unique** : (1) Stock & traçabilité lot, (2) Qualité/CoA, (3) Départs/expéditions — reliés par l'entité pivot **Lot**.

**Règle d'or du système** : *le statut qualité d'un lot gouverne sa disponibilité commerciale.* Un lot n'est **vendable/expédiable que s'il est `Libéré`**. Cette règle est non-négociable et pilotée par une seule donnée (le statut lot).

---

## 1. Questions à trancher (zones d'ombre)

À valider par toi avant TEMPS 2. Regroupées par thème ; mes hypothèses par défaut sont indiquées `→ défaut proposé`.

### 1.1 Référentiel & numérotation
1. **N° de lot Circul'Egg** : format souhaité ? `→ défaut : REG-{GAMME}-{ORIGINE}-{AAMMJJ}-{séquence}` (ex. `REG-PLUS-ES-260704-01`).
2. Un lot Circul'Egg = **un lot fournisseur unique** ou peut-on **regrouper/scinder** plusieurs lots fournisseurs en un lot Circul'Egg ? `→ défaut : 1 lot fournisseur = 1 lot CE (pas de mélange)`.
3. Faut-il gérer des **sous-lots / conditionnements** (sacs, big-bags, fûts) sous le lot, ou le lot est-il la maille la plus fine ? `→ défaut : maille = lot`.
4. Les **gammes** ont-elles des specs qualité différentes (seuils CoA distincts par gamme) ? `→ hypothèse : oui, seuils par gamme`.

### 1.2 Paramètres CoA (à confirmer / compléter — voir §4 pour la liste détaillée)
5. Liste **exacte** des paramètres microbiologiques exigés et leurs **seuils** (limites d'acceptation).
6. **Actifs** à doser : collagène, acide hyaluronique, glucosamine, chondroïtine, élastine, kératine, protéines totales ? Lesquels sont **libératoires** (bloquants) vs **informatifs** ?
7. **Unités** par paramètre (%, UFC/g, mg/kg, ppm, µm…) et **méthodes** de référence (Kjeldahl, ICP-MS, PCR Salmonella…).
8. **Métaux lourds / contaminants** : plomb, cadmium, mercure, arsenic — seuils ? Pesticides exigés pour **Bio / Plein Air** ?
9. **DLUO/DDM** : durée par défaut à la fabrication ? `→ défaut : 24 mois`. Y a-t-il des lots sans DLUO ?
10. Le **CoA Circul'Egg** reprend-il les résultats fournisseur + contre-analyse, ou uniquement la contre-analyse CE ? `→ défaut : CoA CE = contre-analyse CE, avec référence au lot & CoA fournisseur`.

### 1.3 Stock & emplacements
11. **Emplacements physiques** : combien de sites / zones (quarantaine, zone libérée, zone bloquée, expédition) ? `→ défaut : 1 site, 4 zones logiques`.
12. Un lot **non libéré** doit-il être physiquement en **zone quarantaine** (contrainte tracée) ou seulement bloqué logiquement ? `→ défaut : zone quarantaine logique + physique`.
13. **Unité de stock** : kg ? g ? `→ défaut : kg, avec affichage g pour échantillons`.
14. **Seuils d'alerte stock bas** : par gamme, par gamme×origine, ou global ? Valeurs ? `→ défaut : seuil par gamme×origine, paramétrable`.

### 1.4 Commandes & appro
15. Les **commandes clients** existent-elles déjà dans l'ERP actuel (à réutiliser) ou à créer ici ? 
16. Gère-t-on une **réservation de stock** à la prise de commande, ou l'allocation se fait-elle seulement au départ ? `→ défaut : réservation à la commande, décrément au départ`.
17. **Arrivées prévues** : saisies manuellement, ou via commande fournisseur formelle (avec accusé) ? `→ défaut : commande fournisseur avec date prévue + suivi retard`.

### 1.5 Départs / expéditions
18. **Transporteurs** utilisés : Colissimo seul, ou aussi Chronopost / DHL / transporteur palette ? Multi-transporteur dès le MVP ? `→ défaut : Colissimo au MVP, modèle extensible`.
19. **Génération d'étiquette** : intégration API transporteur (Colissimo/Boxtal/Sendcloud) ou saisie manuelle du n° de suivi ? `→ défaut MVP : saisie manuelle du tracking, API en V2`.
20. **Échantillons** : quantité type (50 g ?), gratuit/facturé, plafond par client, prélevés sur quel lot (dernier libéré ? lot dédié échantillon ?) ? `→ défaut : prélevé sur lot libéré, quantité libre, tracé`.
21. Un départ peut-il **mixer plusieurs lots / gammes** dans un même colis ? `→ défaut : oui, multi-lignes`.
22. Faut-il un **document d'accompagnement** (bon de livraison, packing list, CoA joint au colis) généré automatiquement ? `→ défaut : BL + CoA CE PDF joints`.

### 1.6 Rôles, droits, conformité
23. Nombre d'utilisateurs et cumul de rôles (une personne = plusieurs rôles) ? `→ hypothèse : oui, cumul possible`.
24. Besoin d'une **piste d'audit** (qui a libéré/modifié quoi, quand) pour la conformité agro ? `→ défaut : oui, journal immuable sur actions qualité & stock`.
25. Faut-il gérer les **non-conformités / rappels** (retrait d'un lot déjà expédié) dès le MVP ? `→ défaut : traçabilité descendante prête, module rappel en V2`.

---

## 2. Modèle de données

Entité pivot : **Lot**. Le référentiel Clients/Fournisseurs est **partagé** avec l'ERP existant.

### 2.1 Vue d'ensemble (relations)

```
Gamme ─┐
Origine─┼─< Lot >─── CoA_Fournisseur
Fournisseur┘   │  └── CoA_CircuEgg ──< ResultatAnalyse >── ParametreAnalyse
               │
               ├──< MouvementStock >── Emplacement
               │
               └──< LigneDepart >── DemandeDepart ──< Expedition >── Transporteur
                                          │
Client ──< AdresseLivraison >─────────────┘
Client ──< CommandeClient >──< LigneCommande >
Fournisseur ──< CommandeFournisseur >──< ArrivéePrévue >
Utilisateur ──< Role
```

### 2.2 Tables & attributs

#### Référentiel

**Gamme**
| Attribut | Type | Notes |
|---|---|---|
| id | PK | |
| nom | texte | Standard / Plus / Bio / Plein Air |
| code | texte | STD / PLUS / BIO / PA |
| specs_qualite | lien → JeuDeSpecs | seuils CoA par gamme |
| actif | booléen | extensible |

**Origine**
| id | PK |
| pays | texte | France / Espagne / Turquie |
| code | texte | FR / ES / TR |
| actif | booléen |

**Fournisseur** *(partagé ERP)*
| id | PK |
| raison_sociale, siret, contact, email, tel, pays | |
| origines_fournies | lien → Origine | |

**Client** *(partagé ERP)*
| id | PK |
| raison_sociale, siret, secteur | secteur = nutraceutique/cosmétique/petfood |
| contact_principal, email, tel | |

**AdresseLivraison**
| id | PK |
| client | lien → Client |
| libellé, ligne1, ligne2, cp, ville, pays | |
| par_défaut | booléen |

#### Stock & lots

**Lot** *(pivot)*
| Attribut | Type | Notes |
|---|---|---|
| id | PK | |
| numero_lot_CE | texte unique | numérotation Circul'Egg |
| numero_lot_fournisseur | texte | |
| gamme | lien → Gamme | |
| origine | lien → Origine | |
| fournisseur | lien → Fournisseur | |
| date_reception | date | |
| dluo | date | DDM |
| quantite_recue | nombre (kg) | |
| quantite_stock | rollup mouvements | stock physique courant |
| quantite_reservee | rollup lignes commande | |
| quantite_disponible | formule | stock − réservé, **si statut = Libéré, sinon 0** |
| statut_qualite | select | voir §3.1 |
| emplacement | lien → Emplacement | |
| coa_fournisseur | lien → CoA_Fournisseur | |
| coa_circuegg | lien → CoA_CircuEgg | |
| commentaire | texte long | |

**Emplacement**
| id | PK |
| site, zone | zone : Quarantaine / Libéré / Bloqué / Expédition |
| type | logique/physique |

**MouvementStock** *(journal des flux, immuable)*
| id | PK |
| lot | lien → Lot |
| type | select : Entrée / Sortie / Ajustement / Transfert |
| quantite | nombre (± ) |
| date, utilisateur | |
| reference | lien → Expedition / Reception / Ajustement |
| motif | texte |

#### Qualité

**ParametreAnalyse** *(référentiel des tests)*
| id | PK |
| nom | ex. Salmonella, Humidité, Protéines |
| categorie | Micro / Physico-chimique / Actif / Contaminant / Organoleptique |
| unite | UFC/g, %, mg/kg, µm… |
| methode | méthode de référence |
| libératoire | booléen | bloque la libération si hors seuil |

**JeuDeSpecs** *(seuils par gamme)*
| id | PK |
| gamme | lien → Gamme |
| parametre | lien → ParametreAnalyse |
| min, max, cible | seuils d'acceptation |

**CoA_Fournisseur**
| id | PK |
| lot | lien → Lot |
| fichier | pièce jointe (PDF fournisseur) |
| date_reception, reference_fournisseur | |
| conforme | booléen (contrôle documentaire) |

**CoA_CircuEgg**
| id | PK |
| lot | lien → Lot |
| numero_coa | texte unique |
| date_analyse, date_edition, laborantin | |
| statut | Brouillon / Émis |
| pdf_genere | pièce jointe (document charté) |
| conclusion | Conforme / Non conforme |

**ResultatAnalyse**
| id | PK |
| coa_circuegg | lien → CoA_CircuEgg |
| parametre | lien → ParametreAnalyse |
| valeur_mesuree | nombre/texte |
| conforme | formule vs JeuDeSpecs |

#### Commandes & appro

**CommandeClient**
| id | PK |
| numero, client, adresse_livraison, date_commande, date_souhaitee | |
| statut | Brouillon / Confirmée / En préparation / Expédiée / Clôturée / Annulée |

**LigneCommande**
| id | PK |
| commande | lien → CommandeClient |
| gamme, origine_souhaitee, quantite | origine facultative |
| lot_alloué | lien → Lot (à l'allocation) |

**CommandeFournisseur / Appro**
| id | PK |
| numero, fournisseur, gamme, origine, quantite_attendue | |
| date_commande, date_prevue, date_reelle | |
| statut | Prévue / Confirmée / En retard / Reçue partielle / Reçue / Annulée |
| retard_jours | formule (aujourd'hui − date_prevue) si non reçue |

#### Départs / expéditions

**DemandeDepart**
| Attribut | Type | Notes |
|---|---|---|
| id | PK | |
| numero | texte | |
| type | select : Échantillon / Commande | |
| demandeur | lien → Utilisateur | (sales) |
| client | lien → Client | |
| adresse_livraison | lien → AdresseLivraison | |
| commande_liee | lien → CommandeClient | si type = Commande |
| date_demande, date_souhaitee | | |
| statut | select | voir §3.2 |
| priorite | select | Normale / Urgente |
| commentaire | texte long | |

**LigneDepart**
| id | PK |
| demande | lien → DemandeDepart |
| gamme, origine_souhaitee, quantite | |
| lot_alloué | lien → Lot | doit être `Libéré` |

**Expedition**
| id | PK |
| demande | lien → DemandeDepart |
| transporteur | lien → Transporteur |
| numero_suivi | texte |
| date_expedition, poids, nb_colis | |
| bl_pdf, coa_joint | pièces jointes |
| statut | Préparée / Remise transporteur / En transit / Livrée / Incident |

**Transporteur**
| id, nom, mode (colis/palette), url_tracking | |

#### Sécurité

**Utilisateur** / **Role**
| Utilisateur | id, nom, email, roles[] |
| Role | Sales / Prod-Ops-Appro / Qualité / Départ / Admin |

---

## 3. Workflows & statuts

### 3.1 Réception → Qualité → Libération (cycle de vie du LOT)

```
[Réception]
   Entrée lot + CoA fournisseur → statut = En attente d'analyse (zone Quarantaine)
        │
        ▼
[Qualité] contrôle CoA fournisseur + prélèvement
   → statut = En cours d'analyse
        │
        ├─ résultats conformes aux specs de la gamme ──► édition CoA Circul'Egg
        │                                               → statut = Libéré (zone Libéré)  ✅ vendable
        │
        ├─ résultat hors seuil libératoire ───────────► statut = Bloqué (zone Bloqué)   ⛔ non vendable
        │                                               (dérogation possible → Libéré sur décision Qualité, tracée)
        │
        └─ non-conformité majeure ───────────────────► statut = Refusé                  ⛔ retour/destruction
```

**Statuts lot** : `En attente d'analyse` → `En cours d'analyse` → `Libéré` | `Bloqué` | `Refusé`.
**Invariant** : `quantite_disponible > 0` **⟺** `statut = Libéré`. Toute allocation de départ/commande vérifie ce statut.

### 3.2 Demande de départ → Expédition

```
[Sales] crée DemandeDepart (type, client, adresse, lignes gamme/qté)
   → statut = Demandée
        │
        ▼
[Équipe départ] prend en charge, alloue les lots (Libérés uniquement)
   → statut = En préparation   (réservation stock)
        │
        ▼
   colis prêt, BL + CoA générés, remise transporteur, saisie n° suivi
   → statut = Expédiée   → décrément stock (MouvementStock Sortie)
        │
        ▼
   suivi tracking
   → statut = Livrée   |   Incident (litige transport)
```

Statuts départ : `Demandée` → `En préparation` → `Expédiée` → `Livrée` | `Incident` | `Annulée`.
**Contrôle bloquant** : impossible de passer `En préparation` → `Expédiée` si un lot alloué n'est pas `Libéré` ou si le stock disponible est insuffisant.

### 3.3 Appro (anticipation rupture)

```
CommandeFournisseur : Prévue → Confirmée → (En retard si date dépassée) → Reçue → [Réception §3.1]
```
Le croisement **stock disponible + arrivées prévues − commandes/réservations** alimente l'alerte de rupture par gamme×origine.

---

## 4. Paramètres CoA — proposition à valider

> Membrane de coquille d'œuf (Reggenerate®). Colonne **Libératoire** = bloque la libération si hors seuil. Seuils à **confirmer/renseigner** par toi (colonnes min/max laissées ouvertes).

| Catégorie | Paramètre | Unité | Méthode (réf.) | Libératoire | Seuil (à confirmer) |
|---|---|---|---|---|---|
| Micro | Flore mésophile aérobie totale | UFC/g | ISO 4833 | ✅ | max ? |
| Micro | Entérobactéries | UFC/g | ISO 21528 | ✅ | max ? |
| Micro | E. coli | UFC/g | ISO 16649 | ✅ | max ? |
| Micro | Salmonella | /25 g | ISO 6579 (PCR) | ✅ | Absence |
| Micro | Staph. aureus | UFC/g | ISO 6888 | ✅ | max ? |
| Micro | Listeria monocytogenes | /25 g | ISO 11290 | ✅ | Absence |
| Micro | Levures & moisissures | UFC/g | ISO 21527 | ✅ | max ? |
| Physico-chimique | Humidité | % | gravimétrie | ✅ | max ? |
| Physico-chimique | Protéines totales | % | Kjeldahl (N×6,25) | ✅ | min ? |
| Physico-chimique | Cendres | % | calcination | ⬜ | — |
| Physico-chimique | Granulométrie | µm / mesh | tamisage/laser | ⬜ | plage ? |
| Actif | Collagène | % | hydroxyproline | ✅ | min ? |
| Actif | Acide hyaluronique | mg/g | HPLC/ELISA | ⬜ | min ? |
| Actif | Glucosamine | mg/g | HPLC | ⬜ | — |
| Actif | Chondroïtine sulfate | mg/g | HPLC | ⬜ | — |
| Actif | Élastine / Kératine | mg/g | dosage spécifique | ⬜ | — |
| Contaminant | Plomb (Pb) | mg/kg | ICP-MS | ✅ | max ? |
| Contaminant | Cadmium (Cd) | mg/kg | ICP-MS | ✅ | max ? |
| Contaminant | Mercure (Hg) | mg/kg | ICP-MS | ✅ | max ? |
| Contaminant | Arsenic (As) | mg/kg | ICP-MS | ✅ | max ? |
| Contaminant | Pesticides (Bio/Plein Air) | mg/kg | GC-MS/LC-MS | ✅ (Bio/PA) | selon règlement Bio |
| Organoleptique | Aspect / Couleur / Odeur | — | visuel | ⬜ | conforme référence |

---

## 5. Matrice rôles / permissions

Légende : **C** créer · **L** lire · **M** modifier · **V** valider/libérer · **X** exécuter · — aucun accès.

| Fonction | Sales | Prod/Ops/Appro | Qualité | Équipe départ | Admin |
|---|---|---|---|---|---|
| Dashboard stock (dispo par gamme/origine) | L | L | L | L | L |
| Référentiel (gammes, origines, clients, fournisseurs) | L | M | L | L | C/M |
| Réception lot | — | C/M | L | — | C/M |
| Statut/libération lot | L | L | **V** | L | V |
| CoA fournisseur (import, contrôle) | — | L | C/M | L | M |
| CoA Circul'Egg (édition, PDF) | — | — | **C/M** | L | M |
| Commandes clients | C/L | L/M | L | L | M |
| Appro / arrivées prévues / retards | L | **C/M** | L | — | M |
| Créer demande de départ | **C** | C | — | L | C |
| Exécuter/expédier départ | L | L | L | **X** | X |
| Allocation lot → départ/commande | — | M | L | M | M |
| Journal d'audit | — | L | L | — | L |
| Gestion utilisateurs & droits | — | — | — | — | **C/M** |

Cumul de rôles autorisé (une personne peut être Sales + Départ, etc.).

---

## 6. Vues / écrans par rôle

### 6.1 Sales
- **Dashboard stock** : disponible à la vente par **gamme × origine** (badge Libéré vs bloqué), niveaux vs seuils, arrivées prévues.
- **Nouvelle demande de départ** : formulaire (type Échantillon/Commande, client, adresse, lignes gamme/qté), envoi à l'équipe départ.
- **Mes demandes** : suivi statut + tracking.
- Liste **commandes clients** en cours.

### 6.2 Prod / Ops / Appro
- **Réception** : saisie lot + upload CoA fournisseur → crée le lot en Quarantaine.
- **Tableau appro** : arrivées prévues, dates, **retards** (rouge), reste à recevoir.
- **Stock détaillé** : par lot, emplacement, mouvements.
- **Anticipation rupture** : stock dispo + appro − commandes par gamme×origine.

### 6.3 Qualité
- **File de validation** : lots `En attente`/`En cours`, triés par ancienneté.
- **Fiche lot qualité** : CoA fournisseur, saisie des **résultats d'analyse** vs specs de la gamme (conforme/hors seuil auto-calculé).
- **Édition CoA Circul'Egg** : génération du PDF charté, puis **Libérer / Bloquer / Refuser**.
- **Journal qualité** (audit) : qui a libéré quoi, quand, dérogations.

### 6.4 Équipe départ (échantillon / commande)
- **File des demandes à exécuter** : filtrable Échantillon/Commande, priorité.
- **Préparation** : allocation des lots (seuls les `Libérés` proposés), contrôle quantité.
- **Expédition** : choix transporteur, poids/colis, génération BL + CoA, saisie n° suivi → décrément stock.
- **Suivi** : colis expédiés, tracking, incidents.

### 6.5 Admin
- Gestion utilisateurs/rôles, référentiels, paramètres (seuils, specs, transporteurs), journal d'audit global.

---

## 7. Règles de gestion clés (récap)

1. **Disponibilité = statut Libéré.** Un lot non libéré n'apparaît jamais comme vendable/expédiable.
2. **Décrément stock au départ** (passage `Expédiée`), pas à la demande. Réservation possible à l'allocation.
3. **Traçabilité descendante & ascendante** : de « quel lot chez quel client » jusqu'à « quel fournisseur/origine pour ce lot » (base d'un futur rappel).
4. **Journal immuable** sur libérations, mouvements de stock, expéditions.
5. **Seuils qualité par gamme** ; un paramètre libératoire hors seuil bloque la libération (dérogation Qualité tracée).
6. **Alertes** : stock bas (seuil gamme×origine), appro en retard, lots en attente d'analyse trop anciens, DLUO approchant.

---

## 8. Ce qui reste hors périmètre MVP (proposé pour V2)

- Intégration API transporteur (étiquettes automatiques).
- Module rappel/retrait de lot formalisé.
- Facturation / comptabilité.
- Portail client (suivi commande côté client).
- Analytics avancés (rendement matière, taux de libération, délais).

---

## 9. Validation

**Merci de valider / corriger :**
- [ ] Architecture mono-outil (extension Airtable + PWA) — OK ?
- [ ] Réponses aux questions §1
- [ ] Liste & seuils des paramètres CoA §4
- [ ] Modèle de données §2
- [ ] Workflows & statuts §3
- [ ] Matrice rôles §5
- [ ] Périmètre MVP vs V2 §8

**Dès validation → TEMPS 2 : plan d'exécution** (sprints, MVP/V2, roadmap, jalons, dépendances, RACI).
