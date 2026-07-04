import { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { fetchPage } from '../scryfall';
import type { CardMin, SwipeDir } from '../types';
import { SwipeCard, GhostCard, type DragOffset } from './SwipeCard';
import { PilePicker, PileChip } from './PilePicker';

interface Exiting {
  card: CardMin;
  dir: SwipeDir;
  from: DragOffset;
  key: number;
}

const QUEUE_LOW_WATER = 15;
const PRELOAD_COUNT = 6;

export function SwipeScreen() {
  const { state, dispatch } = useStore();
  const session = state.session;
  const [exiting, setExiting] = useState<Exiting[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryTick, setRetryTick] = useState(0);
  const loadingRef = useRef(false);
  const keyRef = useRef(0);

  const queue = session?.queue ?? [];
  const card = queue[0];
  const isPileMode = session?.source.kind === 'pile';
  const sourceIsTarget = isPileMode && session!.source.kind === 'pile' && session!.source.pileId === state.activePileId;

  // Fetch the next page when the queue runs low.
  useEffect(() => {
    if (!session?.nextPageUrl || session.queue.length >= QUEUE_LOW_WATER) return;
    if (loadingRef.current) return;
    loadingRef.current = true;
    fetchPage(session.nextPageUrl)
      .then((page) => {
        setLoadError(null);
        dispatch({ type: 'APPEND_QUEUE', cards: page.cards, nextPageUrl: page.nextPageUrl });
      })
      .catch((e: Error) => setLoadError(e.message))
      .finally(() => {
        loadingRef.current = false;
      });
  }, [session?.nextPageUrl, session?.queue.length, retryTick, dispatch]);

  // Warm the image cache for the next few cards.
  useEffect(() => {
    queue.slice(0, PRELOAD_COUNT).forEach((c) => {
      const img = new Image();
      img.src = c.image;
    });
  }, [queue]);

  // Reset flip state whenever the top card changes.
  useEffect(() => setFlipped(false), [card?.id]);

  const commit = useCallback(
    (dir: SwipeDir, from: DragOffset) => {
      if (!session || session.queue.length === 0) return;
      const top = session.queue[0];
      keyRef.current += 1;
      setExiting((prev) => [...prev.slice(-3), { card: top, dir, from, key: keyRef.current }]);
      dispatch({ type: 'SWIPE', dir });
    },
    [session, dispatch]
  );

  const undo = useCallback(() => {
    if (session && session.history.length > 0) dispatch({ type: 'UNDO' });
  }, [session, dispatch]);

  // Keyboard controls for desktop use.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (pickerOpen) return;
      if (e.key === 'ArrowLeft') commit('left', { dx: 0, dy: 0 });
      else if (e.key === 'ArrowRight') commit('right', { dx: 0, dy: 0 });
      else if (e.key === 'Backspace' || e.key === 'u') undo();
      else if (e.key === 'f') setFlipped((f) => !f);
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [commit, undo, pickerOpen]);

  if (!session) {
    return (
      <div className="empty-state">
        <p>No active session.</p>
        <button className="btn btn-primary" onClick={() => dispatch({ type: 'SET_VIEW', view: 'home' })}>
          Start a search
        </button>
      </div>
    );
  }

  const done = queue.length === 0 && !session.nextPageUrl;
  const progress = session.totalCards > 0 ? session.seenCount / session.totalCards : 0;
  const sourceLabel =
    session.source.kind === 'search' ? session.source.query : `Pile: ${session.source.pileName}`;
  const keepLabel = !isPileMode ? 'PILE' : sourceIsTarget ? 'KEEP' : 'MOVE';
  const passLabel = isPileMode ? 'CUT' : 'PASS';

  return (
    <div className="swipe-screen">
      <header className="swipe-header">
        <button
          className="icon-btn"
          aria-label="Adjust filters"
          onClick={() => dispatch({ type: 'SET_VIEW', view: 'home' })}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 6h16M7 12h10M10 18h4" />
          </svg>
        </button>
        <div className="swipe-progress">
          <span className="swipe-progress-text">
            {Math.min(session.seenCount + 1, session.totalCards)} / {session.totalCards}
          </span>
          <span className="swipe-progress-query" title={sourceLabel}>
            {sourceLabel}
          </span>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progress * 100}%` }} />
          </div>
        </div>
        <PileChip onClick={() => setPickerOpen(true)} />
      </header>

      <div className="card-stage">
        {queue[2] && <div className="mcard mcard-back mcard-back-2" />}
        {queue[1] && (
          <div className="mcard mcard-back mcard-back-1">
            <img src={queue[1].image} alt="" draggable={false} loading="eager" />
          </div>
        )}
        {card && (
          <SwipeCard
            key={card.id}
            card={card}
            flipped={flipped}
            onFlip={() => setFlipped((f) => !f)}
            onCommit={commit}
            keepLabel={keepLabel}
            passLabel={passLabel}
          />
        )}
        {exiting.map((e) => (
          <GhostCard
            key={e.key}
            card={e.card}
            dir={e.dir}
            from={e.from}
            onDone={() => setExiting((prev) => prev.filter((x) => x.key !== e.key))}
          />
        ))}

        {!card && !done && (
          <div className="stage-message">
            {loadError ? (
              <>
                <p className="error-text">{loadError}</p>
                <button className="btn btn-secondary" onClick={() => setRetryTick((t) => t + 1)}>
                  Retry
                </button>
              </>
            ) : (
              <>
                <div className="spinner" />
                <p>Shuffling up more cards…</p>
              </>
            )}
          </div>
        )}

        {done && (
          <div className="stage-message done-panel">
            <div className="done-emoji">🎉</div>
            <h2>Pile through!</h2>
            <p>
              You went through <strong>{session.seenCount}</strong>{' '}
              {session.seenCount === 1 ? 'card' : 'cards'} and kept{' '}
              <strong>{session.keptCount}</strong>.
            </p>
            <div className="done-actions">
              <button
                className="btn btn-primary"
                onClick={() => {
                  dispatch({ type: 'END_SESSION' });
                  dispatch({ type: 'SET_VIEW', view: 'piles' });
                }}
              >
                View piles
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  dispatch({ type: 'END_SESSION' });
                  dispatch({ type: 'SET_VIEW', view: 'home' });
                }}
              >
                New search
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="card-caption">
        {card ? (
          <>
            <span className="caption-name">{card.name}</span>
            <span className="caption-meta">
              {card.set.toUpperCase()} · {card.rarity}
              {card.usd ? ` · $${card.usd}` : ''}
            </span>
          </>
        ) : (
          <span className="caption-meta">&nbsp;</span>
        )}
      </div>

      <div className="swipe-actions">
        <button
          className="action-btn action-pass"
          aria-label="Pass (swipe left)"
          disabled={!card}
          onClick={() => commit('left', { dx: 0, dy: 0 })}
        >
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        <button
          className="action-btn action-undo"
          aria-label="Undo last swipe"
          disabled={session.history.length === 0}
          onClick={undo}
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 14 4 9l5-5" />
            <path d="M4 9h10a6 6 0 0 1 0 12h-3" />
          </svg>
        </button>
        <button
          className="action-btn action-keep"
          aria-label="Add to pile (swipe right)"
          disabled={!card}
          onClick={() => commit('right', { dx: 0, dy: 0 })}
        >
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>

      {pickerOpen && <PilePicker onClose={() => setPickerOpen(false)} />}
    </div>
  );
}
