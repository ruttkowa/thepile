import type { SetInfo } from './types';
import { latestExpansion } from './scryfall';

export interface Filters {
  name: string;
  oracle: string;
  type: string;
  colors: string[]; // W U B R G, or ['C'] for colorless
  colorMode: 'c' | 'id'; // colors vs. commander identity
  colorOp: '>=' | '=' | '<=';
  mvOp: '' | '=' | '<=' | '>=' | '<';
  mv: string;
  rarities: string[]; // c u r m
  set: string; // set code
  format: string;
  maxPrice: string;
  raw: string;
}

export const EMPTY_FILTERS: Filters = {
  name: '',
  oracle: '',
  type: '',
  colors: [],
  colorMode: 'c',
  colorOp: '>=',
  mvOp: '',
  mv: '',
  rarities: [],
  set: '',
  format: '',
  maxPrice: '',
  raw: '',
};

const FILTERS_KEY = 'thepile:filters:v1';

export function loadFilters(): Filters {
  try {
    const f = JSON.parse(localStorage.getItem(FILTERS_KEY) ?? 'null');
    if (f && typeof f === 'object') return { ...EMPTY_FILTERS, ...f };
  } catch {
    /* start clean */
  }
  return { ...EMPTY_FILTERS };
}

export function saveFilters(f: Filters): void {
  try {
    localStorage.setItem(FILTERS_KEY, JSON.stringify(f));
  } catch {
    /* non-fatal */
  }
}

function quoted(term: string): string {
  const t = term.trim();
  return /\s/.test(t) ? `"${t.replace(/"/g, '')}"` : t;
}

export function buildQuery(f: Filters): string {
  const parts: string[] = [];
  if (f.name.trim()) parts.push(quoted(f.name));
  if (f.oracle.trim()) parts.push(`o:${quoted(f.oracle)}`);
  if (f.type.trim()) parts.push(`t:${quoted(f.type)}`);
  if (f.colors.length > 0) {
    const value = f.colors.includes('C') ? 'c' : f.colors.join('').toLowerCase();
    const op = f.colors.includes('C') ? '=' : f.colorOp;
    parts.push(`${f.colorMode}${op === '=' ? ':' : op}${value}`);
  }
  if (f.mvOp && f.mv.trim() !== '') parts.push(`mv${f.mvOp === '=' ? ':' : f.mvOp}${f.mv.trim()}`);
  if (f.rarities.length > 0) {
    const terms = f.rarities.map((r) => `r:${r}`);
    parts.push(terms.length > 1 ? `(${terms.join(' or ')})` : terms[0]);
  }
  if (f.set) parts.push(`e:${f.set}`);
  if (f.format) parts.push(`f:${f.format}`);
  if (f.maxPrice.trim() !== '') parts.push(`usd<=${f.maxPrice.trim()}`);
  if (f.raw.trim()) parts.push(f.raw.trim());
  return parts.join(' ');
}

export const SORT_OPTIONS = [
  { value: 'name:auto', label: 'Name (A–Z)' },
  { value: 'released:desc', label: 'Newest first' },
  { value: 'edhrec:asc', label: 'Most played (EDHREC)' },
  { value: 'usd:desc', label: 'Price: high to low' },
  { value: 'usd:asc', label: 'Price: low to high' },
  { value: 'cmc:asc', label: 'Mana value: low to high' },
  { value: 'set:asc', label: 'Collector number' },
];

export interface Preset {
  id: string;
  title: string;
  description: string;
  query: string;
  order: string;
  dir: string;
}

/** Presets; the newest-set ones need the set list to resolve. */
export function buildPresets(sets: SetInfo[]): Preset[] {
  const latest = latestExpansion(sets);
  const presets: Preset[] = [];
  if (latest) {
    presets.push({
      id: 'latest-set',
      title: `Newest set: ${latest.name}`,
      description: `Every card in ${latest.code.toUpperCase()}, in collector order`,
      query: `e:${latest.code}`,
      order: 'set',
      dir: 'asc',
    });
    presets.push({
      id: 'latest-commons',
      title: 'Fresh commons & uncommons',
      description: `Draft fodder or hidden gems? ${latest.code.toUpperCase()} at low rarity`,
      query: `e:${latest.code} r<=uncommon`,
      order: 'set',
      dir: 'asc',
    });
  }
  presets.push(
    {
      id: 'downshifts',
      title: 'Downshifted to common',
      description: 'Cards recently reprinted at common — new Pauper toys',
      query: 'new:rarity r:common',
      order: 'released',
      dir: 'desc',
    },
    {
      id: 'budget-rares',
      title: 'Budget rares',
      description: 'Rares and mythics under $0.25',
      query: 'r>=rare usd<=0.25',
      order: 'edhrec',
      dir: 'asc',
    },
    {
      id: 'commander-staples',
      title: 'Commander staples',
      description: 'The most-played cards in EDH',
      query: 'f:commander',
      order: 'edhrec',
      dir: 'asc',
    },
    {
      id: 'pauper-removal',
      title: 'Pauper removal',
      description: 'Kill spells and bounce at common',
      query: 'f:pauper (o:destroy or o:exile or o:"return target")',
      order: 'edhrec',
      dir: 'asc',
    }
  );
  return presets;
}

export const FORMATS = [
  'standard',
  'pioneer',
  'modern',
  'legacy',
  'vintage',
  'commander',
  'pauper',
  'oathbreaker',
  'brawl',
];
