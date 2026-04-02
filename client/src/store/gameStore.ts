/**
 * Solid.js Game Store — Alter Ego Client
 *
 * Central reactive store using solid-js/store createStore
 * for fine-grained reactivity across the entire game.
 *
 * RULE: All arrays/objects are nested inside parent objects.
 *       No top-level arrays — Solid.js requires wrapping for reactivity.
 *
 * Exports both:
 *   - Individual exports (gameState, setGameState, helpers) for new code
 *   - Backward-compatible `gameStore` object for existing components
 */

import { createStore, produce } from 'solid-js/store';
import type {
  GamePhase,
  CharacterStats,
  NewGameRequest,
  NewGameResponse,
  SaveFile,
  GameState,
  Storylet,
  StoryletChoice,
  StoryletMood,
  NPCRelationship,
  WealthTier,
  LifeStage,
  StoryletOutcome,
  EducationLevel,
} from '../../../server/core/types';
import { getWealthTier } from '../../../server/core/types';

// ─── Floating Indicator (UI-only) ──────────────────────────────

export interface FloatingIndicator {
  id: string;
  statName: string;
  delta: number;
  timestamp: number;
}

// ─── Stage Transition Overlay Data ─────────────────────────────

export interface StageTransitionData {
  from: LifeStage;
  to: LifeStage;
  narrative: string;
}

// ─── Full Client Store Shape ───────────────────────────────────

export interface ClientGameState {
  player: {
    name: string;
    gender: 'male' | 'female' | 'nonbinary';
    personalityProfile: Record<string, number>;
    stats: {
      physical: number;
      confidence: number;
      intellectual: number;
      creativity: number;
      empathy: number;
      resilience: number;
      charm: number;
      discipline: number;
      happiness: number;
      morality: number;
      riskTolerance: number;
      independence: number;
      education: EducationLevel;
      career: string | null;
      careerLevel: number;
      wealth: number;
      isMarried: boolean;
      hasChildren: boolean;
      experiencesCompleted: string[];
      narrativeTags: string[];
      relationships: Record<string, NPCRelationship>;
      age: number;
      currentStage: LifeStage;
    };
  };
  currentEvent: Storylet | null;
  /** Nested wrapper — Solid.js rule: no top-level arrays */
  events: {
    available: string[];
  };
  stageProgress: number;
  gamePhase: GamePhase;
  selectedMood: string | null;
  deathProbability: number;
  /** UI state — client-only, not synced with server */
  ui: {
    showStatsPanel: boolean;
    showExperienceTree: boolean;
    showSaveLoad: boolean;
    showMenu: boolean;
    fontSize: number;
    floatingIndicators: FloatingIndicator[];
    lastStatChanges: Record<string, number>;
    isLoading: boolean;
    error: string | null;
    // Character creation
    pendingName: string;
    pendingGender: 'male' | 'female' | 'nonbinary' | '';
    statOffsets: Partial<CharacterStats>;
    outcomeText: string | null;
    isTransitioning: boolean;
    cardKey: number;
    // Save data — nested array
    saveData: {
      saves: SaveFile[];
    };
    personalityProfile: Record<string, number>;
    // Stage transition overlay
    stageTransitionData: StageTransitionData | null;
    // Track whether game has been initialized
    gameInitialized: boolean;
  };
}

// ─── Initial State Factory ─────────────────────────────────────

function createInitialState(): ClientGameState {
  return {
    player: {
      name: '',
      gender: 'male',
      personalityProfile: {},
      stats: {
        physical: 50,
        confidence: 50,
        intellectual: 50,
        creativity: 50,
        empathy: 50,
        resilience: 50,
        charm: 50,
        discipline: 50,
        happiness: 60,
        morality: 50,
        riskTolerance: 50,
        independence: 30,
        education: 'none',
        career: null,
        careerLevel: 0,
        wealth: 10,
        isMarried: false,
        hasChildren: false,
        experiencesCompleted: [],
        narrativeTags: [],
        relationships: {},
        age: 0,
        currentStage: 'infancy',
      },
    },
    currentEvent: null,
    events: {
      available: [],
    },
    stageProgress: 0,
    gamePhase: 'title',
    selectedMood: null,
    deathProbability: 0,
    ui: {
      showStatsPanel: false,
      showExperienceTree: false,
      showSaveLoad: false,
      showMenu: false,
      fontSize: 16,
      floatingIndicators: [],
      lastStatChanges: {},
      isLoading: false,
      error: null,
      pendingName: '',
      pendingGender: '',
      statOffsets: {},
      outcomeText: null,
      isTransitioning: false,
      cardKey: 0,
      saveData: {
        saves: [],
      },
      personalityProfile: {},
      stageTransitionData: null,
      gameInitialized: false,
    },
  };
}

