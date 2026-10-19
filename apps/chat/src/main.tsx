import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import '@noevix/design-system/styles/tokens.css';
import '@noevix/design-system/styles/components.css';
import '@noevix/design-system/styles/globals.css';

window.onerror = (msg, url, line, col, error) => {
  console.error('[Noevix Chat Runtime Error]', { msg, url, line, col, error: error?.stack });
};

window.onunhandledrejection = (event) => {
  console.error('[Noevix Chat Unhandled Rejection]', event.reason);
};

const root = document.getElementById('root');
if (!root) {
  console.error('[Noevix Chat] #root element not found in DOM');
} else {
  try {
    ReactDOM.createRoot(root).render(<App />);
  } catch (err) {
    console.error('[Noevix Chat] Fatal render error:', err);
  }
}
