-- Suivi persistant des tâches automatiques du calendrier.
-- Chaque cron met à jour sa dernière exécution, son résultat compact et son
-- éventuelle erreur. Table non métier : aucune donnée d'inscription n'est
-- modifiée ici.
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
