import { Show } from 'solid-js';
import { gameStore } from '../store/gameStore';

export default function MenuBar() {
  const stageName = () => gameStore.lifeStageLabel();
  const age = () => gameStore.playerAge();
  const progress = () => gameStore.stageProgress();
  const name = () => gameStore.playerName();
  const menuOpen = () => gameStore.showMenu();

  return (
    <header class="menu-bar">
      <div class="menu-bar__inner">
        <div class="menu-bar__left">
          <div class="menu-bar__identity">
            <span class="menu-bar__stage">{stageName()}</span>
            <span class="menu-bar__separator">·</span>
            <span class="menu-bar__age">Age {age()}</span>
          </div>
          <Show when={name()}>
            <span class="menu-bar__name">{name()}</span>
          </Show>
        </div>

        <div class="menu-bar__right">
          <button
            type="button"
            class="menu-bar__btn"
            aria-label="Toggle stats panel"
            onClick={() => gameStore.toggleStatsPanel()}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M18 20V10M12 20V4M6 20v-6" />
            </svg>
          </button>

          <button
            type="button"
            class={`menu-bar__btn ${menuOpen() ? 'menu-bar__btn--active' : ''}`}
            aria-label="Toggle menu"
            onClick={() => gameStore.toggleMenu()}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      <div class="menu-bar__progress-track">
        <div
          class="menu-bar__progress-fill"
          style={{ width: `${progress() * 100}%` }}
        />
      </div>
    </header>
  );
}
