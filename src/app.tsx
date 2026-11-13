import { Hono } from 'hono';
import { loadConfig, type RigConfig } from './config.js';
import { lane } from './lane.js';
import { readStatus } from './status.js';
import { Layout } from './views/layout.js';
import { StatusBoard } from './views/status.js';
import { renderDigest } from './views/digest.js';
import { isNight } from './digest/night.js';
import { readNight } from './digest/types.js';

export function createApp(config: RigConfig = loadConfig()) {
  const app = new Hono();

  app.get('/health', (c) => c.json({ ok: true, lane: lane().id }));

  app.get('/', (c) =>
    c.html(
      <Layout title="status" lane={lane()}>
        <StatusBoard status={readStatus(config)} />
      </Layout>,
    ),
  );

  app.get('/digest/:night', (c) => {
    const page = renderDigest(config.runsDir, c.req.param('night'), lane());
    return c.html(page.body, page.status);
  });

  app.get('/api/digest/:night', (c) => {
    const night = c.req.param('night');
    const found = isNight(night) ? readNight(config.runsDir, night) : null;
    if (!found) return c.json({ error: 'no such night', night }, 404);
    return c.json(found);
  });

  return app;
}
