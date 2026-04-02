
# Build "Alter Ego" — A GUI-Based Life Simulation RPG (Bun + Solid.js)

## Overview
Clone the classic 1986 game "Alter Ego" (created by psychologist Peter J. Favaro). Build a modern, visually rich GUI-based life simulation RPG using Bun as the runtime. The game simulates an entire human life from birth to death through choices, branching narratives, and evolving character stats — all presented through a beautiful web interface.

**Key differentiator from the original:** Recurring NPCs that persist across life stages and reference past interactions, fixing the original game's biggest flaw (choices never referenced again).

## Tech Stack
- **Runtime:** Bun (latest stable)
- **Language:** TypeScript (full stack)
- **Backend:** Bun HTTP server (native, no Express) + WebSocket for real-time sync
- **Frontend Framework:** Solid.js (fine-grained reactivity, no VDOM, 6-8 KB gzipped)
- **Styling:** CSS with custom theme (dark, atmospheric, life-simulation feel)
- **State Management:** Solid.js signals/stores (`createStore`) synced with backend via REST + WebSocket
- **State Machine:** XState v5 for life stage management (hierarchical + parallel states)
- **Condition Evaluation:** JSON Logic + safe expressions (JSON-serializable, NOT runtime functions)
- **Content Validation:** Zod (runtime) + JSON Schema/ajv (build-time)
- **Persistence:** Bun file system API for save/load (JSON with atomic writes)
- **Bundler:** Vite + vite-plugin-solid (frontend) / Bun native (backend)

> **Why Solid.js over Preact:** Fine-grained signal reactivity means stat changes update only affected DOM nodes — no VDOM diffing overhead. Critical for a game with frequent reactive updates (mood, stats, choices, animations). Official `solid-transition-group` for card animations.

> **Why NOT runtime function conditions:** Functions cannot be serialized (breaks save/load), cannot be validated at load time, cannot be hot-reloaded, and pose sandbox escape risks. All conditions use JSON Logic or safe expressions.

## Architecture: Client/Server

```
┌──────────────┐    REST/JSON     ┌───────────────┐
│  Frontend    │ ◄──────────────► │  Bun Server   │
│  (Solid.js)  │   + WebSocket    │  (Bun.serve)  │
└──────────────┘                  └───────────────┘
```

**Communication Layers:**
- **REST:** Initial load, new game, save/load, character creation
- **WebSocket:** Real-time state sync, floating stat change indicators, save notifications

**Backend API Endpoints:**
```
POST /api/game/new           — Start a new game (with personality quiz)
GET  /api/game/state         — Get current game state
POST /api/game/choose        — Submit a mood + action choice, returns outcome
POST /api/game/save          — Save to disk (atomic write)
POST /api/game/load          — Load a save
GET  /api/game/stats         — Current character stats
GET  /api/game/relationships — Current NPCs and relationship status
POST /api/game/end           — Trigger end-of-life summary
WS   /ws/game                — Real-time state delta stream
GET  /health/live            — Health check (liveness)
GET  /health/ready           — Health check (readiness)
```

## Project Structure

```
alter-ego/
├── package.json
├── bunfig.toml
├── tsconfig.json
├── vite.config.ts              — Vite config for Solid.js frontend
│
├── server/
│   ├── server.ts               — Bun.serve entry point (REST + WebSocket)
│   ├── engine/
│   │   ├── game-loop.ts        — Main game loop + event selection
│   │   ├── event-resolver.ts   — Resolves choices → outcomes via JSON Logic
│   │   ├── event-selector.ts   — Three-tier: story-critical → weighted → fill
│   │   ├── stat-tracker.ts     — Stat changes with bounds validation
│   │   ├── stage-manager.ts    — XState machine for life stages
│   │   ├── save-system.ts      — Atomic JSON save/load
│   │   ├── tag-index.ts        — Inverted index for O(1) narrative callbacks
│   │   └── npc-manager.ts      — NPC relationships with memory consolidation
│   ├── core/
│   │   ├── character.ts        — Character creation + personality quiz
│   │   ├── events.ts           — Storylet definitions
│   │   ├── life-stages.ts      — Life stage definitions + transition rules
│   │   ├── conditions.ts       — JSON Logic condition evaluator
│   │   └── types.ts            — Shared TypeScript types
│   └── api/
│       ├── routes.ts           — REST route handlers
│       └── websocket.ts        — WebSocket connection handler
│
├── client/
│   ├── index.html
│   ├── vite.config.ts          — Vite config (proxy /api to Bun server)
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── store/
│   │   │   └── gameStore.ts    — Solid.js createStore (nested structure)
│   │   ├── components/
│   │   │   ├── GameView.tsx
│   │   │   ├── EventCard.tsx
│   │   │   ├── MoodPicker.tsx
│   │   │   ├── TreeView.tsx
│   │   │   ├── StatsPanel.tsx
│   │   │   ├── MenuBar.tsx
│   │   │   ├── StageHeader.tsx
│   │   │   ├── LifeSummary.tsx
│   │   │   ├── SaveLoad.tsx
│   │   │   ├── StartScreen.tsx
│   │   │   └── PersonalityQuiz.tsx
│   │   └── styles/
│   │       └── main.css
│   └── public/
│
├── data/
│   └── events/
│       ├── shared/             — Cross-stage events, random encounters
│       ├── infancy/            — 3-5 events
│       ├── childhood/          — 8-12 events
│       ├── adolescence/        — 12-18 events
│       ├── young-adulthood/    — 15-20 events
│       ├── adulthood/          — 12-16 events
│       ├── middle-adulthood/   — 8-12 events
│       └── old-age/            — 5-8 events
│   └── npcs/
│       └── roster.json         — NPC definitions with cross-stage appearances
│
├── scripts/
│   ├── validate-events.ts      — Build-time JSON Schema validation (ajv)
│   └── bundle-content.ts       — Content bundling for production
│
├── saves/                      — Auto-created save files
└── tests/
    ├── engine/
    │   ├── events.test.ts      — Event resolution, condition evaluation
    │   ├── stats.test.ts       — Stat changes, bounds checking
    │   ├── state-machine.test.ts — Life stage transitions (XState)
    │   └── save-load.test.ts   — Serialization round-trip
    ├── content/
    │   └── events.schema.test.ts — JSON Schema validation
    └── narrative/
        └── dialog.test.ts      — Snapshot tests for text output
```

