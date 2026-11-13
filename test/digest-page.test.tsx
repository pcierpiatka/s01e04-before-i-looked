import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const config = { adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir: 'runs' };

describe('digest page', () => {
  it('renders a missing owner as a dash and keeps the last error', async () => {
    const res = await createApp(config).request('/digest/2026-10-28');
    const html = await res.text();
    expect(html).toContain('fixtures/refresh');
    expect(html).toContain('digest/render');
    expect(html).toContain('—');
    expect(html).toContain('quota exceeded');
  });
});
