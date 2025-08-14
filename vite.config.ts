import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig({ 
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify('2.52'),
  },
  envPrefix: 'VITE_',
  server: {
    headers: {
      'Content-Security-Policy': "script-src 'self' 'unsafe-eval' 'unsafe-inline'; object-src 'none';"
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  }
})
