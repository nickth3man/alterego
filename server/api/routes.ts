/**
 * REST API Routes — Alter Ego Game Server
 *
 * All routes delegate to existing engine modules.
 * No game logic is implemented here — only routing and state management.
 */

import type {
  GameState,
  CharacterStats,
  Storylet,
  NewGameRequest,
  ChooseRequest,
  ChooseResponse,
  StatsResponse,
  RelationshipsResponse,
  SaveData,
  WealthTier,
  DeathProbability,
  NPCRelationship,
  LifeStage,
  NPCDefinition,
} from '../core/types.js';
import { TagIndex } from '../engine/tag-index.js';
import { NPCManager } from '../engine/npc-manager.js';
import { createStageMachine, type StageMachine } from '../engine/stage-manager.js';
import { resolveChoice, applyOutcome, processConsequences } from '../engine/event-resolver.js';
import { selectNextEvent } from '../engine/event-selector.js';
import { evaluateCondition } from '../core/conditions.js';
import { getWealthTier, LIFE_STAGES } from '../core/types.js';

// ─── Module-Level State (shared across requests) ──────────────────────────────

// Singleton game state — initialized on first /new call
let gameState: GameState | null = null;
let stageMachine: StageMachine | null = null;
let tagIndex: TagIndex | null = null;
let npcManager: NPCManager | null = null;

// ─── CORS Headers

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// ─── JSON Body Parser ─────────────────────────────────────────────────────────

async function parseJsonBody<T>(req: Request): Promise<T | null> {
  try {
    const contentType = req.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) {
      return null;
    }
    const body = await req.text();
    if (!body) return null;
    return JSON.parse(body) as T;
  } catch {
    return null;
  }
}

// ─── Death Probability Calculator ────────────────────────────────────────────

function calculateDeathProbability(stats: CharacterStats, age: number): DeathProbability {
  // Age-based base rate (roughly 0.1% at 20, scaling up)
  const ageFactor = Math.max(0, (age - 20) / 100);
  const baseRate = age < 20 ? 0.001 : Math.min(0.95, 0.001 + ageFactor);

  // Resilience reduces death probability
  const resilienceModifier = (100 - stats.resilience) / 200;

  // Physical health reduces death probability
  const physicalModifier = (100 - stats.physical) / 200;

  const total = Math.min(0.99, baseRate + resilienceModifier + physicalModifier);

  return {
    baseRate,
    statModifier: resilienceModifier + physicalModifier,
    eventModifier: 0,
    total,
  };
}

// ─── Life Stage Transition Checker ───────────────────────────────────────────

function checkStageTransition(
  currentStage: LifeStage,
  age: number
): { shouldTransition: boolean; newStage: LifeStage | null; narrative: string } {
  const stageOrder: LifeStage[] = [
    'infancy',
    'childhood',
    'adolescence',
    'young-adulthood',
    'adulthood',
    'middle-adulthood',
    'old-age',
  ];

  const stageAgeRanges: Record<LifeStage, [number, number]> = {
    infancy: [0, 2],
    childhood: [3, 12],
    adolescence: [13, 19],
    'young-adulthood': [20, 35],
    adulthood: [36, 50],
    'middle-adulthood': [51, 65],
    'old-age': [66, 120],
  };

  const currentRange = stageAgeRanges[currentStage];
  if (age > currentRange[1]) {
    const currentIdx = stageOrder.indexOf(currentStage);
    if (currentIdx < stageOrder.length - 1) {
      const nextStage = stageOrder[currentIdx + 1];
      const narratives: Record<string, string> = {
        'childhood': 'You grew older and entered a new phase of life.',
        'adolescence': 'The turmoil of teenage years begins.',
        'young-adulthood': 'You step into adulthood.',
        'adulthood': 'Middle age approaches.',
        'middle-adulthood': 'The golden years await.',
        'old-age': 'You enter the twilight of life.',
      };
      return {
        shouldTransition: true,
        newStage: nextStage,
        narrative: narratives[nextStage] ?? 'A new life stage begins.',
      };
    }
  }

  return { shouldTransition: false, newStage: null, narrative: '' };
}

// ─── Route Handlers ───────────────────────────────────────────────────────────

