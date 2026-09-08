import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import type { ProxyOptions } from 'vite'

// The Python dashboard backend (FastAPI/uvicorn) that owns the data + auth.
// In dev we proxy REST, WebSocket and static assets to it so the SPA shows
// real content and shares the session cookie.
const BACKEND = process.env.SAGE_BACKEND ?? 'http://127.0.0.1:8401'

const plain: ProxyOptions = { target: BACKEND, changeOrigin: true }

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 5177,
    strictPort: true,
    allowedHosts: true,
    proxy: {
      '/api': plain,
      '/static': plain,
      '/logout': plain,
      '/login': plain,
    },
  },
})