## Core Engine Types

### Character Stats
```typescript
interface CharacterStats {
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
  careerLevel: number;        // 0 = entry, 5 = executive
  wealth: number;             // 0-100 scale (see Economy System below)
  isMarried: boolean;
  hasChildren: boolean;
  // Tracking — ALWAYS nested inside objects for Solid.js reactivity
  experiencesCompleted: string[];
  narrativeTags: string[];
  relationships: Record<string, NPCRelationship>;  // Record, not array
  age: number;
  currentStage: LifeStage;
}
```

### Economy System
Wealth gates and enables choices across 4 tiers:

| Wealth Range | Available Options |
|-------------|-------------------|
| 0-10 | Struggle — only basic survival choices |
| 11-50 | Middle class — education, standard housing |
| 51-80 | Affluent — investments, premium options |
| 81-100 | Wealthy — exclusive events, philanthropy |

**Income mechanic:** `careerEarnings + passiveIncome - expenses = netWealthChange` per stage cycle.

**Spending categories:** Housing (→ happiness), Education (→ career gates), Healthcare (→ physical/resilience), Transportation (→ opportunity access), Investments (→ passive income).

### NPC Relationship System
```typescript
interface NPCRelationship {
  id: string;
  name: string;
  trust: number;              // -100 to 100
  affection: number;          // -100 to 100
  memories: MemoryEntry[];    // Interaction history for callbacks
  status: 'stranger' | 'acquaintance' | 'friend' | 'closeFriend' | 'romantic' | 'enemy';
  activeStages: LifeStage[];  // When this NPC appears
}

interface MemoryEntry {
  eventId: string;
  tags: string[];
  sentiment: 'positive' | 'negative' | 'neutral';
  summary: string;            // Hand-written or AI-generated callback text
}
```

**Key feature: Memory consolidation** — periodically summarize NPC interactions into "impression tags" for efficient condition checking. NPCs from earlier stages reappear and reference past interactions.

### Condition System (JSON-Serializable)
```typescript
// NOT: condition: (stats: CharacterStats) => boolean  ← DANGEROUS
// USE: JSON Logic or safe expressions

type Condition = JsonLogicRule | SafeExpression;

// Example JSON Logic condition
interface JsonLogicRule {
  type: 'jsonLogic';
  rule: Record<string, unknown>;
  // e.g. { "and": [{ ">=": [{ "var": "stats.age" }, 18] }, { "in": ["married", { "var": "tags" }] }] }
}

interface SafeExpression {
  type: 'expression';
  expression: string;  // Sandboxed, parse-time verified
}
```

### Storylet (Event Node)
```typescript
interface Storylet {
  id: string;
  category: "social" | "physical" | "emotional" | "family" | "vocational";
  lifeStages: LifeStage[];
  prerequisites: Condition;           // JSON-serializable condition
  weight: number;                     // Base probability weight for selection
  maxRepeats?: number;                // undefined = unlimited, 1 = once-only
  priority: "story" | "weighted" | "fill";  // Three-tier selection
  title: string;
  description: string;
  moods: {
    id: string;
    label: string;     // "Calm", "Angry", "Excited", "Fearful"
    emoji: string;
    color: string;
  }[];
  choices: {
    id: string;
    label: string;
    compatibleMoods?: string[];
    outcomes: Outcome[];
  }[];
}

interface Outcome {
  condition: Condition;               // JSON-serializable, NOT a function
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
```