// ─── Create Store ──────────────────────────────────────────────

const [gameState, setGameState] = createStore<ClientGameState>(createInitialState());

export { gameState, setGameState };

// ─── Numeric stat keys (for delta application) ─────────────────

const NUMERIC_STAT_KEYS: ReadonlySet<string> = new Set([
  'physical', 'confidence', 'intellectual', 'creativity', 'empathy',
  'resilience', 'charm', 'discipline', 'happiness', 'morality',
  'riskTolerance', 'independence', 'wealth', 'careerLevel', 'age',
]);

// ─── Derived Accessors (reactive in tracking scopes) ───────────

function currentEvent(): Storylet | null {
  return gameState.currentEvent;
}

function selectedMood(): string | null {
  return gameState.selectedMood;
}

function playerStats(): CharacterStats | undefined {
  return gameState.player.stats;
}

function playerAge(): number {
  return gameState.player.stats.age;
}

function currentMoodData(): StoryletMood | null {
  const event = gameState.currentEvent;
  const moodId = gameState.selectedMood;
  if (!event || !moodId) return null;
  return event.moods.find((m) => m.id === moodId) ?? null;
}

function compatibleChoices(): StoryletChoice[] {
  const event = gameState.currentEvent;
  const moodId = gameState.selectedMood;
  if (!event || !moodId) return [];
  return event.choices.filter(
    (choice) => !choice.compatibleMoods || choice.compatibleMoods.includes(moodId),
  );
}

const STAGE_LABELS: Record<string, string> = {
  infancy: 'Infancy',
  childhood: 'Childhood',
  adolescence: 'Adolescence',
  'young-adulthood': 'Young Adulthood',
  adulthood: 'Adulthood',
  'middle-adulthood': 'Middle Adulthood',
  'old-age': 'Old Age',
};

function lifeStageLabel(): string {
  return STAGE_LABELS[gameState.player.stats.currentStage] ?? gameState.player.stats.currentStage;
}

function stageProgress(): number {
  return gameState.stageProgress;
}

function playerName(): string {
  return gameState.player.name;
}

function isChoiceCompatible(): (choice: StoryletChoice) => boolean {
  return (choice: StoryletChoice) => {
    const moodId = gameState.selectedMood;
    if (!moodId) return false;
    return !choice.compatibleMoods || choice.compatibleMoods.includes(moodId);
  };
}

function wealthTier(): WealthTier {
  return getWealthTier(gameState.player.stats.wealth);
}

function relationships(): NPCRelationship[] {
  return Object.values(gameState.player.stats.relationships);
}

const LIFE_STAGE_ORDER: LifeStage[] = [
  'infancy', 'childhood', 'adolescence',
  'young-adulthood', 'adulthood', 'middle-adulthood', 'old-age',
];

function chapterNumber(): number {
  const idx = LIFE_STAGE_ORDER.indexOf(gameState.player.stats.currentStage);
  return idx >= 0 ? idx + 1 : 1;
}

// ─── Helper: Reset to Initial State ────────────────────────────

export function resetGame(): void {
  setGameState(createInitialState());
}

// ─── Helper: Sync Full State from Server ───────────────────────

export function updateFromServer(serverState: GameState): void {
  // Player identity
  setGameState('player', {
    name: serverState.player.name,
    gender: serverState.player.gender,
    personalityProfile: { ...serverState.player.personalityProfile },
  });

  // Stats — explicit key-by-key for fine-grained Solid.js reactivity
  const s = serverState.player.stats;
  setGameState('player', 'stats', {
    physical: s.physical,
    confidence: s.confidence,
    intellectual: s.intellectual,
    creativity: s.creativity,
    empathy: s.empathy,
    resilience: s.resilience,
    charm: s.charm,
    discipline: s.discipline,
    happiness: s.happiness,
    morality: s.morality,
    riskTolerance: s.riskTolerance,
    independence: s.independence,
    education: s.education,
    career: s.career,
    careerLevel: s.careerLevel,
    wealth: s.wealth,
    isMarried: s.isMarried,
    hasChildren: s.hasChildren,
    experiencesCompleted: [...s.experiencesCompleted],
    narrativeTags: [...s.narrativeTags],
    relationships: { ...s.relationships },
    age: s.age,
    currentStage: s.currentStage,
  });

  // Top-level game fields
  setGameState({
    currentEvent: serverState.currentEvent,
    stageProgress: serverState.stageProgress,
    gamePhase: serverState.gamePhase,
    selectedMood: serverState.selectedMood,
    deathProbability: serverState.deathProbability,
  });

  // Available events nested inside wrapper object
  setGameState('events', 'available', [...serverState.availableEvents]);
  setGameState('ui', 'gameInitialized', true);
}

