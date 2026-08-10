-- Migration 0012 : les avis ne doivent pas disparaître à l'archivage
--
-- event_reviews.event_id référençait events(id) ON DELETE CASCADE (migration
-- 0009). Cette contrainte a deux conséquences qui n'avaient jamais posé
-- problème jusqu'ici, faute de tout accès public aux avis d'un événement
-- déjà archivé — mais qui cassent la nouvelle page publique "Événements
-- passés" (cf. GET /api/archives/public) :
--
--   1. purgeExpiredEvents() (ou une suppression manuelle d'événement)
--      supprime la ligne dans `events` 5 jours après sa fin. Avec la
--      contrainte CASCADE, tout avis déjà déposé pour cet événement est
--      supprimé EN MÊME TEMPS, silencieusement.
--   2. PRAGMA foreign_keys = ON (schema.sql) empêche tout simplement
--      d'insérer un nouvel avis pour un événement déjà archivé : la
--      contrainte de clé étrangère rejette l'INSERT puisque l'event_id
--      n'existe plus dans `events`.
--
-- event_archives.event_id n'a jamais eu ce genre de contrainte (c'est un
-- TEXT NOT NULL simple) précisément parce que l'événement d'origine peut ne
-- plus exister — event_reviews doit suivre le même principe : event_id y
-- reste une référence *logique* vers un événement (actif ou archivé), pas
-- une contrainte d'intégrité stricte vers la seule table `events`.
--
-- SQLite ne permet pas de retirer une contrainte REFERENCES par ALTER TABLE
-- : on recrée la table, comme migration 0003_add_ferme_status.sql.

PRAGMA foreign_keys = OFF;

CREATE TABLE IF NOT EXISTS event_reviews_new (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id      TEXT    NOT NULL,   -- ← référence logique (events OU event_archives), plus de REFERENCES/CASCADE
  nom           TEXT    NOT NULL,
  email         TEXT,
  note          INTEGER NOT NULL CHECK (note BETWEEN 1 AND 5),
  commentaire   TEXT,
  publie        INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

INSERT INTO event_reviews_new SELECT * FROM event_reviews;

DROP TABLE event_reviews;
ALTER TABLE event_reviews_new RENAME TO event_reviews;

CREATE INDEX IF NOT EXISTS idx_event_reviews_event   ON event_reviews(event_id, publie);
CREATE INDEX IF NOT EXISTS idx_event_reviews_publie  ON event_reviews(publie, created_at);

PRAGMA foreign_keys = ON;
