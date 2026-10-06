import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // In dev, forward API calls to Express so the browser sees one origin (no CORS issues).
    proxy: {
      '/health': 'http://localhost:4000',
      '/api': 'http://localhost:4000',
    },
  },
})
