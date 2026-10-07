import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `npm run dev` proxies API calls and short codes to the server on :3000 (nginx does this in Docker)
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
      '^/[A-Za-z0-9]{7}$': 'http://localhost:3000',
    },
  },
});
