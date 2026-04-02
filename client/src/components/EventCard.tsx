import { Show, For, createSignal, Match, Switch } from 'solid-js';
import { gameStore } from '../store/gameStore';
import MoodPicker from './MoodPicker';
import type { StoryletChoice, EventCategory } from '../../../server/core/types';

const CATEGORY_COLORS: Record<EventCategory, string> = {
  social: 'var(--color-social)',
  physical: 'var(--color-physical)',
  emotional: 'var(--color-emotional)',
  family: 'var(--color-family)',
  vocational: 'var(--color-vocational)',
};

const CATEGORY_LABELS: Record<EventCategory, string> = {
  social: 'Social',
  physical: 'Physical',
  emotional: 'Emotional',
  family: 'Family',
  vocational: 'Vocational',
};

export default function EventCard() {
  const event = () => gameStore.currentEvent();
  const moodSelected = () => gameStore.selectedMood() !== null;
  const outcome = () => gameStore.outcomeText();
  const transitioning = () => gameStore.isTransitioning();
  const key = () => gameStore.cardKey();
  const hasOutcome = () => outcome() !== null;

  const categoryColor = () => {
    const e = event();
    return e ? CATEGORY_COLORS[e.category] : 'var(--color-accent-primary)';
  };

  const categoryLabel = () => {
    const e = event();
    return e ? CATEGORY_LABELS[e.category] : '';
  };

  async function handleChoice(choice: StoryletChoice) {
    const ev = event();
    const moodId = gameStore.selectedMood();
    if (!ev || !moodId) return;

    try {
      const res = await fetch('/api/game/choose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: ev.id,
          moodId,
          choiceId: choice.id,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(err.message ?? `Server error ${res.status}`);
      }

      const data = await res.json();
      gameStore.showOutcome(data.outcome.narration);

      if (data.newStats) {
        gameStore.updateStats(data.newStats);
      }
    } catch (e: unknown) {
      console.error('Choice failed:', e);
    }
  }

  function handleContinue() {
    const ev = event();
    if (!ev) return;

    // For now, advance with null — in real flow the server provides nextEvent
    gameStore.advanceEvent(null);
  }

  return (
    <Show when={event()}>
      {(ev) => (
        <div
          class={`event-card ${transitioning() ? 'event-card--exit' : 'event-card--enter'}`}
        >
          <div
            class="event-card__accent-bar"
            style={{ 'background-color': categoryColor() }}
          />

          <div class="event-card__header">
            <span
              class="event-card__category"
              style={{ color: categoryColor() }}
            >
              {categoryLabel()}
            </span>
            <h2 class="event-card__title">{ev().title}</h2>
          </div>

          <div class="event-card__body">
            <p class="event-card__description">{ev().description}</p>

            <Switch>
              <Match when={hasOutcome()}>
                <div class="event-card__outcome">
                  <div class="event-card__outcome-text">
                    {outcome()}
                  </div>
                  <button
                    type="button"
                    class="event-card__continue-btn"
                    onClick={handleContinue}
                  >
                    Continue
                  </button>
                </div>
              </Match>

              <Match when={!moodSelected()}>
                <MoodPicker moods={ev().moods} />
              </Match>

              <Match when={moodSelected()}>
                <div class="event-card__choices-section">
                  <MoodPicker moods={ev().moods} />
                  <div class="event-card__choices">
                    <For each={ev().choices}>
                      {(choice) => {
                        const compatible = () => gameStore.isChoiceCompatible()(choice);
                        return (
                          <button
                            type="button"
                            class={`event-card__choice ${compatible() ? 'event-card__choice--compatible' : 'event-card__choice--dim'}`}
                            onClick={() => compatible() && handleChoice(choice)}
                            disabled={!compatible()}
                          >
                            {choice.label}
                            <Show when={choice.compatibleMoods}>
                              <span class="event-card__choice-moods">
                                <For each={choice.compatibleMoods!}>
                                  {(moodId) => {
                                    const mood = ev().moods.find((m) => m.id === moodId);
                                    return (
                                      <Show when={mood}>
                                        {(m) => (
                                          <span class="event-card__mood-tag">{m().emoji}</span>
                                        )}
                                      </Show>
                                    );
                                  }}
                                </For>
                              </span>
                            </Show>
                          </button>
                        );
                      }}
                    </For>
                  </div>
                </div>
              </Match>
            </Switch>
          </div>
        </div>
      )}
    </Show>
  );
}
