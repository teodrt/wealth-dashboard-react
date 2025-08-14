import { VERSION } from './version'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles.css'

// Global error handlers for debugging
if (typeof window !== 'undefined') {
  window.addEventListener('error', (e) => {
    console.error('[window.error]', e.error || e.message);
  });
  
  window.addEventListener('unhandledrejection', (e) => {
    console.error('[unhandledrejection]', e.reason);
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
