import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readNight, type DigestRow } from '../src/digest/types.js';

describe('readNight', () => {
  it('reads runs/2026-10-28.jsonl into one row per job', () => {
    const night = readNight('runs', '2026-10-28');
    expect(night).not.toBeNull();
    if (!night) return;

    expect(night.night).toBe('2026-10-28');
    expect(night.badLines).toBe(1);
    expect(night.rows).toHaveLength(5);
    expect(night.rows.map((row) => row.job)).toEqual([
      'digest/render',
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
      'rig/rotate-logs',
    ]);

    const refresh = findRow(night.rows, 'fixtures/refresh');
    expect(refresh.runs).toBe(4);
    expect(refresh.retries).toBe(3);
    expect(refresh.lastStatus).toBe('ok');
    expect(refresh.lastError).toBe('upstream 503');

    const backup = findRow(night.rows, 'notes/backup');
    expect(backup.lastStatus).toBe('fail');
    expect(backup.lastError).toBe('quota exceeded');

    expect(findRow(night.rows, 'digest/render').owner).toBeNull();
    const sync = findRow(night.rows, 'lane/sync');
    expect(sync.firstAt).toBe('2026-10-28T23:00:06+01:00');
    expect(sync.lastAt).toBe('2026-10-29T05:00:04+01:00');
  });

  it('returns null when the night file is missing', () => {
    const dir = mkdtempSync(join(tmpdir(), 'rig-digest-'));
    try {
      expect(readNight(dir, '2026-10-28')).toBeNull();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('returns empty rows for an empty file', () => {
    const dir = mkdtempSync(join(tmpdir(), 'rig-digest-'));
    try {
      writeFileSync(join(dir, '2026-10-28.jsonl'), '');
      expect(readNight(dir, '2026-10-28')).toEqual({ night: '2026-10-28', rows: [], badLines: 0 });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('returns null on any other read error', () => {
    const dir = mkdtempSync(join(tmpdir(), 'rig-digest-'));
    const file = join(dir, 'not-a-directory');
    writeFileSync(file, '');
    try {
      expect(readNight(file, '2026-10-28')).toBeNull();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('skips blank lines and counts a line that does not parse', () => {
    const dir = mkdtempSync(join(tmpdir(), 'rig-digest-'));
    try {
      writeFileSync(
        join(dir, '2026-10-28.jsonl'),
        [
          '',
          '   ',
          '{"at":"2026-10-28T23:00:06+01:00","job":"lane/sync","status":"nope","owner":"rook"}',
          '{"at":"2026-10-28T23:00:06+01:00","job":"lane/sync","status":"ok","owner":"rook"}',
        ].join('\n'),
      );
      const night = readNight(dir, '2026-10-28');
      expect(night?.badLines).toBe(1);
      expect(night?.rows).toHaveLength(1);
      expect(night?.rows[0]?.runs).toBe(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

function findRow(rows: DigestRow[], job: string): DigestRow {
  const found = rows.find((row) => row.job === job);
  if (!found) throw new Error(`missing ${job}`);
  return found;
}
