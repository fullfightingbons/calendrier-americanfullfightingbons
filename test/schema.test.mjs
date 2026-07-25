// Garde-fou contre la régression corrigée le 25/07 : schema.sql (utilisé pour
// initialiser une base fraîche) avait dérivé des migrations réellement
// appliquées en prod, cassant silencieusement deux fonctionnalités :
//   - fermeture d'un événement (status='ferme' rejeté par le CHECK constraint)
//   - toute réservation (colonne cancel_token absente de la table)
// Ce test ne remplace pas une vraie vérification D1 (aucun harnais D1 dans ce
// repo), mais empêche qu'un futur schema.sql régresse de la même façon sans
// qu'on s'en aperçoive avant la mise en prod.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const schemaPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '../schema.sql');
const schema = readFileSync(schemaPath, 'utf8');

describe('schema.sql — cohérence avec worker.js et les migrations', () => {
  it("autorise le statut 'ferme' sur events (cf. migration 0003 + worker.js validStatuses)", () => {
    const match = schema.match(/CHECK \(status IN \(([^)]+)\)\)/);
    expect(match).not.toBeNull();
    expect(match[1]).toContain("'ferme'");
  });

  it('déclare cancel_token et rappel_envoye_at sur registrations (cf. migration 0008)', () => {
    const tableMatch = schema.match(/CREATE TABLE IF NOT EXISTS registrations \(([\s\S]*?)\n\);/);
    expect(tableMatch).not.toBeNull();
    expect(tableMatch[1]).toContain('cancel_token');
    expect(tableMatch[1]).toContain('rappel_envoye_at');
  });

  it('déclare poster_key sur events (cf. migration 0006)', () => {
    const tableMatch = schema.match(/CREATE TABLE IF NOT EXISTS events \(([\s\S]*?)\n\);/);
    expect(tableMatch).not.toBeNull();
    expect(tableMatch[1]).toContain('poster_key');
  });
});