### Game State
```typescript
interface GameState {
  player: {
    name: string;
    gender: "male" | "female" | "nonbinary";
    personalityProfile: Record<string, number>;  // From pre-game quiz
    stats: CharacterStats;
  };
  currentEvent: Storylet | null;
  availableEvents: string[];
  stageProgress: number;
  gamePhase: "title" | "quiz" | "char-create" | "playing" | "stage-transition" | "gameover" | "summary";
  selectedMood: string | null;
  deathProbability: number;           // Calculated from age + stats
}
```

> **Solid.js Store Structure Rule:** Always nest arrays and objects inside parent objects. Top-level arrays lose reactivity in `createStore`.
> ```typescript
> const [gameState, setGameState] = createStore({
>   player: {
>     stats: { physical: 50, ... },     // nested ✅
>     relationships: { /* Record */ },   // nested ✅
>     narrativeTags: ['tag1'],           // nested ✅
>   }
> });
> ```

## UI / Design Direction

### Visual Style
- Dark theme with warm accents (deep indigo bg, amber/gold highlights)
- Category color coding: Social=blue, Physical=red-orange, Emotional=pink-purple, Family=green, Vocational=yellow-gold
- Card-based event display with smooth transitions (`solid-transition-group`)
- Atmospheric, cozy, introspective reading experience

