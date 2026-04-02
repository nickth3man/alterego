import { Show, Switch, Match } from 'solid-js';
import { gameStore } from './store/gameStore';
import StartScreen from './components/StartScreen';
import PersonalityQuiz from './components/PersonalityQuiz';
import CharacterCreation from './components/CharacterCreation';

function GameView() {
  return (
    <div class="placeholder-screen">
      <h2>Game View</h2>
      <p>Life simulation gameplay will appear here.</p>
      <p>Age: {gameStore.gameState()?.player.stats.age ?? '—'}</p>
    </div>
  );
}

function LifeSummary() {
  return (
    <div class="placeholder-screen">
      <h2>Life Summary</h2>
      <p>Your life story will be told here.</p>
    </div>
  );
}

function StageTransition() {
  return (
    <div class="placeholder-screen">
      <h2>Stage Transition</h2>
      <p>Moving to the next chapter of your life...</p>
    </div>
  );
}

export default function App() {
  return (
    <Switch fallback={<div>Unknown phase</div>}>
      <Match when={gameStore.gamePhase() === 'title'}>
        <StartScreen />
      </Match>
      <Match when={gameStore.gamePhase() === 'quiz'}>
        <PersonalityQuiz />
      </Match>
      <Match when={gameStore.gamePhase() === 'char-create'}>
        <CharacterCreation />
      </Match>
      <Match when={gameStore.gamePhase() === 'playing'}>
        <GameView />
      </Match>
      <Match when={gameStore.gamePhase() === 'stage-transition'}>
        <StageTransition />
      </Match>
      <Match when={gameStore.gamePhase() === 'gameover'}>
        <LifeSummary />
      </Match>
      <Match when={gameStore.gamePhase() === 'summary'}>
        <LifeSummary />
      </Match>
    </Switch>
  );
}
