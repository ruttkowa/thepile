import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { StoreProvider } from './store';
import App from './App';
import { ConsentGate } from './components/ConsentGate';
import { hasConsent } from './consent';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConsentGate>
      <StoreProvider>
        <App />
      </StoreProvider>
    </ConsentGate>
  </StrictMode>
);

if (import.meta.env.PROD && 'serviceWorker' in navigator && hasConsent()) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch((e) => {
      console.warn('Service worker registration failed', e);
    });
  });
}
