import { Show } from 'solid-js';
import { gameStore } from '../store/gameStore';
import MenuBar from './MenuBar';
import EventCard from './EventCard';

export default function GameView() {
  const hasEvent = () => gameStore.currentEvent() !== null;
  const statsOpen = () => gameStore.showStats();
  const menuOpen = () => gameStore.showMenu();
  const stats = () => gameStore.playerStats();

  const statBars: { key: string; label: string }[] = [
    { key: 'physical', label: 'Physical' },
    { key: 'happiness', label: 'Happiness' },
    { key: 'intellectual', label: 'Intellect' },
    { key: 'empathy', label: 'Empathy' },
    { key: 'confidence', label: 'Confidence' },
    { key: 'creativity', label: 'Creativity' },
    { key: 'resilience', label: 'Resilience' },
    { key: 'charm', label: 'Charm' },
    { key: 'discipline', label: 'Discipline' },
    { key: 'morality', label: 'Morality' },
    { key: 'wealth', label: 'Wealth' },
  ];

  const displayed = () => {
    const s = stats();
    if (!s) return {} as Record<string, number>;
    return {
      physical: s.physical,
      happiness: s.happiness,
      intellectual: s.intellectual,
      empathy: s.empathy,
      confidence: s.confidence,
      creativity: s.creativity,
      resilience: s.resilience,
      charm: s.charm,
      discipline: s.discipline,
      morality: s.morality,
      wealth: s.wealth,
    };
  };

  function statColor(value: number): string {
    if (value >= 70) return 'var(--color-family)';
    if (value >= 40) return 'var(--color-accent-primary)';
    return 'var(--color-physical)';
  }

  return (
    <div class="game-view">
      <MenuBar />

      <div class="game-view__content">
        <Show
          when={hasEvent()}
          fallback={
            <div class="game-view__empty">
              <div class="game-view__empty-icon">🌙</div>
              <p class="game-view__empty-text">Your story awaits...</p>
            </div>
          }
        >
          <EventCard />
        </Show>
      </div>

      <Show when={statsOpen()}>
        <button
          type="button"
          class="stats-panel-overlay"
          aria-label="Close stats panel"
          onClick={() => gameStore.closeStatsPanel()}
        />
        <aside class="stats-panel stats-panel--open">
          <div class="stats-panel__header">
            <h3 class="stats-panel__title">Character Stats</h3>
            <button
              type="button"
              class="stats-panel__close"
              aria-label="Close stats"
              onClick={() => gameStore.closeStatsPanel()}
            >
              ✕
            </button>
          </div>
          <div class="stats-panel__bars">
            {statBars.map((bar) => (
              <div class="stats-panel__stat">
                <div class="stats-panel__stat-label">
                  <span>{bar.label}</span>
                  <span class="stats-panel__stat-value">{displayed()[bar.key] ?? 0}</span>
                </div>
                <div class="stats-panel__stat-track">
                  <div
                    class="stats-panel__stat-fill"
                    style={{
                      width: `${displayed()[bar.key] ?? 0}%`,
                      'background-color': statColor(displayed()[bar.key] ?? 0),
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </aside>
      </Show>

      <Show when={menuOpen()}>
        <button
          type="button"
          class="menu-overlay"
          aria-label="Close menu"
          onClick={() => gameStore.closeMenu()}
        />
        <aside class="game-menu game-menu--open">
          <div class="game-menu__header">
            <h3 class="game-menu__title">Menu</h3>
            <button
              type="button"
              class="game-menu__close"
              aria-label="Close menu"
              onClick={() => gameStore.closeMenu()}
            >
              ✕
            </button>
          </div>
          <nav class="game-menu__nav">
            <button type="button" class="game-menu__item" onClick={() => gameStore.closeMenu()}>
              <span class="game-menu__item-icon">💾</span>
              Save Game
            </button>
            <button type="button" class="game-menu__item" onClick={() => gameStore.closeMenu()}>
              <span class="game-menu__item-icon">📂</span>
              Load Game
            </button>
            <button type="button" class="game-menu__item" onClick={() => gameStore.closeMenu()}>
              <span class="game-menu__item-icon">⚙️</span>
              Settings
            </button>
            <button type="button" class="game-menu__item game-menu__item--danger" onClick={() => gameStore.closeMenu()}>
              <span class="game-menu__item-icon">🚪</span>
              Quit to Title
            </button>
          </nav>
        </aside>
      </Show>
    </div>
  );
}
