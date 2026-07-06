# Analyse des fichiers Excel actuels → intégration dans l'ERP

> Analyse des 3 fichiers Excel utilisés au quotidien, et plan pour les rapatrier dans l'ERP.
> 2026-07-06.

---

## 1. Ce que contient chaque fichier

### A. `Suivi_stock_membrane_Egglin.xlsx` — le classeur maître
Beaucoup d'onglets, c'est le cœur du suivi actuel :
- **MOUV** : journal des mouvements. Colonnes : *Date | Mois | N° mouvement | N° lot | Quantité (kg) | Fournisseur/Client | Commentaires*. ~260 mouvements. **Types de mouvement** (légende) : `1 Entrée sac`, `2 Expédition sac`, `3 Entrée échantillon`, `4 Sortie échantillon`, `5 Entrée NC`, `6 Régul stock`, `7 Échantillothèque`.
- **STOCK** : état du stock par lot. *N° de lot | Catégorie de produit | Date réception | Fournisseur | **Lot validé par la qualité (OUI/NON/NA)** | Quantité à réception | **Format sac 5 kg | Format échantillon 50 g | Échantillothèque | NC | Total***. En tête : agrégat par gamme (REGG, REGG+) avec *En stock / En cours de livraison / Stock bloqué / Stock prévisionnel*.
- **ANALYSE / ANALYSE Innain** : analyses libératoires (CoA) avec le panel complet + cibles par gamme.
- **COA, COA manuel, COA CHONDROVO, COA contaminants, CDC, BL+COMPO, BL petfood, BL VetInnov** : gabarits de CoA et de bons de livraison par client.

### B. `Suivi_commande_Egglin.xlsx` — les commandes FOURNISSEUR (appro)
⚠️ « Commande » = **commande passée à Egglin** (le fabricant, production en Turquie, réception à Janzé), pas les commandes clients.
- Colonnes : *Date commande | Date paiement | Bon de commande | Type de produit | Quantité (kg) | **État de la commande** | Date réception prévisionnelle | Date réelle réception | N° facture | Commentaires | N° proforma | Date acompte*.
- **Workflow appro en 6 étapes** : `Message WhatsApp (1)` → `Envoi facture proforma (2)` → `Preuve de paiement (3)` → `Lancement production (4) (1 mois délai)` → `Expédition Turquie (5)` → `Réception Janzé (6)`.
- Règles métier : **1 lot = 150 kg**, **60 j de délai libéré pour les commerciaux (45 j Turquie + analyse)**, réceptions **partielles** fréquentes (ex. « 160 kg reçus le 17/11 » sur 300).
- Onglet **Suivi facturation** : suivi compta (proforma, factures, montants) — hors périmètre MVP.

### C. `Pre_vision_volumes_membrane.xlsx` — projection de stock
- **Une feuille par gamme** : `REGG`, `REGG +`, `REGG++`, `REGG plein air`, `REGG bio`, `REGG INNAIN`, `CARBIO INNAIN`.
- Chaque feuille = série **journalière** : *Date | Quantité réceptionnée | Quantité expédiée | Client associé | Stock prévisionnel*.
- Sert à **anticiper les ruptures** jour par jour (entrées prévues − sorties prévues).

---

## 2. Réalité révélée vs modèle ERP actuel

