import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { nightCounts } from '../src/status.js';

const config = { adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir: 'runs' };

describe('status board', () => {
  it('shows the lane banner and the nights on disk', async () => {
    process.env.LANE_MARKER = 'TEST-MARKER';
    const res = await createApp(config).request('/');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('TEST-MARKER');
    expect(html).toContain('href="/digest/2026-10-28"');
    expect(html).toContain('href="/digest/2026-10-27"');
    // 15 parsed lines: 10 ok, 4 retry, 1 fail. The unparsable line is not counted.
    expect(html).toContain('2026-10-28 · ok 10 · retry 4 · fail 1');
    expect(html).toContain('2026-10-27 · ok 7 · retry 0 · fail 0');
  });

  it('renders an unreadable night with em dashes', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rig-status-'));
    try {
      mkdirSync(join(dir, '2026-10-28.jsonl'));
      const res = await createApp({ ...config, runsDir: dir }).request('/');
      const html = await res.text();
      expect(html).toContain('href="/digest/2026-10-28"');
      expect(html).toContain('2026-10-28 · ok — · retry — · fail —');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('health answers with the lane id', async () => {
    const res = await createApp(config).request('/health');
    expect(await res.json()).toEqual({ ok: true, lane: 'lane-07' });
  });
});

describe('nightCounts', () => {
  it('returns null counts when the night log is missing', () => {
    const dir = mkdtempSync(join(tmpdir(), 'rig-status-'));
    try {
      expect(nightCounts(dir, '2026-10-28')).toEqual({
        night: '2026-10-28',
        ok: null,
        retry: null,
        fail: null,
      });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
