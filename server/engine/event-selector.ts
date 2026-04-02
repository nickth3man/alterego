/**
 * Event Selector — Alter Ego Game Engine
 *
 * Three-tier event selection system:
 * - Tier 1 (story): Always trigger when prerequisites met. No randomization.
 * - Tier 2 (weighted): Reigns-style deck selection with multiple weight modifiers.
 * - Tier 3 (fill): Generic events when no story/weighted available.
 */

import type { Storylet, GameState, EventPriority } from '../core/types.js';
import { evaluateCondition } from '../core/conditions.js';

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface EventWeightModifiers {
  baseWeight: number;
  statRangeBonus: number;
  tagPresenceBoost: number;
  relationshipRelevanceBoost: number;
  recentDecisionBoost: number;
}

export interface SelectionContext {
  gameState: GameState;
  recentDecisions: string[];
}

// ─── Tag Index Interface ─────────────────────────────────────────────────────

export interface TagIndex {
  getEventsForTag(tag: string): string[];
  getActiveTags(): string[];
  hasTag(tag: string): boolean;
}

// ─── NPC Manager Interface ───────────────────────────────────────────────────

export interface NPCManager {
  getActiveNPCs(): string[];
  getNPCRelationship(npcId: string): { trust: number; affection: number } | null;
}

// ─── Weight Calculation ──────────────────────────────────────────────────────

/**
 * Calculate the weight for a weighted-priority event.
 * Combines base weight with contextual modifiers.
 */
export function calculateWeight(
  event: Storylet,
  context: Record<string, unknown>,
  recentDecisions: string[],
  tagIndex?: TagIndex,
  npcManager?: NPCManager
): number {
  if (event.priority !== 'weighted') {
    return event.weight;
  }

  let weight = event.weight;

  // 1. Stat range modifiers (example: events more likely when stats are in certain ranges)
  weight += calculateStatRangeModifier(event, context);

  // 2. Tag presence boost — events related to completed narratives get weight boost
  weight += calculateTagPresenceBoost(event, context, tagIndex);

  // 3. Relationship relevance — events involving active NPCs get boost
  weight += calculateRelationshipBoost(event, context, npcManager);

  // 4. Recent decision boost — track last N decisions, boost related events
  weight += calculateRecentDecisionBoost(event, recentDecisions);

  // Ensure weight is at least 0
  return Math.max(0, weight);
}

function calculateStatRangeModifier(
  event: Storylet,
  context: Record<string, unknown>
): number {
  // This is a placeholder for stat range modifiers defined in event data.
  // Events can define preferred stat ranges, and we boost weight when
  // the player's stats fall within those ranges.
  // For now, return 0 - actual implementation would read from event metadata.
  return 0;
}

function calculateTagPresenceBoost(
  event: Storylet,
  context: Record<string, unknown>,
  tagIndex?: TagIndex
): number {
  if (!tagIndex) return 0;

  const narrativeTags = context['stats.narrativeTags'];
  if (!Array.isArray(narrativeTags)) return 0;

  let boost = 0;

  // Check if event is related to tags the player already has
  for (const tag of narrativeTags) {
    const eventsForTag = tagIndex.getEventsForTag(tag as string);
    if (eventsForTag.includes(event.id)) {
      // Boost events that extend existing narratives
      boost += 5;
    }
  }

  return boost;
}

function calculateRelationshipBoost(
  event: Storylet,
  context: Record<string, unknown>,
  npcManager?: NPCManager
): number {
  if (!npcManager) return 0;

  // Extract NPC IDs mentioned in event (from description or metadata)
  // For now, we check if any active NPC is relevant to this event
  // This is a simplified check - actual implementation would use event metadata
  const activeNPCs = npcManager.getActiveNPCs();
  let boost = 0;

  for (const npcId of activeNPCs) {
    const rel = npcManager.getNPCRelationship(npcId);
    if (rel) {
      // Events with NPCs you have strong relationships with are more likely
      if (rel.affection > 50 || rel.trust > 50) {
        boost += 3;
      }
      // Events with NPCs you have poor relationships with are also interesting
      if (rel.affection < -30 || rel.trust < -30) {
        boost += 2;
      }
    }
  }

  return boost;
}

function calculateRecentDecisionBoost(
  event: Storylet,
  recentDecisions: string[]
): number {
  if (recentDecisions.length === 0) return 0;

  // Boost events that are related to recent decisions
  // This creates narrative continuity
  // For now, simple check - actual implementation would use event tags/metadata
  let boost = 0;

  // Small boost for events that haven't been seen recently
  // (prevents the same event from appearing too often)
  for (const decision of recentDecisions.slice(0, 5)) {
    if (event.id.includes(decision) || decision.includes(event.id)) {
      boost += 1;
    }
  }

  return boost;
}

// ─── Event Filtering ─────────────────────────────────────────────────────────

/**
 * Filter events by checking their prerequisites against the evaluation context.
 */
export function filterAvailableEvents(
  events: Storylet[],
  context: Record<string, unknown>
): Storylet[] {
  return events.filter(event => {
    try {
      return evaluateCondition(event.prerequisites as unknown as { type: string; [key: string]: unknown }, context);
    } catch {
      return false;
    }
  });
}

// ─── Weighted Random Selection ───────────────────────────────────────────────

/**
 * Pick a random event from a list using weighted probability.
 * Uses the roulette wheel selection algorithm.
 */
