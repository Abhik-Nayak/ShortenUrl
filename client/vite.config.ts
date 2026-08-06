import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Keeps the browser on one origin in dev: /api/* is forwarded to the API tier.
    proxy: {
      '/api': { target: 'http://localhost:5000', changeOrigin: true },
    },
  },
});
