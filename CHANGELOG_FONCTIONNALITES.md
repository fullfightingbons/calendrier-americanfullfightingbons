# Nouvelles fonctionnalités — Calendrier AFFBC

Ajoutées sur la base du projet existant, sans rien retirer. Tous les tests
existants passent toujours (47/47 après ajout de tests pour le nouveau code),
`tsc --noEmit` et `wrangler deploy --dry-run` sont propres.

## Mise à jour 16/08/2026 — suivi des automatisations

- Table `automation_status` (migration `0013_automation_status.sql`) pour
  conserver la dernière exécution des tâches cron.
- `GET /api/admin/automation/status` (admin) : expose le dernier statut, la
  durée, le résultat compact et l'erreur éventuelle de chaque tâche.
- Nouvel onglet admin "Automatisations" dans `index.html`.
- Le cron quotidien continue les tâches suivantes même si une tâche échoue,
  tout en enregistrant l'échec.

## 1. Liste d'attente

- Table `waitlist` (migration `0007_waitlist.sql`).
- `POST /api/waitlist` (public) : rejoindre la liste d'attente d'un événement complet.
  Body : `{ event_id, nom, prenom, email, telephone? }`.
- `GET /api/waitlist?event_id=...` (admin) : lister.
- `DELETE /api/waitlist/:id` (admin) : retirer une entrée.
- Dès qu'une place se libère (annulation admin, auto-annulation membre ou
  publique), la personne la plus ancienne en liste d'attente reçoit un email
  l'invitant à s'inscrire. Pas de réservation ferme : premier arrivé, premier
  servi, comme pour toute inscription. Une notification sans suite expire
  après 48h et relance la personne suivante (cron quotidien).

## 2. Rappel J-1

- Colonne `registrations.rappel_envoye_at` (migration `0008`).
- Le cron quotidien envoie un email de rappel la veille de l'événement à
  toutes les inscriptions confirmées (payées ou gratuites), une seule fois.

## 3. Export ICS

- `GET /api/events/:id/ics` (public) : télécharge l'événement au format
  calendrier standard (RFC 5545), compatible Google Calendar / Outlook /
  Apple Calendar.
- Le fichier `.ics` est aussi joint automatiquement à l'email de confirmation
  d'inscription (en plus de la facture PDF existante).

## 4. Événements récurrents (séries)

- Colonne `events.series_id` (migration `0010`).
- `POST /api/events/series` (admin) : crée plusieurs occurrences d'un même
  événement en une fois.
  Body : `{ template: {...mêmes champs qu'une création d'événement}, date_start, occurrences, interval_days? }`
  (`interval_days` par défaut 7, pour un cours hebdomadaire).
- `DELETE /api/events/series/:seriesId` (admin) : supprime (avec archivage
  des inscriptions, comme pour un événement seul) toutes les occurrences
  restantes de la série.

## 5. Auto-annulation publique par lien signé

- Colonne `registrations.cancel_token` (migration `0008`), générée à chaque
  inscription.
- L'email de confirmation inclut un lien "Annuler mon inscription" **quand
  l'annulation reste possible** (même règle que l'auto-annulation membre :
  pas après paiement confirmé ni après l'événement).
- Page autonome `/annulation/:token` (fichier `annulation.html`, servi
  directement par le worker, indépendant de la SPA principale).
- `GET/POST /api/registrations/cancel/:token`.

## 6. Avis publics sur les événements passés

- La table `comments` (jamais utilisée, reliquat du template de départ) est
  supprimée et remplacée par `event_reviews` (migration `0009`).
- `POST /api/reviews` (public) : soumettre un avis, non publié tant qu'il
  n'est pas validé.
- `GET /api/reviews?event_id=...` (public) : avis publiés uniquement.
- `GET /api/reviews/admin` (admin) : tous les avis, y compris en attente.
- `PUT /api/reviews/:id/publish` (admin) : publier / dépublier.
- `DELETE /api/reviews/:id` (admin).

## À faire pour une mise en production complète

Le backend est complet et testé. Le câblage côté interface publique
(`index.html`) est fait pour la liste d'attente et l'export ICS :

- Un événement complet reste cliquable et ouvre une modale "Rejoindre la
  liste d'attente" (au lieu d'être simplement grisé).
- Un lien "Ajouter à mon calendrier" (ICS) est visible dans la modale
  d'inscription, quel que soit l'étape du formulaire.

Il reste, à la discrétion du club :

- Formulaire de dépôt d'avis après un événement passé + affichage des avis
  publiés — nécessite d'abord une page publique listant les événements
  passés (aujourd'hui, seul l'admin voit les archives). L'API est prête
  (`POST/GET /api/reviews`).
- Interface admin pour créer une série d'événements et modérer les avis
  (actuellement uniquement via API/Postman) — l'admin peut déjà gérer la
  liste d'attente indirectement via `GET/DELETE /api/waitlist`.

## Déploiement

```
wrangler d1 migrations apply DB --remote   # applique les migrations jusqu'à 0013
wrangler deploy
```

Le cron existant (`0 3 * * *`) couvre automatiquement les nouveaux traitements
(rappel J-1, expiration liste d'attente) — aucun changement à `wrangler.toml`.
