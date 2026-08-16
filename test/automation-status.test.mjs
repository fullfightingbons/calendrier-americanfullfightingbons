import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const workerSource = readFileSync(new URL('../worker.js', import.meta.url), 'utf8');
const indexSource = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

describe('automatisations calendrier', () => {
  it('trace les tâches cron dans automation_status et continue après un échec', () => {
    expect(workerSource).toContain('async function runTrackedAutomation');
    expect(workerSource).toContain('await runTrackedAutomation(env, key, label, task)');
    expect(workerSource).toContain("console.error(`[cron] ${key} a échoué`");
  });

  it('expose la route admin et l’onglet de suivi', () => {
    expect(workerSource).toContain("resource === 'admin' && resId === 'automation' && subRes === 'status'");
    expect(indexSource).toContain("switchAdminTab('automations',this)");
    expect(indexSource).toContain("loadAutomationStatus()");
  });
});
