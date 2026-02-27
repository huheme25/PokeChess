import { useGameStore } from './store';
import { TeamBuilder } from './components/TeamBuilder';
import { GameBoard } from './components/GameBoard';
import { BalanceDebug } from './components/BalanceDebug';

const TABS = [
  { id: 'builder' as const, label: 'Team Builder' },
  { id: 'game' as const, label: 'Game Board' },
  { id: 'balance' as const, label: 'Balance Debug' },
];

export function App() {
  const currentView = useGameStore(s => s.currentView);
  const setView = useGameStore(s => s.setView);

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">PokéChess 151</h1>
        <nav className="app-nav">
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`nav-tab ${currentView === tab.id ? 'active' : ''}`}
              onClick={() => setView(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>
      <main className="app-main">
        {currentView === 'builder' && <TeamBuilder />}
        {currentView === 'game' && <GameBoard />}
        {currentView === 'balance' && <BalanceDebug />}
      </main>
    </div>
  );
}
