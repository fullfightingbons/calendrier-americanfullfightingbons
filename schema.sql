-- ══════════════════════════════════════════════════════════════
--  AMERICAN FULL FIGHTING — BONS-EN-CHABLAIS
--  Schéma Cloudflare D1 (SQLite)
--  Créez la base avec : wrangler d1 create aff-bons
--  Appliquez le schéma : wrangler d1 execute aff-bons --file=schema.sql
-- ══════════════════════════════════════════════════════════════

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
                CHECK (status IN ('disponible','complet','ferme')),
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
  poster_key    TEXT,                          -- clé de l'affiche dans R2 (bucket POSTERS), NULL si aucune
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

  -- ── Rappel J-1 et auto-annulation publique (cf. migration 0008) ─
  rappel_envoye_at TEXT,                        -- horodatage du rappel J-1 déjà envoyé
  cancel_token     TEXT,                        -- jeton "annuler mon inscription" (lien email)

  -- ── Méta ────────────────────────────────────────────────────
  created_at      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  updated_at      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_reg_cancel_token ON registrations(cancel_token);

CREATE INDEX IF NOT EXISTS idx_reg_event_id ON registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_reg_email    ON registrations(email);
CREATE INDEX IF NOT EXISTS idx_reg_status   ON registrations(paiement_status);

-- Empêche un même email de s'inscrire deux fois au même événement
CREATE UNIQUE INDEX IF NOT EXISTS idx_reg_unique_email_event ON registrations(event_id, email);

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
-- TABLE : admin_credentials
-- Mot de passe admin modifiable depuis le panneau (onglet Réglages).
-- Une seule ligne (id=1, imposé par le CHECK). Tant qu'aucune ligne
-- n'existe, le login retombe sur le secret Cloudflare ADMIN_TOKEN
-- (comportement historique) — voir la route POST /api/auth/login dans
-- worker.js. Dès qu'un admin change le mot de passe via le panneau,
-- cette table devient la seule source de vérité pour le login, et
-- ADMIN_TOKEN n'est plus utilisé (sauf en secours : supprimer la ligne
-- via `wrangler d1 execute ... "DELETE FROM admin_credentials"` redonne
-- accès avec l'ancien ADMIN_TOKEN).
-- Le mot de passe n'est jamais stocké en clair : PBKDF2-SHA256 salé,
-- calculé côté Worker avec crypto.subtle (hashPassword/verifyPassword
-- dans worker.js).
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_credentials (
  id            INTEGER PRIMARY KEY CHECK (id = 1),
  password_hash TEXT    NOT NULL,   -- hex, dérivé PBKDF2-SHA256
  password_salt TEXT    NOT NULL,   -- hex, sel aléatoire 16 octets
  iterations    INTEGER NOT NULL DEFAULT 100000,
  updated_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

-- ──────────────────────────────────────────────────────────────
-- TABLE : automation_status
-- Dernière exécution des tâches automatiques du calendrier
-- (archivage, rattrapage paiements, rappels, liste d'attente).
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS automation_status (
  key         TEXT PRIMARY KEY,
  label       TEXT    NOT NULL,
  trigger     TEXT    NOT NULL DEFAULT 'cron',
  started_at  TEXT    NOT NULL,
  finished_at TEXT    NOT NULL,
  ok          INTEGER NOT NULL DEFAULT 0,
  result_json TEXT,
  error       TEXT,
  updated_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

-- ──────────────────────────────────────────────────────────────
-- Pas de données de démonstration ici.
--
-- ⚠️ Ce fichier est réexécuté par .github/workflows/deploy.yml À CHAQUE PUSH
-- sur main (wrangler d1 execute --file=schema.sql --remote), pas seulement
-- à la création de la base. Un ancien `INSERT OR IGNORE INTO events` avec
-- 6 événements de démonstration figurait ici : leur id étant fixe
-- (stage1, grade1, stage2, seminar1, compet1, compet2), supprimer l'un de
-- ces événements depuis l'admin libérait son id, et le redéploiement
-- suivant le recréait aussitôt avec INSERT OR IGNORE (l'id n'existant
-- plus, la clause OR IGNORE ne bloquait rien). D'où la réapparition
-- d'événements fantômes à chaque déploiement. Supprimé : si des données
-- de démonstration sont nécessaires un jour, les insérer une seule fois
-- via une migration dans migrations/ (jamais réexécutée une fois appliquée),
-- jamais ici.
