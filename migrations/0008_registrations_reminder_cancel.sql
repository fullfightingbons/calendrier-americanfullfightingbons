-- Migration 0008 : rappel J-1 et auto-annulation publique par lien signé
--
-- IMPORTANT : comme pour 0006_events_poster.sql, ces ALTER TABLE ADD COLUMN
-- ne sont pas idempotents en SQLite (erreur "duplicate column" si rejoués) —
-- ce fichier n'est donc PAS inclus dans schema.sql et doit être appliqué une
-- seule fois via `wrangler d1 migrations apply`.
--
-- rappel_envoye_at : horodatage du rappel J-1 déjà envoyé (cf. sendEventReminders
-- dans le cron quotidien), pour ne jamais relancer deux fois la même personne.
--
-- cancel_token : jeton opaque inclus dans le lien "annuler mon inscription" de
-- l'email de confirmation, pour les inscrit·e·s qui ne sont pas des adhérent·e·s
-- du club (donc sans compte espace membre — cf. /api/member/registrations qui,
-- lui, ne couvre que les adhérents identifiés). Le jeton est vérifié côté worker.js
-- par HMAC (getSessionSecret) et n'a donc pas besoin d'être secret en base ;
-- il est stocké pour permettre son invalidation après usage (passage à NULL).
ALTER TABLE registrations ADD COLUMN rappel_envoye_at TEXT;
ALTER TABLE registrations ADD COLUMN cancel_token TEXT;

CREATE INDEX IF NOT EXISTS idx_reg_cancel_token ON registrations(cancel_token);
