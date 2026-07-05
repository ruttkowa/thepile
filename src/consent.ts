const CONSENT_KEY = 'thepile:consent:v1';

/** Bump this if the notice text changes materially — forces re-consent. */
const CONSENT_VERSION = 1;

export function hasConsent(): boolean {
  try {
    const blob = JSON.parse(localStorage.getItem(CONSENT_KEY) ?? 'null');
    return blob?.version === CONSENT_VERSION && blob?.granted === true;
  } catch {
    return false;
  }
}

export function grantConsent(): void {
  try {
    localStorage.setItem(
      CONSENT_KEY,
      JSON.stringify({ granted: true, version: CONSENT_VERSION, ts: Date.now() })
    );
  } catch {
    /* storage unavailable — consent won't persist across reloads, but this
       session can still proceed since grantConsent() was called explicitly */
  }
}
