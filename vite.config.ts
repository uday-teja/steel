import { createReadStream, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import site from './config/site.json' with { type: 'json' };

const base = process.env.SITE_BASE || site.basePath;
const dataDir = path.resolve(process.env.DATA_DIR || 'data');

/** Serve the generated /data directory during development (copied into dist at build time). */
function serveData(): Plugin {
  return {
    name: 'steelscope-data',
    configureServer(server) {
      server.middlewares.use(`${base}data`, (req, res, next) => {
        const file = path.join(dataDir, decodeURIComponent((req.url || '').split('?')[0]));
        if (!file.startsWith(dataDir) || !existsSync(file) || !statSync(file).isFile()) return next();
        res.setHeader('content-type', 'application/json');
        createReadStream(file).pipe(res);
      });
    },
  };
}

export default defineConfig({
  base,
  plugins: [react(), tailwindcss(), serveData()],
  build: { target: 'es2020', cssCodeSplit: false },
});