### Key Screens
1. **Title Screen** — Game title, New Game, Load Game, Challenge Modes
2. **Personality Quiz** — Pre-game questionnaire that affects narrative tone and starting conditions (original Alter Ego's differentiator)
3. **Character Creation** — Choose gender + name, randomized starting stat offsets
4. **Main Game View** — Top menu bar (Stats, Save/Load), center Event Card (narrative + mood options + choices), side/slide-out Stats dashboard, accessible Experience tree
5. **Stats Panel** — Visual bars/radars for all stats, relationship list, life progress
6. **Stage Transition** — Cinematic chapter transitions between life stages
7. **End-of-Life Summary** — Beautiful recap: life story, major decisions, final stats, legacy view
8. **Challenge Mode Select** — Constrained playthroughs ("become a rockstar starting poor")

### Interactions
- Click mood → highlights → compatible choices appear
- Click choice → brief animation → outcome text with floating stat change indicators (e.g. "+5 Confidence") via WebSocket push
- Experience tree shows available events as icons, completed ones dimmed
- Smooth fade/slide transitions between events
- Tap-anywhere-to-advance navigation

### Accessibility Requirements
- Font size scaling (14px default → 24px+)
- Colorblind support (never use color alone — add icons/symbols)
- Content warnings before sensitive scenarios
- Screen reader support (all text programmatically readable)
- No timed sequences or time-pressure choices
- Tap-anywhere-to-advance navigation

## Seven Life Stages

| Stage | Target Events | Focus |
|-------|--------------|-------|
| 1. **Infancy** | 3-5 | First sensory experiences, basic trust |
| 2. **Childhood** | 8-12 | Family, early friends, playground incidents |
| 3. **Adolescence** | 12-18 | Identity, peer pressure, first romance |
| 4. **Young Adulthood** | 15-20 | College, careers, serious relationships |
| 5. **Adulthood** | 12-16 | Established career, family life, deeper dilemmas |
| 6. **Middle Adulthood** | 8-12 | Mid-life reflections, course correction |
| 7. **Old Age** | 5-8 | Legacy, final choices |

**Total target: 63-91 minimum, 100-150 recommended for a satisfying playthrough.**

## Event Content (`data/events/`)

### Event Selection: Three-Tier Storylet System
Based on the Fallen London / Reigns model:

1. **Story-critical events** (`priority: "story"`) — Always trigger when prerequisites met. No randomization. Major life milestones.
2. **Weighted events** (`priority: "weighted"`) — Reigns-style deck selection. Each event has a base weight modified by stat ranges, tag presence, relationship status, and callback relevance. Recent decisions boost related event weights.
3. **Fill events** (`priority: "fill"`) — Generic events when no story/weighted events are available. Maintain engagement between major beats.

### Event Writing Requirements
Events must be:
- 100% original (NOT copied from the 1986 game)
- Genuinely dilemmatic — no single "correct" answer
- Mix of humorous and serious
- Varied in outcome weight
- Include callbacks to earlier decisions via narrative tags
- Have JSON-serializable conditions (JSON Logic or safe expressions)
- Define weight values for selection probability
- Specify maxRepeats for replayability control

### Content Validation Pipeline
```
events/**/*.json → ajv validation (build-time) → Zod parsing (runtime) → ContentCache
```
- **Build-time:** JSON Schema validation via `ajv` — catches malformed files before runtime
- **Runtime:** Zod schemas — validates loaded content with detailed error messages
- **Hot-reload (dev):** File watcher detects JSON changes, reloads and revalidates content

## Key Design Goals
1. **Meaningful Choices** — real stat consequences and narrative callbacks via TagIndex (O(1) lookups)
2. **Recurring Characters** — NPCs from earlier stages reappear with memory of past interactions
3. **Stat-Narrative Integration** — stats directly gate events and determine outcomes via JSON Logic conditions
4. **Polished GUI** — this is a visual game, not a terminal. Make it beautiful
5. **Content Separation** — all narrative text in JSON; engine is content-agnostic
6. **Extensible** — adding events is "drop a JSON file in the right folder"
7. **Replayability** — personality quiz, randomized starts, legacy mode, challenge modes
8. **Accessible** — font scaling, colorblind support, screen reader, no time pressure

## Death Mechanics

Hybrid approach — death should feel natural but not frustrating:

1. **Age-based mortality:** Probability increases with age (1% at 60, 10% at 80, 50% at 95)
2. **Stat-based vulnerability:** Low resilience/physical increases accident/illness death chance
3. **Random critical events:** 5-10% chance per stage of a deadly scenario appearing
4. **Choice-based death:** Certain decisions can lead to immediate death
5. **Graceful endings:** "Big Sleep" — die peacefully with full life summary and legacy view

## Replayability Mechanisms
- **Randomized starting conditions** — random family background, starting stat offsets
- **Pre-game personality quiz** — affects narrative tone and event weighting
- **Legacy mode** — children inherit partial stats/wealth
- **Challenge modes** — constrained playthroughs ("become a rockstar starting poor")
- **Achievement system** — long-term goals beyond single playthrough

## Implementation Steps

### Phase 1 — Foundation
1. Scaffold project: Bun backend + Vite/Solid.js frontend with proxy config
2. Define shared `types.ts` with all interfaces (Storylet, Condition, NPC, etc.)
3. Set up Zod schemas for content validation + ajv JSON Schema for build-time checks
4. Build JSON Logic condition evaluator (NOT runtime functions)

### Phase 2 — Core Engine
5. Build game engine with XState state machine for life stages (hierarchical + parallel)
6. Implement event resolver with three-tier selection (story → weighted → fill)
7. Build stat tracker with bounds validation
8. Implement TagIndex for O(1) narrative callbacks (inverted index)
9. Build NPC relationship system with memory consolidation

### Phase 3 — API & Persistence
10. Bun API server with REST endpoints + WebSocket for real-time sync
11. Save/load system with atomic file writes
12. Content pipeline with hot-reload during development

### Phase 4 — Frontend
13. Title screen + personality quiz + character creation
14. Main game view with event card, mood picker, choice buttons
15. Stats panel with visual bars/radars
16. Experience tree view
17. Stage transition animations
18. End-of-life summary screen with legacy view

### Phase 5 — Content
19. Write 100+ events across all 7 life stages (JSON, validated)
20. Define NPC roster with cross-stage appearances
21. Write stage transition narratives

### Phase 6 — Polish & Testing
22. Animations, transitions, floating stat indicators (WebSocket-pushed)
23. Responsive design + accessibility features
24. Comprehensive test suite:
    - Engine: event resolution, stat bounds, state transitions, save/load
    - Content: JSON Schema validation
    - Narrative: snapshot tests for text output
    - Use `bun:test` + `fast-check` for property-based testing
25. Performance optimization + bundle size audit

## Development Workflow

```bash
# Dev: Run both servers with hot reload
npm run dev          # Concurrently: Vite (frontend HMR) + Bun --hot (backend)

# Type checking
npm run typecheck    # tsc --noEmit

# Testing
npm test             # bun test

# Build
npm run build        # Vite build (frontend) + Bun build (backend)

# Content validation
npm run validate     # ajv schema check on all event JSON files
```

## Deployment
- **Quick deploy:** Railway (native Bun support, 500hrs/mo free)
- **Production:** Docker multi-stage build with `oven/bun:alpine`
- **Health checks:** `/health/live` and `/health/ready` endpoints

## Solid.js Gotchas (Development Reference)
1. **Top-level arrays lose reactivity** — always nest arrays inside objects in `createStore`
2. **Destructuring props breaks reactivity** — use `props.field` not `{ field }`
3. **Use `<Show>`/`<For>` not `if`/`.map()`** for conditional/list rendering
4. **No React compat** — cannot use React component libraries
5. **Signals are functions** — `count()` not `count`