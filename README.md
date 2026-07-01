# 🥊 AFF Bons-en-Chablais — Déploiement GitHub → Cloudflare

Déploiement automatique du Worker et de la base D1 via GitHub Actions.

---

## Structure du dépôt

```
votre-repo/
├── .github/
│   └── workflows/
│       └── deploy.yml      ← pipeline CI/CD (doit être ici, pas à la racine !)
├── worker.js               ← API Cloudflare Worker
├── schema.sql              ← schéma D1 initial (tables de base, + données démo)
├── migrations/             ← migrations D1 appliquées via `wrangler d1 migrations apply`
│   ├── 0002_add_unique_email_event.sql  ← contrainte UNIQUE email+event
│   ├── 0003_add_ferme_status.sql        ← ajout du statut 'ferme'
│   └── 0004_event_archives.sql          ← table event_archives (archivage à la suppression)
├── wrangler.toml           ← configuration Cloudflare
└── index.html              ← front-end SPA
```

---

## Étape 1 — Créer la base D1

En local (une seule fois) :

```bash
npm install -g wrangler
wrangler login

wrangler d1 create calendrier-americanfullfightingbonsdb
```

Copiez l'**`id`** affiché et collez-le dans `wrangler.toml` :

```toml
[[d1_databases]]
database_id = "VOTRE_ID_ICI"
```

Committez `wrangler.toml` mis à jour dans votre dépôt GitHub.

---

## Étape 2 — Ajouter les 4 secrets GitHub

Dans votre dépôt GitHub : **Settings → Secrets and variables → Actions → New repository secret**

| Nom du secret | Valeur | Où la trouver |
|---|---|---|
| `CF_API_TOKEN` | Token API Cloudflare | [dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens) → *Edit Cloudflare Workers* |
| `CF_ACCOUNT_ID` | ID de votre compte | Cloudflare Dashboard → barre latérale droite |
| `CF_ADMIN_TOKEN` | Mot de passe admin de votre choix | Inventez-en un fort, ex: `AFF-Admin-2025!` |
| `CF_SESSION_SECRET` | Chaîne aléatoire de 32+ caractères | Générez-la avec `openssl rand -base64 32` |

> ⚠️ Le token API doit avoir les permissions :
> **Workers Scripts:Edit**, **D1:Edit**, **Account Settings:Read**
>
> ⚠️ `CF_SESSION_SECRET` sert à signer (HMAC) le cookie de session admin une
> fois le mot de passe validé (voir `getSessionSecret()` dans `worker.js`).
> **Sans lui, la connexion échoue toujours** — même avec le bon mot de passe
> — et l'API renvoie une erreur 500 que le frontend affiche à tort comme
> "Mot de passe incorrect". Générez-le **une seule fois** ; le changer
> déconnectera tous les admins actuellement connectés (leurs cookies
> deviendront invalides), ce qui est sans danger.

### Secrets Worker supplémentaires (à injecter via `wrangler secret put`)

Ces secrets ne doivent **jamais** apparaître dans le code source :

```bash
# Clé API Brevo pour l'envoi des emails de confirmation
echo "VOTRE_CLE_BREVO" | wrangler secret put BREVO_API_KEY

# Identifiants HelloAsso (si paiement en ligne)
echo "VOTRE_CLIENT_ID" | wrangler secret put HELLOASSO_CLIENT_ID
echo "VOTRE_CLIENT_SECRET" | wrangler secret put HELLOASSO_CLIENT_SECRET
echo "votre-slug-organisation" | wrangler secret put HELLOASSO_ORG_SLUG
```

---

## Étape 3 — Premier déploiement

Poussez vos fichiers sur la branche `main` :

```bash
git add worker.js schema.sql wrangler.toml .github/
git commit -m "feat: ajout Worker + D1 + CI/CD"
git push origin main
```

GitHub Actions va automatiquement :
1. Appliquer `schema.sql` sur la base D1 (tables de base)
2. Appliquer le dossier `migrations/` sur la base D1 (`wrangler d1 migrations apply DB --remote`)
3. Déployer le Worker sur Cloudflare
4. Injecter `CF_ADMIN_TOKEN` comme secret du Worker (`ADMIN_TOKEN`)
5. Injecter `CF_SESSION_SECRET` comme secret du Worker (`SESSION_SECRET`)

Suivez l'avancement dans l'onglet **Actions** de votre dépôt GitHub.

---

## Étape 4 — Configurer le domaine personnalisé

Une fois le Worker déployé, rendez-vous sur :

**Cloudflare Dashboard → Workers & Pages → calendrier-americanfullfightingbons → Settings → Triggers → Add Custom Domain**

Ajoutez : `calendrier.americanfullfightingbons.fr`

> Le sous-domaine doit être sur une zone DNS gérée par Cloudflare.
> Cloudflare configurera automatiquement le certificat SSL.

Ensuite, décommentez les lignes `routes` dans `wrangler.toml` et adaptez le domaine :

