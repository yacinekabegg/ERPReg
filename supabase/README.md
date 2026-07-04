# Base Supabase — ERP Reggenerate (Sprint 0)

Socle de données de l'ERP. **Source de vérité = Postgres (Supabase).**
Approche v1 : simple, **sans seuils** — le statut d'un lot est posé à la main par la Qualité.

## Contenu

| Fichier | Rôle |
|---|---|
| `migrations/0001_schema.sql` | Tables, types énumérés, génération du n° de lot, vue stock, triggers |
| `migrations/0002_rls.sql` | Row Level Security : permissions des 5 rôles |
| `migrations/0003_storage_and_users.sql` | Bucket Storage `coa` + création auto du profil à l'inscription |
| `seed.sql` | Données de démarrage : gammes, origines (FR/ES/TR), zones de stock, transporteur |

> Pour la mise en ligne complète (Supabase + Vercel), voir [`../docs/mise-en-ligne.md`](../docs/mise-en-ligne.md).

## Les 5 rôles (génériques, sans prénom)

| Rôle (`user_role`) | Fait quoi |
|---|---|
| `sales` | Dashboard stock, crée les demandes de départ & commandes clients |
| `prod_ops` | Réception des lots, stock, appro / arrivées prévues |
| `qualite` | Upload CoA, **Libérer / Bloquer / Refuser** un lot |
| `depart` | Prépare, expédie, saisit le tracking |
| `admin` | Utilisateurs, référentiels, tous droits |

Cumul autorisé : un utilisateur peut porter plusieurs rôles (`roles user_role[]`).

## Règle d'or (seule automatisation)

`disponible_vente = (statut = 'libere')`. Un lot n'est vendable/expédiable **que** s'il a été passé
en `libere` par la Qualité. Voir la vue `v_stock_lot` (stock physique, réservé, disponible).

## N° de lot

Généré automatiquement à l'insertion : `REG-{GAMME}-{ORIGINE}-{AAMMJJ}-{seq}`
(ex. `REG-PLUS-ES-260704-01`).

## Appliquer

Avec la CLI Supabase (recommandé) :

```bash
supabase db reset          # applique migrations + seed sur la base locale
# ou, sur un projet distant déjà lié :
supabase db push           # applique les migrations
```

Sans CLI : exécuter dans l'ordre, via le SQL Editor du dashboard Supabase :
`0001_schema.sql` → `0002_rls.sql` → `0003_storage_and_users.sql` → `seed.sql`.

## À faire ensuite (hors Sprint 0)

- Créer le **bucket Storage** `coa` (privé) pour les PDF de CoA / BL.
- Créer les utilisateurs via **Supabase Auth**, puis renseigner `public.profils.roles`
  (exemples dans `seed.sql`).
- Brancher la PWA Next.js (Sprint 1+).