export async function handleNewGame(req: Request): Promise<Response> {
  const body = await parseJsonBody<NewGameRequest>(req);

  if (!body || !body.name || !body.gender || !body.personalityProfile) {
    return Response.json(
      { error: 'Missing required fields: name, gender, personalityProfile' },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const validGenders = ['male', 'female', 'nonbinary'];
  if (!validGenders.includes(body.gender)) {
    return Response.json(
      { error: 'Invalid gender value' },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  // Create initial character stats with personality-driven base + random offset
  const personalityBase = body.personalityProfile;

  // Randomized offsets (small ±5) for replayability
  const randomOffset = (): number => Math.floor(Math.random() * 11) - 5;

  const initialStats: CharacterStats = {
    physical: Math.max(0, Math.min(100, (personalityBase['physical'] ?? 50) + randomOffset())),
    confidence: Math.max(0, Math.min(100, (personalityBase['confidence'] ?? 50) + randomOffset())),
    intellectual: Math.max(0, Math.min(100, (personalityBase['intellectual'] ?? 50) + randomOffset())),
    creativity: Math.max(0, Math.min(100, (personalityBase['creativity'] ?? 50) + randomOffset())),
    empathy: Math.max(0, Math.min(100, (personalityBase['empathy'] ?? 50) + randomOffset())),
    resilience: Math.max(0, Math.min(100, (personalityBase['resilience'] ?? 50) + randomOffset())),
    charm: Math.max(0, Math.min(100, (personalityBase['charm'] ?? 50) + randomOffset())),
    discipline: Math.max(0, Math.min(100, (personalityBase['discipline'] ?? 50) + randomOffset())),
    happiness: 60 + randomOffset(), // Start moderately happy
    morality: 50 + randomOffset(),
    riskTolerance: 50 + randomOffset(),
    independence: 30 + randomOffset(), // Start dependent (child)
    education: 'none',
    career: null,
    careerLevel: 0,
    wealth: 10 + randomOffset(), // Start with minimal resources
    isMarried: false,
    hasChildren: false,
    experiencesCompleted: [],
    narrativeTags: [],
    relationships: {},
    age: 0,
    currentStage: 'infancy',
  };

  // Initialize engine components
  tagIndex = new TagIndex();
  npcManager = new NPCManager([]);

  // Load NPC roster from data/npcs/roster.json if available
  try {
    const rosterPath = new URL('../../data/npcs/roster.json', import.meta.url);
    const rosterData = await fetch(rosterPath).then(r => r.json()).catch(() => null);
    if (rosterData && Array.isArray(rosterData)) {
      const roster = rosterData as NPCDefinition[];
      const actualNpcManager = new NPCManager(roster);
      const npcIds = actualNpcManager.getAllNPCIds();
      actualNpcManager.initializeRelationships(npcIds);
      npcManager = actualNpcManager;
    }
  } catch {
    // NPC roster not critical — use empty manager
  }

  // Create stage machine
  stageMachine = createStageMachine(0);

  // Build initial game state
  gameState = {
    player: {
      name: body.name,
      gender: body.gender,
      personalityProfile: body.personalityProfile,
      stats: initialStats,
    },
    currentEvent: null,
    availableEvents: [],
    stageProgress: 0,
    gamePhase: 'playing',
    selectedMood: null,
    deathProbability: calculateDeathProbability(initialStats, 0).total,
  };

  return Response.json({ gameState }, { status: 200, headers: CORS_HEADERS });
}

export async function handleGetState(_req: Request): Promise<Response> {
  if (!gameState) {
    return Response.json(
      { error: 'No active game. Start a new game first.' },
      { status: 404, headers: CORS_HEADERS }
    );
  }

  return Response.json({ gameState }, { status: 200, headers: CORS_HEADERS });
}

export async function handleChoose(req: Request): Promise<Response> {
  if (!gameState) {
    return Response.json(
      { error: 'No active game. Start a new game first.' },
      { status: 404, headers: CORS_HEADERS }
    );
  }

  const body = await parseJsonBody<ChooseRequest>(req);

  if (!body || !body.eventId || !body.moodId || !body.choiceId) {
    return Response.json(
      { error: 'Missing required fields: eventId, moodId, choiceId' },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  if (!tagIndex || !npcManager) {
    return Response.json(
      { error: 'Game engine not initialized' },
      { status: 500, headers: CORS_HEADERS }
    );
  }

  // Find the event in gameState or available events
  // For now, we assume currentEvent is set from previous selection
  const currentEvent = gameState.currentEvent;
  if (!currentEvent || currentEvent.id !== body.eventId) {
    return Response.json(
      { error: `Event '${body.eventId}' not found or not current event` },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  // Build evaluation context for condition checking
  const context: Record<string, unknown> = {
    'stats.age': gameState.player.stats.age,
    'stats.physical': gameState.player.stats.physical,
    'stats.confidence': gameState.player.stats.confidence,
    'stats.happiness': gameState.player.stats.happiness,
    'stats.wealth': gameState.player.stats.wealth,
    'stats.isMarried': gameState.player.stats.isMarried,
    'stats.hasChildren': gameState.player.stats.hasChildren,
    'stats.currentStage': gameState.player.stats.currentStage,
    'stats.narrativeTags': gameState.player.stats.narrativeTags,
    age: gameState.player.stats.age,
    currentStage: gameState.player.stats.currentStage,
    ...gameState.player.personalityProfile,
  };

  try {
    // Resolve choice to outcome
    const outcome = resolveChoice(currentEvent, body.moodId, body.choiceId, context);

    // Apply stat changes
    const newStats = applyOutcome(gameState.player.stats, outcome);

    // Age up by 1 year per choice
    newStats.age = Math.min(120, (newStats.age ?? 0) + 1);

    // Update game state with new stats
    gameState.player.stats = newStats;

    // Process consequences (tags, relationships)
    processConsequences(outcome, tagIndex as unknown as import('../engine/event-resolver.js').TagIndex, npcManager as unknown as import('../engine/event-resolver.js').NPCManager);

    // Add experience completed
    if (!newStats.experiencesCompleted.includes(currentEvent.id)) {
      newStats.experiencesCompleted = [...newStats.experiencesCompleted, currentEvent.id];
    }

    const deathProb = calculateDeathProbability(newStats, newStats.age);
    gameState.deathProbability = deathProb.total;

    // Check for death
    let death = false;
    if (deathProb.total > Math.random()) {
      death = true;
      gameState.gamePhase = 'gameover';
    }

    // Check for stage transition
    let stageTransition: { from: LifeStage; to: LifeStage; narrative: string } | undefined;
    const transitionResult = checkStageTransition(newStats.currentStage, newStats.age);
    if (transitionResult.shouldTransition && transitionResult.newStage) {
      stageTransition = {
        from: newStats.currentStage,
        to: transitionResult.newStage,
        narrative: transitionResult.narrative,
      };
      newStats.currentStage = transitionResult.newStage;
      gameState.player.stats = newStats;
    }

    // Select next event (placeholder — would need event cache)
    const nextEvent: Storylet | null = null;

    // Update game state
    gameState.currentEvent = nextEvent;
    gameState.selectedMood = null;

    const response: ChooseResponse = {
      outcome,
      newStats,
      nextEvent,
    };

    if (stageTransition) {
      response.stageTransition = stageTransition;
    }

    if (death) {
      response.death = true;
    }

    return Response.json(response, { status: 200, headers: CORS_HEADERS });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return Response.json(
      { error: `Failed to resolve choice: ${message}` },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

export async function handleGetStats(_req: Request): Promise<Response> {
  if (!gameState) {
    return Response.json(
      { error: 'No active game. Start a new game first.' },
      { status: 404, headers: CORS_HEADERS }
    );
  }

  const { stats } = gameState.player;
  const wealthTier = getWealthTier(stats.wealth);
  const deathProbability = calculateDeathProbability(stats, stats.age);

  const response: StatsResponse = {
    stats,
    wealthTier,
    deathProbability,
  };

  return Response.json(response, { status: 200, headers: CORS_HEADERS });
}

export async function handleGetRelationships(_req: Request): Promise<Response> {
  if (!gameState) {
    return Response.json(
      { error: 'No active game. Start a new game first.' },
      { status: 404, headers: CORS_HEADERS }
    );
  }

  if (!npcManager) {
    return Response.json(
      { error: 'NPC manager not initialized' },
      { status: 500, headers: CORS_HEADERS }
    );
  }

  const relationships = npcManager.getAllRelationships();
  const activeNPCs = npcManager.getActiveNPCs(gameState.player.stats.currentStage);

  const response: RelationshipsResponse = {
    relationships,
    activeNPCs,
  };

  return Response.json(response, { status: 200, headers: CORS_HEADERS });
}

export async function handleSave(req: Request): Promise<Response> {
  if (!gameState) {
    return Response.json(
      { error: 'No active game. Start a new game first.' },
      { status: 404, headers: CORS_HEADERS }
    );
  }

  const body = await parseJsonBody<{ saveName?: string }>(req);
  const saveName = body?.saveName ?? `Save-${Date.now()}`;

  // Placeholder response — save-system.ts will be implemented separately
  const saveId = `save-${Date.now()}`;
  const timestamp = new Date().toISOString();

  return Response.json(
    { saveId, timestamp, note: 'Save system not yet implemented' },
    { status: 200, headers: CORS_HEADERS }
  );
}

export async function handleLoad(req: Request): Promise<Response> {
  const body = await parseJsonBody<{ saveId: string }>(req);

  if (!body || !body.saveId) {
    return Response.json(
      { error: 'Missing required field: saveId' },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  // Placeholder response — save-system.ts will be implemented separately
  return Response.json(
    { error: 'Load system not yet implemented', saveId: body.saveId },
    { status: 501, headers: CORS_HEADERS }
  );
}

export async function handleEndGame(_req: Request): Promise<Response> {
  if (!gameState) {
    return Response.json(
      { error: 'No active game. Start a new game first.' },
      { status: 404, headers: CORS_HEADERS }
    );
  }

  const { player } = gameState;

  // Build life story from narrative tags and experiences
  const lifeStoryParts: string[] = [];
  if (player.stats.narrativeTags.length > 0) {
    lifeStoryParts.push(`Key moments: ${player.stats.narrativeTags.join(', ')}.`);
  }
  if (player.stats.career) {
    lifeStoryParts.push(`${player.name} pursued a career as ${player.stats.career}.`);
  }
  if (player.stats.isMarried) {
    lifeStoryParts.push(`${player.name} found love and married.`);
  }
  if (player.stats.hasChildren) {
    lifeStoryParts.push(`${player.name} raised a family.`);
  }
  lifeStoryParts.push(`Lived to age ${player.stats.age}.`);

  const summary = {
    lifeStory: lifeStoryParts.join(' '),
    finalStats: { ...player.stats },
    legacy: player.stats.narrativeTags.length > 0
      ? `Remembered for: ${player.stats.narrativeTags.slice(0, 3).join(', ')}`
      : 'A quiet life, largely unremembered.',
  };

  gameState.gamePhase = 'summary';

  return Response.json({ summary }, { status: 200, headers: CORS_HEADERS });
}

// ─── Health Check Handlers (kept from original server) ───────────────────────

export function handleHealthLive(_req: Request): Response {
  return Response.json({ status: 'ok' }, { headers: CORS_HEADERS });
}

export function handleHealthReady(_req: Request): Response {
  const isReady = gameState !== null;
  return Response.json(
    { status: isReady ? 'ready' : 'initializing' },
    { headers: CORS_HEADERS }
  );
}

// ─── Main Router ──────────────────────────────────────────────────────────────

export function routeRequest(req: Request): Response | Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname;

  // Health endpoints
  if (path === '/health/live') {
    return handleHealthLive(req);
  }
  if (path === '/health/ready') {
    return handleHealthReady(req);
  }

  // API routes
  if (path === '/api/game/new' && req.method === 'POST') {
    return handleNewGame(req);
  }
  if (path === '/api/game/state' && req.method === 'GET') {
    return handleGetState(req);
  }
  if (path === '/api/game/choose' && req.method === 'POST') {
    return handleChoose(req);
  }
  if (path === '/api/game/stats' && req.method === 'GET') {
    return handleGetStats(req);
  }
  if (path === '/api/game/relationships' && req.method === 'GET') {
    return handleGetRelationships(req);
  }
  if (path === '/api/game/save' && req.method === 'POST') {
    return handleSave(req);
  }
  if (path === '/api/game/load' && req.method === 'POST') {
    return handleLoad(req);
  }
  if (path === '/api/game/end' && req.method === 'POST') {
    return handleEndGame(req);
  }

  // OPTIONS for CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  // 404 for unknown routes
  return Response.json({ error: 'Not found' }, { status: 404, headers: CORS_HEADERS });
}

// ─── Export Shared State Access (for WebSocket) ──────────────────────────────

export function getGameState(): GameState | null {
  return gameState;
}

export function setGameState(state: GameState): void {
  gameState = state;
}

export function getTagIndex(): TagIndex | null {
  return tagIndex;
}

export function getNpcManager(): NPCManager | null {
  return npcManager;
}