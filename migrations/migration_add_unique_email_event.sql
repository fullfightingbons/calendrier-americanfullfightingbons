-- ══════════════════════════════════════════════════════════════
--  MIGRATION — Ajout de l'index UNIQUE (event_id, email)
--  Empêche la double inscription d'un même email à un même événement.
--  Appliquez avec :
--    wrangler d1 execute calendrier-americanfullfightingbonsdb \
--      --file=migration_add_unique_email_event.sql --remote
-- ══════════════════════════════════════════════════════════════

-- Supprimer les éventuels doublons avant de créer l'index
-- (garde l'inscription la plus ancienne en cas de doublon)
DELETE FROM registrations
WHERE id NOT IN (
  SELECT MIN(id)
  FROM   registrations
  GROUP  BY event_id, email
);

-- Créer l'index UNIQUE
CREATE UNIQUE INDEX IF NOT EXISTS idx_reg_unique_email_event
  ON registrations(event_id, email);
