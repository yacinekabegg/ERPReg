-- =============================================================================
-- ERP Reggenerate — Seed initial (données de démarrage)
-- Gammes connues + origines FR/ES/TR + zones de stock + transporteur MVP.
-- Pas de clients (créés dans l'outil), pas de fournisseurs (pays suffit).
-- =============================================================================

insert into public.gammes (nom, code) values
  ('Reggenerate® Standard',   'STD'),
  ('Reggenerate® Plus',       'PLUS'),
  ('Reggenerate® Bio',        'BIO'),
  ('Reggenerate® Plein Air',  'PA')
on conflict (code) do nothing;

insert into public.origines (pays, code) values
  ('France',  'FR'),
  ('Espagne', 'ES'),
  ('Turquie', 'TR')
on conflict (code) do nothing;

insert into public.emplacements (site, zone, libelle) values
  ('Principal', 'quarantaine', 'Zone quarantaine (lots en attente qualité)'),
  ('Principal', 'libere',      'Zone stock libéré (vendable)'),
  ('Principal', 'bloque',      'Zone lots bloqués / refusés'),
  ('Principal', 'expedition',  'Zone préparation expédition');

insert into public.transporteurs (nom, mode, url_tracking) values
  ('Colissimo', 'colis', 'https://www.laposte.fr/outils/suivre-vos-envois?code=');

-- -----------------------------------------------------------------------------
-- RÔLES (définition générique, sans prénom) — pour information.
-- Les utilisateurs sont créés via Supabase Auth, puis on renseigne
-- public.profils.roles avec un ou plusieurs de ces rôles :
--   'sales'    → Dashboard stock + création des demandes de départ + commandes clients
--   'prod_ops' → Réception des lots, gestion stock, appro / arrivées prévues
--   'qualite'  → Validation des lots (upload CoA, Libérer / Bloquer / Refuser)
--   'depart'   → Exécution des demandes : préparation, expédition, tracking
--   'admin'    → Administration : utilisateurs, référentiels, tous droits
-- Exemple d'affectation après création d'un utilisateur :
--   update public.profils set roles = '{qualite}'         where email = 'qualite@circulegg.fr';
--   update public.profils set roles = '{sales,depart}'    where email = 'ops@circulegg.fr';
-- -----------------------------------------------------------------------------
