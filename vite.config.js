import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const brapiToken = env.VITE_BRAPI_TOKEN || env.BRAPI_TOKEN;

  return {
    plugins: [react()],
    root: '.',
    base: './',
    define: {
      'global': 'globalThis',
    },
    resolve: {
      alias: {
        buffer: resolve(__dirname, 'node_modules/buffer/'),
      },
    },
    build: {
      outDir: 'dist',
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom'],
            'vendor-router': ['react-router-dom'],
            'vendor-recharts': ['recharts'],
            'vendor-xlsx': ['xlsx-populate'],
          },
        },
      },
    },
    server: {
      host: '127.0.0.1',
      port: 5173,
      strictPort: true,
      proxy: {
        '/api/yahoo': {
          target: 'https://query1.finance.yahoo.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/yahoo/, '/v8/finance'),
        },
        '/api/brapi': {
          target: 'https://brapi.dev',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/brapi/, '/api'),
          configure: (proxy) => {
            if (!brapiToken) return;
            proxy.on('proxyReq', (proxyReq) => {
              const separator = proxyReq.path.includes('?') ? '&' : '?';
              proxyReq.path = `${proxyReq.path}${separator}token=${encodeURIComponent(brapiToken)}`;
            });
          },
        },
      },
    },
  };
});