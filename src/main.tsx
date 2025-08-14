import { VERSION } from './version'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

// Self-hosted Inter font weights
import "@fontsource/inter/300.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";

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
