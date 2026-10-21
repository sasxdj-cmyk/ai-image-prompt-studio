import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './ui/App';
import { AppProvider } from './state/AppProvider';
import './styles.css';

const container = document.getElementById('root');
if (!container) throw new Error('The root element is missing in index.html');

createRoot(container).render(
  <StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </StrictMode>,
);

// Offline support: the service worker caches the app shell after the first
// visit, so the studio keeps working without a connection.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      /* the app works without the service worker too */
    });
  });
}
