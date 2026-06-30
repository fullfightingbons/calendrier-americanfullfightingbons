-- Migration number: 0004 — archivage des inscriptions à la suppression d'un événement
--
-- Quand l'admin supprime un événement (typiquement après qu'il soit passé),
-- DELETE FROM events déclenche ON DELETE CASCADE sur registrations : les
-- inscriptions disparaissaient jusqu'ici sans aucune trace. Cette table
-- conserve un instantané JSON de toutes les inscriptions juste avant la
-- suppression, téléchargeable en CSV depuis l'onglet "Archives" de l'admin.
CREATE TABLE IF NOT EXISTS event_archives (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id             TEXT    NOT NULL,           -- ancien id de l'événement (peut être réutilisé depuis)
  title                TEXT    NOT NULL,
  type                 TEXT,
  date_start           TEXT,
  date_end             TEXT,
  lieu                 TEXT,
  registrations_count  INTEGER NOT NULL DEFAULT 0,
  registrations_json   TEXT    NOT NULL,           -- snapshot JSON complet des inscriptions
  archived_at          TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_event_archives_archived_at ON event_archives(archived_at);
