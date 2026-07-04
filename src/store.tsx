import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  type Dispatch,
  type ReactNode,
} from 'react';
import type {
  CardMin,
  HistoryEntry,
  Pile,
  Session,
  SessionSource,
  SwipeDir,
  View,
} from './types';
import { loadPiles, loadSession, makePile, savePiles, saveSession } from './storage';

const HISTORY_LIMIT = 100;

export interface State {
  view: View;
  piles: Pile[];
  activePileId: string;
  session: Session | null;
}

export type Action =
  | { type: 'SET_VIEW'; view: View }
  | { type: 'CREATE_PILE'; name: string; activate?: boolean }
  | { type: 'RENAME_PILE'; pileId: string; name: string }
  | { type: 'DELETE_PILE'; pileId: string }
  | { type: 'SET_ACTIVE_PILE'; pileId: string }
  | { type: 'REMOVE_CARD'; pileId: string; cardId: string }
  | {
      type: 'START_SESSION';
      source: SessionSource;
      queue: CardMin[];
      totalCards: number;
      nextPageUrl: string | null;
    }
  | { type: 'APPEND_QUEUE'; cards: CardMin[]; nextPageUrl: string | null }
  | { type: 'SWIPE'; dir: SwipeDir }
  | { type: 'UNDO' }
  | { type: 'END_SESSION' };

function initState(): State {
  const { piles, activePileId } = loadPiles();
  return { view: 'home', piles, activePileId, session: loadSession() };
}

function updatePile(piles: Pile[], pileId: string, fn: (p: Pile) => Pile): Pile[] {
  return piles.map((p) => (p.id === pileId ? fn(p) : p));
}

function applySwipe(state: State, dir: SwipeDir): State {
  const session = state.session;
  if (!session || session.queue.length === 0) return state;
  const card = session.queue[0];
  const src = session.source;
  let piles = state.piles;
  const entry: HistoryEntry = { card, dir };

  if (dir === 'right') {
    const keepInPlace = src.kind === 'pile' && src.pileId === state.activePileId;
    if (!keepInPlace) {
      const target = piles.find((p) => p.id === state.activePileId);
      if (target && !target.cards.some((c) => c.id === card.id)) {
        piles = updatePile(piles, target.id, (p) => ({
          ...p,
          cards: [...p.cards, { ...card, addedAt: Date.now() }],
        }));
        entry.addedTo = target.id;
      }
      if (src.kind === 'pile') {
        piles = removeFromPile(piles, src.pileId, card.id, entry);
      }
    }
  } else if (src.kind === 'pile') {
    piles = removeFromPile(piles, src.pileId, card.id, entry);
  }

  const kept = dir === 'right' ? 1 : 0;
  return {
    ...state,
    piles,
    session: {
      ...session,
      queue: session.queue.slice(1),
      seenCount: session.seenCount + 1,
      keptCount: session.keptCount + kept,
      history: [...session.history.slice(-(HISTORY_LIMIT - 1)), entry],
      updatedAt: Date.now(),
    },
  };
}

function removeFromPile(
  piles: Pile[],
  pileId: string,
  cardId: string,
  entry: HistoryEntry
): Pile[] {
  const pile = piles.find((p) => p.id === pileId);
  if (!pile) return piles;
  const index = pile.cards.findIndex((c) => c.id === cardId);
  if (index === -1) return piles;
  entry.removed = { pileId, card: pile.cards[index], index };
  return updatePile(piles, pileId, (p) => ({
    ...p,
    cards: p.cards.filter((_, i) => i !== index),
  }));
}

function applyUndo(state: State): State {
  const session = state.session;
  if (!session || session.history.length === 0) return state;
  const entry = session.history[session.history.length - 1];
  let piles = state.piles;

  if (entry.addedTo) {
    piles = updatePile(piles, entry.addedTo, (p) => ({
      ...p,
      cards: p.cards.filter((c) => c.id !== entry.card.id),
    }));
  }
  if (entry.removed) {
    const { pileId, card, index } = entry.removed;
    piles = updatePile(piles, pileId, (p) => {
      const cards = [...p.cards];
      cards.splice(Math.min(index, cards.length), 0, card);
      return { ...p, cards };
    });
  }

  const kept = entry.dir === 'right' ? 1 : 0;
  return {
    ...state,
    piles,
    session: {
      ...session,
      queue: [entry.card, ...session.queue],
      seenCount: session.seenCount - 1,
      keptCount: session.keptCount - kept,
      history: session.history.slice(0, -1),
      updatedAt: Date.now(),
    },
  };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_VIEW':
      return { ...state, view: action.view };
    case 'CREATE_PILE': {
      const pile = makePile(action.name);
      return {
        ...state,
        piles: [...state.piles, pile],
        activePileId: action.activate ? pile.id : state.activePileId,
      };
    }
    case 'RENAME_PILE':
      return {
        ...state,
        piles: updatePile(state.piles, action.pileId, (p) => ({ ...p, name: action.name })),
      };
    case 'DELETE_PILE': {
      let piles = state.piles.filter((p) => p.id !== action.pileId);
      if (piles.length === 0) piles = [makePile('The Pile')];
      const activePileId = piles.some((p) => p.id === state.activePileId)
        ? state.activePileId
        : piles[0].id;
      // A session sourced from the deleted pile no longer makes sense.
      const session =
        state.session?.source.kind === 'pile' && state.session.source.pileId === action.pileId
          ? null
          : state.session;
      return { ...state, piles, activePileId, session };
    }
    case 'SET_ACTIVE_PILE':
      return { ...state, activePileId: action.pileId };
    case 'REMOVE_CARD':
      return {
        ...state,
        piles: updatePile(state.piles, action.pileId, (p) => ({
          ...p,
          cards: p.cards.filter((c) => c.id !== action.cardId),
        })),
      };
    case 'START_SESSION':
      return {
        ...state,
        view: 'swipe',
        session: {
          source: action.source,
          queue: action.queue,
          totalCards: action.totalCards,
          seenCount: 0,
          keptCount: 0,
          nextPageUrl: action.nextPageUrl,
          history: [],
          startedAt: Date.now(),
          updatedAt: Date.now(),
        },
      };
    case 'APPEND_QUEUE': {
      if (!state.session) return state;
      return {
        ...state,
        session: {
          ...state.session,
          queue: [...state.session.queue, ...action.cards],
          nextPageUrl: action.nextPageUrl,
          updatedAt: Date.now(),
        },
      };
    }
    case 'SWIPE':
      return applySwipe(state, action.dir);
    case 'UNDO':
      return applyUndo(state);
    case 'END_SESSION':
      return { ...state, session: null };
    default:
      return state;
  }
}

const StoreContext = createContext<{ state: State; dispatch: Dispatch<Action> } | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initState);

  useEffect(() => {
    savePiles(state.piles, state.activePileId);
  }, [state.piles, state.activePileId]);

  useEffect(() => {
    saveSession(state.session);
  }, [state.session]);

  return <StoreContext.Provider value={{ state, dispatch }}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore outside provider');
  return ctx;
}

export function activePile(state: State): Pile {
  return state.piles.find((p) => p.id === state.activePileId) ?? state.piles[0];
}
