import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'node:path';
import fs from 'node:fs';
import { apiRouter } from './src/api/routes/api.ts';
import { config } from './src/api/config.ts';
import { getBackendStatus } from './src/api/inference/index.ts';
import { Telemetry } from './src/api/telemetry/telemetry.ts';

async function startServer() {
  const app = express();
  const PORT = config.PORT;

  // JSON Body parsing with 5MB limit
  app.use(express.json({ limit: '5mb' }));

  // Probes required by section 5
  app.get('/healthz', (_req, res) => {
    res.status(200).json({ status: 'ok', uptime: process.uptime() });
  });

  app.get('/readyz', (_req, res) => {
    const status = getBackendStatus();
    res.status(200).json({ status: 'ready', backend: status.activeBackend });
  });

  // API router under /v1 and /api
  app.use('/v1', apiRouter);
  app.use('/api', apiRouter);

  // Mount Vite middlewares in development
  const isDev = process.env.NODE_ENV !== 'production';
  if (isDev) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: PORT,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving
    const distPath = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Noevix] Server running on http://0.0.0.0:${PORT}`);
    console.log(`[Noevix] Inference backend initialized: ${getBackendStatus().activeBackend}`);
  });
}

startServer().catch((err) => {
  console.error('[Noevix] Fatal startup error:', err);
  process.exit(1);
});
