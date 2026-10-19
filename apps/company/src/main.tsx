import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import '@noevix/design-system/styles/tokens.css';
import '@noevix/design-system/styles/components.css';
import '@noevix/design-system/styles/globals.css';

window.onerror = (msg, url, line, col, error) => {
  console.error('[Noevix Company Runtime Error]', { msg, url, line, col, error: error?.stack });
};

window.onunhandledrejection = (event) => {
  console.error('[Noevix Company Unhandled Rejection]', event.reason);
};

const root = document.getElementById('root');
if (!root) {
  console.error('[Noevix Company] #root element not found in DOM');
} else {
  try {
    ReactDOM.createRoot(root).render(<App />);
  } catch (err) {
    console.error('[Noevix Company] Fatal render error:', err);
  }
}
