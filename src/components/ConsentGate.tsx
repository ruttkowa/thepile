import { useState, type ReactNode } from 'react';
import { grantConsent, hasConsent } from '../consent';

export function ConsentGate({ children }: { children: ReactNode }) {
  const [granted, setGranted] = useState(hasConsent);

  if (granted) return <>{children}</>;

  return (
    <div className="consent-gate">
      <div className="consent-card">
        <h1 className="consent-title">Before you start</h1>
        <p>
          The Pile has no backend of its own, but your browser makes live requests
          directly to the <a href="https://scryfall.com" target="_blank" rel="noreferrer">Scryfall</a> API
          (<code>api.scryfall.com</code>, <code>cards.scryfall.io</code>) to fetch card data
          and images — currently the only third-party service this app calls. Your filters,
          piles, and swipe sessions are saved only in this browser's local storage —
          never as cookies, and never sent anywhere by us.
        </p>
        <p>
          By clicking OK you agree to these external requests and to our{' '}
          <a href="./legal.html#privacy" target="_blank" rel="noreferrer">privacy policy</a> and{' '}
          <a href="./legal.html#impressum" target="_blank" rel="noreferrer">legal notice</a>.
          The app cannot be used without accepting.
        </p>
        <button
          className="btn btn-primary btn-lg consent-ok"
          onClick={() => {
            grantConsent();
            setGranted(true);
          }}
        >
          OK
        </button>
      </div>
    </div>
  );
}
