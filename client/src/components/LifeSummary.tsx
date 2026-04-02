import { Show, For } from 'solid-js';
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

interface TimelineEntry {
  age: number;
  stage: LifeStage;
  title: string;
  description: string;
  category: string;
}

const LEGACY_ITEMS = [
  { label: 'Children', getValue: (s: any) => (s.hasChildren ? 'Yes' : 'No') },
  { label: 'Married', getValue: (s: any) => (s.isMarried ? 'Yes' : 'No') },
  { label: 'Career Peak', getValue: (s: any) => s.career ?? 'None' },
  { label: 'Education', getValue: (s: any) => s.education },
];

const SUMMARY_STATS = [
  { key: 'happiness' as const, label: 'Happiness', color: 'var(--color-accent-primary)' },
  { key: 'morality' as const, label: 'Morality', color: 'var(--color-family)' },
  { key: 'wealth' as const, label: 'Wealth', color: 'var(--color-vocational)' },
  { key: 'intellectual' as const, label: 'Intellect', color: 'var(--color-social)' },
  { key: 'empathy' as const, label: 'Empathy', color: 'var(--color-emotional)' },
  { key: 'resilience' as const, label: 'Resilience', color: 'var(--color-physical)' },
];

export default function LifeSummary() {
  const stats = () => gameStore.playerStats();
  const playerName = () => gameStore.playerName();
  const relationships = () => gameStore.relationships();
  const tier = () => gameStore.wealthTier();
  const chapter = () => gameStore.chapterNumber();

  const lifeEvents = (): TimelineEntry[] => {
    const s = stats();
    if (!s) return [];
    const events: TimelineEntry[] = [];
    const completed = s.experiencesCompleted;
    for (let i = 0; i < Math.min(completed.length, 20); i++) {
      events.push({
        age: Math.max(0, s.age - (completed.length - i) * 2),
        stage: s.currentStage,
        title: completed[i],
        description: `Experience: ${completed[i]}`,
        category: 'milestone',
      });
    }
    return events;
  };

  function overallScore(): number {
    const s = stats();
    if (!s) return 0;
    const vals = [s.happiness, s.morality, s.wealth, s.intellectual, s.empathy, s.resilience];
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  }

  function scoreLabel(score: number): string {
    if (score >= 80) return 'Extraordinary Life';
    if (score >= 60) return 'Fulfilling Life';
    if (score >= 40) return 'Average Life';
    if (score >= 20) return 'Difficult Life';
    return 'Tragic Life';
  }

  return (
    <Show when={gameStore.gamePhase() === 'summary'}>
      <div class="life-summary">
        <div class="life-summary__backdrop" />

        <div class="life-summary__content">
          <header class="life-summary__header">
            <div class="life-summary__overline">A Life Remembered</div>
            <h1 class="life-summary__name">{playerName()}</h1>
            <div class="life-summary__score-badge">
              <span class="life-summary__score-number">{overallScore()}</span>
              <span class="life-summary__score-label">{scoreLabel(overallScore())}</span>
            </div>
          </header>

          <Show when={stats()}>
            {(s) => (
              <>
                <section class="life-summary__section">
                  <h2 class="life-summary__section-title">Final Stats</h2>
                  <div class="life-summary__stats-grid">
                    <For each={SUMMARY_STATS}>
                      {(stat) => (
                        <div class="summary-stat">
                          <span class="summary-stat__label">{stat.label}</span>
                          <div class="summary-stat__bar-track">
                            <div
                              class="summary-stat__bar-fill"
                              style={{
                                width: `${s()[stat.key]}%`,
                                'background-color': stat.color,
                              }}
                            />
                          </div>
                          <span class="summary-stat__value">{s()[stat.key]}</span>
                        </div>
                      )}
                    </For>
                  </div>
                </section>

                <section class="life-summary__section">
                  <h2 class="life-summary__section-title">Legacy</h2>
                  <div class="life-summary__legacy-grid">
                    <For each={LEGACY_ITEMS}>
                      {(item) => (
                        <div class="legacy-item">
                          <span class="legacy-item__label">{item.label}</span>
                          <span class="legacy-item__value">
                            {item.getValue(s())}
                          </span>
                        </div>
                      )}
                    </For>
                  </div>
                </section>

                <Show when={relationships().length > 0}>
                  <section class="life-summary__section">
                    <h2 class="life-summary__section-title">Relationships</h2>
                    <div class="life-summary__relationships">
                      <For each={relationships()}>
                        {(rel) => (
                          <div class="summary-relationship">
                            <span class="summary-relationship__name">{rel.name}</span>
                            <span class="summary-relationship__status">{rel.status}</span>
                            <span class="summary-relationship__trust">
                              Trust: {rel.trust > 0 ? '+' : ''}{rel.trust}
                            </span>
                          </div>
                        )}
                      </For>
                    </div>
                  </section>
                </Show>

                <Show when={lifeEvents().length > 0}>
                  <section class="life-summary__section">
                    <h2 class="life-summary__section-title">Life Timeline</h2>
                    <div class="life-summary__timeline">
                      <For each={lifeEvents()}>
                        {(entry) => (
                          <div class="timeline-entry">
                            <div class="timeline-entry__age">Age {entry.age}</div>
                            <div class="timeline-entry__dot" />
                            <div class="timeline-entry__content">
                              <div class="timeline-entry__title">{entry.title}</div>
                              <div class="timeline-entry__stage">{STAGE_LABELS[entry.stage]}</div>
                            </div>
                          </div>
                        )}
                      </For>
                    </div>
                  </section>
                </Show>

                <section class="life-summary__section">
                  <h2 class="life-summary__section-title">Chapters Lived</h2>
                  <div class="life-summary__chapters">{chapter()} of 7</div>
                </section>
              </>
            )}
          </Show>

          <div class="life-summary__actions">
            <button type="button" class="life-summary__play-again" onClick={() => gameStore.resetToTitle()}>
              Play Again
            </button>
          </div>
        </div>
      </div>
    </Show>
  );
}
