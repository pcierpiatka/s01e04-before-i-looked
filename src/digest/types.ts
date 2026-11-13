export type JobStatus = 'ok' | 'retry' | 'fail';

// One job across the night. owner and lastStatus are from the latest line;
// lastError is from the latest line that carried one. Times stay log strings.
export type DigestRow = {
  job: string;
  owner: string | null;
  runs: number;
  retries: number;
  lastStatus: JobStatus;
  lastError: string | null;
  firstAt: string;
  lastAt: string;
};

export type Night = {
  night: string;
  rows: DigestRow[];
  badLines: number;
};

export { readNight } from './read.js';
