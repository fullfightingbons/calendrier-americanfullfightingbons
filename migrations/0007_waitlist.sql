-- Migration 0007 : liste d'attente sur les événements complets
--
-- Quand un événement est complet (spots_left = 0), l'inscription publique est
-- aujourd'hui refusée avec un 409 (cf. createRegistrationRow). Cette table
-- permet de proposer une inscription à la liste d'attente à la place : dès
-- qu'une place se libère (annulation admin ou auto-annulation), le premier·e
-- inscrit·e en attente reçoit un email l'invitant à s'inscrire normalement
-- (cf. notifyNextWaitlistEntry dans worker.js). Pas de jeton de réservation
-- ferme : la notification donne une longueur d'avance (personne d'autre n'est
-- au courant qu'une place s'est libérée), sans verrouiller la place tant
-- qu'une inscription réelle n'est pas passée par le formulaire habituel.
--
-- Une seule ligne active par (event_id, email) : on ne veut pas qu'un même
-- email s'inscrive plusieurs fois à la même liste d'attente.
CREATE TABLE IF NOT EXISTS waitlist (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id          TEXT    NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  nom               TEXT    NOT NULL,
  prenom            TEXT    NOT NULL,
  email             TEXT    NOT NULL,
  telephone         TEXT,
  statut            TEXT    NOT NULL DEFAULT 'attente'
                    CHECK (statut IN ('attente', 'notifie', 'convertie', 'expiree', 'annulee')),
  notified_at       TEXT,
  notify_expires_at TEXT,                          -- fenêtre avant relance du suivant (48h par défaut)
  created_at        TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  updated_at        TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_waitlist_unique_email_event
  ON waitlist(event_id, email)
  WHERE statut IN ('attente', 'notifie');

CREATE INDEX IF NOT EXISTS idx_waitlist_event ON waitlist(event_id, statut);
