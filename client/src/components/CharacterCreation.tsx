import { Show, For, onMount } from 'solid-js';
import { gameStore } from '../store/gameStore';

const STAT_LABELS: Record<string, string> = {
  physical: 'Physical',
  confidence: 'Confidence',
  intellectual: 'Intellectual',
  creativity: 'Creativity',
  empathy: 'Empathy',
  resilience: 'Resilience',
  charm: 'Charm',
  discipline: 'Discipline',
};

const STAT_COLORS: Record<string, string> = {
  physical: 'var(--color-physical)',
  confidence: 'var(--color-accent-primary)',
  intellectual: 'var(--color-social)',
  creativity: 'var(--color-emotional)',
  empathy: 'var(--color-family)',
  resilience: 'var(--color-accent-tertiary)',
  charm: 'var(--color-vocational)',
  discipline: 'var(--color-text-secondary)',
};

const GENDERS = [
  { value: 'male' as const, label: 'Male', icon: '♂' },
  { value: 'female' as const, label: 'Female', icon: '♀' },
  { value: 'nonbinary' as const, label: 'Non-Binary', icon: '⚧' },
];

export default function CharacterCreation() {
  onMount(() => {
    gameStore.rollStats();
  });

  function handleNameInput(e: Event) {
    const target = e.target as HTMLInputElement;
    gameStore.setPendingName(target.value.trim());
  }

  function selectGender(value: 'male' | 'female' | 'nonbinary') {
    gameStore.setPendingGender(value);
  }

  function handleReroll() {
    gameStore.rollStats();
  }

  async function handleBegin() {
    await gameStore.startNewGame();
  }

  return (
    <div class="char-create">
      <h2 class="char-create__heading">Create Your Character</h2>
      <p class="char-create__subtext">Your quiz answers have shaped who you are. Now give yourself a name.</p>

      <div class="char-create__form">
        <div class="char-create__section">
          <label class="char-create__label" for="char-name">Name</label>
          <input
            id="char-name"
            type="text"
            class="char-create__input"
            placeholder="Enter your name..."
            maxLength={24}
            onInput={handleNameInput}
            value={gameStore.pendingName()}
          />
        </div>

        <div class="char-create__section">
          <span class="char-create__label">Gender</span>
          <div class="char-create__genders">
            <For each={GENDERS}>
              {(gender) => (
                <button
                  type="button"
                  class={`char-create__gender-btn ${gameStore.pendingGender() === gender.value ? 'char-create__gender-btn--active' : ''}`}
                  onClick={() => selectGender(gender.value)}
                >
                  <span class="char-create__gender-icon">{gender.icon}</span>
                  <span class="char-create__gender-label">{gender.label}</span>
                </button>
              )}
            </For>
          </div>
        </div>

        <div class="char-create__section">
          <div class="char-create__stats-header">
            <span class="char-create__label">Starting Attributes</span>
            <button type="button" class="btn btn--reroll" onClick={handleReroll}>
              🎲 Reroll
            </button>
          </div>

          <div class="char-create__stats">
            <For each={Object.entries(STAT_LABELS)}>
              {([key, label]) => {
                const offsets = gameStore.statOffsets();
                const value = (offsets as Record<string, number | undefined>)[key] ?? 0;
                return (
                  <div class="char-create__stat-row">
                    <span class="char-create__stat-name">{label}</span>
                    <div class="char-create__stat-bar">
                      <div
                        class="char-create__stat-fill"
                        style={{
                          width: `${value}%`,
                          'background-color': STAT_COLORS[key] ?? 'var(--color-accent-primary)',
                        }}
                      />
                    </div>
                    <span class="char-create__stat-value">{value}</span>
                  </div>
                );
              }}
            </For>
          </div>
        </div>

        <Show when={gameStore.error()}>
          {(err) => <p class="char-create__error">{err()}</p>}
        </Show>

        <button
          type="button"
          class="btn btn--primary btn--large"
          onClick={handleBegin}
          disabled={gameStore.loading() || !gameStore.pendingName() || !gameStore.pendingGender()}
        >
          <Show when={gameStore.loading()} fallback={'Begin Life →'}>
            Creating...
          </Show>
        </button>
      </div>
    </div>
  );
}
