import { z } from 'zod';

// ─── Life Stages ─────────────────────────────────────────────────────────────

export const zLifeStage = z.union([
  z.literal('infancy'),
  z.literal('childhood'),
  z.literal('adolescence'),
  z.literal('young-adulthood'),
  z.literal('adulthood'),
  z.literal('middle-adulthood'),
  z.literal('old-age'),
]);

export type LifeStage = z.infer<typeof zLifeStage>;

// ─── Education Levels ─────────────────────────────────────────────────────────

export const zEducationLevel = z.union([
  z.literal('none'),
  z.literal('elementary'),
  z.literal('high-school'),
  z.literal('some-college'),
  z.literal('bachelors'),
  z.literal('masters'),
  z.literal('doctorate'),
]);

export type EducationLevel = z.infer<typeof zEducationLevel>;

// ─── Game Phases ─────────────────────────────────────────────────────────────

export const zGamePhase = z.union([
  z.literal('title'),
  z.literal('quiz'),
  z.literal('char-create'),
  z.literal('playing'),
  z.literal('stage-transition'),
  z.literal('gameover'),
  z.literal('summary'),
]);

export type GamePhase = z.infer<typeof zGamePhase>;

// ─── Event Categories ────────────────────────────────────────────────────────

export const zEventCategory = z.union([
  z.literal('social'),
  z.literal('physical'),
  z.literal('emotional'),
  z.literal('family'),
  z.literal('vocational'),
]);

export type EventCategory = z.infer<typeof zEventCategory>;

// ─── Event Priority Tiers ─────────────────────────────────────────────────────

export const zEventPriority = z.union([
  z.literal('story'),
  z.literal('weighted'),
  z.literal('fill'),
]);

export type EventPriority = z.infer<typeof zEventPriority>;

// ─── NPC Status ──────────────────────────────────────────────────────────────

export const zNPCStatus = z.union([
  z.literal('stranger'),
  z.literal('acquaintance'),
  z.literal('friend'),
  z.literal('closeFriend'),
  z.literal('romantic'),
  z.literal('enemy'),
]);

export type NPCStatus = z.infer<typeof zNPCStatus>;

// ─── Memory Sentiment ────────────────────────────────────────────────────────

export const zMemorySentiment = z.union([
  z.literal('positive'),
  z.literal('negative'),
  z.literal('neutral'),
]);

export type MemorySentiment = z.infer<typeof zMemorySentiment>;

// ─── Condition System (JSON-Serializable, NOT functions) ─────────────────────

export const zJsonLogicRule = z.object({
  type: z.literal('jsonLogic'),
  rule: z.record(z.unknown()),
});

export type JsonLogicRule = z.infer<typeof zJsonLogicRule>;

export const zSafeExpression = z.object({
  type: z.literal('expression'),
  expression: z.string(),
});

export type SafeExpression = z.infer<typeof zSafeExpression>;

export const zCondition: z.ZodType<JsonLogicRule | SafeExpression> = z.union([
  zJsonLogicRule,
  zSafeExpression,
]);

export type Condition = z.infer<typeof zCondition>;

// ─── Storylet (Event Node) ────────────────────────────────────────────────────

export const zStoryletMood = z.object({
  id: z.string(),
  label: z.string(),
  emoji: z.string(),
  color: z.string(),
});

export type StoryletMood = z.infer<typeof zStoryletMood>;

export const zRelationshipChange = z.object({
  npcId: z.string(),
  delta: z.number(),
});

export const zStoryletOutcome = z.object({
  condition: zCondition,
  narration: z.string(),
  statChanges: z.record(z.string(), z.number()),
  consequences: z.object({
    unlockEvents: z.array(z.string()).optional(),
    blockEvents: z.array(z.string()).optional(),
    death: z.boolean().optional(),
    tag: z.string().optional(),
    relationshipChanges: z.array(zRelationshipChange).optional(),
  }),
});

export type StoryletOutcome = z.infer<typeof zStoryletOutcome>;

export const zStoryletChoice = z.object({
  id: z.string(),
  label: z.string(),
  compatibleMoods: z.array(z.string()).optional(),
  outcomes: z.array(zStoryletOutcome).min(1),
});

export type StoryletChoice = z.infer<typeof zStoryletChoice>;

export const zStorylet = z.object({
  id: z.string(),
  category: zEventCategory,
  lifeStages: z.array(zLifeStage).min(1),
  prerequisites: zCondition,
  weight: z.number().min(0),
  maxRepeats: z.number().int().nonnegative().optional(),
  priority: zEventPriority,
  title: z.string(),
  description: z.string(),
  moods: z.array(zStoryletMood).min(1),
  choices: z.array(zStoryletChoice).min(1),
});

