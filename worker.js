/**
 * ══════════════════════════════════════════════════════════════
 *  AMERICAN FULL FIGHTING — BONS-EN-CHABLAIS
 *  Cloudflare Worker — sert index.html + API REST D1
 * ══════════════════════════════════════════════════════════════
 */

// ── Classe d'erreur métier ─────────────────────────────────────
class ApiError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
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
    const e = await resp.json();
    console.error('HelloAsso checkout error:', e);
    throw new ApiError('Erreur création checkout HelloAsso', 502);
  }
  const data = await resp.json();
  return data.redirectUrl;
}

// ── Brevo — envoi d'email ──────────────────────────────────────
async function sendBrevoEmail(env, { to, toName, subject, html }) {
  if (!env.BREVO_API_KEY) return;
  const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept':       'application/json',
      'api-key':      env.BREVO_API_KEY,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender:  { name: 'American Full Fighting Bons-en-Chablais', email: 'contact@americanfullfightingbons.fr' },
      to:      [{ email: to, name: toName }],
      subject,
      htmlContent: html,
    }),
  });
  if (!resp.ok) {
    const e = await resp.json().catch(() => ({}));
    console.error('Brevo error:', JSON.stringify(e));
  }
}

async function sendConfirmationEmails(env, { reg, ev }) {
  const CLUB_EMAIL = 'fullfightingbons@gmail.com';
  const CLUB_NAME  = 'American Full Fighting Bons-en-Chablais';
  const prix       = ev.price === 0 ? 'Gratuit' : `${ev.price} €`;
  const dateStr    = new Date(ev.date_start).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  const participantHtml = `<!DOCTYPE html><html lang="fr"><body style="font-family:sans-serif;color:#222;max-width:600px;margin:0 auto;padding:20px">
  <div style="background:#050505;padding:20px 24px;border-radius:8px 8px 0 0;text-align:center">
    <span style="font-family:sans-serif;font-size:22px;font-weight:900;letter-spacing:2px;color:#fff">AMERICAN FULL FIGHTING</span><br>
    <span style="color:#aaa;font-size:13px">Bons-en-Chablais · FFK</span>
  </div>
  <div style="border:1px solid #eee;border-top:none;padding:28px 24px;border-radius:0 0 8px 8px">
    <h2 style="color:#E10600;margin-top:0">✅ Inscription confirmée</h2>
    <p>Bonjour <strong>${reg.prenom} ${reg.nom}</strong>,</p>
    <p>Votre inscription à l'événement suivant a bien été enregistrée :</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      <tr style="background:#f9f9f9"><td style="padding:8px 12px;font-weight:600;width:40%">Événement</td><td style="padding:8px 12px">${ev.title}</td></tr>
      <tr><td style="padding:8px 12px;font-weight:600">Date</td><td style="padding:8px 12px">${dateStr}</td></tr>
      <tr style="background:#f9f9f9"><td style="padding:8px 12px;font-weight:600">Lieu</td><td style="padding:8px 12px">${ev.lieu}</td></tr>
      <tr><td style="padding:8px 12px;font-weight:600">Montant</td><td style="padding:8px 12px;font-weight:700;color:#E10600">${prix}</td></tr>
      <tr style="background:#f9f9f9"><td style="padding:8px 12px;font-weight:600">Statut paiement</td><td style="padding:8px 12px">${reg.paiement_status === 'gratuit' ? '✓ Gratuit' : reg.paiement_status === 'paye' ? '✓ Payé' : '⏳ En attente'}</td></tr>
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

  await Promise.allSettled([
    sendBrevoEmail(env, {
      to: reg.email, toName: `${reg.prenom} ${reg.nom}`,
      subject: `✅ Inscription confirmée — ${ev.title}`,
      html: participantHtml,
    }),
    sendBrevoEmail(env, {
      to: CLUB_EMAIL, toName: CLUB_NAME,
      subject: `🥊 Nouvelle inscription — ${ev.title} — ${reg.nom} ${reg.prenom}`,
      html: clubHtml,
    }),
  ]);
}

// ══════════════════════════════════════════════════════════════
//  WORKER PRINCIPAL
// ══════════════════════════════════════════════════════════════
export default {
  async fetch(request, env) {
    const url    = new URL(request.url);
    const path   = url.pathname;
    const method = request.method.toUpperCase();

    // ── Servir index.html depuis GitHub ───────────────────────
    if (method === 'GET' && (path === '/' || path === '' || path === '/index.html')) {
      const htmlResp = await fetch(
        'https://raw.githubusercontent.com/fullfightingbons/calendrier-americanfullfightingbons/main/index.html',
        { cf: { cacheEverything: true, cacheTtl: 300 } }
      );
      const html = await htmlResp.text();
      return new Response(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=300',
        },
      });
    }

    // ── CORS ───────────────────────────────────────────────────
    const corsHeaders = {
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // ── Helpers internes ───────────────────────────────────────
    const json = (data, status = 200) =>
      new Response(JSON.stringify(data), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    const err = (msg, status = 400) => json({ error: msg }, status);

    const isAdmin = () => {
      const auth  = request.headers.get('Authorization') || '';
      const token = auth.replace('Bearer ', '').trim();
      return token !== '' && token === (env.ADMIN_TOKEN || '');
    };

    const requireAdmin = () => {
      if (!isAdmin()) throw new ApiError('Non autorisé', 401);
    };

    const genId = (prefix = 'evt') => `${prefix}${Date.now().toString(36)}`;

    const segments = path.replace(/^\/api\//, '').split('/');
    const resource = segments[0];
    const resId    = segments[1];
    const subRes   = segments[2];

    try {
      // ══════════════════════════════════════════════════════════
      //  EVENTS
      // ══════════════════════════════════════════════════════════
      if (resource === 'events') {

        if (method === 'GET' && !resId) {
          const { results } = await env.DB.prepare(
            `SELECT * FROM events ORDER BY date_start ASC`
          ).all();
          return json(results);
        }

        if (method === 'GET' && resId) {
          const ev = await env.DB.prepare(
            `SELECT * FROM events WHERE id = ?`
          ).bind(resId).first();
          if (!ev) return err('Événement introuvable', 404);
          const count = await env.DB.prepare(
            `SELECT COUNT(*) as total FROM registrations WHERE event_id = ? AND paiement_status IN ('paye','gratuit')`
          ).bind(resId).first();
          return json({ ...ev, registrations_count: count?.total ?? 0 });
        }

        if (method === 'POST') {
          requireAdmin();
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
          const created = await env.DB.prepare(`SELECT * FROM events WHERE id = ?`).bind(id).first();
          return json(created, 201);
        }

        if (method === 'PUT' && resId) {
          requireAdmin();
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
          const updated = await env.DB.prepare(`SELECT * FROM events WHERE id = ?`).bind(resId).first();
          if (!updated) return err('Événement introuvable', 404);
          return json(updated);
        }

        if (method === 'DELETE' && resId) {
          requireAdmin();
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
            SELECT r.nom, r.prenom, r.paiement_status, e.title as event_title, e.date_start
            FROM registrations r
            JOIN events e ON e.id = r.event_id
            WHERE e.date_start >= date('now')
            ORDER BY e.date_start ASC
            LIMIT 20
          `).all();
          return json(results);
        }

        // GET /api/registrations [admin]
        if (method === 'GET' && !resId) {
          requireAdmin();
          const eventFilter  = url.searchParams.get('event_id');
          const statusFilter = url.searchParams.get('status');
          let query  = `SELECT r.*, e.title as event_title FROM registrations r JOIN events e ON e.id = r.event_id WHERE 1=1`;
          const params = [];
          if (eventFilter)  { query += ` AND r.event_id = ?`;        params.push(eventFilter); }
          if (statusFilter) { query += ` AND r.paiement_status = ?`; params.push(statusFilter); }
          query += ` ORDER BY r.created_at DESC`;
          const stmt = env.DB.prepare(query);
          const { results } = await (params.length ? stmt.bind(...params) : stmt).all();
          return json(results);
        }

        // GET /api/registrations/:id [admin]
        if (method === 'GET' && resId && !subRes) {
          requireAdmin();
          const reg = await env.DB.prepare(
            `SELECT r.*, e.title as event_title, e.price as event_price
             FROM registrations r JOIN events e ON e.id = r.event_id WHERE r.id = ?`
          ).bind(resId).first();
          if (!reg) return err('Inscription introuvable', 404);
          return json(reg);
        }

        // POST /api/registrations [public]
        if (method === 'POST' && !resId) {
          const body = await request.json();
          validateRegistration(body);
          const ev = await env.DB.prepare(`SELECT * FROM events WHERE id = ?`).bind(body.event_id).first();
          if (!ev)                     return err('Événement introuvable', 404);
          if (ev.status === 'complet') return err('Événement complet', 409);
          if (ev.spots_left <= 0)      return err('Plus de places disponibles', 409);
          const paiementStatus = ev.price === 0 ? 'gratuit' : 'en_attente';
          const info = await env.DB.prepare(`
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
            body.telephone, body.email,
            body.licence_ffk       ?? null, body.is_mineur ? 1 : 0,
            body.categorie         ?? null, body.niveau    ?? null, body.regime ?? null,
            body.ceinture_actuelle ?? null, body.ceinture_visee ?? null,
            body.parent_nom        ?? null, body.parent_prenom  ?? null, body.parent_tel ?? null,
            body.message           ?? null,
            body.certif_medical ? 1 : 0, body.droit_image ? 1 : 0, body.reglement_ok ? 1 : 0,
            ev.price, paiementStatus, body.helloasso_ref ?? null,
          ).run();
          const regData = {
            nom: body.nom, prenom: body.prenom, email: body.email,
            telephone: body.telephone, date_naissance: body.date_naissance,
            categorie: body.categorie ?? null, niveau: body.niveau ?? null,
            licence_ffk: body.licence_ffk ?? null, message: body.message ?? null,
            is_mineur: body.is_mineur ? 1 : 0,
            parent_nom: body.parent_nom ?? null, parent_prenom: body.parent_prenom ?? null, parent_tel: body.parent_tel ?? null,
            paiement_status: paiementStatus,
          };
          env.BREVO_API_KEY && sendConfirmationEmails(env, { reg: regData, ev }).catch(e => console.error('Email error:', e));
          return json({ id: info.meta.last_row_id, event_id: body.event_id, paiement_status: paiementStatus, montant: ev.price }, 201);
        }

        // PUT /api/registrations/:id/status [admin]
        if (method === 'PUT' && resId && subRes === 'status') {
          requireAdmin();
          const body = await request.json();
          const validStatuses = ['en_attente', 'paye', 'gratuit', 'annule'];
          if (!validStatuses.includes(body.paiement_status)) {
            return err(`Statut invalide. Valeurs : ${validStatuses.join(', ')}`);
          }
          const info = await env.DB.prepare(`
            UPDATE registrations SET paiement_status = ?, helloasso_ref = COALESCE(?, helloasso_ref) WHERE id = ?
          `).bind(body.paiement_status, body.helloasso_ref ?? null, resId).run();
          if (info.changes === 0) return err('Inscription introuvable', 404);
          return json({ id: resId, paiement_status: body.paiement_status });
        }

        // DELETE /api/registrations/:id [admin]
        if (method === 'DELETE' && resId) {
          requireAdmin();
          const info = await env.DB.prepare(`DELETE FROM registrations WHERE id = ?`).bind(resId).run();
          if (info.changes === 0) return err('Inscription introuvable', 404);
          return json({ deleted: Number(resId) });
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
        const ev = await env.DB.prepare('SELECT * FROM events WHERE id = ?').bind(event_id).first();
        if (!ev)                     return err('Evenement introuvable', 404);
        if (ev.price === 0)          return err('Evenement gratuit, pas de checkout', 400);
        if (ev.status === 'complet') return err('Evenement complet', 409);

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
