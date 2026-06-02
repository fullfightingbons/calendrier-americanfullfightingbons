/**
 * ══════════════════════════════════════════════════════════════
 *  AMERICAN FULL FIGHTING — BONS-EN-CHABLAIS
 *  Cloudflare Worker — sert index.html + API REST D1
 * ══════════════════════════════════════════════════════════════
 */

import INDEX_HTML from './index.html';

// ── Classe d'erreur métier ─────────────────────────────────────
class ApiError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

function securityHeaders(extra = {}) {
  return {
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    ...extra,
  };
}

function secureEquals(left, right) {
  const a = String(left || '');
  const b = String(right || '');
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) {
    diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return diff === 0;
}

function getAllowedOrigins(env, requestUrl) {
  const configured = String(env.CORS_ALLOWED_ORIGINS || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  return new Set([requestUrl.origin, ...configured]);
}

function buildCorsHeaders(request, env, requestUrl) {
  const origin = String(request.headers.get('Origin') || '').trim();
  const allowedOrigins = getAllowedOrigins(env, requestUrl);
  const allowOrigin = origin && allowedOrigins.has(origin) ? origin : requestUrl.origin;
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Vary': 'Origin',
  };
}

const ADMIN_SESSION_COOKIE = 'affbc_calendar_session';
const ADMIN_SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const CLUB_CONTACT_EMAIL = 'fullfightingbons@gmail.com';
const MAIL_SENDER_EMAIL = 'contact@americanfullfightingbons.fr';

function parseCookies(request) {
  const raw = request.headers.get('Cookie') || '';
  return Object.fromEntries(
    raw.split(';')
      .map((chunk) => chunk.trim())
      .filter(Boolean)
      .map((chunk) => {
        const index = chunk.indexOf('=');
        if (index < 0) return [chunk, ''];
        return [chunk.slice(0, index), decodeURIComponent(chunk.slice(index + 1))];
      })
  );
}

function toBase64Url(value) {
  return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(value) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((value.length + 3) % 4);
  return atob(padded);
}

function bytesToBase64Url(value) {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function hmacSha256Base64Url(secret, value) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  return bytesToBase64Url(signature);
}

function getSessionSecret(env) {
  return String(env.SESSION_SECRET || env.ADMIN_TOKEN || '');
}

async function createSessionToken(payload, env) {
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = await hmacSha256Base64Url(getSessionSecret(env), encodedPayload);
  return `${encodedPayload}.${signature}`;
}

async function parseSessionToken(token, env) {
  const [payload, signature] = String(token || '').split('.');
  if (!payload || !signature) return null;
  const expected = await hmacSha256Base64Url(getSessionSecret(env), payload);
  if (!secureEquals(expected, signature)) return null;
  try {
    return JSON.parse(fromBase64Url(payload));
  } catch {
    return null;
  }
}

function buildSessionCookie(token) {
  return `${ADMIN_SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; Path=/; Max-Age=${Math.floor(ADMIN_SESSION_TTL_MS / 1000)}; SameSite=Lax; Secure`;
}

function clearSessionCookie() {
  return `${ADMIN_SESSION_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax; Secure`;
}

async function loadActiveRegistrationCount(db, eventId) {
  const result = await db.prepare(
    `SELECT COUNT(*) AS total
     FROM registrations
     WHERE event_id = ?
       AND paiement_status IN ('en_attente', 'paye', 'gratuit')`
  ).bind(eventId).first();
  return Number(result?.total || 0);
}

function withComputedEventState(event, activeRegistrations) {
  const spotsTotal = Number(event?.spots_total || 0);
  const spotsLeft = Math.max(0, spotsTotal - activeRegistrations);
  const forcedClosed = event?.status === 'ferme';
  const status = forcedClosed
    ? 'ferme'
    : spotsLeft <= 0
      ? 'complet'
      : 'disponible';
  return {
    ...event,
    spots_total: spotsTotal,
    spots_left: spotsLeft,
    status,
    registrations_count: activeRegistrations,
  };
}

