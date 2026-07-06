import { describe, it, expect, vi } from 'vitest';

// worker.js importe `./index.html` et `./mentions-legales.html` comme texte brut
// via le bundler de Wrangler (règle de module par défaut). Sous Vitest/Node, on
// simule ces imports.
vi.mock('../index.html', () => ({ default: '<!doctype html><html></html>' }));
vi.mock('../mentions-legales.html', () => ({ default: '<!doctype html><html></html>' }));

const {
  ApiError,
  secureEquals,
  getAllowedOrigins,
  parseCookies,
  toBase64Url,
  fromBase64Url,
  withComputedEventState,
  validateEvent,
  validateRegistration,
  isUniqueConstraintError,
  isRateLimited,
  buildHelloAssoPaymentState,
} = await import('../worker.js');

describe('secureEquals', () => {
  it('retourne true pour deux chaînes identiques', () => {
    expect(secureEquals('abc123', 'abc123')).toBe(true);
  });

  it('retourne false pour des chaînes différentes de même longueur', () => {
    expect(secureEquals('abc123', 'abc124')).toBe(false);
  });

  it('retourne false pour des longueurs différentes', () => {
    expect(secureEquals('abc', 'abcd')).toBe(false);
  });

  it('gère les valeurs null/undefined sans lever d’exception', () => {
    expect(secureEquals(null, undefined)).toBe(true); // les deux deviennent ''
  });
});

describe('getAllowedOrigins', () => {
  it('inclut toujours l’origine de la requête', () => {
    const url = new URL('https://calendrier.americanfullfightingbons.fr/api/events');
    const origins = getAllowedOrigins({}, url);
    expect(origins.has('https://calendrier.americanfullfightingbons.fr')).toBe(true);
  });

  it('ajoute les origines configurées via CORS_ALLOWED_ORIGINS (CSV, avec espaces)', () => {
    const url = new URL('https://calendrier.americanfullfightingbons.fr/');
    const origins = getAllowedOrigins(
      { CORS_ALLOWED_ORIGINS: 'https://americanfullfightingbons.fr, https://www.americanfullfightingbons.fr' },
      url
    );
    expect(origins.has('https://americanfullfightingbons.fr')).toBe(true);
    expect(origins.has('https://www.americanfullfightingbons.fr')).toBe(true);
  });

  it('ignore les entrées vides dans CORS_ALLOWED_ORIGINS', () => {
    const url = new URL('https://calendrier.americanfullfightingbons.fr/');
    const origins = getAllowedOrigins({ CORS_ALLOWED_ORIGINS: ',,' }, url);
    expect(origins.size).toBe(1); // uniquement l'origine de la requête
  });
});

describe('parseCookies', () => {
  function fakeRequest(cookieHeader) {
    return { headers: { get: (name) => (name === 'Cookie' ? cookieHeader : null) } };
  }

  it('parse un en-tête Cookie simple', () => {
    const cookies = parseCookies(fakeRequest('a=1; b=2'));
    expect(cookies).toEqual({ a: '1', b: '2' });
  });

  it('décode les valeurs encodées en URL', () => {
    const cookies = parseCookies(fakeRequest('session=hello%20world'));
    expect(cookies.session).toBe('hello world');
  });

  it('retourne un objet vide sans en-tête Cookie', () => {
    expect(parseCookies(fakeRequest(null))).toEqual({});
  });
});

describe('toBase64Url / fromBase64Url', () => {
  it('fait un aller-retour fidèle', () => {
    const original = JSON.stringify({ userId: 'abc-123', role: 'admin' });
    const encoded = toBase64Url(original);
    expect(encoded).not.toMatch(/[+/=]/); // alphabet base64url uniquement
    expect(fromBase64Url(encoded)).toBe(original);
  });
});

describe('withComputedEventState', () => {
  it('calcule "disponible" quand il reste des places', () => {
    const result = withComputedEventState({ spots_total: 10, status: 'disponible' }, 4);
    expect(result.spots_left).toBe(6);
    expect(result.status).toBe('disponible');
  });

  it('calcule "complet" quand il ne reste plus de place', () => {
    const result = withComputedEventState({ spots_total: 10, status: 'disponible' }, 10);
    expect(result.spots_left).toBe(0);
    expect(result.status).toBe('complet');
  });

  it('force "ferme" même s’il reste des places disponibles', () => {
    const result = withComputedEventState({ spots_total: 10, status: 'ferme' }, 2);
    expect(result.status).toBe('ferme');
    expect(result.spots_left).toBe(8);
  });

  it('ne descend jamais sous 0 en cas de sur-réservation', () => {
    const result = withComputedEventState({ spots_total: 5, status: 'disponible' }, 9);
    expect(result.spots_left).toBe(0);
    expect(result.status).toBe('complet');
  });
});

