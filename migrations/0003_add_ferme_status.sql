-- ══════════════════════════════════════════════════════════════
--  MIGRATION — Ajout du statut 'ferme' sur la table events
--  Appliquez avec :
--    wrangler d1 execute calendrier-americanfullfightingbonsdb \
--      --file=migration_add_ferme_status.sql --remote
-- ══════════════════════════════════════════════════════════════

-- SQLite ne permet pas ALTER COLUMN CHECK.
-- On recrée la table avec la nouvelle contrainte, on migre les
-- données puis on supprime l'ancienne.

PRAGMA foreign_keys = OFF;

-- 1. Nouvelle table avec CHECK étendu
CREATE TABLE IF NOT EXISTS events_new (
  id            TEXT    PRIMARY KEY,
  title         TEXT    NOT NULL,
  sub           TEXT    NOT NULL,
  type          TEXT    NOT NULL
                CHECK (type IN ('stage','competition','seminaire','grade')),
  status        TEXT    NOT NULL DEFAULT 'disponible'
                CHECK (status IN ('disponible','complet','ferme')),   -- ← 'ferme' ajouté
  date_start    TEXT    NOT NULL,
  date_end      TEXT,
  time_start    TEXT,
  time_end      TEXT,
  lieu          TEXT    NOT NULL,
  price         REAL    NOT NULL DEFAULT 0,
  spots_total   INTEGER NOT NULL DEFAULT 0,
  spots_left    INTEGER NOT NULL DEFAULT 0,
  featured      INTEGER NOT NULL DEFAULT 0,
  is_grade      INTEGER NOT NULL DEFAULT 0,
  helloasso     INTEGER NOT NULL DEFAULT 0,
  helloasso_url TEXT,
  created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  updated_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

-- 2. Copie des données
INSERT INTO events_new SELECT * FROM events;

-- 3. Suppression de l'ancienne table et des triggers associés
DROP TRIGGER IF EXISTS trg_spots_decrement;
DROP TRIGGER IF EXISTS trg_spots_increment;
DROP TRIGGER IF EXISTS trg_events_updated;
DROP TABLE events;

-- 4. Renommage
ALTER TABLE events_new RENAME TO events;

-- 5. Recréation des index
CREATE INDEX IF NOT EXISTS idx_events_type   ON events(type);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_date   ON events(date_start);

-- 6. Recréation des triggers (identiques à schema.sql)
CREATE TRIGGER IF NOT EXISTS trg_spots_decrement
  AFTER INSERT ON registrations
  WHEN NEW.paiement_status IN ('paye','gratuit')
BEGIN
  UPDATE events
  SET    spots_left = MAX(0, spots_left - 1),
         status     = CASE WHEN spots_left - 1 <= 0 THEN 'complet' ELSE status END,
         updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now')
  WHERE  id = NEW.event_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_spots_increment
  AFTER UPDATE OF paiement_status ON registrations
  WHEN NEW.paiement_status = 'annule'
    AND OLD.paiement_status IN ('paye','gratuit')
BEGIN
  UPDATE events
  SET    spots_left = MIN(spots_total, spots_left + 1),
         status     = 'disponible',
         updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now')
  WHERE  id = NEW.event_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_events_updated
  AFTER UPDATE ON events
BEGIN
  UPDATE events SET updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now')
  WHERE id = NEW.id;
END;

PRAGMA foreign_keys = ON;
