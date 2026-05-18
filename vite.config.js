import { defineConfig } from 'vite'

export default defineConfig({
  root: 'frontend',
  server: {
    port: 5173,
    proxy: {
      '/auth':   'http://localhost:8000',
      '/chat':   'http://localhost:8000',
      '/report': 'http://localhost:8000',
      '/admin':  'http://localhost:8000',
      '/stream': 'http://localhost:8000',
      '/drugs':  'http://localhost:8000',
    },
  },
})