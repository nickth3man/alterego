// Shared types — server engine + client Solid.js store

// ─── Life Stages ───────────────────────────────────────────

export type LifeStage =
  | 'infancy'
  | 'childhood'
  | 'adolescence'
  | 'young-adulthood'
  | 'adulthood'
  | 'middle-adulthood'
  | 'old-age';

export const LIFE_STAGES: LifeStage[] = [
  'infancy',
  'childhood',
  'adolescence',
  'young-adulthood',
  'adulthood',
  'middle-adulthood',
  'old-age',
];

// ─── Education Levels ──────────────────────────────────────

export type EducationLevel =
  | 'none'
  | 'elementary'
  | 'high-school'
  | 'some-college'
  | 'bachelors'
  | 'masters'
  | 'doctorate';

// ─── Game Phases ───────────────────────────────────────────

export type GamePhase =
  | 'title'
  | 'quiz'
  | 'char-create'
  | 'playing'
  | 'stage-transition'
  | 'gameover'
  | 'summary';

// ─── Event Categories ──────────────────────────────────────

export type EventCategory =
  | 'social'
  | 'physical'
  | 'emotional'
  | 'family'
  | 'vocational';

// ─── Condition System (JSON-Serializable, NOT functions) ───

export interface JsonLogicRule {
  type: 'jsonLogic';
  rule: Record<string, unknown>;
  // e.g. { "and": [{ ">=": [{ "var": "stats.age" }, 18] }, { "in": ["married", { "var": "tags" }] }] }
}

export interface SafeExpression {
  type: 'expression';
  expression: string; // Sandboxed, parse-time verified
}

export type Condition = JsonLogicRule | SafeExpression;

// ─── Event Priority Tiers ──────────────────────────────────

export type EventPriority = 'story' | 'weighted' | 'fill';

// ─── Storylet (Event Node) ─────────────────────────────────

export interface StoryletMood {
  id: string;
  label: string; // "Calm", "Angry", "Excited", "Fearful"
  emoji: string;
  color: string;
}

export interface StoryletOutcome {
  condition: Condition;
  narration: string;
  statChanges: Partial<CharacterStats>;
  consequences: {
    unlockEvents?: string[];
    blockEvents?: string[];
    death?: boolean;
    tag?: string;
    relationshipChanges?: { npcId: string; delta: number }[];
  };
}

export interface StoryletChoice {
  id: string;
  label: string;
  compatibleMoods?: string[];
  outcomes: StoryletOutcome[];
}

export interface Storylet {
  id: string;
  category: EventCategory;
  lifeStages: LifeStage[];
  prerequisites: Condition;
  weight: number;
  maxRepeats?: number; // undefined = unlimited, 1 = once-only
  priority: EventPriority;
  title: string;
  description: string;
  moods: StoryletMood[];
  choices: StoryletChoice[];
}

// ─── NPC Relationship System ───────────────────────────────

export type NPCStatus =
  | 'stranger'
  | 'acquaintance'
  | 'friend'
  | 'closeFriend'
  | 'romantic'
  | 'enemy';

export type MemorySentiment = 'positive' | 'negative' | 'neutral';

export interface MemoryEntry {
  eventId: string;
  tags: string[];
  sentiment: MemorySentiment;
  summary: string; // Hand-written or AI-generated callback text
}

export interface NPCRelationship {
  id: string;
  name: string;
  trust: number; // -100 to 100
  affection: number; // -100 to 100
  memories: MemoryEntry[];
  status: NPCStatus;
  activeStages: LifeStage[];
}

// NPC roster definition (from data/npcs/roster.json)
export interface NPCDefinition {
  id: string;
  name: string;
  role: string; // "parent", "sibling", "friend", "mentor", etc.
  activeStages: LifeStage[];
  personality: Record<string, number>; // Trait weights that affect interactions
  initialTrust: number; // Starting trust value
  initialAffection: number; // Starting affection value
  description: string; // Brief NPC description for the game
}

// ─── Character Stats ───────────────────────────────────────

