import type { Child } from 'hono/jsx';
import { isNight } from '../digest/night.js';
import { readNight, type DigestRow, type Night } from '../digest/types.js';
import type { Lane } from '../lane.js';
import { Layout } from './layout.js';

const DASH = '—';

export function DigestPage({ night, lane: who }: { night: Night; lane: Lane }) {
  return (
    <Layout title={`digest · ${night.night}`} lane={who}>
      <h1>digest · {night.night}</h1>
      {night.rows.length === 0 ? <p>nothing ran</p> : <DigestTable rows={night.rows} />}
      {night.badLines > 0 ? <p class="mute">{unparsed(night.badLines)}</p> : null}
    </Layout>
  );
}

export function renderDigest(runsDir: string, night: string, who: Lane) {
  if (!isNight(night)) return missing(who);
  const data = readNight(runsDir, night);
  if (!data) return missing(who);
  return { status: 200 as const, body: <DigestPage night={data} lane={who} /> };
}

function DigestTable({ rows }: { rows: DigestRow[] }) {
  return (
    <table>
      <thead>
        <tr>
          <th>job</th>
          <th>owner</th>
          <th>runs</th>
          <th>retries</th>
          <th>last status</th>
          <th>last error</th>
          <th>first</th>
          <th>last</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr>
            <td>{row.job}</td>
            <td>{row.owner ?? DASH}</td>
            <td>{row.runs}</td>
            <Marked warn={row.retries >= 3}>{row.retries}</Marked>
            <Marked warn={row.lastStatus === 'fail'}>{row.lastStatus}</Marked>
            <td>{row.lastError ?? DASH}</td>
            <td>{row.firstAt}</td>
            <td>{row.lastAt}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Marked({ warn, children }: { warn: boolean; children: Child }) {
  return warn ? <td class="warn">{children}</td> : <td>{children}</td>;
}

function missing(who: Lane) {
  return {
    status: 404 as const,
    body: (
      <Layout title="digest" lane={who}>
        <p>no such night</p>
      </Layout>
    ),
  };
}

function unparsed(count: number): string {
  return count === 1 ? '1 line did not parse' : `${count} lines did not parse`;
}
