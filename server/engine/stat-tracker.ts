import type { CharacterStats } from '../core/types';

// ─── Bounds Definition ────────────────────────────────────────────────────────

const SCALED_STAT_BOUNDS: Record<string, { min: number; max: number }> = {
  physical: { min: 0, max: 100 },
  confidence: { min: 0, max: 100 },
  intellectual: { min: 0, max: 100 },
  creativity: { min: 0, max: 100 },
  empathy: { min: 0, max: 100 },
  resilience: { min: 0, max: 100 },
  charm: { min: 0, max: 100 },
  discipline: { min: 0, max: 100 },
  happiness: { min: 0, max: 100 },
  morality: { min: 0, max: 100 },
  riskTolerance: { min: 0, max: 100 },
  independence: { min: 0, max: 100 },
  wealth: { min: 0, max: 100 },
};

const CAREER_LEVEL_BOUNDS = { min: 0, max: 5 };

const TRUST_AFFECTION_BOUNDS = { min: -100, max: 100 };

// ─── Stat Change Record ──────────────────────────────────────────────────────

export interface StatChangeRecord {
  statName: string;
  oldValue: number;
  newValue: number;
  delta: number;
}

// ─── StatTracker Class ───────────────────────────────────────────────────────

export class StatTracker {
  private stats: CharacterStats;
  private history: StatChangeRecord[] = [];

  constructor(initial: CharacterStats) {
    this.stats = { ...initial };
  }

  /**
   * Applies a partial set of stat changes with bounds clamping.
   * Returns a new stats snapshot with all changes applied.
   */
  applyChanges(changes: Partial<CharacterStats>): CharacterStats {
    const previousStats = { ...this.stats };

    for (const [key, value] of Object.entries(changes)) {
      if (value === undefined) continue;

      const statName = key as keyof CharacterStats;
      const currentValue = this.stats[statName];

      if (typeof currentValue === 'number' && typeof value === 'number') {
        const clamped = this.clamp(statName, value);
        (this.stats as unknown as Record<string, unknown>)[statName] = clamped;

        if (clamped !== currentValue) {
          this.recordChange(statName as string, currentValue, clamped);
        }
      } else if (key !== 'relationships' && key !== 'experiencesCompleted' && key !== 'narrativeTags') {
        (this.stats as unknown as Record<string, unknown>)[statName] = value;
      }
    }

    return { ...this.stats };
  }

  /**
   * Applies a delta to a single stat. Returns the new clamped value.
   */
  applyDelta(statName: string, delta: number): number {
    const currentValue = this.getStat(statName);
    if (currentValue === null) {
      throw new Error(`Unknown stat: ${statName}`);
    }

    const newValue = currentValue + delta;
    const clamped = this.clamp(statName, newValue);

    const boundedStatName = statName as keyof CharacterStats;
    (this.stats as unknown as Record<string, unknown>)[boundedStatName] = clamped;

    if (clamped !== currentValue) {
      this.recordChange(statName, currentValue, clamped);
    }

    return clamped;
  }

  /**
   * Gets the current value of a stat.
   */
  getStat(statName: string): number | null {
    const value = (this.stats as unknown as Record<string, unknown>)[statName];
    if (typeof value === 'number') {
      return value;
    }
    if (statName === 'careerLevel' && typeof value === 'number') {
      return value;
    }
    return null;
  }

  /**
   * Returns a complete snapshot of current stats.
   */
  getAllStats(): CharacterStats {
    return { ...this.stats };
  }

  /**
   * Clamps a value to the valid range for the given stat.
   */
  clamp(statName: string, value: number): number {
    const bounds = this.getBounds(statName);
    return Math.max(bounds.min, Math.min(bounds.max, value));
  }

  /**
   * Returns the min/max bounds for a stat.
   */
  getBounds(statName: string): { min: number; max: number } {
    if (statName in SCALED_STAT_BOUNDS) {
      return SCALED_STAT_BOUNDS[statName];
    }
    if (statName === 'careerLevel') {
      return CAREER_LEVEL_BOUNDS;
    }
    if (statName === 'trust' || statName === 'affection') {
      return TRUST_AFFECTION_BOUNDS;
    }
    if (statName === 'age') {
      return { min: 0, max: 120 };
    }
    // Default for unknown numeric stats - treat as scaled
    return { min: 0, max: 100 };
  }

  /**
   * Returns the full change history for floating indicators.
   */
  getHistory(): StatChangeRecord[] {
    return [...this.history];
  }

  /**
   * Clears the change history.
   */
  clearHistory(): void {
    this.history = [];
  }

  private recordChange(statName: string, oldValue: number, newValue: number): void {
    this.history.push({
      statName,
      oldValue,
      newValue,
      delta: newValue - oldValue,
    });
  }
}