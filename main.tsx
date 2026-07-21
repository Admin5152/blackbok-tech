import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './global.css';
import { ensureHashRoute } from './lib/hashRouteBootstrap';
import { consumeAuthRedirect } from './lib/consumeAuthRedirect';

ensureHashRoute();

async function boot() {
  // Establish recovery / confirm session before React navigates the hash route
  // (which would otherwise wipe `#access_token=…` from the URL).
  try {
    await consumeAuthRedirect();
  } catch (e) {
    console.warn('Auth redirect consume failed:', e);
  }

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
    </React.StrictMode>,
  );
}

void boot();
