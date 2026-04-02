import { For, Show } from 'solid-js';
import { gameStore } from '../store/gameStore';
import type { StoryletMood } from '../../../server/core/types';

interface MoodPickerProps {
  moods: StoryletMood[];
}

export default function MoodPicker(props: MoodPickerProps) {
  const selectedId = () => gameStore.selectedMood();

  return (
    <div class="mood-picker">
      <p class="mood-picker__prompt">How are you feeling?</p>
      <div class="mood-picker__options">
        <For each={props.moods}>
          {(mood) => {
            const isSelected = () => selectedId() === mood.id;

            return (
              <button
                type="button"
                class={`mood-picker__mood ${isSelected() ? 'mood-picker__mood--selected' : ''}`}
                style={{
                  '--mood-color': mood.color,
                }}
                onClick={() => gameStore.selectMood(mood.id)}
              >
                <span class="mood-picker__emoji">{mood.emoji}</span>
                <span class="mood-picker__label">{mood.label}</span>
                <Show when={isSelected()}>
                  <span class="mood-picker__ring" />
                </Show>
              </button>
            );
          }}
        </For>
      </div>
    </div>
  );
}
