import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: '.',
  define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(process.env.supabase_url || process.env.VITE_SUPABASE_URL || ''),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(process.env.supabase_anon_key || process.env.VITE_SUPABASE_ANON_KEY || ''),
  },
  base: './',
  build: {
    outDir: 'dist',
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
      },
    },
  },
});
