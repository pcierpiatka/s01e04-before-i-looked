import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DigestRow, JobStatus, Night } from './types.js';

// ISO time with an offset, kept as the log wrote it. Never parsed into UTC.
const AT_WITH_OFFSET = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

type Parsed = {
  at: string;
  job: string;
  status: JobStatus;
  owner: string | null;
  error: string | null;
};

// No file, or any other read error, is null. An empty file is a night with no rows.
// A line that does not parse is counted in badLines, never thrown. Blank lines are skipped.
export function readNight(runsDir: string, night: string): Night | null {
  let text: string;
  try {
    text = readFileSync(join(runsDir, `${night}.jsonl`), 'utf8');
  } catch {
    return null;
  }

  const byJob = new Map<string, DigestRow>();
  let badLines = 0;

  for (const line of text.split('\n')) {
    if (line.trim() === '') continue;
    const parsed = parseLine(line);
    if (!parsed) {
      badLines += 1;
      continue;
    }
    const row = byJob.get(parsed.job);
    if (!row) {
      byJob.set(parsed.job, {
        job: parsed.job,
        owner: parsed.owner,
        runs: 1,
        retries: parsed.status === 'retry' ? 1 : 0,
        lastStatus: parsed.status,
        lastError: parsed.error,
        firstAt: parsed.at,
        lastAt: parsed.at,
      });
      continue;
    }
    row.runs += 1;
    if (parsed.status === 'retry') row.retries += 1;
    row.owner = parsed.owner;
    row.lastStatus = parsed.status;
    row.lastAt = parsed.at;
    if (parsed.error !== null) row.lastError = parsed.error;
  }

  const rows = [...byJob.values()].sort(byJobName);
  return { night, rows, badLines };
}

function parseLine(text: string): Parsed | null {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isRecord(value)) return null;

  const { at, job, status, owner, error } = value;
  if (!isAt(at) || !isJob(job) || !isStatus(status)) return null;
  if (owner !== undefined && owner !== null && typeof owner !== 'string') return null;
  if (error !== undefined && error !== null && typeof error !== 'string') return null;

  return {
    at,
    job,
    status,
    owner: typeof owner === 'string' ? owner : null,
    error: typeof error === 'string' && error !== '' ? error : null,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isAt(value: unknown): value is string {
  return typeof value === 'string' && AT_WITH_OFFSET.test(value);
}

function isJob(value: unknown): value is string {
  return typeof value === 'string' && value !== '';
}

function isStatus(value: unknown): value is JobStatus {
  return value === 'ok' || value === 'retry' || value === 'fail';
}

function byJobName(a: DigestRow, b: DigestRow): number {
  if (a.job < b.job) return -1;
  if (a.job > b.job) return 1;
  return 0;
}