async function hydrateEvent(db, event) {
  const activeRegistrations = await loadActiveRegistrationCount(db, event.id);
  return withComputedEventState(event, activeRegistrations);
}

async function hydrateEvents(db, events) {
  return Promise.all((events || []).map((event) => hydrateEvent(db, event)));
}

async function syncEventAvailability(db, eventId) {
  const event = await db.prepare(`SELECT * FROM events WHERE id = ?`).bind(eventId).first();
  if (!event) return null;
  const hydrated = await hydrateEvent(db, event);
  await db.prepare(
    `UPDATE events
     SET spots_left = ?, status = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now')
     WHERE id = ?`
  ).bind(hydrated.spots_left, hydrated.status, eventId).run();
  return hydrated;
}

// ── Validation événement ───────────────────────────────────────
function validateEvent(body) {
  const required = ['title', 'sub', 'type', 'date_start', 'lieu'];
  for (const f of required) {
    if (!body[f]) throw new ApiError(`Champ requis manquant : ${f}`);
  }
  const validTypes = ['stage', 'competition', 'seminaire', 'grade'];
  if (!validTypes.includes(body.type)) {
    throw new ApiError(`Type invalide. Valeurs : ${validTypes.join(', ')}`);
  }
  const validStatuses = ['disponible', 'complet', 'ferme'];
  if (body.status && !validStatuses.includes(body.status)) {
    throw new ApiError(`Statut invalide. Valeurs : ${validStatuses.join(', ')}`);
  }
}

// ── Validation inscription ─────────────────────────────────────
function validateRegistration(body) {
  const required = ['event_id', 'nom', 'prenom', 'date_naissance', 'telephone', 'email'];
  for (const f of required) {
    if (!body[f]) throw new ApiError(`Champ requis manquant : ${f}`);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
    throw new ApiError('Email invalide');
  }
  if (body.is_mineur && (!body.parent_nom || !body.parent_prenom || !body.parent_tel)) {
    throw new ApiError('Informations du représentant légal requises pour un mineur');
  }
}

function isUniqueConstraintError(error, indexName) {
  const message = String(error?.message || error || '');
  return message.includes('UNIQUE constraint failed')
    || (indexName && message.includes(indexName));
}

// ── HelloAsso OAuth2 ───────────────────────────────────────────
async function getHelloAssoToken(env) {
  const resp = await fetch('https://api.helloasso.com/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'client_credentials',
      client_id:     env.HELLOASSO_CLIENT_ID,
      client_secret: env.HELLOASSO_CLIENT_SECRET,
    })
  });
  if (!resp.ok) throw new ApiError('Erreur authentification HelloAsso', 502);
  const data = await resp.json();
  return data.access_token;
}

// ── HelloAsso — créer une session Checkout ─────────────────────
async function createHelloAssoCheckout(env, { eventTitle, amount, email, prenom, nom, returnUrl, errorUrl }) {
  const token = await getHelloAssoToken(env);
  const resp = await fetch(
    `https://api.helloasso.com/v5/organizations/${env.HELLOASSO_ORG_SLUG}/checkout-intents`,
    {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        totalAmount:      amount * 100,
        initialAmount:    amount * 100,
        itemName:         eventTitle,
        backUrl:          errorUrl,
        errorUrl:         errorUrl,
        returnUrl:        returnUrl,
        containsDonation: false,
        payer: { email, firstName: prenom, lastName: nom }
      })
    }
  );
 if (!resp.ok) {
    let e = {};
    try { e = await resp.json(); } catch(_) {}
    const detail = e?.message || e?.error || e?.errors?.[0]?.message || JSON.stringify(e);
    console.error('HelloAsso checkout error:', JSON.stringify(e));
    throw new ApiError('Erreur HelloAsso : ' + detail, 502);
  }
  const data = await resp.json();
  return data.redirectUrl;
}

