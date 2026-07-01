-- ══════════════════════════════════════════════════════════════
-- Migration 0005 : mot de passe admin modifiable (table admin_credentials)
-- À appliquer une seule fois si la base existe déjà et n'a pas encore
-- cette table (elle est aussi incluse dans schema.sql pour les nouvelles
-- bases) :
--   wrangler d1 execute calendrier-americanfullfightingbonsdb \
--     --file=migrations/0005_admin_credentials.sql --remote
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS admin_credentials (
  id            INTEGER PRIMARY KEY CHECK (id = 1),
  password_hash TEXT    NOT NULL,
  password_salt TEXT    NOT NULL,
  iterations    INTEGER NOT NULL DEFAULT 100000,
  updated_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
