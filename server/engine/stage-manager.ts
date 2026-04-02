import { createMachine, assign, type StateFrom } from 'xstate';
import type { LifeStage } from '../core/types.js';
import {
  STAGE_DEFINITIONS,
  STAGE_ORDER,
  canTransition,
  getStageProgress,
  getNextStage,
  getPreviousStage,
  getStageConfig,
} from '../core/life-stages.js';

interface StageContext {
  age: number;
  currentStage: LifeStage;
  previousStage: LifeStage | null;
  transitionNarrative: string | null;
}

type StageEvent =
  | { type: 'ADVANCE_STAGE' }
  | { type: 'REGRESS_STAGE' }
  | { type: 'START_TRANSITION' }
  | { type: 'COMPLETE_TRANSITION' }
  | { type: 'AGE_UP'; age: number }
  | { type: 'DIE' };

const isValidTransition = (from: LifeStage, to: LifeStage): boolean => {
  return canTransition(from, to);
};

const isAgeAppropriate = (age: number, stage: LifeStage): boolean => {
  const def = STAGE_DEFINITIONS[stage];
  return age >= def.ageRange[0] && age <= def.ageRange[1];
};

const getInitialStage = (age: number): LifeStage => {
  for (const stage of STAGE_ORDER) {
    if (isAgeAppropriate(age, stage)) {
      return stage;
    }
  }
  return 'old-age';
};

export const createStageMachine = (initialAge = 0) => {
  const initialStage = getInitialStage(initialAge);

  const states: Record<string, object> = {};

  for (const stage of STAGE_ORDER) {
    const def = STAGE_DEFINITIONS[stage];
    const next = getNextStage(stage);
    const prev = getPreviousStage(stage);

    states[stage] = {
      initial: 'playing',
      states: {
        playing: {
          on: {
            ADVANCE_STAGE: next && def.transitionRules.canAdvance
              ? {
                  target: `${next}.transitioning`,
                  guard: ({ context }: { context: StageContext }) =>
                    isValidTransition(context.currentStage, next) &&
                    context.age >= def.ageRange[1],
                }
              : undefined,
            REGRESS_STAGE: prev && def.transitionRules.canRegress
              ? {
                  target: `${prev}.transitioning`,
                  guard: ({ context }: { context: StageContext }) =>
                    isValidTransition(context.currentStage, prev),
                }
              : undefined,
            START_TRANSITION: 'transitioning',
            AGE_UP: {
              target: stage,
              guard: ({ event }: { event: StageEvent }) =>
                'age' in event && isAgeAppropriate(event.age, stage),
              actions: assign({
                age: ({ event }: { event: StageEvent }) =>
                  'age' in event ? event.age : 0,
              }),
            },
            DIE: 'gameover',
          },
        },
        transitioning: {
          on: {
            COMPLETE_TRANSITION: stage,
            DIE: 'gameover',
          },
        },
      },
    };
  }

  states.gameover = {
    type: 'final' as const,
  };

  return createMachine({
    id: 'lifeStage',
    initial: initialStage,
    context: {
      age: initialAge,
      currentStage: initialStage,
      previousStage: null,
      transitionNarrative: null,
    } as StageContext,
    states,
    on: {
      DIE: 'gameover',
    },
  });
};

export type StageMachine = ReturnType<typeof createStageMachine>;
export type StageStateValue = StateFrom<StageMachine>['value'];

export { getStageConfig, getStageProgress, canTransition };