```toml
routes = [
  { pattern = "calendrier.americanfullfightingbons.fr/*", zone_name = "americanfullfightingbons.fr" }
]
```

---

## Étape 5 — Connecter index.html à l'API

Dans votre `index.html`, définissez l'URL de base de l'API :

```javascript
const API = 'https://calendrier.americanfullfightingbons.fr';
// ou pendant les tests :
// const API = 'https://calendrier-americanfullfightingbons.VOTRE-COMPTE.workers.dev';
```

### Charger les événements au démarrage

```javascript
async function loadEvents() {
  const res  = await fetch(`${API}/api/events`);
  adminEvents = await res.json();
  rebuildPublicPage();
}
document.addEventListener('DOMContentLoaded', loadEvents);
```

### Soumettre une inscription

```javascript
async function submitRegistration(payload) {
  const res = await fetch(`${API}/api/registrations`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  });
  if (!res.ok) {
    const e = await res.json();
    throw new Error(e.error);
  }
  return res.json();
}
```

### Se connecter en admin et sauvegarder un événement

> ⚠️ L'authentification admin **n'utilise plus** de Bearer token statique
> en `sessionStorage`. Depuis le passage aux sessions signées, le login se
> fait via `POST /api/auth/login` qui pose un cookie `HttpOnly` signé en
> HMAC (voir `createSessionToken()` / `SESSION_SECRET` dans `worker.js`).
> Toutes les requêtes admin doivent inclure `credentials: 'include'` pour
> envoyer ce cookie — il n'y a plus de header `Authorization` à gérer
> côté client.

```javascript
async function adminLogin(password) {
  const res = await fetch(`${API}/api/auth/login`, {
    method:      'POST',
    credentials: 'include',
    headers:     { 'Content-Type': 'application/json' },
    body:        JSON.stringify({ password }),
  });
  if (!res.ok) throw new Error('Mot de passe incorrect');
}

async function saveEventToAPI(ev) {
  const isNew = !ev.id;
  const url   = isNew ? `${API}/api/events` : `${API}/api/events/${ev.id}`;
  const res   = await fetch(url, {
    method:      isNew ? 'POST' : 'PUT',
    credentials: 'include',
    headers:     { 'Content-Type': 'application/json' },
    body:        JSON.stringify(ev),
  });
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}

async function deleteEventFromAPI(id) {
  await fetch(`${API}/api/events/${id}`, {
    method:      'DELETE',
    credentials: 'include',
  });
}
```

---

## Déploiements suivants

Chaque `git push` sur `main` redéploie automatiquement le Worker, réapplique `schema.sql` et applique les éventuelles nouvelles migrations du dossier `migrations/`. Les `INSERT OR IGNORE` dans `schema.sql` protègent les données existantes, et `wrangler d1 migrations apply` ne réapplique jamais une migration déjà exécutée.

---

## Référence des routes API

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET | `/api/events` | — | Liste tous les événements |
| GET | `/api/events/:id` | — | Détail + nombre d'inscrits |
| POST | `/api/events` | ✅ | Créer un événement |
| PUT | `/api/events/:id` | ✅ | Modifier un événement |
| DELETE | `/api/events/:id` | ✅ | Supprimer un événement (archive automatiquement ses inscriptions, cf. ci-dessous) |
| POST | `/api/registrations` | — | Créer une inscription |
| GET | `/api/registrations` | ✅ | Lister les inscriptions |
| GET | `/api/registrations/:id` | ✅ | Détail d'une inscription |
| PUT | `/api/registrations/:id/status` | ✅ | Changer le statut de paiement |
| DELETE | `/api/registrations/:id` | ✅ | Supprimer une inscription |
| GET | `/api/archives` | ✅ | Lister les événements archivés (supprimés manuellement ou automatiquement) |
| GET | `/api/archives/:id/csv` | ✅ | Télécharger la liste des inscrits d'une archive (CSV) |
| DELETE | `/api/archives/:id` | ✅ | Supprimer définitivement une archive |

✅ = Nécessite une session admin active (cookie `HttpOnly` posé par
`POST /api/auth/login`, requêtes envoyées avec `credentials: 'include'`).

## Archivage automatique des événements passés

Un cron quotidien (`[triggers] crons` dans `wrangler.toml`, 3h du matin UTC)
supprime du calendrier tout événement dont la date est dépassée depuis plus
de 5 jours. **Aucune donnée n'est perdue** : juste avant la suppression, la
liste complète des inscrits (nom, contact, paiement...) est automatiquement
enregistrée dans une archive consultable et téléchargeable en CSV depuis
l'onglet **🗄 Archives** du panel admin. La suppression manuelle d'un
événement depuis l'admin déclenche le même archivage automatique.

Pour changer la fenêtre de rétention (5 jours) ou la fréquence du cron,
modifier respectivement `purgeExpiredEvents()` dans `worker.js` et
`crons = [...]` dans `wrangler.toml`.
