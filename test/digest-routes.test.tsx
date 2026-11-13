import { copyFileSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const runsDir = mkdtempSync(join(tmpdir(), 'rig-'));
const config = {
  adapter: 'shim',
  installed: '2026-10-29T14:06:00+01:00',
  beatEverySeconds: 60,
  runsDir,
};

const normal = '2026-10-28';
const empty = '2026-10-26';
const bad = '2026-10-25';
const missing = '1999-01-01';
const malformed = ['nope', '..%2F..%2Fetc', '..%2Fx'] as const;

beforeAll(() => {
  process.env.LANE_MARKER = 'ROUTE-MARKER';
  copyFileSync(join('runs', `${normal}.jsonl`), join(runsDir, `${normal}.jsonl`));
  writeFileSync(join(runsDir, `${empty}.jsonl`), '');
  writeFileSync(
    join(runsDir, `${bad}.jsonl`),
    [
      '{"at":"2026-10-25T01:00:00+01:00","job":"lane/sync","status":"ok","owner":"rook"}',
      'not json',
      '{"at":"2026-10-25T02:00:00+01:00","job":"notes/backup","status":"ok","owner":"rook"}',
    ].join('\n'),
  );
});

afterAll(() => {
  rmSync(runsDir, { recursive: true, force: true });
});

describe('digest routes', () => {
  describe('GET /digest/:night', () => {
    it('returns 200 with the table and the lane marker', async () => {
      const { status, html } = await getPage(normal);
      const marker = process.env.LANE_MARKER ?? '';
      expect(status).toBe(200);
      expect(html).toContain('<table>');
      expect(marker).toBe('ROUTE-MARKER');
      expect(html).toContain(marker);
    });

    it('returns 404 when the night file is missing', async () => {
      const { status, html } = await getPage(missing);
      expect(status).toBe(404);
      expect(html).toContain('no such night');
    });

    it('returns 404 for a malformed night segment', async () => {
      for (const night of malformed) {
        const { status, html } = await getPage(night);
        expect(status, night).toBe(404);
        expect(html, night).toContain('no such night');
      }
    });

    it('renders nothing ran for an empty file', async () => {
      const { status, html } = await getPage(empty);
      expect(status).toBe(200);
      expect(html).toContain('nothing ran');
    });

    it('says when a line did not parse', async () => {
      const { status, html } = await getPage(bad);
      expect(status).toBe(200);
      expect(html).toContain('1 line did not parse');
    });

    it('marks fail and retries of 3 or more', async () => {
      const { status, html } = await getPage(normal);
      expect(status).toBe(200);
      expect(html).toContain('<td class="warn">3</td>');
      expect(html).toContain('<td class="warn">fail</td>');
    });
  });

  describe('GET /api/digest/:night', () => {
    it('returns 200 with 5 rows and 1 bad line', async () => {
      const { status, body } = await getJson(normal);
      expect(status).toBe(200);
      expect(body.rows).toHaveLength(5);
      expect(body.badLines).toBe(1);
    });

    it('returns 404 when the night file is missing', async () => {
      const { status, body } = await getJson(missing);
      expect(status).toBe(404);
      expect(body).toEqual({ error: 'no such night', night: missing });
    });

    it('returns 404 for a malformed night segment', async () => {
      for (const night of malformed) {
        const { status, body } = await getJson(night);
        expect(status, night).toBe(404);
        expect(body, night).toEqual({ error: 'no such night', night: decodeURIComponent(night) });
      }
    });

    it('returns empty rows for an empty file', async () => {
      const { status, body } = await getJson(empty);
      expect(status).toBe(200);
      expect(body.rows).toEqual([]);
      expect(body.badLines).toBe(0);
    });

    it('counts one bad line among good lines', async () => {
      const { status, body } = await getJson(bad);
      expect(status).toBe(200);
      expect(body.badLines).toBe(1);
    });
  });

  it('lists the same jobs in the same order on the page and in JSON', async () => {
    const { html } = await getPage(normal);
    const { body } = await getJson(normal);
    expect(jobCells(html)).toEqual(body.rows.map((row) => row.job));
  });
});

function jobCells(html: string): string[] {
  const jobs: string[] = [];
  for (const row of html.match(/<tr>[\s\S]*?<\/tr>/g) ?? []) {
    const cell = row.match(/<td>([^<]*)<\/td>/);
    if (cell?.[1] !== undefined) jobs.push(cell[1]);
  }
  return jobs;
}

async function getPage(night: string): Promise<{ status: number; html: string }> {
  const res = await createApp(config).request(`/digest/${night}`);
  return { status: res.status, html: await res.text() };
}

async function getJson(night: string): Promise<{ status: number; body: DigestJson }> {
  const res = await createApp(config).request(`/api/digest/${night}`);
  return { status: res.status, body: (await res.json()) as DigestJson };
}

type DigestJson = {
  rows: { job: string }[];
  badLines: number;
  error?: string;
  night?: string;
};
