import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

function localDbPlugin() {
  return {
    name: 'local-db-plugin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url.startsWith('/api/db/')) {
          const dbName = req.url.split('/')[3];
          const filePath = path.join(process.cwd(), `db_${dbName}.json`);
          
          if (req.method === 'GET') {
            if (fs.existsSync(filePath)) {
              res.setHeader('Content-Type', 'application/json');
              res.end(fs.readFileSync(filePath, 'utf-8'));
            } else {
              res.statusCode = 404;
              res.end(JSON.stringify({ error: 'Not found' }));
            }
          } else if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk.toString(); });
            req.on('end', () => {
              fs.writeFileSync(filePath, body, 'utf-8');
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true }));
            });
          }
        } else {
          next();
        }
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), localDbPlugin()],
  root: '.',
  base: './',
  build: {
    outDir: 'dist',
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api/yahoo': {
        target: 'https://query1.finance.yahoo.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/yahoo/, '/v8/finance'),
      },
    },
  },
});