// ─── Helper: Apply Stat Deltas + Animation Tracking ────────────

export function applyStatChanges(changes: Partial<CharacterStats>): void {
  const batchId = `ind-${Date.now()}`;
  const now = Date.now();
  const newChanges: Record<string, number> = {};

  for (const [key, rawDelta] of Object.entries(changes)) {
    if (typeof rawDelta !== 'number') continue;

    if (NUMERIC_STAT_KEYS.has(key)) {
      const statKey = key as keyof CharacterStats;
      const currentVal = gameState.player.stats[statKey];
      if (typeof currentVal === 'number') {
        const next = Math.max(0, Math.min(100, currentVal + rawDelta));
        setGameState('player', 'stats', statKey, next);
        newChanges[key] = rawDelta;
      }
    }
  }

  // Push floating indicators for visual feedback
  if (Object.keys(newChanges).length > 0) {
    setGameState(
      produce((state) => {
        for (const [statName, delta] of Object.entries(newChanges)) {
          state.ui.floatingIndicators.push({
            id: `${batchId}-${statName}`,
            statName,
            delta,
            timestamp: now,
          });
        }
        Object.assign(state.ui.lastStatChanges, newChanges);
      }),
    );
  }
}

// ─── Helper: Transition Game Phase ─────────────────────────────

export function setGamePhase(phase: GamePhase): void {
  setGameState('gamePhase', phase);
}

// ─── Helper: Clear Expired Floating Indicators ─────────────────

export function clearExpiredIndicators(maxAgeMs: number = 2000): void {
  const cutoff = Date.now() - maxAgeMs;
  setGameState(
    produce((state) => {
      state.ui.floatingIndicators = state.ui.floatingIndicators.filter(
        (ind) => ind.timestamp >= cutoff,
      );
    }),
  );
}

// ─── Helper: Loading / Error State ─────────────────────────────

export function setLoading(loading: boolean): void {
  setGameState('ui', 'isLoading', loading);
}

export function setError(error: string | null): void {
  setGameState('ui', 'error', error);
}

// ─── Helper: Toggle UI Panels ──────────────────────────────────

export function toggleStatsPanel(): void {
  setGameState('ui', 'showStatsPanel', !gameState.ui.showStatsPanel);
}

export function toggleExperienceTree(): void {
  setGameState('ui', 'showExperienceTree', !gameState.ui.showExperienceTree);
}

export function toggleSaveLoad(): void {
  setGameState('ui', 'showSaveLoad', !gameState.ui.showSaveLoad);
}

export function toggleMenu(): void {
  setGameState('ui', 'showMenu', !gameState.ui.showMenu);
}

export function closeStatsPanel(): void {
  setGameState('ui', 'showStatsPanel', false);
}

export function closeMenu(): void {
  setGameState('ui', 'showMenu', false);
}

export function closeTree(): void {
  setGameState('ui', 'showExperienceTree', false);
}

export function closeSaveLoad(): void {
  setGameState('ui', 'showSaveLoad', false);
}

// ─── Character Creation Helpers ────────────────────────────────

function randomizeStatOffsets(): Partial<CharacterStats> {
  const rand = (min: number, max: number) =>
    Math.floor(Math.random() * (max - min + 1)) + min;

  return {
    physical: rand(35, 65),
    confidence: rand(30, 60),
    intellectual: rand(30, 65),
    creativity: rand(25, 70),
    empathy: rand(25, 70),
    resilience: rand(30, 60),
    charm: rand(25, 65),
    discipline: rand(25, 60),
  };
}

function rollStats(): void {
  setGameState('ui', 'statOffsets', randomizeStatOffsets());
}

