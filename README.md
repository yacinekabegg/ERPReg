# ERP Reggenerate® — Circul'Egg

ERP unique pour la gestion de **Reggenerate®** (membrane de coquille d'œuf, ingrédient B2B) :
stock & traçabilité lot, qualité (CoA), et expéditions.

- **Socle :** Supabase (Postgres) = source de vérité · **PWA Next.js** (App Router) · Vercel.
- **Approche v1 :** simple, **sans seuils** — le statut d'un lot est posé à la main par la Qualité.
- **Règle d'or :** un lot n'est vendable/expédiable que s'il est **`libéré`**.

## Documentation

| Doc | Contenu |
|---|---|
| [`docs/cahier-des-charges-erp-reggenerate.md`](docs/cahier-des-charges-erp-reggenerate.md) | Besoin, modèle de données, workflows, rôles, écrans |
| [`docs/plan-execution-erp-reggenerate.md`](docs/plan-execution-erp-reggenerate.md) | Sprints, MVP/V2, roadmap, RACI |
| [`supabase/README.md`](supabase/README.md) | Schéma, RLS, seed et mise en place de la base |

## Structure

```
supabase/            # Base de données (source de vérité)
  migrations/        #   0001 schéma · 0002 RLS
  seed.sql           #   gammes, origines, zones, transporteur
src/
  app/               # Pages (App Router)
    login/           #   authentification
    (app)/           #   shell protégé : dashboard, reception, qualite, departs, commandes, appro, admin
  components/        # Sidebar, PageHead, placeholders…
  lib/               # clients Supabase, auth, rôles
middleware.ts        # protection des routes + refresh session
public/              # manifest PWA, icône, service worker
```

## Démarrer en local

```bash
npm install
cp .env.example .env.local     # renseigner l'URL et l'ANON KEY Supabase
npm run dev                    # http://localhost:3000
```

> **Sans `.env.local`**, l'app tourne en **mode démo** (utilisateur fictif « tous rôles »)
> pour parcourir les écrans. L'authentification réelle s'active dès que Supabase est branché.

### Appliquer la base

Voir [`supabase/README.md`](supabase/README.md). En résumé (CLI Supabase liée à un projet) :

```bash
supabase db push        # migrations
# puis exécuter seed.sql via le SQL Editor ou `supabase db reset` en local
```

## Rôles

`sales` · `prod_ops` · `qualite` · `depart` · `admin` — cumul autorisé.
La navigation et les permissions (RLS Postgres) s'adaptent au(x) rôle(s) de l'utilisateur.

## État d'avancement

- **Sprint 0 (socle)** ✅ : schéma + RLS + seed (validés sur Postgres), PWA + auth + navigation par rôle (build OK).
- **Sprint 1** ⏭️ : Réception & stock (formulaire lot + upload CoA, stock temps réel).
- Voir le plan pour la suite.
