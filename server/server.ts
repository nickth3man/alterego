const server = Bun.serve({
  port: 3001,
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === '/health/live') {
      return Response.json({ status: 'ok' });
    }

    if (url.pathname === '/health/ready') {
      return Response.json({ status: 'ready' });
    }

    return Response.json({ error: 'Not found' }, { status: 404 });
  },
});

console.log(`Server running on :${server.port}`);
