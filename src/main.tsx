import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Global error handlers to catch runtime errors
window.onerror = (msg, url, line, col, error) => {
  console.error('[Noevix Runtime Error]', { msg, url, line, col, error: error?.stack });
  return false;
};
window.onunhandledrejection = (event) => {
  console.error('[Noevix Unhandled Rejection]', event.reason);
};

try {
  const rootEl = document.getElementById('root');
  if (!rootEl) {
    console.error('[Noevix] #root element not found in DOM');
  } else {
    createRoot(rootEl).render(<App />);
  }
} catch (err: any) {
  console.error('[Noevix] Fatal render error:', err);
}
