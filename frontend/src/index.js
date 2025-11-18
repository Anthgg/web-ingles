import React from 'react';
import ReactDOM from 'react-dom/client';
// Dev-only console filter for noisy extension errors
import './utils/devConsoleFilter';
import './tailwind.css';
import './mobile-responsive.css';
import App from './App';
import { ThemeProvider } from './context/ThemeContext';

// Handle dynamic import chunk load failures by reloading once
(() => {
  const RELOAD_FLAG = '__chunk_reload_once__';

  const shouldHandle = (err) => {
    try {
      const name = err?.name || '';
      const msg = err?.message || String(err || '');
      return name === 'ChunkLoadError' || msg.includes('Loading chunk');
    } catch (_) {
      return false;
    }
  };

  const reloadOnce = () => {
    if (sessionStorage.getItem(RELOAD_FLAG)) return;
    sessionStorage.setItem(RELOAD_FLAG, '1');
    window.location.reload();
  };

  window.addEventListener('unhandledrejection', (e) => {
    if (shouldHandle(e?.reason)) reloadOnce();
  });

  window.addEventListener('error', (e) => {
    const err = e?.error || e; 
    if (shouldHandle(err)) reloadOnce();
  });

  window.addEventListener('load', () => {
    // Clear the flag after a successful load to avoid loops
    if (sessionStorage.getItem(RELOAD_FLAG)) {
      sessionStorage.removeItem(RELOAD_FLAG);
    }
  });
})();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<ThemeProvider><App /></ThemeProvider>);