function setPendingName(name: string): void {
  setGameState('ui', 'pendingName', name);
}

function setPendingGender(gender: 'male' | 'female' | 'nonbinary' | ''): void {
  setGameState('ui', 'pendingGender', gender);
}

function setPersonalityProfile(profile: Record<string, number>): void {
  setGameState('ui', 'personalityProfile', profile);
}

function setStatOffsets(offsets: Partial<CharacterStats>): void {
  setGameState('ui', 'statOffsets', offsets);
}

// ─── API-Backed Actions ────────────────────────────────────────

async function startNewGame(): Promise<boolean> {
  const name = gameState.ui.pendingName;
  const gender = gameState.ui.pendingGender;
  const profile = gameState.ui.personalityProfile;

  if (!name || !gender) {
    setError('Please enter a name and select a gender.');
    return false;
  }

  setLoading(true);
  setError(null);

  try {
    const body: NewGameRequest = {
      name,
      gender: gender as 'male' | 'female' | 'nonbinary',
      personalityProfile: profile,
    };

    const res = await fetch('/api/game/new', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(err.message ?? `Server error ${res.status}`);
    }

    const data: NewGameResponse = await res.json();
    updateFromServer(data.gameState);
    setGamePhase('playing');
    return true;
  } catch (e: unknown) {
    setError(e instanceof Error ? e.message : 'Failed to start game');
    return false;
  } finally {
    setLoading(false);
  }
}

async function loadSaveList(): Promise<void> {
  setLoading(true);
  try {
    const res = await fetch('/api/game/saves');
    if (!res.ok) throw new Error('Failed to load saves');
    const data: SaveFile[] = await res.json();
    setGameState('ui', 'saveData', 'saves', [...data]);
  } catch (e: unknown) {
    setError(e instanceof Error ? e.message : 'Failed to load saves');
    setGameState('ui', 'saveData', 'saves', []);
  } finally {
    setLoading(false);
  }
}

async function saveGame(name: string): Promise<boolean> {
  if (!gameState.ui.gameInitialized) return false;
  setLoading(true);
  try {
    // Build a GameState snapshot for the server
    const snapshot: GameState = {
      player: gameState.player,
      currentEvent: gameState.currentEvent,
      availableEvents: gameState.events.available,
      stageProgress: gameState.stageProgress,
      gamePhase: gameState.gamePhase,
      selectedMood: gameState.selectedMood,
      deathProbability: gameState.deathProbability,
    };
    const res = await fetch('/api/game/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ saveName: name }),
    });
    if (res.ok) {
      await loadSaveList();
      return true;
    }
    return false;
  } catch {
    return false;
  } finally {
    setLoading(false);
  }
}

async function loadGame(saveId: string): Promise<boolean> {
  setLoading(true);
  try {
    const res = await fetch('/api/game/load', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ saveId }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.gameState) {
        updateFromServer(data.gameState);
      }
      setGamePhase('playing');
      closeSaveLoad();
      return true;
    }
    return false;
  } catch {
    return false;
  } finally {
    setLoading(false);
  }
}