// ── Brevo — envoi d'email ──────────────────────────────────────
async function sendBrevoEmail(env, { to, toName, subject, html }) {
  if (!env.BREVO_API_KEY) {
    console.error('BREVO: clé API manquante — emails non envoyés');
    return { ok: false, error: 'missing_api_key' };
  }
  console.log('BREVO: tentative envoi à', to, '| sujet:', subject);
  try {
    const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept':       'application/json',
        'api-key':      env.BREVO_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender:  { name: 'AMERICAN FULL FIGHTING BONS EN CHABLAIS', email: MAIL_SENDER_EMAIL },
        to:      [{ email: to, name: toName }],
        subject,
        htmlContent: html,
      }),
    });
    const body = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      console.error('BREVO: erreur HTTP', resp.status, JSON.stringify(body));
      return { ok: false, status: resp.status, body };
    } else {
      console.log('BREVO: succès', resp.status, JSON.stringify(body));
      return { ok: true, status: resp.status, body };
    }
  } catch(e) {
    console.error('BREVO: exception réseau', e.message);
    return { ok: false, error: e.message };
  }
}

async function sendConfirmationEmails(env, { reg, ev }) {
  const CLUB_EMAIL = CLUB_CONTACT_EMAIL;
  const CLUB_NAME  = 'AMERICAN FULL FIGHTING BONS EN CHABLAIS';
  const prix       = ev.price === 0 ? 'Gratuit' : `${ev.price} €`;
  const dateStr    = new Date(ev.date_start).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  const isConfirmed = reg.paiement_status === 'gratuit' || reg.paiement_status === 'paye';
  const participantTitle = isConfirmed ? '✅ Inscription confirmée' : '⏳ Inscription enregistrée';
  const participantIntro = isConfirmed
    ? 'Votre inscription à l\'événement suivant a bien été confirmée :'
    : 'Votre demande d\'inscription a bien été enregistrée. Le paiement ou le dossier doit encore être vérifié pour finaliser votre participation :';
  const participantStatus = reg.paiement_status === 'gratuit'
    ? '✓ Gratuit'
    : reg.paiement_status === 'paye'
      ? '✓ Payé'
      : '⏳ En attente de validation';
  const participantSubject = isConfirmed
    ? `✅ Inscription confirmée — ${ev.title}`
    : `⏳ Inscription enregistrée — ${ev.title}`;

  const participantHtml = `<!DOCTYPE html><html lang="fr"><body style="font-family:sans-serif;color:#222;max-width:600px;margin:0 auto;padding:20px">
  <div style="background:#050505;padding:20px 24px;border-radius:8px 8px 0 0;text-align:center">
    <span style="font-family:sans-serif;font-size:22px;font-weight:900;letter-spacing:2px;color:#fff">AMERICAN FULL FIGHTING</span><br>
    <span style="color:#aaa;font-size:13px">Bons-en-Chablais · FFK</span>
  </div>
  <div style="border:1px solid #eee;border-top:none;padding:28px 24px;border-radius:0 0 8px 8px">
    <h2 style="color:#E10600;margin-top:0">${participantTitle}</h2>
    <p>Bonjour <strong>${reg.prenom} ${reg.nom}</strong>,</p>
    <p>${participantIntro}</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      <tr style="background:#f9f9f9"><td style="padding:8px 12px;font-weight:600;width:40%">Événement</td><td style="padding:8px 12px">${ev.title}</td></tr>
      <tr><td style="padding:8px 12px;font-weight:600">Date</td><td style="padding:8px 12px">${dateStr}</td></tr>
      <tr style="background:#f9f9f9"><td style="padding:8px 12px;font-weight:600">Lieu</td><td style="padding:8px 12px">${ev.lieu}</td></tr>
      <tr><td style="padding:8px 12px;font-weight:600">Montant</td><td style="padding:8px 12px;font-weight:700;color:#E10600">${prix}</td></tr>
      <tr style="background:#f9f9f9"><td style="padding:8px 12px;font-weight:600">Statut dossier</td><td style="padding:8px 12px">${participantStatus}</td></tr>
    </table>
    <p style="color:#666;font-size:13px">Pour toute question, contactez-nous à <a href="mailto:${CLUB_EMAIL}">${CLUB_EMAIL}</a>.</p>
    <p style="color:#666;font-size:13px">À bientôt sur le tatami 🥊</p>
    <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
    <p style="color:#aaa;font-size:11px;text-align:center">${CLUB_NAME} · Saison 2025–2026</p>
  </div>
</body></html>`;

  const clubHtml = `<!DOCTYPE html><html lang="fr"><body style="font-family:sans-serif;color:#222;max-width:600px;margin:0 auto;padding:20px">
  <h2 style="color:#E10600">🥊 Nouvelle inscription — ${ev.title}</h2>
  <table style="width:100%;border-collapse:collapse">
    <tr style="background:#f9f9f9"><td style="padding:8px 12px;font-weight:600;width:40%">Participant</td><td style="padding:8px 12px">${reg.prenom} ${reg.nom}</td></tr>
    <tr><td style="padding:8px 12px;font-weight:600">Email</td><td style="padding:8px 12px"><a href="mailto:${reg.email}">${reg.email}</a></td></tr>
    <tr style="background:#f9f9f9"><td style="padding:8px 12px;font-weight:600">Téléphone</td><td style="padding:8px 12px">${reg.telephone}</td></tr>
    <tr><td style="padding:8px 12px;font-weight:600">Date de naissance</td><td style="padding:8px 12px">${reg.date_naissance}</td></tr>
    <tr style="background:#f9f9f9"><td style="padding:8px 12px;font-weight:600">Catégorie</td><td style="padding:8px 12px">${reg.categorie || '—'}</td></tr>
    <tr><td style="padding:8px 12px;font-weight:600">Montant</td><td style="padding:8px 12px;font-weight:700">${prix}</td></tr>
    <tr style="background:#f9f9f9"><td style="padding:8px 12px;font-weight:600">Statut paiement</td><td style="padding:8px 12px">${reg.paiement_status}</td></tr>
    ${reg.message ? `<tr><td style="padding:8px 12px;font-weight:600">Message</td><td style="padding:8px 12px">${reg.message}</td></tr>` : ''}
    ${reg.is_mineur ? `<tr style="background:#fff3cd"><td style="padding:8px 12px;font-weight:600">⚠ Mineur</td><td style="padding:8px 12px">${reg.parent_prenom} ${reg.parent_nom} — ${reg.parent_tel}</td></tr>` : ''}
  </table>
</body></html>`;

  const [participantEmail, clubEmail] = await Promise.all([
    sendBrevoEmail(env, {
      to: reg.email, toName: `${reg.prenom} ${reg.nom}`,
      subject: participantSubject,
      html: participantHtml,
    }),
    sendBrevoEmail(env, {
      to: CLUB_EMAIL, toName: CLUB_NAME,
      subject: `🥊 Nouvelle inscription — ${ev.title} — ${reg.nom} ${reg.prenom}`,
      html: clubHtml,
    }),
  ]);

  return { participant: participantEmail, club: clubEmail };
}

