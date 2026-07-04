import type { Pile, Session } from './types';

const PILES_KEY = 'thepile:piles:v1';
const SESSION_KEY = 'thepile:session:v1';

/** Sessions older than this are considered stale and dropped on load. */
export const SESSION_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

export function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function makePile(name: string): Pile {
  return { id: newId(), name, cards: [], createdAt: Date.now() };
}

interface PilesBlob {
  piles: Pile[];
  activePileId: string;
}

export function loadPiles(): PilesBlob {
  try {
    const blob = JSON.parse(localStorage.getItem(PILES_KEY) ?? 'null') as PilesBlob | null;
    if (blob && Array.isArray(blob.piles) && blob.piles.length > 0) {
      if (!blob.piles.some((p) => p.id === blob.activePileId)) {
        blob.activePileId = blob.piles[0].id;
      }
      return blob;
    }
  } catch {
    /* corrupt storage — start fresh */
  }
  const pile = makePile('The Pile');
  return { piles: [pile], activePileId: pile.id };
}

export function savePiles(piles: Pile[], activePileId: string): void {
  try {
    localStorage.setItem(PILES_KEY, JSON.stringify({ piles, activePileId }));
  } catch (e) {
    console.warn('Could not persist piles', e);
  }
}

export function loadSession(): Session | null {
  try {
    const s = JSON.parse(localStorage.getItem(SESSION_KEY) ?? 'null') as Session | null;
    if (!s || !Array.isArray(s.queue)) return null;
    if (Date.now() - s.updatedAt > SESSION_MAX_AGE) return null;
    return s;
  } catch {
    return null;
  }
}

export function saveSession(session: Session | null): void {
  try {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  } catch (e) {
    console.warn('Could not persist session', e);
  }
}