export type Storylet = z.infer<typeof zStorylet>;

// ─── NPC Relationship System ─────────────────────────────────────────────────

export const zMemoryEntry = z.object({
  eventId: z.string(),
  tags: z.array(z.string()),
  sentiment: zMemorySentiment,
  summary: z.string(),
});

export type MemoryEntry = z.infer<typeof zMemoryEntry>;

export const zNPCRelationship = z.object({
  id: z.string(),
  name: z.string(),
  trust: z.number().min(-100).max(100),
  affection: z.number().min(-100).max(100),
  memories: z.array(zMemoryEntry),
  status: zNPCStatus,
  activeStages: z.array(zLifeStage),
});

export type NPCRelationship = z.infer<typeof zNPCRelationship>;

// NPC roster definition (from data/npcs/roster.json)
export const zNPCDefinition = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),
  activeStages: z.array(zLifeStage),
  personality: z.record(z.number()),
  initialTrust: z.number(),
  initialAffection: z.number(),
  description: z.string(),
});

export type NPCDefinition = z.infer<typeof zNPCDefinition>;

// ─── Character Stats ──────────────────────────────────────────────────────────

// Scale 0-100
const zScaledStat = z.number().min(0).max(100);

// Career level is 0-5
const zCareerLevel = z.number().int().min(0).max(5);

export const zCharacterStats = z.object({
  // Core personality traits (scale 0-100)
  physical: zScaledStat,
  confidence: zScaledStat,
  intellectual: zScaledStat,
  creativity: zScaledStat,
  empathy: zScaledStat,
  resilience: zScaledStat,
  charm: zScaledStat,
  discipline: zScaledStat,
  // Life aspects (scale 0-100)
  happiness: zScaledStat,
  morality: zScaledStat,
  riskTolerance: zScaledStat,
  independence: zScaledStat,
  // Life progress
  education: zEducationLevel,
  career: z.string().nullable(),
  careerLevel: zCareerLevel,
  wealth: zScaledStat,
  isMarried: z.boolean(),
  hasChildren: z.boolean(),
  // Tracking — ALWAYS nested inside objects for Solid.js reactivity
  experiencesCompleted: z.array(z.string()),
  narrativeTags: z.array(z.string()),
  relationships: z.record(zNPCRelationship),
  age: z.number(),
  currentStage: zLifeStage,
});

export type CharacterStats = z.infer<typeof zCharacterStats>;

// ─── Game State ───────────────────────────────────────────────────────────────

export const zGameState = z.object({
  player: z.object({
    name: z.string(),
    gender: z.union([z.literal('male'), z.literal('female'), z.literal('nonbinary')]),
    personalityProfile: z.record(z.number()),
    stats: zCharacterStats,
  }),
  currentEvent: zStorylet.nullable(),
  availableEvents: z.array(z.string()),
  stageProgress: z.number(),
  gamePhase: zGamePhase,
  selectedMood: z.string().nullable(),
  deathProbability: z.number(),
});

export type GameState = z.infer<typeof zGameState>;

// ─── Save Data ────────────────────────────────────────────────────────────────

export const zEconomySnapshot = z.object({
  careerEarnings: z.number(),
  passiveIncome: z.number(),
  expenses: z.number(),
  netWealthChange: z.number(),
});

export type EconomySnapshot = z.infer<typeof zEconomySnapshot>;

export const zSaveData = z.object({
  version: z.number(),
  timestamp: z.string(),
  gameState: zGameState,
  economySnapshot: zEconomySnapshot,
});

export type SaveData = z.infer<typeof zSaveData>;

export const zSaveFile = z.object({
  id: z.string(),
  name: z.string(),
  timestamp: z.string(),
  stage: zLifeStage,
  age: z.number(),
  wealth: z.number(),
});

export type SaveFile = z.infer<typeof zSaveFile>;

// ─── Parse Helpers ───────────────────────────────────────────────────────────

export function parseStorylet(data: unknown): Storylet {
  return zStorylet.parse(data);
}

export function tryParseStorylet(data: unknown): Storylet | null {
  return zStorylet.safeParse(data).success ? (data as Storylet) : null;
}

export function parseGameState(data: unknown): GameState {
  return zGameState.parse(data);
}

export function tryParseGameState(data: unknown): GameState | null {
  return zGameState.safeParse(data).success ? (data as GameState) : null;
}

export function parseNPCDefinition(data: unknown): NPCDefinition {
  return zNPCDefinition.parse(data);
}

export function tryParseNPCDefinition(data: unknown): NPCDefinition | null {
  return zNPCDefinition.safeParse(data).success ? (data as NPCDefinition) : null;
}