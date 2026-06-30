-- Migration number: 0002   2026-05-21T18:30:00Z
-- Empêche la double inscription d'un même email au même événement.

UPDATE registrations
SET email = lower(trim(email))
WHERE email IS NOT NULL;

DELETE FROM registrations
WHERE id NOT IN (
  SELECT MIN(id)
  FROM registrations
  GROUP BY event_id, email
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_reg_unique_email_event
  ON registrations(event_id, email);
