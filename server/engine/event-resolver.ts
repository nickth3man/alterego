/**
 * Event Resolver — Alter Ego Game Engine
 *
 * Resolves a player's choice (mood + action) into an outcome.
 */

import type { Storylet, StoryletOutcome, CharacterStats } from '../core/types.js';
import { evaluateCondition } from '../core/conditions.js';

// ─── Tag Index Interface ─────────────────────────────────────────────────────

export interface TagIndex {
  addTag(tag: string): void;
  hasTag(tag: string): boolean;
  getAllTags(): string[];
}

// ─── NPC Manager Interface ───────────────────────────────────────────────────

export interface NPCManager {
  updateRelationship(npcId: string, delta: number, stat: 'trust' | 'affection'): void;
  getRelationship(npcId: string): { trust: number; affection: number } | null;
}

// ─── Mood/Choice Validation ──────────────────────────────────────────────────

export class MoodNotFoundError extends Error {
  constructor(moodId: string, eventId: string) {
    super(`Mood '${moodId}' not found in event '${eventId}'`);
    this.name = 'MoodNotFoundError';
  }
}

export class ChoiceNotFoundError extends Error {
  constructor(choiceId: string, eventId: string) {
    super(`Choice '${choiceId}' not found in event '${eventId}'`);
    this.name = 'ChoiceNotFoundError';
  }
}

export class IncompatibleMoodError extends Error {
  constructor(moodId: string, choiceId: string) {
    super(`Mood '${moodId}' is not compatible with choice '${choiceId}'`);
    this.name = 'IncompatibleMoodError';
  }
}

export class NoMatchingOutcomeError extends Error {
  constructor(eventId: string, choiceId: string) {
    super(`No outcome matched for event '${eventId}' choice '${choiceId}'`);
    this.name = 'NoMatchingOutcomeError';
  }
}

// ─── Main Resolution Function ─────────────────────────────────────────────────

export function resolveChoice(
  event: Storylet,
  moodId: string,
  choiceId: string,
  context: Record<string, unknown>
): StoryletOutcome {
  const mood = event.moods.find(m => m.id === moodId);
  if (!mood) {
    throw new MoodNotFoundError(moodId, event.id);
  }

  const choice = event.choices.find(c => c.id === choiceId);
  if (!choice) {
    throw new ChoiceNotFoundError(choiceId, event.id);
  }

  if (choice.compatibleMoods && choice.compatibleMoods.length > 0) {
    if (!choice.compatibleMoods.includes(moodId)) {
      throw new IncompatibleMoodError(moodId, choiceId);
    }
  }

  for (const outcome of choice.outcomes) {
    try {
      if (evaluateCondition(outcome.condition as unknown as { type: string; [key: string]: unknown }, context)) {
        return outcome;
      }
    } catch {
      continue;
    }
  }

  throw new NoMatchingOutcomeError(event.id, choiceId);
}

// ─── Stat Application ────────────────────────────────────────────────────────

const NUMERIC_STAT_KEYS = [
  'physical',
  'confidence',
  'intellectual',
  'creativity',
  'empathy',
  'resilience',
  'charm',
  'discipline',
  'happiness',
  'morality',
  'riskTolerance',
  'independence',
  'wealth',
  'age',
  'careerLevel',
] as const;

type NumericStatKey = typeof NUMERIC_STAT_KEYS[number];

const STAT_BOUNDS: Record<NumericStatKey, { min: number; max: number }> = {
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
  age: { min: 0, max: 120 },
  careerLevel: { min: 0, max: 5 },
};

export function applyOutcome(
  stats: CharacterStats,
  outcome: StoryletOutcome
): CharacterStats {
  const newStats = { ...stats };
  const changes = outcome.statChanges;

  for (const key of NUMERIC_STAT_KEYS) {
    if (key in changes) {
      const change = changes[key as keyof typeof changes];
      if (typeof change === 'number') {
        const current = (newStats[key] as number) ?? 0;
        const bounds = STAT_BOUNDS[key];
        newStats[key] = Math.min(bounds.max, Math.max(bounds.min, current + change)) as never;
      }
    }
  }

  if ('isMarried' in changes) {
    newStats.isMarried = changes.isMarried ?? newStats.isMarried;
  }

  if ('hasChildren' in changes) {
    newStats.hasChildren = changes.hasChildren ?? newStats.hasChildren;
  }

  if ('career' in changes) {
    newStats.career = changes.career ?? newStats.career;
  }

  if ('education' in changes && changes.education !== undefined) {
    newStats.education = changes.education as CharacterStats['education'];
  }

  if ('experiencesCompleted' in changes && Array.isArray(changes.experiencesCompleted)) {
    const combined = new Set(newStats.experiencesCompleted);
    for (const tag of changes.experiencesCompleted) {
      combined.add(tag);
    }
    newStats.experiencesCompleted = Array.from(combined);
  }

  if ('narrativeTags' in changes && Array.isArray(changes.narrativeTags)) {
    const combined = new Set(newStats.narrativeTags);
    for (const tag of changes.narrativeTags) {
      combined.add(tag);
    }
    newStats.narrativeTags = Array.from(combined);
  }

  return newStats;
}

// ─── Consequence Processing ───────────────────────────────────────────────────

export function processConsequences(
  outcome: StoryletOutcome,
  tagIndex: TagIndex,
  npcManager: NPCManager
): void {
  const { consequences } = outcome;

  if (consequences.tag) {
    tagIndex.addTag(consequences.tag);
  }

  if (consequences.relationshipChanges) {
    for (const change of consequences.relationshipChanges) {
      const rel = npcManager.getRelationship(change.npcId);
      if (rel) {
        npcManager.updateRelationship(change.npcId, change.delta, 'trust');
        npcManager.updateRelationship(change.npcId, change.delta, 'affection');
      }
    }
  }
}
