import type {
  NPCDefinition,
  NPCRelationship,
  NPCStatus,
  MemoryEntry,
  MemorySentiment,
  LifeStage,
} from '../core/types';

// Status calculation thresholds
const STATUS_THRESHOLDS = {
  romantic: { trust: 60, affection: 70 },
  closeFriend: { trust: 50, affection: 50 },
  friend: { trust: 30, affection: 30 },
  acquaintance: { trust: 0, affection: 0 },
  enemy: { trust: -30, affection: -30 },
} as const;

// Memory consolidation settings
const MEMORY_CONSOLIDATION_THRESHOLD = 5;
const MEMORIES_TO_CONSOLIDATE = 3;

/**
 * Calculate NPC status based on trust and affection values.
 * Priority: romantic > closeFriend > friend > acquaintance > enemy > stranger
 */
export function calculateNPCStatus(trust: number, affection: number): NPCStatus {
  // Romantic: trust > 60 && affection > 70
  if (trust > STATUS_THRESHOLDS.romantic.trust && affection > STATUS_THRESHOLDS.romantic.affection) {
    return 'romantic';
  }

  // Close friend: trust > 50 && affection > 50
  if (trust > STATUS_THRESHOLDS.closeFriend.trust && affection > STATUS_THRESHOLDS.closeFriend.affection) {
    return 'closeFriend';
  }

  // Friend: trust > 30 && affection > 30
  if (trust > STATUS_THRESHOLDS.friend.trust && affection > STATUS_THRESHOLDS.friend.affection) {
    return 'friend';
  }

  // Enemy: trust < -30 || affection < -30
  if (trust < STATUS_THRESHOLDS.enemy.trust || affection < STATUS_THRESHOLDS.enemy.affection) {
    return 'enemy';
  }

  // Acquaintance: trust > 0 && affection > 0
  if (trust > STATUS_THRESHOLDS.acquaintance.trust && affection > STATUS_THRESHOLDS.acquaintance.affection) {
    return 'acquaintance';
  }

  // Default: stranger
  return 'stranger';
}

/**
 * Determines sentiment from an impression tag keyword.
 * This is a simple heuristic for consolidation.
 */
function inferSentimentFromTag(tag: string): MemorySentiment {
  const positiveIndicators = ['helpful', 'kind', 'trustworthy', 'supportive', 'caring', 'warm', 'friendly', 'close', 'romantic'];
  const negativeIndicators = ['untrustworthy', 'cold', 'hostile', 'distant', 'mean', 'cruel', 'unreliable', 'enemy'];

  const lowerTag = tag.toLowerCase();

  for (const indicator of positiveIndicators) {
    if (lowerTag.includes(indicator)) {
      return 'positive';
    }
  }

  for (const indicator of negativeIndicators) {
    if (lowerTag.includes(indicator)) {
      return 'negative';
    }
  }

  return 'neutral';
}

/**
 * Generate an impression tag from consolidated memory data.
 * Uses a simple keyword extraction approach based on sentiments and tags.
 */
function generateImpressionTag(memories: MemoryEntry[]): string {
  const tagCounts: Record<string, { sentiment: MemorySentiment; count: number }> = {};

  for (const memory of memories) {
    const sentimentMultiplier = memory.sentiment === 'positive' ? 2 : memory.sentiment === 'negative' ? -2 : 1;

    for (const tag of memory.tags) {
      if (!tagCounts[tag]) {
        tagCounts[tag] = { sentiment: memory.sentiment, count: 0 };
      }
      tagCounts[tag].count += sentimentMultiplier;
    }
  }

  let bestTag = 'neutral';
  let bestScore = -Infinity;

  for (const [tag, data] of Object.entries(tagCounts)) {
    const score = data.count;
    if (score > bestScore) {
      bestScore = score;
      bestTag = tag;
    }
  }

  return bestTag;
}

/**
 * Summarize multiple memories into a single consolidated summary.
 */
function consolidateMemorySummary(memories: MemoryEntry[]): string {
  if (memories.length === 0) {
    return '';
  }

  const summaries = memories.map((m) => m.summary);
  const sentiments = memories.map((m) => m.sentiment);

  const positiveCount = sentiments.filter((s) => s === 'positive').length;
  const negativeCount = sentiments.filter((s) => s === 'negative').length;
  const neutralCount = sentiments.filter((s) => s === 'neutral').length;

  let overview = '';
  if (positiveCount > negativeCount && positiveCount > neutralCount) {
    overview = 'Overall positive interactions. ';
  } else if (negativeCount > positiveCount && negativeCount > neutralCount) {
    overview = 'Overall negative interactions. ';
  } else if (neutralCount > 0) {
    overview = 'Mixed to neutral interactions. ';
  }

  return overview + summaries.slice(0, 3).join(' ');
}

/**
 * NPCManager - Manages NPC relationships, memories, and memory consolidation.
 * Handles cross-stage NPC appearances and relationship tracking.
 */
export class NPCManager {
  private relationships: Record<string, NPCRelationship> = {};
  private npcRoster: Map<string, NPCDefinition> = new Map();

  constructor(npcRoster: NPCDefinition[] = []) {
    for (const npc of npcRoster) {
      this.npcRoster.set(npc.id, npc);
    }
  }

  /**
   * Get a single NPC relationship by ID.
   */
  getNPC(npcId: string): NPCRelationship | undefined {
    return this.relationships[npcId];
  }

  /**
   * Get all active NPC relationships.
   */
  getAllRelationships(): Record<string, NPCRelationship> {
    return { ...this.relationships };
  }

