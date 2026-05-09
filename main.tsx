import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './global.css';

const rootElement = document.getElementById('root');
const debugBanner = document.createElement('div');

debugBanner.id = 'blackbox-debug-banner';
debugBanner.style.cssText = [
  'position:fixed',
  'left:8px',
  'bottom:8px',
  'z-index:2147483647',
  'padding:6px 8px',
  'border:1px solid rgba(212,175,55,0.45)',
  'background:rgba(0,0,0,0.82)',
  'color:#f4e4c1',
  'font:11px/1.3 ui-monospace,SFMono-Regular,Menlo,monospace',
  'border-radius:6px',
  'pointer-events:none',
].join(';');

const setDebugStatus = (status: string) => {
  debugBanner.textContent = `route: ${window.location.pathname}${window.location.hash} | react: ${status}`;
};

setDebugStatus(rootElement ? 'mounting' : 'missing #root');
document.body.appendChild(debugBanner);

if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

queueMicrotask(() => setDebugStatus('mounted'));
window.addEventListener('popstate', () => setDebugStatus('mounted'));
window.addEventListener('hashchange', () => setDebugStatus('mounted'));