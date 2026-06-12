import { useDice } from './hooks/useDice';
import DiceDisplay from './components/DiceDisplay';
import HistoryPanel from './components/HistoryPanel';
import './App.css';

function App() {
  const {
    number,
    isEnd,
    history,
    showHistory,
    hasRolledToday,
    isLoading,
    randomNumber,
    toggleHistory,
    clearHistory,
  } = useDice();

  return (
    <div className='flex flex-col md:flex-row w-screen min-h-screen'>
      <DiceDisplay
        number={number}
        isEnd={isEnd}
        hasRolledToday={hasRolledToday}
        isLoading={isLoading}
        onRoll={randomNumber}
      />
      <HistoryPanel
        history={history}
        showHistory={showHistory}
        onToggle={toggleHistory}
        onClear={clearHistory}
      />
    </div>
  );
}

export default App;