// ── Rate limiting simple par IP (en mémoire, par isolat Worker) ──
const rateLimitMap = new Map();
function isRateLimited(ip, limit = 10, windowMs = 60_000) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip) || { count: 0, resetAt: now + windowMs };
  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + windowMs;
  }
  entry.count++;
  rateLimitMap.set(ip, entry);
  // Nettoyage périodique pour éviter les fuites mémoire
  if (rateLimitMap.size > 5000) {
    for (const [k, v] of rateLimitMap) {
      if (now > v.resetAt) rateLimitMap.delete(k);
    }
  }
  return entry.count > limit;
}


export default {
  async fetch(request, env) {
    const url    = new URL(request.url);
    const path   = url.pathname;
    const method = request.method.toUpperCase();

    if ((method === 'GET' || method === 'HEAD') && path === '/api/health') {
      return new Response(JSON.stringify({ ok: true, service: 'calendrier-americanfullfightingbons', date: new Date().toISOString() }), {
        headers: securityHeaders({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }),
      });
    }

    if ((method === 'GET' || method === 'HEAD') && path === '/api/version') {
      return new Response(JSON.stringify({ service: 'calendrier-americanfullfightingbons', version: '1.0.0' }), {
        headers: securityHeaders({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }),
      });
    }

    if ((method === 'GET' || method === 'HEAD') && path === '/robots.txt') {
      return new Response('User-agent: *\nAllow: /\n\nSitemap: https://calendrier.americanfullfightingbons.fr/sitemap.xml\n', {
        headers: securityHeaders({ 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' }),
      });
    }

    if ((method === 'GET' || method === 'HEAD') && path === '/sitemap.xml') {
      return new Response('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>https://calendrier.americanfullfightingbons.fr/</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n</urlset>\n', {
        headers: securityHeaders({ 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' }),
      });
    }

    // ── Servir index.html embarqué dans le Worker ─────────────
    if ((method === 'GET' || method === 'HEAD') && (path === '/' || path === '' || path === '/index.html')) {
      return new Response(INDEX_HTML, {
        status: 200,
        headers: securityHeaders({
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=300',
        }),
      });
    }

    // ── CORS ───────────────────────────────────────────────────
    const corsHeaders = buildCorsHeaders(request, env, url);
    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: securityHeaders(corsHeaders) });
    }

    // ── Helpers internes ───────────────────────────────────────
    const json = (data, status = 200) =>
      new Response(JSON.stringify(data), {
        status,
        headers: securityHeaders({ ...corsHeaders, 'Content-Type': 'application/json' }),
      });

    const err = (msg, status = 400) => json({ error: msg }, status);

    const hasAdminSession = async () => {
      const token = parseCookies(request)[ADMIN_SESSION_COOKIE];
      if (!token) return false;
      const session = await parseSessionToken(token, env);
      return !!session && Number(session.expiresAt || 0) > Date.now() && session.role === 'admin';
    };

    const isAdmin = async () => {
      const auth  = request.headers.get('Authorization') || '';
      const token = auth.replace('Bearer ', '').trim();
      if (token !== '' && secureEquals(token, env.ADMIN_TOKEN || '')) return true;
      return hasAdminSession();
    };

    const requireAdmin = async () => {
      if (!(await isAdmin())) throw new ApiError('Non autorisé', 401);
    };

    const genId = (prefix = 'evt') => `${prefix}${Date.now().toString(36)}`;

    const segments = path.replace(/^\/api\//, '').split('/');
    const resource = segments[0];
    const resId    = segments[1];
    const subRes   = segments[2];

    try {
      if (resource === 'auth') {
        if (method === 'POST' && resId === 'login') {
          const body = await request.json();
          const password = String(body?.password || '').trim();
          if (!password || !secureEquals(password, env.ADMIN_TOKEN || '')) {
            return err('Mot de passe incorrect', 401);
          }
          const token = await createSessionToken(
            { role: 'admin', expiresAt: Date.now() + ADMIN_SESSION_TTL_MS },
            env
          );
          return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: securityHeaders({
              ...corsHeaders,
              'Content-Type': 'application/json',
              'Set-Cookie': buildSessionCookie(token),
            }),
          });
        }

        if (method === 'GET' && resId === 'session') {
          return json({ ok: await isAdmin() });
        }

        if (method === 'POST' && resId === 'logout') {
          return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: securityHeaders({
              ...corsHeaders,
              'Content-Type': 'application/json',
              'Set-Cookie': clearSessionCookie(),
            }),
          });
        }
      }

      // ══════════════════════════════════════════════════════════
      //  EVENTS
      // ══════════════════════════════════════════════════════════
      if (resource === 'events') {

        if (method === 'GET' && !resId) {
          const { results } = await env.DB.prepare(
            `SELECT * FROM events ORDER BY date_start ASC`
          ).all();
          return json(await hydrateEvents(env.DB, results));
        }

        if (method === 'GET' && resId) {
          const ev = await env.DB.prepare(
            `SELECT * FROM events WHERE id = ?`
          ).bind(resId).first();
          if (!ev) return err('Événement introuvable', 404);
          return json(await hydrateEvent(env.DB, ev));
        }

        if (method === 'POST') {
          await requireAdmin();
          const body = await request.json();
          const id   = body.id || genId('evt');
          validateEvent(body);
          await env.DB.prepare(`
            INSERT INTO events
              (id, title, sub, type, status, date_start, date_end, time_start, time_end,
               lieu, price, spots_total, spots_left, featured, is_grade, helloasso, helloasso_url)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
          `).bind(
            id, body.title, body.sub, body.type,
            body.status ?? 'disponible',
            body.date_start, body.date_end ?? null,
            body.time_start ?? null, body.time_end ?? null,
            body.lieu, body.price ?? 0,
            body.spots_total ?? 0, body.spots_left ?? body.spots_total ?? 0,
            body.featured  ? 1 : 0, body.is_grade  ? 1 : 0,
            body.helloasso ? 1 : 0, body.helloasso_url ?? null,
          ).run();
          const created = await syncEventAvailability(env.DB, id);
          return json(created, 201);
        }

        if (method === 'PUT' && resId) {
          await requireAdmin();
          const body = await request.json();
          validateEvent(body);
          await env.DB.prepare(`
            UPDATE events SET
              title = ?, sub = ?, type = ?, status = ?,
              date_start = ?, date_end = ?, time_start = ?, time_end = ?,
              lieu = ?, price = ?, spots_total = ?, spots_left = ?,
              featured = ?, is_grade = ?, helloasso = ?, helloasso_url = ?
            WHERE id = ?
          `).bind(
            body.title, body.sub, body.type, body.status ?? 'disponible',
            body.date_start, body.date_end ?? null,
            body.time_start ?? null, body.time_end ?? null,
            body.lieu, body.price ?? 0,
            body.spots_total ?? 0, body.spots_left ?? body.spots_total ?? 0,
            body.featured  ? 1 : 0, body.is_grade  ? 1 : 0,
            body.helloasso ? 1 : 0, body.helloasso_url ?? null,
            resId,
          ).run();
          const updated = await syncEventAvailability(env.DB, resId);
          if (!updated) return err('Événement introuvable', 404);
          return json(updated);
        }

        if (method === 'DELETE' && resId) {
          await requireAdmin();
          const info = await env.DB.prepare(`DELETE FROM events WHERE id = ?`).bind(resId).run();
          if (info.changes === 0) return err('Événement introuvable', 404);
          return json({ deleted: resId });
        }
      }

      // ══════════════════════════════════════════════════════════
      //  REGISTRATIONS
      // ══════════════════════════════════════════════════════════
      if (resource === 'registrations') {

        // GET /api/registrations/public [public]
        if (method === 'GET' && resId === 'public') {
          const { results } = await env.DB.prepare(`
            SELECT e.id AS event_id,
                   e.title AS event_title,
                   e.date_start,
                   COUNT(r.id) AS registrations_count
            FROM events e
            LEFT JOIN registrations r
              ON r.event_id = e.id
             AND r.paiement_status IN ('en_attente', 'paye', 'gratuit')
            WHERE e.date_start >= date('now')
            GROUP BY e.id, e.title, e.date_start
            ORDER BY e.date_start ASC
            LIMIT 20
          `).all();
          return json(results);
        }

        // GET /api/registrations [admin]
        if (method === 'GET' && !resId) {
          await requireAdmin();
          const eventFilter  = url.searchParams.get('event_id');
          const statusFilter = url.searchParams.get('status');
          let query  = `SELECT r.*, e.title as event_title FROM registrations r JOIN events e ON e.id = r.event_id WHERE 1=1`;
          const params = [];
          if (eventFilter)  { query += ` AND r.event_id = ?`;        params.push(eventFilter); }
          if (statusFilter) { query += ` AND r.paiement_status = ?`; params.push(statusFilter); }
          query += ` ORDER BY e.date_start ASC, r.created_at ASC`;
          const stmt = env.DB.prepare(query);
          const { results } = await (params.length ? stmt.bind(...params) : stmt).all();
          return json(results);
        }

        // GET /api/registrations/:id [admin]
        if (method === 'GET' && resId && !subRes) {
          await requireAdmin();
          const reg = await env.DB.prepare(
            `SELECT r.*, e.title as event_title, e.price as event_price
             FROM registrations r JOIN events e ON e.id = r.event_id WHERE r.id = ?`
          ).bind(resId).first();
          if (!reg) return err('Inscription introuvable', 404);
          return json(reg);
        }

        // POST /api/registrations [public]
        if (method === 'POST' && !resId) {
          // Rate limiting : 10 inscriptions max par IP par minute
          const clientIp = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';
          if (isRateLimited(clientIp, 10, 60_000)) {
            return err('Trop de requêtes. Veuillez patienter avant de réessayer.', 429);
          }

          const body = await request.json();
          validateRegistration(body);
          const normalizedEmail = String(body.email || '').toLowerCase().trim();
          const rawEvent = await env.DB.prepare(`SELECT * FROM events WHERE id = ?`).bind(body.event_id).first();
          const ev = rawEvent ? await hydrateEvent(env.DB, rawEvent) : null;
          if (!ev)                     return err('Événement introuvable', 404);
          if (ev.status === 'complet') return err('Événement complet', 409);
          if (ev.status === 'ferme')   return err('Les inscriptions sont fermées pour cet événement', 409);
          if (ev.spots_left <= 0)      return err('Plus de places disponibles', 409);

          // Vérifier qu'il n'existe pas déjà une inscription pour cet email + cet événement
          const existing = await env.DB.prepare(
            `SELECT id, paiement_status, montant FROM registrations WHERE event_id = ? AND email = ? AND paiement_status != 'annule'`
          ).bind(body.event_id, normalizedEmail).first();
          if (existing) {
            return json({
              error: 'Une inscription existe déjà pour cet email à cet événement.',
              code: 'duplicate_registration',
              existing_id: existing.id,
              paiement_status: existing.paiement_status,
              montant: existing.montant,
            }, 409);
          }

          const paiementStatus = ev.price === 0
            ? 'gratuit'
            : 'en_attente';

          let info;
          try {
            info = await env.DB.prepare(`
              INSERT INTO registrations (
                event_id, nom, prenom, date_naissance, telephone, email,
                licence_ffk, is_mineur, categorie, niveau, regime,
                ceinture_actuelle, ceinture_visee,
                parent_nom, parent_prenom, parent_tel,
                message, certif_medical, droit_image, reglement_ok,
                montant, paiement_status, helloasso_ref
              ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            `).bind(
              body.event_id, body.nom, body.prenom, body.date_naissance,
              body.telephone, normalizedEmail,
              body.licence_ffk       ?? null, body.is_mineur ? 1 : 0,
              body.categorie         ?? null, body.niveau    ?? null, body.regime ?? null,
              body.ceinture_actuelle ?? null, body.ceinture_visee ?? null,
              body.parent_nom        ?? null, body.parent_prenom  ?? null, body.parent_tel ?? null,
              body.message           ?? null,
              body.certif_medical ? 1 : 0, body.droit_image ? 1 : 0, body.reglement_ok ? 1 : 0,
              ev.price, paiementStatus, body.helloasso_ref ?? null,
            ).run();
          } catch (insertError) {
            if (!isUniqueConstraintError(insertError, 'idx_reg_unique_email_event')) {
              throw insertError;
            }
            const concurrent = await env.DB.prepare(
              `SELECT id, paiement_status, montant FROM registrations WHERE event_id = ? AND email = ? AND paiement_status != 'annule'`
            ).bind(body.event_id, normalizedEmail).first();
            return json({
              error: 'Une inscription existe déjà pour cet email à cet événement.',
              code: 'duplicate_registration',
              existing_id: concurrent?.id ?? null,
              paiement_status: concurrent?.paiement_status ?? paiementStatus,
              montant: concurrent?.montant ?? ev.price,
            }, 409);
          }

          await syncEventAvailability(env.DB, body.event_id);

          const regData = {
            nom: body.nom, prenom: body.prenom, email: normalizedEmail,
            telephone: body.telephone, date_naissance: body.date_naissance,
            categorie: body.categorie ?? null, niveau: body.niveau ?? null,
            licence_ffk: body.licence_ffk ?? null, message: body.message ?? null,
            is_mineur: body.is_mineur ? 1 : 0,
            parent_nom: body.parent_nom ?? null, parent_prenom: body.parent_prenom ?? null, parent_tel: body.parent_tel ?? null,
            paiement_status: paiementStatus,
          };
          const emailResults = await sendConfirmationEmails(env, { reg: regData, ev });
          return json({
            id: info.meta.last_row_id,
            event_id: body.event_id,
            paiement_status: paiementStatus,
            montant: ev.price,
            emails: emailResults,
          }, 201);
          } 
          
        // PUT /api/registrations/:id/status [admin]
        if (method === 'PUT' && resId && subRes === 'status') {
          await requireAdmin();
          const body = await request.json();
          const validStatuses = ['en_attente', 'paye', 'gratuit', 'annule'];
          if (!validStatuses.includes(body.paiement_status)) {
            return err(`Statut invalide. Valeurs : ${validStatuses.join(', ')}`);
          }
          const registration = await env.DB.prepare(
            `SELECT event_id FROM registrations WHERE id = ?`
          ).bind(resId).first();
          if (!registration) return err('Inscription introuvable', 404);
          const info = await env.DB.prepare(`
            UPDATE registrations SET paiement_status = ?, helloasso_ref = COALESCE(?, helloasso_ref) WHERE id = ?
          `).bind(body.paiement_status, body.helloasso_ref ?? null, resId).run();
          if (info.changes === 0) return err('Inscription introuvable', 404);
          await syncEventAvailability(env.DB, registration.event_id);
          return json({ id: resId, paiement_status: body.paiement_status });
        }

        // DELETE /api/registrations/:id [admin]
        // ── Supprime l'inscription ET restitue une place sur l'événement ──
        if (method === 'DELETE' && resId) {
          await requireAdmin();

          const reg = await env.DB.prepare(
            `SELECT event_id, paiement_status FROM registrations WHERE id = ?`
          ).bind(resId).first();
          if (!reg) return err('Inscription introuvable', 404);

          const info = await env.DB.prepare(
            `DELETE FROM registrations WHERE id = ?`
          ).bind(resId).run();
          if (info.changes === 0) return err('Inscription introuvable', 404);

          await syncEventAvailability(env.DB, reg.event_id);

          return json({ deleted: Number(resId), event_id: reg.event_id });
        }
      }

      // ══════════════════════════════════════════════════════════
      //  CHECKOUT HELLOASSO
      // ══════════════════════════════════════════════════════════
      if (resource === 'checkout' && method === 'POST') {
        const body = await request.json();
        const { event_id, nom, prenom, email } = body;
        if (!event_id || !nom || !prenom || !email) {
          return err('Champs requis : event_id, nom, prenom, email');
        }
        const rawEvent = await env.DB.prepare('SELECT * FROM events WHERE id = ?').bind(event_id).first();
        const ev = rawEvent ? await hydrateEvent(env.DB, rawEvent) : null;
        if (!ev)                     return err('Evenement introuvable', 404);
        if (ev.price === 0)          return err('Evenement gratuit, pas de checkout', 400);
        if (ev.status === 'complet') return err('Evenement complet', 409);
        if (ev.status === 'ferme')   return err('Les inscriptions sont fermées pour cet événement', 409);
        if (ev.spots_left <= 0)      return err('Plus de places disponibles', 409);

        const origin    = url.origin;
        const returnUrl = `${origin}/?checkout=success&event_id=${event_id}`;
        const errorUrl  = `${origin}/?checkout=error&event_id=${event_id}`;

        const redirectUrl = await createHelloAssoCheckout(env, {
          eventTitle: ev.title,
          amount:     ev.price,
          email, prenom, nom,
          returnUrl, errorUrl,
        });
        return json({ redirectUrl });
      }

      return err('Route introuvable', 404);

    } catch (e) {
      if (e instanceof ApiError) return err(e.message, e.status);
      console.error(e);
      return err('Erreur serveur interne', 500);
    }
  },
};
