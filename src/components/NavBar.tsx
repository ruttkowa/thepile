import { activePile, useStore } from '../store';
import type { View } from '../types';

const SearchIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

const SwipeIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="7" y="4" width="11" height="16" rx="2" transform="rotate(6 12.5 12)" />
    <path d="M6.5 6.8 5 7.3a2 2 0 0 0-1.2 2.6l3 8.2" />
  </svg>
);

const PileIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3 3 8l9 5 9-5-9-5Z" />
    <path d="m3 13 9 5 9-5" />
  </svg>
);

export function NavBar() {
  const { state, dispatch } = useStore();
  const pile = activePile(state);
  const hasSession = state.session !== null;

  const tab = (view: View, label: string, icon: JSX.Element, disabled = false, badge?: number) => (
    <button
      className={`nav-tab ${state.view === view ? 'active' : ''}`}
      disabled={disabled}
      onClick={() => dispatch({ type: 'SET_VIEW', view })}
      aria-label={label}
    >
      <span className="nav-icon">
        {icon}
        {badge !== undefined && badge > 0 && <span className="nav-badge">{badge}</span>}
      </span>
      <span className="nav-label">{label}</span>
    </button>
  );

  return (
    <nav className="navbar">
      {tab('home', 'Search', SearchIcon)}
      {tab('swipe', 'Swipe', SwipeIcon, !hasSession)}
      {tab('piles', 'Piles', PileIcon, false, pile.cards.length)}
    </nav>
  );
}
