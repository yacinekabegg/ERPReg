# Mise en ligne — ERP Reggenerate

Guide pas-à-pas pour passer du code à une application utilisable en ligne.
Deux services, tous deux avec offre gratuite : **Supabase** (base + auth + fichiers) et **Vercel** (hébergement de l'app).

Durée : ~30–45 min. Aucune compétence technique requise au-delà du copier-coller.

---

## Étape 1 — Créer le projet Supabase

1. Aller sur **https://supabase.com** → *Start your project* → se connecter (GitHub ou email).
2. *New project* :
   - **Name** : `erp-reggenerate`
   - **Database Password** : générer et **garder ce mot de passe** de côté.
   - **Region** : `West EU (Paris)` ou `Frankfurt`.
3. Attendre ~2 min que le projet se provisionne.

## Étape 2 — Récupérer les clés API

Dans le projet : **Project Settings** (roue crantée) → **API**. Noter :
- **Project URL** → ce sera `NEXT_PUBLIC_SUPABASE_URL`
- **Project API keys → `anon` `public`** → ce sera `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Étape 3 — Créer la base (schéma + sécurité + données)

Ouvrir **SQL Editor** (menu de gauche) → *New query*. Copier-coller puis **Run**, **dans cet ordre**, le contenu de :

1. `supabase/migrations/0001_schema.sql`  → les tables
2. `supabase/migrations/0002_rls.sql`     → les permissions par rôle
3. `supabase/migrations/0003_storage_and_users.sql` → le stockage des CoA + auto-profil
4. `supabase/seed.sql`                    → gammes, origines, zones, Colissimo

> Chaque exécution doit afficher *Success*. (Des *NOTICE … skipping* sont normaux.)

À la fin, dans **Storage**, le bucket **`coa`** doit exister (privé).

## Étape 4 — Créer les utilisateurs et leurs rôles

1. Menu **Authentication → Users → Add user** (ou *Invite*). Créer un compte par personne
   (email + mot de passe). Un **profil applicatif est créé automatiquement**, sans rôle.
2. Se donner les droits d'admin : **SQL Editor**, exécuter (avec votre email) :
   ```sql
   update public.profils set roles = '{admin}' where email = 'vous@circulegg.fr';
   ```
3. Attribuer les rôles des autres (un ou plusieurs par personne) :
   ```sql
   update public.profils set roles = '{qualite}'      where email = 'qualite@circulegg.fr';
   update public.profils set roles = '{prod_ops}'     where email = 'prod@circulegg.fr';
   update public.profils set roles = '{sales}'        where email = 'sales@circulegg.fr';
   update public.profils set roles = '{depart}'       where email = 'expedition@circulegg.fr';
   -- cumul possible :
   update public.profils set roles = '{sales,depart}' where email = 'polyvalent@circulegg.fr';
   ```

Rôles : `sales`, `prod_ops`, `qualite`, `depart`, `admin`.

> **Astuce démarrage rapide** : dans **Authentication → Providers → Email**, vous pouvez
> désactiver *Confirm email* pour que les comptes soient utilisables immédiatement.

## Étape 5 — Déployer l'application sur Vercel

1. Aller sur **https://vercel.com** → se connecter avec **GitHub**.
2. *Add New… → Project* → importer le dépôt **`yacinekabegg/ERPReg`**.
3. Vercel détecte **Next.js** automatiquement (ne rien changer au build).
4. **Environment Variables** — ajouter les deux clés de l'étape 2 :
   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | *(votre Project URL)* |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | *(votre clé anon public)* |
5. **Deploy**. Au bout de ~1–2 min, Vercel donne une URL type `https://erp-reggenerate.vercel.app`.

## Étape 6 — Finaliser l'authentification

Dans Supabase : **Authentication → URL Configuration** → mettre **Site URL** =
l'URL Vercel (`https://…vercel.app`). Enregistrer.

## Étape 7 — Tester la boucle complète

1. Ouvrir l'URL Vercel → se connecter avec un compte.
2. **Prod/Ops** : *Réception* → enregistrer un lot (+ CoA fournisseur PDF).
3. **Qualité** : *Qualité* → ouvrir le lot → *Libérer*. → il devient vendable.
4. **Sales** : *Commandes* → créer un client ; *Départs* → créer une demande (échantillon 50 g).
5. **Équipe départ** : *Départs* → *Exécuter* → allouer le lot → *Expédier*. → le stock se décrémente.
6. **Dashboard** : le disponible par gamme × origine reflète tout ça.

---

## Notes

- **Branche déployée** : Vercel déploie la branche par défaut du dépôt. Pour l'instant le code
  est sur `claude/circuleggg-erp-spec-3wy662` — fusionnez-la dans la branche par défaut (ou
  configurez Vercel pour déployer cette branche) avant l'étape 5.
- **Coûts** : les offres gratuites Supabase + Vercel suffisent largement au démarrage.
- **Sécurité** : ne jamais publier le mot de passe de la base ni la clé `service_role`.
  Seule la clé `anon public` va dans Vercel (c'est prévu pour ça, protégée par la RLS).
