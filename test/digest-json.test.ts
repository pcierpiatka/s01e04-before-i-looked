import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { readNight } from '../src/digest/types.js';

const config = { adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir: 'runs' };

describe('GET /api/digest/:night', () => {
  it('returns the night readNight returns, jobs ascending', async () => {
    const expected = readNight(config.runsDir, '2026-10-28');
    const res = await createApp(config).request('/api/digest/2026-10-28');
    const body = await res.json();
    expect(body).toEqual(expected);
    expect(body.rows.map((row: { job: string }) => row.job)).toEqual([
      'digest/render',
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
      'rig/rotate-logs',
    ]);
    expect(body.rows.find((row: { job: string }) => row.job === 'fixtures/refresh').retries).toBe(3);
  });
});
