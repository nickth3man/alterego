import { routeRequest } from './api/routes.js';
import { createWebSocketHandler } from './api/websocket.js';

const { websocket } = createWebSocketHandler();

const server = Bun.serve({
  port: 3001,
  async fetch(req) {
    const url = new URL(req.url);
    const pathname = url.pathname;

    if (pathname.startsWith('/api/') || pathname === '/health/live' || pathname === '/health/ready') {
      return routeRequest(req);
    }

    return Response.json({ error: 'Not found' }, { status: 404 });
  },
  websocket,
});

console.log(`Server running on :${server.port}`);