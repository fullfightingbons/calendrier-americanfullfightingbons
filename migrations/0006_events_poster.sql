-- ══════════════════════════════════════════════════════════════
-- Migration 0006 : affiche d'événement (colonne poster_key)
-- IMPORTANT : contrairement à schema.sql, ce fichier n'est PAS
-- réexécuté automatiquement à chaque déploiement (deploy.yml n'applique
-- que schema.sql). ALTER TABLE ADD COLUMN n'est pas idempotent en SQLite
-- (erreur "duplicate column" si on le relance) — d'où ce fichier à part,
-- à appliquer manuellement UNE SEULE FOIS :
--
--   wrangler d1 execute calendrier-americanfullfightingbonsdb \
--     --file=migrations/0006_events_poster.sql --remote
--
-- (schema.sql a aussi été mis à jour avec cette colonne pour que les
-- nouvelles bases créées from scratch l'aient dès le départ.)
-- ══════════════════════════════════════════════════════════════

ALTER TABLE events ADD COLUMN poster_key TEXT;
