import { useStore } from './store';
import { HomeScreen } from './components/HomeScreen';
import { SwipeScreen } from './components/SwipeScreen';
import { PilesScreen } from './components/PilesScreen';
import { NavBar } from './components/NavBar';

export default function App() {
  const { state } = useStore();
  return (
    <div className="app">
      <main className="app-main">
        {state.view === 'home' && <HomeScreen />}
        {state.view === 'swipe' && <SwipeScreen />}
        {state.view === 'piles' && <PilesScreen />}
      </main>
      <NavBar />
    </div>
  );
}
