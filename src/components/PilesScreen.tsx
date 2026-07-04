import { useState } from 'react';
import { useStore } from '../store';
import type { Pile } from '../types';
import { ExportModal } from './ExportModal';

export function PilesScreen() {
  const { state, dispatch } = useStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [exportPile, setExportPile] = useState<Pile | null>(null);
  const [newName, setNewName] = useState('');

  const createPile = () => {
    const name = newName.trim();
    if (!name) return;
    dispatch({ type: 'CREATE_PILE', name });
    setNewName('');
  };

  return (
    <div className="piles-screen">
      <header className="home-header">
        <div>
          <h1 className="app-title">Piles</h1>
          <p className="app-tagline">Your kept cards, sorted your way.</p>
        </div>
      </header>

      <div className="pile-list">
        {state.piles.map((pile) => (
          <PileRow
            key={pile.id}
            pile={pile}
            isActive={pile.id === state.activePileId}
            expanded={expandedId === pile.id}
            onToggle={() => setExpandedId(expandedId === pile.id ? null : pile.id)}
            onExport={() => setExportPile(pile)}
          />
        ))}
      </div>

      <form
        className="new-pile-form"
        onSubmit={(e) => {
          e.preventDefault();
          createPile();
        }}
      >
        <input
          className="input"
          placeholder="New pile name…"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          maxLength={40}
        />
        <button type="submit" className="btn btn-secondary" disabled={!newName.trim()}>
          Create pile
        </button>
      </form>

      {exportPile && <ExportModal pile={exportPile} onClose={() => setExportPile(null)} />}
    </div>
  );
}

function PileRow({
  pile,
  isActive,
  expanded,
  onToggle,
  onExport,
}: {
  pile: Pile;
  isActive: boolean;
  expanded: boolean;
  onToggle: () => void;
  onExport: () => void;
}) {
  const { dispatch } = useStore();
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState(pile.name);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const totalUsd = pile.cards.reduce((sum, c) => sum + (c.usd ? parseFloat(c.usd) : 0), 0);

  const saveRename = () => {
    const name = nameDraft.trim();
    if (name) dispatch({ type: 'RENAME_PILE', pileId: pile.id, name });
    setRenaming(false);
  };

  const swipePile = () => {
    dispatch({
      type: 'START_SESSION',
      source: { kind: 'pile', pileId: pile.id, pileName: pile.name },
      queue: pile.cards.map(({ addedAt: _addedAt, ...card }) => card),
      totalCards: pile.cards.length,
      nextPageUrl: null,
    });
  };

  return (
    <section className={`pile-row ${expanded ? 'expanded' : ''}`}>
      <button className="pile-row-head" onClick={onToggle}>
        <div className="pile-row-title">
          <span className="pile-row-name">
            {pile.name}
            {isActive && <span className="active-tag">target</span>}
          </span>
          <span className="pile-row-meta">
            {pile.cards.length} {pile.cards.length === 1 ? 'card' : 'cards'}
            {totalUsd > 0 && ` · ~$${totalUsd.toFixed(2)}`}
          </span>
        </div>
        <span className={`chevron ${expanded ? 'up' : ''}`}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </button>

      {expanded && (
        <div className="pile-row-body">
          {renaming ? (
            <form
              className="rename-form"
              onSubmit={(e) => {
                e.preventDefault();
                saveRename();
              }}
            >
              <input
                className="input"
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                maxLength={40}
                autoFocus
              />
              <button type="submit" className="btn btn-secondary">
                Save
              </button>
            </form>
          ) : (
            <div className="pile-actions">
              {!isActive && (
                <button
                  className="btn btn-ghost"
                  onClick={() => dispatch({ type: 'SET_ACTIVE_PILE', pileId: pile.id })}
                >
                  Make target
                </button>
              )}
              <button
                className="btn btn-ghost"
                disabled={pile.cards.length === 0}
                onClick={swipePile}
              >
                Swipe through
              </button>
              <button className="btn btn-ghost" disabled={pile.cards.length === 0} onClick={onExport}>
                Export
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => {
                  setNameDraft(pile.name);
                  setRenaming(true);
                }}
              >
                Rename
              </button>
              {confirmDelete ? (
                <button
                  className="btn btn-danger"
                  onClick={() => dispatch({ type: 'DELETE_PILE', pileId: pile.id })}
                >
                  Really delete?
                </button>
              ) : (
                <button className="btn btn-ghost btn-danger-ghost" onClick={() => setConfirmDelete(true)}>
                  Delete
                </button>
              )}
            </div>
          )}

          {pile.cards.length === 0 ? (
            <p className="pile-empty">Nothing here yet — swipe right on some cards.</p>
          ) : (
            <ul className="card-list">
              {pile.cards.map((c) => (
                <li key={c.id} className="card-list-item">
                  <img src={c.image} alt="" loading="lazy" className="card-thumb" />
                  <div className="card-list-info">
                    <span className="card-list-name">{c.name}</span>
                    <span className="card-list-meta">
                      {c.set.toUpperCase()} · {c.rarity}
                      {c.usd ? ` · $${c.usd}` : ''}
                    </span>
                  </div>
                  <button
                    className="icon-btn"
                    aria-label={`Remove ${c.name}`}
                    onClick={() => dispatch({ type: 'REMOVE_CARD', pileId: pile.id, cardId: c.id })}
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
