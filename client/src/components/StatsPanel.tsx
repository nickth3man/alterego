import { Show, For } from 'solid-js';
import { gameStore } from '../store/gameStore';

const CORE_STATS = [
  { key: 'physical' as const, label: 'Physical', color: 'var(--color-physical)' },
  { key: 'confidence' as const, label: 'Confidence', color: 'var(--color-accent-primary)' },
  { key: 'intellectual' as const, label: 'Intellectual', color: 'var(--color-social)' },
  { key: 'creativity' as const, label: 'Creativity', color: 'var(--color-emotional)' },
  { key: 'empathy' as const, label: 'Empathy', color: 'var(--color-family)' },
  { key: 'resilience' as const, label: 'Resilience', color: 'var(--color-vocational)' },
  { key: 'charm' as const, label: 'Charm', color: 'var(--color-accent-secondary)' },
  { key: 'discipline' as const, label: 'Discipline', color: 'var(--color-text-muted)' },
];

const LIFE_STATS = [
  { key: 'happiness' as const, label: 'Happiness', color: 'var(--color-accent-primary)' },
  { key: 'morality' as const, label: 'Morality', color: 'var(--color-family)' },
  { key: 'riskTolerance' as const, label: 'Risk Tolerance', color: 'var(--color-physical)' },
  { key: 'independence' as const, label: 'Independence', color: 'var(--color-social)' },
];

const WEALTH_TIERS: Record<string, { label: string; css: string }> = {
  struggle: { label: 'Struggling', css: 'wealth-struggle' },
  'middle-class': { label: 'Middle Class', css: 'wealth-middle' },
  affluent: { label: 'Affluent', css: 'wealth-affluent' },
  wealthy: { label: 'Wealthy', css: 'wealth-wealthy' },
};

const EDUCATION_LABELS: Record<string, string> = {
  none: 'No Formal Education',
  elementary: 'Elementary School',
  'high-school': 'High School',
  'some-college': 'Some College',
  bachelors: "Bachelor's Degree",
  masters: "Master's Degree",
  doctorate: 'Doctorate',
};

const STATUS_COLORS: Record<string, string> = {
  stranger: '#64748b',
  acquaintance: '#94a3b8',
  friend: '#3b82f6',
  closeFriend: '#8b5cf6',
  romantic: '#ef4444',
  enemy: '#dc2626',
};

export default function StatsPanel() {
  const stats = () => gameStore.playerStats();
  const tier = () => gameStore.wealthTier();
  const rels = () => gameStore.relationships();
  const age = () => gameStore.playerAge();
  const stage = () => gameStore.lifeStageLabel();

  function statBarWidth(value: number): string {
    return `${Math.max(0, Math.min(100, value))}%`;
  }

  return (
    <Show when={gameStore.showStats()}>
      <div class="stats-panel-overlay">
        <button
          type="button"
          class="stats-panel-backdrop"
          onClick={() => gameStore.closeStatsPanel()}
          aria-label="Close stats panel"
        />
        <div class="stats-panel">
          <button type="button" class="stats-panel__close" onClick={() => gameStore.closeStatsPanel()}>
            ✕
          </button>

          <header class="stats-panel__header">
            <h2 class="stats-panel__title">Character Stats</h2>
            <div class="stats-panel__subtitle">
              Age {age()} · {stage()}
            </div>
          </header>

          <Show when={stats()}>
            {(s) => (
              <div class="stats-panel__body">
                <section class="stats-panel__section">
                  <h3 class="stats-panel__section-title">Core Traits</h3>
                  <For each={CORE_STATS}>
                    {(stat) => (
                      <div class="stat-row">
                        <span class="stat-row__label">{stat.label}</span>
                        <div class="stat-row__bar-track">
                          <div
                            class="stat-row__bar-fill"
                            style={{
                              width: statBarWidth(s()[stat.key]),
                              'background-color': stat.color,
                            }}
                          />
                        </div>
                        <span class="stat-row__value">{s()[stat.key]}</span>
                      </div>
                    )}
                  </For>
                </section>

                <section class="stats-panel__section">
                  <h3 class="stats-panel__section-title">Life Aspects</h3>
                  <For each={LIFE_STATS}>
                    {(stat) => (
                      <div class="stat-row">
                        <span class="stat-row__label">{stat.label}</span>
                        <div class="stat-row__bar-track">
                          <div
                            class="stat-row__bar-fill"
                            style={{
                              width: statBarWidth(s()[stat.key]),
                              'background-color': stat.color,
                            }}
                          />
                        </div>
                        <span class="stat-row__value">{s()[stat.key]}</span>
                      </div>
                    )}
                  </For>
                </section>

                <section class="stats-panel__section">
                  <h3 class="stats-panel__section-title">Wealth</h3>
                  <div class="wealth-display">
                    <div class="wealth-bar-track">
                      <div
                        class="stat-row__bar-fill wealth-bar-fill"
                        style={{ width: statBarWidth(s().wealth) }}
                      />
                    </div>
                    <span class={`wealth-badge ${WEALTH_TIERS[tier()].css}`}>
                      {WEALTH_TIERS[tier()].label}
                    </span>
                    <span class="stat-row__value">{s().wealth}</span>
                  </div>
                </section>

                <section class="stats-panel__section">
                  <h3 class="stats-panel__section-title">Career & Education</h3>
                  <div class="info-row">
                    <span class="info-row__label">Career</span>
                    <span class="info-row__value">
                      {s().career ?? 'None'}
                      <Show when={s().career}>
                        {' '}
                        (Level {s().careerLevel})
                      </Show>
                    </span>
                  </div>
                  <div class="info-row">
                    <span class="info-row__label">Education</span>
                    <span class="info-row__value">
                      {EDUCATION_LABELS[s().education] ?? s().education}
                    </span>
                  </div>
                </section>

                <Show when={rels().length > 0}>
                  <section class="stats-panel__section">
                    <h3 class="stats-panel__section-title">Relationships</h3>
                    <For each={rels()}>
                      {(rel) => (
                        <div class="relationship-row">
                          <span
                            class="relationship-row__dot"
                            style={{ 'background-color': STATUS_COLORS[rel.status] ?? '#64748b' }}
                          />
                          <span class="relationship-row__name">{rel.name}</span>
                          <span class="relationship-row__status">{rel.status.replace(/([A-Z])/g, ' $1').trim()}</span>
                          <span class="relationship-row__trust">
                            {rel.trust > 0 ? '+' : ''}{rel.trust}
                          </span>
                        </div>
                      )}
                    </For>
                  </section>
                </Show>
              </div>
            )}
          </Show>
        </div>
      </div>
    </Show>
  );
}