async function deleteSave(saveId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/game/saves/${saveId}`, { method: 'DELETE' });
    if (res.ok) {
      await loadSaveList();
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

// ─── In-Game Actions ───────────────────────────────────────────

function selectMood(moodId: string): void {
  setGameState('selectedMood', moodId);
  setGameState('ui', 'outcomeText', null);
}

function clearMood(): void {
  setGameState('selectedMood', null);
  setGameState('ui', 'outcomeText', null);
}

function showOutcome(narration: string): void {
  setGameState('ui', 'outcomeText', narration);
}

function advanceEvent(nextEvent: Storylet | null): void {
  setGameState('ui', 'isTransitioning', true);
  setTimeout(() => {
    setGameState('currentEvent', nextEvent);
    setGameState('selectedMood', null);
    setGameState('ui', 'outcomeText', null);
    setGameState('ui', 'isTransitioning', false);
    setGameState('ui', 'cardKey', gameState.ui.cardKey + 1);
  }, 400);
}

function updateStats(newStats: CharacterStats): void {
  setGameState('player', 'stats', {
    physical: newStats.physical,
    confidence: newStats.confidence,
    intellectual: newStats.intellectual,
    creativity: newStats.creativity,
    empathy: newStats.empathy,
    resilience: newStats.resilience,
    charm: newStats.charm,
    discipline: newStats.discipline,
    happiness: newStats.happiness,
    morality: newStats.morality,
    riskTolerance: newStats.riskTolerance,
    independence: newStats.independence,
    education: newStats.education,
    career: newStats.career,
    careerLevel: newStats.careerLevel,
    wealth: newStats.wealth,
    isMarried: newStats.isMarried,
    hasChildren: newStats.hasChildren,
    experiencesCompleted: [...newStats.experiencesCompleted],
    narrativeTags: [...newStats.narrativeTags],
    relationships: { ...newStats.relationships },
    age: newStats.age,
    currentStage: newStats.currentStage,
  });
}

function triggerStageTransition(from: LifeStage, to: LifeStage, narrative: string): void {
  setGameState('ui', 'stageTransitionData', { from, to, narrative });
  setGamePhase('stage-transition');
}

function clearStageTransition(): void {
  setGameState('ui', 'stageTransitionData', null);
  setGamePhase('playing');
}

function endGame(): void {
  setGamePhase('gameover');
}

function startSummary(): void {
  setGamePhase('summary');
}

function resetToTitle(): void {
  setGameState(createInitialState());
}

// ─── Helper: Apply Choice Outcome ──────────────────────────────

export function applyOutcome(outcome: StoryletOutcome, nextEvent: Storylet | null): void {
  applyStatChanges(outcome.statChanges);

  if (outcome.consequences.tag) {
    setGameState(
      produce((state) => {
        if (!state.player.stats.narrativeTags.includes(outcome.consequences.tag!)) {
          state.player.stats.narrativeTags.push(outcome.consequences.tag!);
        }
      }),
    );
  }

  setGameState('currentEvent', nextEvent);
  setGameState('selectedMood', null);
}

// ─── Backward-Compatible Export Object ─────────────────────────
// Existing components import { gameStore } from '../store/gameStore'
// and access via gameStore.someSignal() — these accessors read from
// the createStore proxy and are reactive inside tracking scopes.

export const gameStore = {
  // Signals (accessors reading from createStore proxy)
  gamePhase: () => gameState.gamePhase,
  personalityProfile: () => gameState.ui.personalityProfile,
  pendingName: () => gameState.ui.pendingName,
  pendingGender: () => gameState.ui.pendingGender,
  statOffsets: () => gameState.ui.statOffsets,
  saves: () => gameState.ui.saveData.saves,
  loading: () => gameState.ui.isLoading,
  error: () => gameState.ui.error,
  gameState: (): GameState | null => {
    if (!gameState.ui.gameInitialized) return null;
    return {
      player: gameState.player,
      currentEvent: gameState.currentEvent,
      availableEvents: gameState.events.available,
      stageProgress: gameState.stageProgress,
      gamePhase: gameState.gamePhase,
      selectedMood: gameState.selectedMood,
      deathProbability: gameState.deathProbability,
    };
  },

  // Derived accessors
  currentEvent,
  selectedMood,
  playerStats,
  playerAge,
  currentMoodData,
  compatibleChoices,
  lifeStageLabel,
  stageProgress,
  playerName,
  isChoiceCompatible,
  wealthTier,
  relationships,
  chapterNumber,

  // UI state accessors
  showStats: () => gameState.ui.showStatsPanel,
  showMenu: () => gameState.ui.showMenu,
  showTree: () => gameState.ui.showExperienceTree,
  showSaveLoad: () => gameState.ui.showSaveLoad,
  outcomeText: () => gameState.ui.outcomeText,
  isTransitioning: () => gameState.ui.isTransitioning,
  cardKey: () => gameState.ui.cardKey,
  stageTransitionData: () => gameState.ui.stageTransitionData,

  // Setters
  setGamePhase,
  setPersonalityProfile,
  setPendingName,
  setPendingGender,
  setStatOffsets,
  setError,

  // Actions
  rollStats,
  startNewGame,
  loadSaveList,
  saveGame,
  loadGame,
  deleteSave,
  selectMood,
  clearMood,
  showOutcome,
  advanceEvent,
  updateStats,
  toggleStatsPanel,
  toggleMenu,
  toggleTree: toggleExperienceTree,
  toggleSaveLoad,
  closeStatsPanel,
  closeMenu,
  closeTree,
  closeSaveLoad,
  triggerStageTransition,
  clearStageTransition,
  endGame,
  startSummary,
  resetToTitle,
} as const;