| Sujet | Ce que disent les fichiers | Modèle ERP actuel | Écart / action |
|---|---|---|---|
| **Gammes / types produit** | Types réels par **granulométrie** : `Reggenerate 200-220µ` (standard), `+ 90-100µ`, `90% prot`, `Free range 200-220µ` (plein air), `< 150 µm`, `Bio`. + lignes `CARBIO`, `INNAIN`. | Gammes = Standard/Plus/Bio/Plein Air (4) | **Compléter la liste** + ajouter un attribut **granulométrie/catégorie** |
| **Fournisseur** | Suivi réel : **Egglin** (majoritaire, prod Turquie/Janzé), **Eggnovo**, **Lessonia** | Table Fournisseur retirée (« le pays suffit ») | **À rétablir** (léger) — ils le tracent |
| **Origine** | Turquie (Egglin/Janzé), Espagne (« Chondrovo espagnol »), France | FR/ES/TR ✅ | OK |
| **N° de lot** | = **n° fournisseur** (`EGGM130923`, `EGGM3002504`…), pas un code généré | n° CE auto `REG-…` | **Rendre le n° manuel** (n° fournisseur = identifiant) |
| **Stock par conditionnement** | Éclaté : **Sac 5 kg / Échantillon 50 g / Échantillothèque / NC** | 1 quantité par lot | **Ajouter le format** aux mouvements |
| **Types de mouvement** | 7 types (entrée/sortie × sac/échantillon, NC, régul, échantillothèque) | entrée/sortie/ajustement/transfert | **Étendre l'enum** |
| **Validation qualité** | `OUI / NON / NA` | `libéré / bloqué / refusé / en attente` ✅ | OK (NA = non applicable, ex. échantillon) |
| **CoA** | Panel complet (micro, matière sèche, granulo d50/d90/d99, protéines) + **cibles par gamme** | CoA = PDF + champs libres, sans seuil | Structure connue — reste **sans seuil** en v1 (cibles en info) |
| **Appro** | Workflow **6 états** + paiement + réceptions **partielles** + prévisionnel | Appro simple (V1.1, non fait) | **Reprendre le vrai workflow** en V1.1 |
| **Clients** | Nutrisun, Vetinnov, Sauvale, Lehning, Biose, NHP/IG pharma… (petfood/pharma/nutra) | créés dans l'outil | À **importer** |
| **Documents** | BL par type client + CoA chartés | upload en v1, génération en V2 | Confirme la V2 |

---

## 3. Décisions à trancher (pour caler l'ERP sur ta réalité)

1. **Liste officielle des gammes** — je remplace mes 4 par la vraie liste ? Proposition :
   Standard (200-220µ) · Plus (+90-100µ) · 90% prot · Plein air / Free range (200-220µ) · Fine (<150µm) · Bio. → **valider les libellés**.
2. **Granulométrie** — l'ajouter comme **attribut du lot** (ex. `200-220µm`) en plus de la gamme ? *(recommandé : oui)*
3. **Fournisseur** — le **rétablir** (Egglin / Eggnovo / Lessonia) ? *(recommandé : oui, léger)*
4. **N° de lot** — utiliser le **n° fournisseur** comme identifiant principal (saisi à la main), le `REG-…` auto devenant optionnel ? *(recommandé : oui)*
5. **Stock par format** — modéliser Sac / Échantillon / Échantillothèque / NC ? *(recommandé : oui — c'est structurant pour toi)*
6. **Appro** — reprendre le **workflow 6 états** + réceptions partielles + la vue **prévisionnel de stock** journalier ? *(V1.1)*
7. **CARBIO / INNAIN** — dans le périmètre de l'ERP, ou produits gérés à part pour l'instant ?
8. **Import de l'historique** — je reprends l'**état actuel** (lots + stock + clients + appro en cours) dans l'ERP au démarrage, pour ne pas partir d'une base vide ? *(recommandé : oui, one-shot)*

---

## 4. Plan pour rapatrier (proposé)

**Étape 1 — Aligner le modèle (petite migration `0004`)**
- Compléter les gammes ; ajouter `granulometrie` et `fournisseur` au lot ; n° de lot manuel ; étendre les types de mouvement ; ajouter le **format** au mouvement de stock (sac/échantillon/échantillothèque/NC).

**Étape 2 — Import de l'existant (script one-shot)**
- Clients, fournisseurs, lots + stock courant (depuis l'onglet STOCK), et éventuellement l'historique des mouvements (MOUV).

**Étape 3 — Appro & prévisionnel (V1.1)**
- Reprendre le workflow fournisseur 6 états + réceptions partielles ; vue prévisionnel de stock (stock + arrivées − commandes) façon fichier Prévision.

**Étape 4 — Documents (V2)**
- Génération des BL par type de client et du CoA charté.
