import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const config = { adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir: 'runs' };

describe('digest page', () => {
  it('renders the night from runs/', async () => {
    process.env.LANE_MARKER = 'TEST';
    const res = await createApp(config).request('/digest/2026-10-28');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('fixtures/refresh');
    expect(html).toContain('TEST');
    expect(html).toContain('digest/render');
    expect(html).toContain('—');
    expect(html).toContain('quota exceeded');
  });

  it('404s a night with no file', async () => {
    const res = await createApp(config).request('/digest/1999-01-01');
    expect(res.status).toBe(404);
    expect(await res.text()).toContain('no such night');
  });

  it('404s a night that is not a date', async () => {
    const res = await createApp(config).request('/digest/..%2Fx');
    expect(res.status).toBe(404);
  });
});
