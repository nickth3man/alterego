import { Show } from 'solid-js';
import { gameStore } from '../store/gameStore';

export default function StartScreen() {
  function handleNewGame() {
    gameStore.setGamePhase('quiz');
  }

  function handleLoadGame() {
    gameStore.setGamePhase('playing');
    gameStore.loadSaveList();
  }

  return (
    <div class="start-screen">
      <div class="start-screen__atmosphere" />

      <div class="start-screen__content">
        <h1 class="start-screen__title">Alter Ego</h1>
        <p class="start-screen__subtitle">A Life Simulation</p>

        <div class="start-screen__divider">
          <span class="start-screen__divider-line" />
          <span class="start-screen__divider-diamond">◆</span>
          <span class="start-screen__divider-line" />
        </div>

        <div class="start-screen__actions">
          <button type="button" class="btn btn--primary" onClick={handleNewGame}>
            New Game
          </button>
          <button type="button" class="btn btn--secondary" onClick={handleLoadGame}>
            Load Game
          </button>
        </div>

        <div class="start-screen__challenge">
          <h3 class="start-screen__challenge-title">Challenge Modes</h3>
          <div class="start-screen__challenge-list">
            <button type="button" class="btn btn--challenge" disabled>
              <span class="btn__icon">👑</span>
              Born to Rule
            </button>
            <button type="button" class="btn btn--challenge" disabled>
              <span class="btn__icon">🎭</span>
              Double Life
            </button>
            <button type="button" class="btn btn--challenge" disabled>
              <span class="btn__icon">⏳</span>
              Against Time
            </button>
          </div>
          <p class="start-screen__challenge-note">Coming soon</p>
        </div>

        <Show when={gameStore.error()}>
          {(err) => <p class="start-screen__error">{err()}</p>}
        </Show>
      </div>

      <footer class="start-screen__footer">
        <p>Every choice shapes your destiny</p>
      </footer>
    </div>
  );
}
