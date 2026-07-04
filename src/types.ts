/** Trimmed card representation — everything the app needs, small enough to persist. */
export interface CardMin {
  id: string;
  name: string;
  set: string;
  set_name: string;
  collector_number: string;
  rarity: string;
  mana_cost: string;
  type_line: string;
  oracle_text: string;
  cmc: number;
  colors: string[];
  color_identity: string[];
  image: string;
  imageBack?: string;
  usd: string | null;
  eur: string | null;
  scryfall_uri: string;
}

export interface PileCard extends CardMin {
  addedAt: number;
}

export interface Pile {
  id: string;
  name: string;
  cards: PileCard[];
  createdAt: number;
}

export type SwipeDir = 'left' | 'right';

export type SessionSource =
  | { kind: 'search'; query: string }
  | { kind: 'pile'; pileId: string; pileName: string };

export interface HistoryEntry {
  card: CardMin;
  dir: SwipeDir;
  /** pile the card was added to (undo: remove it again) */
  addedTo?: string;
  /** card removed from a pile (undo: reinsert at index) */
  removed?: { pileId: string; card: PileCard; index: number };
}

export interface Session {
  source: SessionSource;
  /** remaining, not-yet-swiped cards (front = current) */
  queue: CardMin[];
  totalCards: number;
  seenCount: number;
  keptCount: number;
  nextPageUrl: string | null;
  history: HistoryEntry[];
  startedAt: number;
  updatedAt: number;
}

export interface SetInfo {
  code: string;
  name: string;
  released_at: string;
  set_type: string;
  card_count: number;
}

export type View = 'home' | 'swipe' | 'piles';