export interface CharacterStats {
  // Core personality traits (scale 0-100)
  physical: number;
  confidence: number;
  intellectual: number;
  creativity: number;
  empathy: number;
  resilience: number;
  charm: number;
  discipline: number;
  // Life aspects (scale 0-100)
  happiness: number;
  morality: number;
  riskTolerance: number;
  independence: number;
  // Life progress
  education: EducationLevel;
  career: string | null;
  careerLevel: number; // 0 = entry, 5 = executive
  wealth: number; // 0-100 scale
  isMarried: boolean;
  hasChildren: boolean;
  // Tracking — ALWAYS nested inside objects for Solid.js reactivity
  experiencesCompleted: string[];
  narrativeTags: string[];
  relationships: Record<string, NPCRelationship>; // Record, not array
  age: number;
  currentStage: LifeStage;
}

// ─── Economy System ────────────────────────────────────────

export type WealthTier = 'struggle' | 'middle-class' | 'affluent' | 'wealthy';

export interface EconomySnapshot {
  careerEarnings: number;
  passiveIncome: number;
  expenses: number;
  netWealthChange: number;
}

export function getWealthTier(wealth: number): WealthTier {
  if (wealth <= 10) return 'struggle';
  if (wealth <= 50) return 'middle-class';
  if (wealth <= 80) return 'affluent';
  return 'wealthy';
}

// ─── Game State ────────────────────────────────────────────

export interface GameState {
  player: {
    name: string;
    gender: 'male' | 'female' | 'nonbinary';
    personalityProfile: Record<string, number>; // From pre-game quiz
    stats: CharacterStats;
  };
  currentEvent: Storylet | null;
  availableEvents: string[];
  stageProgress: number;
  gamePhase: GamePhase;
  selectedMood: string | null;
  deathProbability: number; // Calculated from age + stats
}

// ─── Death Mechanics ───────────────────────────────────────

export interface DeathProbability {
  baseRate: number; // Age-based probability
  statModifier: number; // From resilience/physical
  eventModifier: number; // From critical events
  total: number; // Combined probability (0-1)
}

// ─── API Request/Response Types ────────────────────────────

export interface NewGameRequest {
  name: string;
  gender: 'male' | 'female' | 'nonbinary';
  personalityProfile: Record<string, number>;
}

export interface NewGameResponse {
  gameState: GameState;
}

export interface ChooseRequest {
  eventId: string;
  moodId: string;
  choiceId: string;
}

export interface ChooseResponse {
  outcome: StoryletOutcome;
  newStats: CharacterStats;
  nextEvent: Storylet | null;
  stageTransition?: {
    from: LifeStage;
    to: LifeStage;
    narrative: string;
  };
  death?: boolean;
}

export interface SaveData {
  version: number;
  timestamp: string;
  gameState: GameState;
  economySnapshot: EconomySnapshot;
}

export interface SaveFile {
  id: string;
  name: string;
  timestamp: string;
  stage: LifeStage;
  age: number;
  wealth: number;
}

export interface LoadResponse {
  gameState: GameState;
}

export interface StatsResponse {
  stats: CharacterStats;
  wealthTier: WealthTier;
  deathProbability: DeathProbability;
}

export interface RelationshipsResponse {
  relationships: Record<string, NPCRelationship>;
  activeNPCs: string[];
}

// ─── WebSocket Messages ────────────────────────────────────

export type WSMessageType =
  | 'stat-change'
  | 'event-update'
  | 'stage-transition'
  | 'save-complete'
  | 'relationship-change'
  | 'death'
  | 'welcome'
  | 'pong'
  | 'subscribed'
  | 'unsubscribed'
  | 'error'
  | 'state';

export interface WSMessage<T = unknown> {
  type: WSMessageType;
  payload: T;
  timestamp: number;
}

export interface StatChangePayload {
  statName: keyof CharacterStats;
  oldValue: number;
  newValue: number;
  delta: number;
  source: string; // eventId that caused the change
}

// ─── Stage Transition ──────────────────────────────────────

export interface StageTransition {
  from: LifeStage;
  to: LifeStage;
  narrative: string;
  ageRange: [number, number]; // Min/max age for this transition
}

// ─── Content Cache (loaded events) ─────────────────────────

export interface ContentCache {
  events: Map<string, Storylet>;
  npcs: Map<string, NPCDefinition>;
  stageTransitions: StageTransition[];
  loadedAt: number;
}

// ─── Challenge Mode ────────────────────────────────────────

export interface ChallengeMode {
  id: string;
  name: string;
  description: string;
  startingStats: Partial<CharacterStats>;
  restrictions: {
    blockedEvents?: string[];
    forcedEvents?: string[];
    startingWealth?: number;
    startingCareer?: string;
  };
}
