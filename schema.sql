-- ══════════════════════════════════════════════════════════════
--  AMERICAN FULL FIGHTING — BONS-EN-CHABLAIS
--  Schéma Cloudflare D1 (SQLite)
--  Créez la base avec : wrangler d1 create aff-bons
--  Appliquez le schéma : wrangler d1 execute aff-bons --file=schema.sql
-- ══════════════════════════════════════════════════════════════

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ──────────────────────────────────────────────────────────────
-- TABLE : events
-- Correspond à l'objet adminEvents[] du panneau admin HTML
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS events (
  id            TEXT    PRIMARY KEY,           -- ex: "evt1", "stage1", "grade1"
  title         TEXT    NOT NULL,              -- "Stage Été — Frappe & Déplacement"
  sub           TEXT    NOT NULL,              -- "Tous niveaux · 2 jours intensifs"
  type          TEXT    NOT NULL               -- stage | competition | seminaire | grade
                CHECK (type IN ('stage','competition','seminaire','grade')),
  status        TEXT    NOT NULL DEFAULT 'disponible'
                CHECK (status IN ('disponible','complet')),
  date_start    TEXT    NOT NULL,              -- ISO-8601 YYYY-MM-DD
  date_end      TEXT,                          -- NULL si événement 1 jour
  time_start    TEXT,                          -- HH:MM ou NULL
  time_end      TEXT,
  lieu          TEXT    NOT NULL,
  price         REAL    NOT NULL DEFAULT 0,    -- 0 = gratuit
  spots_total   INTEGER NOT NULL DEFAULT 0,    -- places totales à la création
  spots_left    INTEGER NOT NULL DEFAULT 0,    -- places restantes (décrémentées à chaque inscription)
  featured      INTEGER NOT NULL DEFAULT 0,    -- 0 | 1  (booléen SQLite)
  is_grade      INTEGER NOT NULL DEFAULT 0,    -- 0 | 1
  helloasso     INTEGER NOT NULL DEFAULT 0,    -- 0 | 1
  helloasso_url TEXT,
  created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  updated_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_events_type   ON events(type);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_date   ON events(date_start);

-- ──────────────────────────────────────────────────────────────
-- TABLE : registrations
-- Une ligne = une inscription à un événement
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS registrations (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id        TEXT    NOT NULL REFERENCES events(id) ON DELETE CASCADE,

  -- ── Étape 1 : Identité ──────────────────────────────────────
  nom             TEXT    NOT NULL,
  prenom          TEXT    NOT NULL,
  date_naissance  TEXT    NOT NULL,            -- YYYY-MM-DD
  telephone       TEXT    NOT NULL,
  email           TEXT    NOT NULL,
  licence_ffk     TEXT,                        -- numéro de licence fédérale (optionnel)
  is_mineur       INTEGER NOT NULL DEFAULT 0,  -- 0 | 1

  -- ── Étape 2 : Détails ───────────────────────────────────────
  categorie       TEXT,                        -- Benjamin, Minime, Cadet…
  niveau          TEXT,                        -- Débutant, Intermédiaire…
  regime          TEXT,                        -- régime alimentaire / allergie
  -- Passage de grade (si is_grade=1 sur l'événement)
  ceinture_actuelle TEXT,
  ceinture_visee    TEXT,
  -- Représentant légal (si is_mineur=1)
  parent_nom      TEXT,
  parent_prenom   TEXT,
  parent_tel      TEXT,
  -- Remarque libre
  message         TEXT,
  -- Consentements
  certif_medical  INTEGER NOT NULL DEFAULT 0,  -- 0 | 1
  droit_image     INTEGER NOT NULL DEFAULT 0,  -- 0 | 1
  reglement_ok    INTEGER NOT NULL DEFAULT 0,  -- 0 | 1

  -- ── Paiement ────────────────────────────────────────────────
  montant         REAL    NOT NULL DEFAULT 0,
  paiement_status TEXT    NOT NULL DEFAULT 'en_attente'
                  CHECK (paiement_status IN ('en_attente','paye','gratuit','annule')),
  helloasso_ref   TEXT,                        -- référence HelloAsso si applicable

  -- ── Méta ────────────────────────────────────────────────────
  created_at      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  updated_at      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_reg_event_id ON registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_reg_email    ON registrations(email);
CREATE INDEX IF NOT EXISTS idx_reg_status   ON registrations(paiement_status);

-- ──────────────────────────────────────────────────────────────
-- TRIGGER : décrémenter spots_left à chaque inscription validée
-- ──────────────────────────────────────────────────────────────
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

-- ──────────────────────────────────────────────────────────────
-- TRIGGER : remettre des places si une inscription est annulée
-- ──────────────────────────────────────────────────────────────
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

-- ──────────────────────────────────────────────────────────────
-- TRIGGER : updated_at automatique sur events
-- ──────────────────────────────────────────────────────────────
CREATE TRIGGER IF NOT EXISTS trg_events_updated
  AFTER UPDATE ON events
BEGIN
  UPDATE events SET updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now')
  WHERE id = NEW.id;
END;

-- ──────────────────────────────────────────────────────────────
-- DONNÉES INITIALES — événements démo (copiés depuis index.html)
-- ──────────────────────────────────────────────────────────────
INSERT OR IGNORE INTO events
  (id, title, sub, type, status, date_start, date_end, time_start, time_end, lieu, price, spots_total, spots_left, featured, is_grade, helloasso)
VALUES
  ('stage1',    'Stage Été — Frappe & Déplacement',  'Tous niveaux · 2 jours intensifs', 'stage',       'disponible', '2025-07-05', '2025-07-06', '09:00', '18:00', 'Dojo du club, Bons-en-Chablais', 80,  20,  14, 1, 0, 0),
  ('grade1',    'Passage de Grade — Ceintures',      'Toutes ceintures · Examinateurs FFK', 'grade',    'disponible', '2025-06-21', NULL,         '10:00', '13:00', 'Dojo du club, Bons-en-Chablais', 0,   30,  27, 0, 1, 0),
  ('stage2',    'Stage Régional FFK',                'Ceintures oranges et plus · 1 jour', 'stage',     'disponible', '2025-07-12', NULL,         '09:00', '17:00', 'Annecy (lieu précisé par mail)',  40,  12,  12, 0, 0, 0),
  ('seminar1',  'Séminaire Mental & Performance',    'Tous adhérents · Après-midi',        'seminaire', 'disponible', '2025-09-05', NULL,         '14:00', '18:00', 'Dojo du club',                   20,  20,   6, 0, 0, 0),
  ('compet1',   'Championnat Régional',              'Sélection club · Compétiteurs',      'competition','complet',   '2025-03-22', NULL,         NULL,    NULL,    'Lyon',                           25,  30,   0, 0, 0, 0),
  ('compet2',   'Interclub Amical Été',              'Tous niveaux · Ambiance détendue',   'competition','disponible','2025-07-19', NULL,         '10:00', '17:00', 'Thonon-les-Bains',               0,   30,  30, 0, 0, 0);