  /**
   * Get list of NPC IDs that are active in a given life stage.
   */
  getActiveNPCs(stage: LifeStage): string[] {
    const activeIds: string[] = [];

    for (const [npcId, relationship] of Object.entries(this.relationships)) {
      if (relationship.activeStages.includes(stage)) {
        activeIds.push(npcId);
      }
    }

    return activeIds;
  }

  /**
   * Add a memory entry to an NPC's memory list.
   * Triggers consolidation if threshold is reached.
   */
  addMemory(npcId: string, entry: MemoryEntry): void {
    const relationship = this.relationships[npcId];
    if (!relationship) {
      return;
    }

    relationship.memories.push(entry);

    if (relationship.memories.length >= MEMORY_CONSOLIDATION_THRESHOLD) {
      this.consolidateMemories(npcId);
    }
  }

  /**
   * Modify trust value, clamped to -100 to 100 range.
   */
  updateTrust(npcId: string, delta: number): void {
    const relationship = this.relationships[npcId];
    if (!relationship) {
      return;
    }

    relationship.trust = Math.max(-100, Math.min(100, relationship.trust + delta));
    this.updateStatus(npcId);
  }

  /**
   * Modify affection value, clamped to -100 to 100 range.
   */
  updateAffection(npcId: string, delta: number): void {
    const relationship = this.relationships[npcId];
    if (!relationship) {
      return;
    }

    relationship.affection = Math.max(-100, Math.min(100, relationship.affection + delta));
    this.updateStatus(npcId);
  }

  /**
   * Auto-update NPC status based on current trust and affection values.
   */
  updateStatus(npcId: string): void {
    const relationship = this.relationships[npcId];
    if (!relationship) {
      return;
    }

    relationship.status = calculateNPCStatus(relationship.trust, relationship.affection);
  }

  /**
   * Consolidate oldest memories into an impression tag.
   * When NPC has 5+ memories, consolidate oldest 3 into a single summary.
   * The summary replaces the consolidated memories.
   */
  consolidateMemories(npcId: string): void {
    const relationship = this.relationships[npcId];
    if (!relationship || relationship.memories.length < MEMORY_CONSOLIDATION_THRESHOLD) {
      return;
    }

    const memoriesToConsolidate = relationship.memories.slice(0, MEMORIES_TO_CONSOLIDATE);
    const memoriesToKeep = relationship.memories.slice(MEMORIES_TO_CONSOLIDATE);

    const impressionTag = generateImpressionTag(memoriesToConsolidate);
    const summary = consolidateMemorySummary(memoriesToConsolidate);

    const consolidatedMemory: MemoryEntry = {
      eventId: 'consolidated',
      tags: [impressionTag],
      sentiment: inferSentimentFromTag(impressionTag),
      summary: `[Impression: ${impressionTag}] ${summary}`,
    };

    relationship.memories = [consolidatedMemory, ...memoriesToKeep];
  }

  /**
   * Find callback text for a given impression tag.
   * Returns the memory summary if found, null otherwise.
   */
  getCallbackText(npcId: string, tag: string): string | null {
    const relationship = this.relationships[npcId];
    if (!relationship) {
      return null;
    }

    for (const memory of relationship.memories) {
      if (memory.tags.includes(tag) && memory.eventId === 'consolidated') {
        return memory.summary;
      }
    }

    return null;
  }

  /**
   * Get all unique impression tags from consolidated memories.
   */
  getImpressionTags(npcId: string): string[] {
    const relationship = this.relationships[npcId];
    if (!relationship) {
      return [];
    }

    const tags: string[] = [];

    for (const memory of relationship.memories) {
      if (memory.eventId === 'consolidated') {
        tags.push(...memory.tags);
      }
    }

    return [...new Set(tags)];
  }

  /**
   * Initialize a new relationship from an NPC definition.
   * Creates the relationship entry with initial values.
   */
  initializeRelationship(npcId: string): void {
    const definition = this.npcRoster.get(npcId);
    if (!definition) {
      return;
    }

    if (this.relationships[npcId]) {
      return;
    }

    this.relationships[npcId] = {
      id: definition.id,
      name: definition.name,
      trust: definition.initialTrust,
      affection: definition.initialAffection,
      memories: [],
      status: calculateNPCStatus(definition.initialTrust, definition.initialAffection),
      activeStages: [...definition.activeStages],
    };
  }

  /**
   * Initialize multiple relationships at once.
   */
  initializeRelationships(npcIds: string[]): void {
    for (const npcId of npcIds) {
      this.initializeRelationship(npcId);
    }
  }

  /**
   * Get the NPC definition for a given NPC ID.
   */
  getNPCDefinition(npcId: string): NPCDefinition | undefined {
    return this.npcRoster.get(npcId);
  }

  /**
   * Get all NPC IDs from the roster.
   */
  getAllNPCIds(): string[] {
    return Array.from(this.npcRoster.keys());
  }

  /**
   * Check if an NPC is known (has a relationship established).
   */
  hasRelationship(npcId: string): boolean {
    return npcId in this.relationships;
  }

  /**
   * Get the count of memories for an NPC.
   */
  getMemoryCount(npcId: string): number {
    const relationship = this.relationships[npcId];
    return relationship ? relationship.memories.length : 0;
  }

  /**
   * Remove a relationship (e.g., when NPC dies or leaves the story).
   */
  removeRelationship(npcId: string): void {
    delete this.relationships[npcId];
  }

  /**
   * Load relationships from a saved game state.
   * Used during game loading.
   */
  loadRelationships(relationships: Record<string, NPCRelationship>): void {
    this.relationships = { ...relationships };
  }
}

export { NPCManager as default };
