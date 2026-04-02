import { Show } from 'solid-js';
import { gameStore } from '../store/gameStore';
import type { LifeStage } from '../../../server/core/types';

const STAGE_LABELS: Record<LifeStage, string> = {
  infancy: 'Infancy',
  childhood: 'Childhood',
  adolescence: 'Adolescence',
  'young-adulthood': 'Young Adulthood',
  adulthood: 'Adulthood',
  'middle-adulthood': 'Middle Adulthood',
  'old-age': 'Old Age',
};

const STAGE_NARRATIVES: Record<LifeStage, string> = {
  infancy: 'The world is vast and new. Every sensation is a discovery.',
  childhood: 'Wonder fills your days as you explore the boundaries of your small universe.',
  adolescence: 'The storms of change brew within. Identity takes shape through fire.',
  'young-adulthood': 'The horizon stretches before you, ripe with possibility.',
  adulthood: 'The weight of responsibility settles, balanced by the depth of experience.',
  'middle-adulthood': 'Looking back and forward in equal measure, wisdom crystallizes.',
  'old-age': 'The tapestry of a life lived, viewed with quiet understanding.',
};

export default function StageTransition() {
  const transition = () => gameStore.stageTransitionData();
  const chapter = () => gameStore.chapterNumber();
  const age = () => gameStore.playerAge();

  return (
    <Show when={gameStore.gamePhase() === 'stage-transition' && transition()}>
      {(_) => {
        const t = transition()!;
        return (
          <div class="stage-transition">
            <div class="stage-transition__backdrop" />
            <div class="stage-transition__content">
              <div class="stage-transition__chapter">Chapter {chapter()}</div>
              <h1 class="stage-transition__title">{STAGE_LABELS[t.to]}</h1>
              <div class="stage-transition__age">Age {age()}</div>
              <p class="stage-transition__narrative">
                {t.narrative || STAGE_NARRATIVES[t.to]}
              </p>
              <div class="stage-transition__divider" />
              <button
                type="button"
                class="stage-transition__continue"
                onClick={() => gameStore.clearStageTransition()}
              >
                Continue
              </button>
            </div>
          </div>
        );
      }}
    </Show>
  );
}