export function pickWeighted<T>(items: T[], weights: number[]): T | null {
  if (items.length === 0 || weights.length !== items.length) {
    return null;
  }

  const totalWeight = weights.reduce((sum, w) => sum + Math.max(0, w), 0);

  if (totalWeight <= 0) {
    return null;
  }

  let random = Math.random() * totalWeight;

  for (let i = 0; i < items.length; i++) {
    const weight = Math.max(0, weights[i]);
    random -= weight;
    if (random <= 0) {
      return items[i];
    }
  }

  // Fallback to last item (shouldn't happen with proper math)
  return items[items.length - 1];
}

// ─── Tier Helpers ────────────────────────────────────────────────────────────

function filterByPriority(events: Storylet[], priority: EventPriority): Storylet[] {
  return events.filter(e => e.priority === priority);
}

function sortByWeight(events: Storylet[]): Storylet[] {
  return [...events].sort((a, b) => b.weight - a.weight);
}

// ─── Main Selection Function ─────────────────────────────────────────────────

export interface SelectNextEventParams {
  events: Storylet[];
  gameState: GameState;
  recentDecisions: string[];
  tagIndex?: TagIndex;
  npcManager?: NPCManager;
}

/**
 * Select the next event using three-tier selection:
 * 1. Story events: Always trigger when prerequisites met (no randomization)
 * 2. Weighted events: Reigns-style selection with weight modifiers
 * 3. Fill events: Generic events as last resort
 */
export function selectNextEvent(params: SelectNextEventParams): Storylet | null {
  const { events, gameState, recentDecisions, tagIndex, npcManager } = params;

  // Build evaluation context from game state
  const context = buildSelectionContext(gameState);

  // Filter events by life stage
  const stageFiltered = filterByLifeStage(events, gameState.player.stats.currentStage);

  // Filter by prerequisites
  const available = filterAvailableEvents(stageFiltered, context);

  if (available.length === 0) {
    return null;
  }

  // Tier 1: Story events (always selected when available)
  const storyEvents = filterByPriority(available, 'story');
  if (storyEvents.length > 0) {
    // Return the first story event (they're not randomized)
    return storyEvents[0];
  }

  // Tier 2: Weighted events (Reigns-style selection)
  const weightedEvents = filterByPriority(available, 'weighted');
  if (weightedEvents.length > 0) {
    const weights = weightedEvents.map(event =>
      calculateWeight(event, context, recentDecisions, tagIndex, npcManager)
    );
    return pickWeighted(weightedEvents, weights) ?? null;
  }

  // Tier 3: Fill events (generic fallback)
  const fillEvents = filterByPriority(available, 'fill');
  if (fillEvents.length > 0) {
    // Fill events are typically equally weighted
    const weights = fillEvents.map(() => 1);
    return pickWeighted(fillEvents, weights) ?? null;
  }

  // No events available in any tier
  return null;
}

function buildSelectionContext(gameState: GameState): Record<string, unknown> {
  const { player } = gameState;

  return {
    'player.name': player.name,
    'player.gender': player.gender,

    'stats.physical': player.stats.physical,
    'stats.confidence': player.stats.confidence,
    'stats.intellectual': player.stats.intellectual,
    'stats.creativity': player.stats.creativity,
    'stats.empathy': player.stats.empathy,
    'stats.resilience': player.stats.resilience,
    'stats.charm': player.stats.charm,
    'stats.discipline': player.stats.discipline,
    'stats.happiness': player.stats.happiness,
    'stats.morality': player.stats.morality,
    'stats.riskTolerance': player.stats.riskTolerance,
    'stats.independence': player.stats.independence,
    'stats.education': player.stats.education,
    'stats.career': player.stats.career,
    'stats.careerLevel': player.stats.careerLevel,
    'stats.wealth': player.stats.wealth,
    'stats.isMarried': player.stats.isMarried,
    'stats.hasChildren': player.stats.hasChildren,
    'stats.age': player.stats.age,
    'stats.currentStage': player.stats.currentStage,
    'stats.experiencesCompleted': player.stats.experiencesCompleted,
    'stats.narrativeTags': player.stats.narrativeTags,

    age: player.stats.age,
    wealth: player.stats.wealth,
    isMarried: player.stats.isMarried,
    hasChildren: player.stats.hasChildren,
    currentStage: player.stats.currentStage,
    education: player.stats.education,
    career: player.stats.career,
    careerLevel: player.stats.careerLevel,
    narrativeTags: player.stats.narrativeTags,
    experiencesCompleted: player.stats.experiencesCompleted,

    gamePhase: gameState.gamePhase,
    stageProgress: gameState.stageProgress,
    selectedMood: gameState.selectedMood,
    deathProbability: gameState.deathProbability,

    personalityProfile: player.personalityProfile,

    ...buildRelationshipsContext(player.stats.relationships),
  };
}

function buildRelationshipsContext(
  relationships: Record<string, { trust: number; affection: number; status: string }>
): Record<string, unknown> {
  const ctx: Record<string, unknown> = {};

  for (const [npcId, rel] of Object.entries(relationships)) {
    ctx[`relationships.${npcId}.trust`] = rel.trust;
    ctx[`relationships.${npcId}.affection`] = rel.affection;
    ctx[`relationships.${npcId}.status`] = rel.status;
  }

  return ctx;
}

function filterByLifeStage(events: Storylet[], currentStage: string): Storylet[] {
  return events.filter(event => {
    // Empty lifeStages array means available at all stages
    if (event.lifeStages.length === 0) {
      return true;
    }
    return event.lifeStages.includes(currentStage as never);
  });
}
