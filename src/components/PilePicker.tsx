import { useState } from 'react';
import { useStore } from '../store';

/** Bottom sheet for choosing / creating the target pile. */
export function PilePicker({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useStore();
  const [newName, setNewName] = useState('');

  const create = () => {
    const name = newName.trim();
    if (!name) return;
    dispatch({ type: 'CREATE_PILE', name, activate: true });
    setNewName('');
    onClose();
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <h2 className="sheet-title">Add cards to…</h2>
        <div className="sheet-list">
          {state.piles.map((p) => (
            <button
              key={p.id}
              className={`sheet-row ${p.id === state.activePileId ? 'selected' : ''}`}
              onClick={() => {
                dispatch({ type: 'SET_ACTIVE_PILE', pileId: p.id });
                onClose();
              }}
            >
              <span className="sheet-row-name">{p.name}</span>
              <span className="sheet-row-meta">
                {p.cards.length} {p.cards.length === 1 ? 'card' : 'cards'}
              </span>
              {p.id === state.activePileId && <span className="sheet-check">✓</span>}
            </button>
          ))}
        </div>
        <form
          className="sheet-new"
          onSubmit={(e) => {
            e.preventDefault();
            create();
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
            Create
          </button>
        </form>
      </div>
    </div>
  );
}

/** Compact chip showing the active pile; opens the picker. */
export function PileChip({ onClick }: { onClick: () => void }) {
  const { state } = useStore();
  const pile = state.piles.find((p) => p.id === state.activePileId) ?? state.piles[0];
  return (
    <button className="pile-chip" onClick={onClick} title="Change target pile">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
        <path d="M12 3 3 8l9 5 9-5-9-5Z" />
        <path d="m3 13 9 5 9-5" />
      </svg>
      <span className="pile-chip-name">{pile.name}</span>
      <span className="pile-chip-count">{pile.cards.length}</span>
    </button>
  );
}
