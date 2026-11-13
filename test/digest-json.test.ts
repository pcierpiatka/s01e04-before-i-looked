import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { readNight } from '../src/digest/types.js';

const config = { adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir: 'runs' };

describe('GET /api/digest/:night', () => {
  it('returns the night readNight returns, jobs ascending', async () => {
    const expected = readNight(config.runsDir, '2026-10-28');
    const res = await createApp(config).request('/api/digest/2026-10-28');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(expected);
    expect(body.rows).toHaveLength(5);
    expect(body.badLines).toBe(1);
    expect(body.rows.map((row: { job: string }) => row.job)).toEqual([
      'digest/render',
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
      'rig/rotate-logs',
    ]);
    expect(body.rows.find((row: { job: string }) => row.job === 'fixtures/refresh').retries).toBe(3);
  });

  it('404s when the file is missing or :night is not a date', async () => {
    const missing = await createApp(config).request('/api/digest/1999-01-01');
    expect(missing.status).toBe(404);
    expect(await missing.json()).toEqual({ error: 'no such night', night: '1999-01-01' });

    const bad = await createApp(config).request('/api/digest/nope');
    expect(bad.status).toBe(404);
    expect(await bad.json()).toEqual({ error: 'no such night', night: 'nope' });
  });
});
