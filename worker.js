/**
 * ══════════════════════════════════════════════════════════════
 *  AMERICAN FULL FIGHTING — BONS-EN-CHABLAIS
 *  Cloudflare Worker — API REST pour Cloudflare D1
 *
 *  Routes :
 *    GET    /api/events                  → liste tous les événements
 *    GET    /api/events/:id              → un événement + stats inscriptions
 *    POST   /api/events                  → créer un événement  [admin]
 *    PUT    /api/events/:id              → modifier un événement [admin]
 *    DELETE /api/events/:id              → supprimer un événement [admin]
 *
 *    POST   /api/registrations           → créer une inscription (public)
 *    GET    /api/registrations           → liste toutes les inscriptions [admin]
 *    GET    /api/registrations/:id       → détail d'une inscription [admin]
 *    PUT    /api/registrations/:id/status → changer le statut de paiement [admin]
 *    DELETE /api/registrations/:id       → supprimer une inscription [admin]
 *
 *  Auth admin : header  Authorization: Bearer <ADMIN_TOKEN>
 *  (définissez ADMIN_TOKEN dans les Secrets du Worker ou wrangler.toml)
 * ══════════════════════════════════════════════════════════════
 */

export default {
  async fetch(request, env) {
    const url    = new URL(request.url);
    const path   = url.pathname;          // ex: /api/events/stage1
    const method = request.method.toUpperCase();

    // ── CORS ────────────────────────────────────────────────────
    const corsHeaders = {
      'Access-Control-Allow-Origin':  '*',   // restreignez à votre domaine en prod
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // ── Helpers ─────────────────────────────────────────────────
    const json = (data, status = 200) =>
      new Response(JSON.stringify(data), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    const err = (msg, status = 400) => json({ error: msg }, status);

    // Authentification admin simple par Bearer token
    const isAdmin = () => {
      const auth  = request.headers.get('Authorization') || '';
      const token = auth.replace('Bearer ', '').trim();
      return token !== '' && token === (env.ADMIN_TOKEN || '');
    };

    const requireAdmin = () => {
      if (!isAdmin()) throw new ApiError('Non autorisé', 401);
    };

    // Génère un id type "evt" + timestamp court
    const genId = (prefix = 'evt') =>
      `${prefix}${Date.now().toString(36)}`;

    // Segments du chemin
    const segments = path.replace(/^\/api\//, '').split('/');
    const resource = segments[0];  // "events" | "registrations"
    const resId    = segments[1];  // id ou undefined
    const subRes   = segments[2];  // "status" ou undefined

    try {
      // ════════════════════════════════════════════════════════
      //  EVENTS
      // ════════════════════════════════════════════════════════
      if (resource === 'events') {

        // GET /api/events
        if (method === 'GET' && !resId) {
          const { results } = await env.DB.prepare(
            `SELECT * FROM events ORDER BY date_start ASC`
          ).all();
          return json(results);
        }

        // GET /api/events/:id
        if (method === 'GET' && resId) {
          const ev = await env.DB.prepare(
            `SELECT * FROM events WHERE id = ?`
          ).bind(resId).first();
          if (!ev) return err('Événement introuvable', 404);

          // Ajouter le nombre d'inscrits validés
          const count = await env.DB.prepare(
            `SELECT COUNT(*) as total FROM registrations
             WHERE event_id = ? AND paiement_status IN ('paye','gratuit')`
          ).bind(resId).first();

          return json({ ...ev, registrations_count: count?.total ?? 0 });
        }

        // POST /api/events  [admin]
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
            id,
            body.title, body.sub, body.type,
            body.status ?? 'disponible',
            body.date_start, body.date_end ?? null,
            body.time_start ?? null, body.time_end ?? null,
            body.lieu,
            body.price ?? 0,
            body.spots_total ?? 0,
            body.spots_left  ?? body.spots_total ?? 0,
            body.featured    ? 1 : 0,
            body.is_grade    ? 1 : 0,
            body.helloasso   ? 1 : 0,
            body.helloasso_url ?? null,
          ).run();

          const created = await env.DB.prepare(
            `SELECT * FROM events WHERE id = ?`
          ).bind(id).first();
          return json(created, 201);
        }

        // PUT /api/events/:id  [admin]
        if (method === 'PUT' && resId) {
          requireAdmin();
          const body = await request.json();
          validateEvent(body);

          await env.DB.prepare(`
            UPDATE events SET
              title = ?, sub = ?, type = ?, status = ?,
              date_start = ?, date_end = ?,
              time_start = ?, time_end = ?,
              lieu = ?, price = ?,
              spots_total = ?, spots_left = ?,
              featured = ?, is_grade = ?,
              helloasso = ?, helloasso_url = ?
            WHERE id = ?
          `).bind(
            body.title, body.sub, body.type,
            body.status ?? 'disponible',
            body.date_start, body.date_end ?? null,
            body.time_start ?? null, body.time_end ?? null,
            body.lieu,
            body.price ?? 0,
            body.spots_total ?? 0,
            body.spots_left  ?? body.spots_total ?? 0,
            body.featured    ? 1 : 0,
            body.is_grade    ? 1 : 0,
            body.helloasso   ? 1 : 0,
            body.helloasso_url ?? null,
            resId,
          ).run();

          const updated = await env.DB.prepare(
            `SELECT * FROM events WHERE id = ?`
          ).bind(resId).first();
          if (!updated) return err('Événement introuvable', 404);
          return json(updated);
        }

        // DELETE /api/events/:id  [admin]
        if (method === 'DELETE' && resId) {
          requireAdmin();
          const info = await env.DB.prepare(
            `DELETE FROM events WHERE id = ?`
          ).bind(resId).run();
          if (info.changes === 0) return err('Événement introuvable', 404);
          return json({ deleted: resId });
        }
      }

      // ════════════════════════════════════════════════════════
      //  REGISTRATIONS
      // ════════════════════════════════════════════════════════
      if (resource === 'registrations') {

        // GET /api/registrations  [admin]
        if (method === 'GET' && !resId) {
          requireAdmin();
          const eventFilter = url.searchParams.get('event_id');
          const statusFilter = url.searchParams.get('status');

          let query  = `SELECT r.*, e.title as event_title
                        FROM registrations r
                        JOIN events e ON e.id = r.event_id
                        WHERE 1=1`;
          const params = [];

          if (eventFilter) { query += ` AND r.event_id = ?`; params.push(eventFilter); }
          if (statusFilter) { query += ` AND r.paiement_status = ?`; params.push(statusFilter); }
          query += ` ORDER BY r.created_at DESC`;

          const stmt = env.DB.prepare(query);
          const { results } = await (params.length ? stmt.bind(...params) : stmt).all();
          return json(results);
        }

        // GET /api/registrations/:id  [admin]
        if (method === 'GET' && resId && !subRes) {
          requireAdmin();
          const reg = await env.DB.prepare(
            `SELECT r.*, e.title as event_title, e.price as event_price
             FROM registrations r
             JOIN events e ON e.id = r.event_id
             WHERE r.id = ?`
          ).bind(resId).first();
          if (!reg) return err('Inscription introuvable', 404);
          return json(reg);
        }

        // POST /api/registrations  [public]
        if (method === 'POST' && !resId) {
          const body = await request.json();
          validateRegistration(body);

          // Vérifier que l'événement existe et n'est pas complet
          const ev = await env.DB.prepare(
            `SELECT * FROM events WHERE id = ?`
          ).bind(body.event_id).first();
          if (!ev)             return err('Événement introuvable', 404);
          if (ev.status === 'complet') return err('Événement complet', 409);
          if (ev.spots_left <= 0)      return err('Plus de places disponibles', 409);

          const paiementStatus = ev.price === 0 ? 'gratuit' : 'en_attente';

          const info = await env.DB.prepare(`
            INSERT INTO registrations (
              event_id, nom, prenom, date_naissance, telephone, email,
              licence_ffk, is_mineur,
              categorie, niveau, regime,
              ceinture_actuelle, ceinture_visee,
              parent_nom, parent_prenom, parent_tel,
              message, certif_medical, droit_image, reglement_ok,
              montant, paiement_status, helloasso_ref
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
          `).bind(
            body.event_id,
            body.nom, body.prenom, body.date_naissance,
            body.telephone, body.email,
            body.licence_ffk   ?? null,
            body.is_mineur     ? 1 : 0,
            body.categorie     ?? null,
            body.niveau        ?? null,
            body.regime        ?? null,
            body.ceinture_actuelle ?? null,
            body.ceinture_visee    ?? null,
            body.parent_nom    ?? null,
            body.parent_prenom ?? null,
            body.parent_tel    ?? null,
            body.message       ?? null,
            body.certif_medical ? 1 : 0,
            body.droit_image    ? 1 : 0,
            body.reglement_ok   ? 1 : 0,
            ev.price,
            paiementStatus,
            body.helloasso_ref ?? null,
          ).run();

          return json({
            id:              info.meta.last_row_id,
            event_id:        body.event_id,
            paiement_status: paiementStatus,
            montant:         ev.price,
          }, 201);
        }

        // PUT /api/registrations/:id/status  [admin]
        if (method === 'PUT' && resId && subRes === 'status') {
          requireAdmin();
          const body = await request.json();
          const validStatuses = ['en_attente','paye','gratuit','annule'];
          if (!validStatuses.includes(body.paiement_status)) {
            return err(`Statut invalide. Valeurs : ${validStatuses.join(', ')}`);
          }

          const info = await env.DB.prepare(`
            UPDATE registrations
            SET paiement_status = ?,
                helloasso_ref   = COALESCE(?, helloasso_ref)
            WHERE id = ?
          `).bind(body.paiement_status, body.helloasso_ref ?? null, resId).run();

          if (info.changes === 0) return err('Inscription introuvable', 404);
          return json({ id: resId, paiement_status: body.paiement_status });
        }

        // DELETE /api/registrations/:id  [admin]
        if (method === 'DELETE' && resId) {
          requireAdmin();
          const info = await env.DB.prepare(
            `DELETE FROM registrations WHERE id = ?`
          ).bind(resId).run();
          if (info.changes === 0) return err('Inscription introuvable', 404);
          return json({ deleted: Number(resId) });
        }
      }

      return err('Route introuvable', 404);

    } catch (e) {
      if (e instanceof ApiError) return err(e.message, e.status);
      console.error(e);
      return err('Erreur serveur interne', 500);
    }
  },
};

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
  const required = [
    'event_id', 'nom', 'prenom', 'date_naissance', 'telephone', 'email'
  ];
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
