import { useEffect, useRef, useState } from 'react';
import type { CardMin, SwipeDir } from '../types';

export interface DragOffset {
  dx: number;
  dy: number;
}

interface Props {
  card: CardMin;
  flipped: boolean;
  onFlip: () => void;
  onCommit: (dir: SwipeDir, from: DragOffset) => void;
  keepLabel: string;
  passLabel: string;
}

interface PointerInfo {
  id: number;
  startX: number;
  startY: number;
  lastX: number;
  lastT: number;
  vx: number;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

export function SwipeCard({ card, flipped, onFlip, onCommit, keepLabel, passLabel }: Props) {
  const [drag, setDrag] = useState<DragOffset | null>(null);
  const pointer = useRef<PointerInfo | null>(null);
  const dragging = drag !== null;

  // While a drag is active, block native scrolling/pull-to-refresh entirely —
  // touch-action alone is not respected by every mobile browser mid-gesture.
  useEffect(() => {
    if (!dragging) return;
    const prevent = (e: TouchEvent) => e.preventDefault();
    document.addEventListener('touchmove', prevent, { passive: false });
    return () => document.removeEventListener('touchmove', prevent);
  }, [dragging]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointer.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    pointer.current = {
      id: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastT: performance.now(),
      vx: 0,
    };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const p = pointer.current;
    if (!p || p.id !== e.pointerId) return;
    const now = performance.now();
    const dt = Math.max(1, now - p.lastT);
    const instant = (e.clientX - p.lastX) / dt;
    p.vx = p.vx * 0.7 + instant * 0.3;
    p.lastX = e.clientX;
    p.lastT = now;
    setDrag({ dx: e.clientX - p.startX, dy: e.clientY - p.startY });
  };

  const release = (e: React.PointerEvent<HTMLDivElement>) => {
    const p = pointer.current;
    if (!p || p.id !== e.pointerId) return;
    pointer.current = null;
    const dx = e.clientX - p.startX;
    const dy = e.clientY - p.startY;
    const threshold = Math.min(window.innerWidth * 0.35, 150);
    const flick = Math.abs(p.vx) > 0.6 && Math.abs(dx) > 40 && Math.sign(p.vx) === Math.sign(dx);
    if (Math.abs(dx) > threshold || flick) {
      onCommit(dx > 0 ? 'right' : 'left', { dx, dy });
    }
    setDrag(null);
  };

  const cancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointer.current?.id === e.pointerId) {
      pointer.current = null;
      setDrag(null);
    }
  };

  const dx = drag?.dx ?? 0;
  const dy = drag?.dy ?? 0;
  const style: React.CSSProperties = drag
    ? {
        transform: `translate(${dx}px, ${dy * 0.5}px) rotate(${dx * 0.06}deg)`,
        transition: 'none',
        cursor: 'grabbing',
      }
    : { cursor: 'grab' };

  return (
    <div
      className="mcard mcard-top"
      style={style}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={release}
      onPointerCancel={cancel}
    >
      <div className={`card-flipper ${flipped ? 'flipped' : ''}`}>
        <img
          className="card-face card-front"
          src={card.image}
          alt={card.name}
          draggable={false}
        />
        {card.imageBack && (
          <img className="card-face card-back" src={card.imageBack} alt="" draggable={false} />
        )}
      </div>
      <div className="stamp stamp-keep" style={{ opacity: clamp01(dx / 90) }}>
        {keepLabel}
      </div>
      <div className="stamp stamp-pass" style={{ opacity: clamp01(-dx / 90) }}>
        {passLabel}
      </div>
      {card.imageBack && (
        <button
          className="flip-btn"
          aria-label="Flip card"
          onClick={onFlip}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 0 1 15.5-6.2L21 8" />
            <path d="M21 3v5h-5" />
            <path d="M21 12a9 9 0 0 1-15.5 6.2L3 16" />
            <path d="M3 21v-5h5" />
          </svg>
        </button>
      )}
    </div>
  );
}

interface GhostProps {
  card: CardMin;
  dir: SwipeDir;
  from: DragOffset;
  onDone: () => void;
}

/** Snapshot of a swiped card flying off screen. */
export function GhostCard({ card, dir, from, onDone }: GhostProps) {
  const [gone, setGone] = useState(false);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    // Double rAF so the initial transform paints before the transition starts.
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setGone(true));
    });
    const timer = setTimeout(() => doneRef.current(), 450);
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      clearTimeout(timer);
    };
  }, []);

  const sign = dir === 'right' ? 1 : -1;
  const style: React.CSSProperties = gone
    ? {
        transform: `translate(${sign * (window.innerWidth + 200)}px, ${from.dy * 0.5 + 60}px) rotate(${sign * 24}deg)`,
        transition: 'transform 0.42s cubic-bezier(0.15, 0.6, 0.4, 1)',
      }
    : {
        transform: `translate(${from.dx}px, ${from.dy * 0.5}px) rotate(${from.dx * 0.06}deg)`,
        transition: 'none',
      };

  return (
    <div className="mcard mcard-ghost" style={style}>
      <img src={card.image} alt="" draggable={false} />
    </div>
  );
}
