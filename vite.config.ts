import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { CSP_DEV, CSP_PROD } from './src/lib/csp'

const isDev = process.env.NODE_ENV !== 'production'
const csp = isDev ? CSP_DEV : CSP_PROD

export default defineConfig({ 
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify('2.52'),
  },
  envPrefix: 'VITE_',
  server: {
    headers: {
      "Content-Security-Policy": csp,
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin"
    }
  },
  preview: {
    headers: {
      "Content-Security-Policy": csp,
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin"
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
