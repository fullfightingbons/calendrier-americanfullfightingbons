-- Migration 0010 : regroupement des événements récurrents (séries)
--
-- POST /api/events/series (admin) crée plusieurs occurrences d'un même
-- événement (ex: cours hebdomadaire) en une seule opération plutôt que de les
-- saisir une par une. series_id permet de retrouver/modifier/supprimer plus
-- tard toutes les occurrences d'une même série depuis l'admin (ex: "supprimer
-- toute la série" au lieu d'une suppression événement par événement).
-- Non idempotent (ADD COLUMN) : à appliquer une seule fois, cf. migration 0006.
ALTER TABLE events ADD COLUMN series_id TEXT;

CREATE INDEX IF NOT EXISTS idx_events_series ON events(series_id);
