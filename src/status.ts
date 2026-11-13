import { readdirSync } from 'node:fs';
import type { RigConfig } from './config.js';
import { readNight } from './digest/types.js';
import { lastBeat, type Beat } from './heartbeat.js';

// One night on the board. Counts are null when the log cannot be read.
export type StatusNight = {
  night: string;
  ok: number | null;
  retry: number | null;
  fail: number | null;
};

export type Status = {
  adapter: string;
  installed: string;
  lastBeat: Beat | null;
  nights: StatusNight[];
};

// Nights on disk = runs/<YYYY-MM-DD>.jsonl, newest first.
export function nightsOnDisk(runsDir: string): string[] {
  try {
    return readdirSync(runsDir)
      .filter((f) => /^\d{4}-\d{2}-\d{2}\.jsonl$/.test(f))
      .map((f) => f.slice(0, 10))
      .sort()
      .reverse();
  } catch {
    return [];
  }
}

// Line counts from readNight rows. ok means lines that were neither retry nor fail.
// retry is every retry line; fail is a row whose last line failed. A missing log is nulls.
export function nightCounts(runsDir: string, night: string): StatusNight {
  const read = readNight(runsDir, night);
  if (read === null) return { night, ok: null, retry: null, fail: null };

  let runs = 0;
  let retry = 0;
  let fail = 0;
  for (const row of read.rows) {
    runs += row.runs;
    retry += row.retries;
    if (row.lastStatus === 'fail') fail += 1;
  }
  return { night, ok: runs - retry - fail, retry, fail };
}

export function readStatus(config: RigConfig): Status {
  return {
    adapter: config.adapter,
    installed: config.installed,
    lastBeat: lastBeat(),
    nights: nightsOnDisk(config.runsDir).map((night) => nightCounts(config.runsDir, night)),
  };
}
