import type { CardMin, SetInfo } from './types';

const API = 'https://api.scryfall.com';

// Scryfall asks for 50–100ms between requests. Serialize all calls through a
// promise chain with a minimum gap.
let chain: Promise<unknown> = Promise.resolve();
let lastRequest = 0;

function throttledFetch(url: string): Promise<Response> {
  const p = chain.then(async () => {
    const wait = lastRequest + 110 - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastRequest = Date.now();
    return fetch(url, { headers: { Accept: 'application/json' } });
  });
  chain = p.catch(() => {});
  return p;
}

async function getJson(url: string): Promise<any> {
  const res = await throttledFetch(url);
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const details =
      body && body.object === 'error'
        ? body.details
        : `Scryfall request failed (${res.status})`;
    throw new Error(details);
  }
  return body;
}

interface RawImageUris {
  normal?: string;
  large?: string;
  png?: string;
}

function bestImage(uris: RawImageUris | undefined): string {
  if (!uris) return '';
  return uris.large ?? uris.normal ?? uris.png ?? '';
}

export function toCardMin(raw: any): CardMin {
  const faces: any[] = Array.isArray(raw.card_faces) ? raw.card_faces : [];
  const front = raw.image_uris ? raw : faces[0] ?? raw;
  const back = !raw.image_uris && faces[1]?.image_uris ? faces[1] : null;
  const oracle =
    raw.oracle_text ??
    faces
      .map((f) => f.oracle_text)
      .filter(Boolean)
      .join('\n//\n');
  return {
    id: raw.id,
    name: raw.name,
    set: raw.set,
    set_name: raw.set_name,
    collector_number: raw.collector_number,
    rarity: raw.rarity,
    mana_cost: raw.mana_cost ?? faces[0]?.mana_cost ?? '',
    type_line: raw.type_line ?? faces.map((f) => f.type_line).filter(Boolean).join(' // '),
    oracle_text: oracle ?? '',
    cmc: raw.cmc ?? 0,
    colors: raw.colors ?? faces[0]?.colors ?? [],
    color_identity: raw.color_identity ?? [],
    image: bestImage(front.image_uris),
    imageBack: back ? bestImage(back.image_uris) : undefined,
    usd: raw.prices?.usd ?? null,
    eur: raw.prices?.eur ?? null,
    scryfall_uri: raw.scryfall_uri,
  };
}

export interface SearchPage {
  cards: CardMin[];
  totalCards: number;
  nextPageUrl: string | null;
}

function toPage(body: any): SearchPage {
  return {
    cards: (body.data as any[]).map(toCardMin),
    totalCards: body.total_cards ?? body.data.length,
    nextPageUrl: body.has_more ? body.next_page : null,
  };
}

export async function searchCards(
  query: string,
  order: string,
  dir: string
): Promise<SearchPage> {
  const params = new URLSearchParams({ q: query, unique: 'cards', order, dir });
  const body = await getJson(`${API}/cards/search?${params}`);
  return toPage(body);
}

export async function fetchPage(url: string): Promise<SearchPage> {
  return toPage(await getJson(url));
}

const SETS_KEY = 'thepile:sets:v1';
const SETS_TTL = 24 * 60 * 60 * 1000;
const RELEVANT_SET_TYPES = new Set([
  'expansion',
  'core',
  'masters',
  'commander',
  'draft_innovation',
  'funny',
  'remastered',
]);

export async function getSets(): Promise<SetInfo[]> {
  try {
    const cached = JSON.parse(localStorage.getItem(SETS_KEY) ?? 'null');
    if (cached && Date.now() - cached.fetchedAt < SETS_TTL) return cached.sets;
  } catch {
    /* fall through to fetch */
  }
  const body = await getJson(`${API}/sets`);
  const today = new Date().toISOString().slice(0, 10);
  const sets: SetInfo[] = (body.data as any[])
    .filter(
      (s) =>
        RELEVANT_SET_TYPES.has(s.set_type) &&
        !s.digital &&
        s.card_count > 0 &&
        s.released_at &&
        s.released_at <= today
    )
    .map((s) => ({
      code: s.code,
      name: s.name,
      released_at: s.released_at,
      set_type: s.set_type,
      card_count: s.card_count,
    }))
    .sort((a, b) => (a.released_at < b.released_at ? 1 : -1));
  try {
    localStorage.setItem(SETS_KEY, JSON.stringify({ fetchedAt: Date.now(), sets }));
  } catch {
    /* storage full — fine, just don't cache */
  }
  return sets;
}

/** Most recent premier expansion — used for the "newest set" preset. */
export function latestExpansion(sets: SetInfo[]): SetInfo | undefined {
  return sets.find((s) => s.set_type === 'expansion' || s.set_type === 'core');
}
