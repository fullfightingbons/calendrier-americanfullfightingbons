-- Jeton persistant par adhérent pour le flux calendrier abonnable
-- (webcal://.../api/member/calendar.ics?token=...). Volontairement séparé
-- des jetons de session (courte durée de vie) : un agenda (Google Calendar,
-- iOS...) va rappeler cette URL périodiquement pendant des mois, donc le
-- jeton ne doit pas expirer comme une session — seule une régénération
-- explicite par l'adhérent l'invalide (cf. DELETE /api/member/calendar-token).
CREATE TABLE IF NOT EXISTS member_calendar_tokens (
  email      TEXT PRIMARY KEY,
  token      TEXT NOT NULL UNIQUE,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_member_calendar_tokens_token ON member_calendar_tokens(token);
