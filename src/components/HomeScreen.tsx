import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../store';
import { getSets, searchCards } from '../scryfall';
import {
  buildPresets,
  buildQuery,
  EMPTY_FILTERS,
  FORMATS,
  loadFilters,
  saveFilters,
  SORT_OPTIONS,
  type Filters,
} from '../query';
import type { SetInfo } from '../types';
import { PilePicker, PileChip } from './PilePicker';

const COLOR_OPTIONS: { code: string; label: string; className: string }[] = [
  { code: 'W', label: 'White', className: 'mana-w' },
  { code: 'U', label: 'Blue', className: 'mana-u' },
  { code: 'B', label: 'Black', className: 'mana-b' },
  { code: 'R', label: 'Red', className: 'mana-r' },
  { code: 'G', label: 'Green', className: 'mana-g' },
  { code: 'C', label: 'Colorless', className: 'mana-c' },
];

const RARITIES = [
  { code: 'c', label: 'Common' },
  { code: 'u', label: 'Uncommon' },
  { code: 'r', label: 'Rare' },
  { code: 'm', label: 'Mythic' },
];

export function HomeScreen() {
  const { state, dispatch } = useStore();
  const [filters, setFilters] = useState<Filters>(loadFilters);
  const [sort, setSort] = useState('name:auto');
  const [sets, setSets] = useState<SetInfo[]>([]);
  const [loading, setLoading] = useState<string | null>(null); // preset id or 'form'
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    getSets().then(setSets).catch(() => {});
  }, []);

  useEffect(() => saveFilters(filters), [filters]);

  const presets = useMemo(() => buildPresets(sets), [sets]);
  const session = state.session;
  const query = buildQuery(filters);

  const set = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    setFilters((f) => ({ ...f, [key]: value }));

  const toggleIn = (list: string[], v: string) =>
    list.includes(v) ? list.filter((x) => x !== v) : [...list, v];

  const start = async (q: string, order: string, dir: string, loadingKey: string) => {
    if (loading) return;
    setError(null);
    if (!q.trim()) {
      setError('Add at least one filter or search term first.');
      return;
    }
    setLoading(loadingKey);
    try {
      const page = await searchCards(q, order, dir);
      dispatch({
        type: 'START_SESSION',
        source: { kind: 'search', query: q },
        queue: page.cards,
        totalCards: page.totalCards,
        nextPageUrl: page.nextPageUrl,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed.');
    } finally {
      setLoading(null);
    }
  };

  const startForm = () => {
    const [order, dir] = sort.split(':');
    void start(query, order, dir, 'form');
  };

  return (
    <div className="home-screen">
      <header className="home-header">
        <div>
          <h1 className="app-title">The Pile</h1>
          <p className="app-tagline">Swipe through Magic cards. Keep the good ones.</p>
        </div>
        <PileChip onClick={() => setPickerOpen(true)} />
      </header>

      {session && (session.queue.length > 0 || session.nextPageUrl) && (
        <section className="resume-card">
          <div className="resume-info">
            <span className="resume-label">Session in progress</span>
            <span className="resume-query">
              {session.source.kind === 'search'
                ? session.source.query
                : `Pile: ${session.source.pileName}`}
            </span>
            <span className="resume-progress">
              {session.seenCount} of {session.totalCards} seen · {session.keptCount} kept
            </span>
          </div>
          <div className="resume-actions">
            <button
              className="btn btn-primary"
              onClick={() => dispatch({ type: 'SET_VIEW', view: 'swipe' })}
            >
              Resume
            </button>
            <button className="btn btn-ghost" onClick={() => dispatch({ type: 'END_SESSION' })}>
              Discard
            </button>
          </div>
        </section>
      )}

      <section className="presets">
        <h2 className="section-title">Quick piles</h2>
        <div className="preset-grid">
          {presets.map((p) => (
            <button
              key={p.id}
              className="preset-card"
              disabled={loading !== null}
              onClick={() => void start(p.query, p.order, p.dir, p.id)}
            >
              <span className="preset-title">
                {p.title}
                {loading === p.id && <span className="spinner spinner-sm" />}
              </span>
              <span className="preset-desc">{p.description}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="filter-form">
        <h2 className="section-title">Build your own filter</h2>

        <label className="field">
          <span className="field-label">Card name</span>
          <input
            className="input"
            placeholder="e.g. Lightning"
            value={filters.name}
            onChange={(e) => set('name', e.target.value)}
          />
        </label>

        <label className="field">
          <span className="field-label">Rules text</span>
          <input
            className="input"
            placeholder="e.g. draw a card"
            value={filters.oracle}
            onChange={(e) => set('oracle', e.target.value)}
          />
        </label>

        <label className="field">
          <span className="field-label">Type line</span>
          <input
            className="input"
            placeholder="e.g. legendary creature, instant, goblin"
            value={filters.type}
            onChange={(e) => set('type', e.target.value)}
          />
        </label>

        <div className="field">
          <span className="field-label">Colors</span>
          <div className="color-row">
            {COLOR_OPTIONS.map((c) => (
              <button
                key={c.code}
                type="button"
                className={`color-pip ${c.className} ${filters.colors.includes(c.code) ? 'on' : ''}`}
                title={c.label}
                onClick={() =>
                  set(
                    'colors',
                    c.code === 'C'
                      ? filters.colors.includes('C')
                        ? []
                        : ['C']
                      : toggleIn(filters.colors.filter((x) => x !== 'C'), c.code)
                  )
                }
              >
                {c.code}
              </button>
            ))}
          </div>
          {filters.colors.length > 0 && !filters.colors.includes('C') && (
            <div className="segmented">
              {(
                [
                  ['>=', 'Including'],
                  ['=', 'Exactly'],
                  ['<=', 'At most'],
                ] as const
              ).map(([op, label]) => (
                <button
                  key={op}
                  type="button"
                  className={filters.colorOp === op ? 'on' : ''}
                  onClick={() => set('colorOp', op)}
                >
                  {label}
                </button>
              ))}
              <button
                type="button"
                className={`seg-mode ${filters.colorMode === 'id' ? 'on' : ''}`}
                title="Match commander color identity instead of card colors"
                onClick={() => set('colorMode', filters.colorMode === 'id' ? 'c' : 'id')}
              >
                Identity
              </button>
            </div>
          )}
        </div>

        <div className="field-row">
          <label className="field">
            <span className="field-label">Mana value</span>
            <div className="mv-row">
              <select
                className="input input-select"
                value={filters.mvOp}
                onChange={(e) => set('mvOp', e.target.value as Filters['mvOp'])}
              >
                <option value="">any</option>
                <option value="=">=</option>
                <option value="<=">≤</option>
                <option value=">=">≥</option>
                <option value="<">&lt;</option>
              </select>
              <input
                className="input input-num"
                type="number"
                min={0}
                max={20}
                inputMode="numeric"
                value={filters.mv}
                disabled={!filters.mvOp}
                onChange={(e) => set('mv', e.target.value)}
              />
            </div>
          </label>
          <label className="field">
            <span className="field-label">Max price (USD)</span>
            <input
              className="input input-num"
              type="number"
              min={0}
              step="0.25"
              inputMode="decimal"
              placeholder="any"
              value={filters.maxPrice}
              onChange={(e) => set('maxPrice', e.target.value)}
            />
          </label>
        </div>

        <div className="field">
          <span className="field-label">Rarity</span>
          <div className="chip-row">
            {RARITIES.map((r) => (
              <button
                key={r.code}
                type="button"
                className={`chip rarity-${r.code} ${filters.rarities.includes(r.code) ? 'on' : ''}`}
                onClick={() => set('rarities', toggleIn(filters.rarities, r.code))}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div className="field-row">
          <label className="field">
            <span className="field-label">Set</span>
            <select
              className="input input-select"
              value={filters.set}
              onChange={(e) => set('set', e.target.value)}
            >
              <option value="">Any set</option>
              {sets.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.name} ({s.code.toUpperCase()})
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">Format</span>
            <select
              className="input input-select"
              value={filters.format}
              onChange={(e) => set('format', e.target.value)}
            >
              <option value="">Any format</option>
              {FORMATS.map((f) => (
                <option key={f} value={f}>
                  {f[0].toUpperCase() + f.slice(1)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="field">
          <span className="field-label">
            Raw Scryfall syntax{' '}
            <a
              href="https://scryfall.com/docs/syntax"
              target="_blank"
              rel="noreferrer"
              className="field-hint-link"
            >
              (syntax help)
            </a>
          </span>
          <input
            className="input mono"
            placeholder="e.g. is:commander devotion>=3"
            value={filters.raw}
            onChange={(e) => set('raw', e.target.value)}
            spellCheck={false}
          />
        </label>

        <label className="field">
          <span className="field-label">Sort order</span>
          <select className="input input-select" value={sort} onChange={(e) => setSort(e.target.value)}>
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        {query && (
          <p className="query-preview">
            <span className="mono">{query}</span>
          </p>
        )}
        {error && <p className="error-text">{error}</p>}

        <div className="form-actions">
          <button
            className="btn btn-ghost"
            type="button"
            onClick={() => setFilters({ ...EMPTY_FILTERS })}
          >
            Clear
          </button>
          <button
            className="btn btn-primary btn-lg"
            disabled={loading !== null || !query}
            onClick={startForm}
          >
            {loading === 'form' ? <span className="spinner spinner-sm" /> : 'Start swiping'}
          </button>
        </div>
      </section>

      <footer className="home-footer">
        <p>
          No account, no tracking — everything stays on this device. Card data & images by{' '}
          <a href="https://scryfall.com" target="_blank" rel="noreferrer">
            Scryfall
          </a>
          . Unofficial Fan Content permitted under WotC Fan Content Policy.
        </p>
        <p>
          <a href="./about.html">About</a> ·{' '}
          <a href="./legal.html#impressum">Legal notice</a> ·{' '}
          <a href="./legal.html#privacy">Privacy policy</a>
        </p>
      </footer>

      {pickerOpen && <PilePicker onClose={() => setPickerOpen(false)} />}
    </div>
  );
}
