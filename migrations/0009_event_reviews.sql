-- Migration 0009 : avis publics sur les événements passés
--
-- La table `comments` (migration 0001) était un reliquat du template de départ
-- (3 lignes de démo "Kristian/Serena/Max"), jamais branchée à une vraie route
-- de l'API ni à l'interface — on la supprime proprement plutôt que de la
-- laisser trainer. `event_reviews` la remplace par une vraie fonctionnalité :
-- un·e participant·e peut laisser une note + un commentaire après un stage/
-- une compétition, modéré par l'admin avant publication (`publie`).
DROP TABLE IF EXISTS comments;

CREATE TABLE IF NOT EXISTS event_reviews (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id      TEXT    NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  nom           TEXT    NOT NULL,
  email         TEXT,                              -- optionnel, jamais affiché publiquement
  note          INTEGER NOT NULL CHECK (note BETWEEN 1 AND 5),
  commentaire   TEXT,
  publie        INTEGER NOT NULL DEFAULT 0,         -- 0 = en attente de modération, 1 = visible publiquement
  created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_event_reviews_event   ON event_reviews(event_id, publie);
CREATE INDEX IF NOT EXISTS idx_event_reviews_publie  ON event_reviews(publie, created_at);
