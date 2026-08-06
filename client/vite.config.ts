import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Bind every interface, not just loopback, so the box is reachable at its
    // public IP. Left as `true` rather than a literal address: an EC2 public IP
    // changes on stop/start unless it is an Elastic IP.
    host: true,
    // Keeps the browser on one origin in dev: /api/* is forwarded to the API tier.
    // `target` stays loopback on purpose — this hop is made by the Vite process
    // to the API on the same box, never by the browser.
    proxy: {
      '/api': { target: 'http://localhost:5000', changeOrigin: true },
    },
  },
});