describe('validateEvent', () => {
  const valid = { title: 'Stage', sub: 'Sous-titre', type: 'stage', date_start: '2026-09-01', lieu: 'Dojo' };

  it('accepte un événement valide', () => {
    expect(() => validateEvent(valid)).not.toThrow();
  });

  it('rejette un champ requis manquant', () => {
    const { title, ...rest } = valid;
    expect(() => validateEvent(rest)).toThrow(ApiError);
  });

  it('rejette un type invalide', () => {
    expect(() => validateEvent({ ...valid, type: 'inconnu' })).toThrow(ApiError);
  });

  it('rejette un statut invalide', () => {
    expect(() => validateEvent({ ...valid, status: 'archive' })).toThrow(ApiError);
  });
});

describe('validateRegistration', () => {
  const valid = {
    event_id: '1', nom: 'Dupont', prenom: 'Jean',
    date_naissance: '1990-01-01', telephone: '0600000000', email: 'jean@example.com',
  };

  it('accepte une inscription valide', () => {
    expect(() => validateRegistration(valid)).not.toThrow();
  });

  it('rejette un email invalide', () => {
    expect(() => validateRegistration({ ...valid, email: 'pas-un-email' })).toThrow(ApiError);
  });

  it('exige les informations du représentant légal pour un mineur', () => {
    expect(() => validateRegistration({ ...valid, is_mineur: true })).toThrow(ApiError);
  });

  it('accepte un mineur si les informations du représentant légal sont fournies', () => {
    expect(() =>
      validateRegistration({
        ...valid,
        is_mineur: true,
        parent_nom: 'Dupont',
        parent_prenom: 'Marie',
        parent_tel: '0600000001',
      })
    ).not.toThrow();
  });
});

describe('isUniqueConstraintError', () => {
  it('détecte une violation de contrainte UNIQUE générique', () => {
    expect(isUniqueConstraintError(new Error('UNIQUE constraint failed: registrations.email'))).toBe(true);
  });

  it('détecte une violation sur un index nommé précis', () => {
    expect(isUniqueConstraintError(new Error('idx_reg_unique_email_event failed'), 'idx_reg_unique_email_event')).toBe(true);
  });

  it('retourne une valeur fausse pour une autre erreur', () => {
    expect(isUniqueConstraintError(new Error('table non trouvée'))).toBeFalsy();
  });
});

describe('isRateLimited', () => {
  it('autorise les appels sous la limite', () => {
    const ip = 'test-ip-' + Math.random();
    for (let i = 0; i < 5; i++) {
      expect(isRateLimited(ip, 10)).toBe(false);
    }
  });

  it('bloque une fois la limite dépassée', () => {
    const ip = 'test-ip-' + Math.random();
    for (let i = 0; i < 10; i++) isRateLimited(ip, 10);
    expect(isRateLimited(ip, 10)).toBe(true);
  });
});

describe('buildHelloAssoPaymentState', () => {
  // Vérification server-to-server du paiement (correctif : calendrier ne
  // validait auparavant aucun paiement réel avant de créer une inscription).
  it('considère payé quand le montant réglé couvre le montant attendu', () => {
    const intent = { order: { payments: [{ amount: 4500 }] } };
    const state = buildHelloAssoPaymentState(intent, 45);
    expect(state.paid).toBe(true);
    expect(state.paidAmountCents).toBe(4500);
  });

  it('considère payé quand plusieurs paiements cumulés couvrent le montant', () => {
    const intent = { order: { payments: [{ amount: 2000 }, { amount: 2500 }] } };
    expect(buildHelloAssoPaymentState(intent, 45).paid).toBe(true);
  });

  it("n'est pas payé si le montant réglé est inférieur au montant attendu", () => {
    const intent = { order: { payments: [{ amount: 1000 }] } };
    expect(buildHelloAssoPaymentState(intent, 45).paid).toBe(false);
  });

  it("n'est pas payé s'il n'y a aucun paiement", () => {
    const intent = { order: { payments: [] } };
    expect(buildHelloAssoPaymentState(intent, 45).paid).toBe(false);
  });

  it('gère un intent sans commande associée (ex. abandon avant paiement)', () => {
    expect(buildHelloAssoPaymentState({}, 45).paid).toBe(false);
    expect(buildHelloAssoPaymentState(null, 45).paid).toBe(false);
  });

  it('ignore les paiements null/undefined dans le tableau', () => {
    const intent = { order: { payments: [null, { amount: 4500 }, undefined] } };
    expect(buildHelloAssoPaymentState(intent, 45).paid).toBe(true);
  });
});
