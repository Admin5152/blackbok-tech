import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './global.css';
import { ensureHashRoute } from './lib/hashRouteBootstrap';

ensureHashRoute();

const rootElement = document.getElementById('root');

try {
  if ('scrollRestoration' in window.history) {
    window.history.scrollRestoration = 'manual';
  }
} catch {
  /* ignore */
}
window.scrollTo(0, 0);
document.documentElement.scrollTop = 0;
document.body.scrollTop = 0;
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);