import type { LifeStage } from './types.js';

export interface StageDefinition {
  name: string;
  ageRange: [number, number];
  transitionNarratives: {
    advance: string[];
    regress: string[];
  };
  transitionRules: {
    canAdvance: boolean;
    canRegress: boolean;
  };
}

export const STAGE_DEFINITIONS: Record<LifeStage, StageDefinition> = {
  infancy: {
    name: 'Infancy',
    ageRange: [0, 3],
    transitionNarratives: {
      advance: [
        'The first blush of consciousness spreads across your mind like dawn breaking.',
        'Crawling becomes walking, babbling becomes words. The world expands.',
        'From the safety of caretaker arms, you begin to explore the vast unknown.',
      ],
      regress: [],
    },
    transitionRules: {
      canAdvance: true,
      canRegress: false,
    },
  },

  childhood: {
    name: 'Childhood',
    ageRange: [4, 12],
    transitionNarratives: {
      advance: [
        'The innocence of childhood gives way to the curiosity of the coming years.',
        'Friendships deepen, lessons shape your mind, and play becomes purpose.',
        'The simple joys of make-believe begin their slow fade into adult concerns.',
      ],
      regress: [
        'A regression pulls you back to simpler times, simpler concerns.',
        'Circumstances force a retreat into the safety of childhood patterns.',
      ],
    },
    transitionRules: {
      canAdvance: true,
      canRegress: true,
    },
  },

  adolescence: {
    name: 'Adolescence',
    ageRange: [13, 17],
    transitionNarratives: {
      advance: [
        'The storm of puberty signals the threshold of adulthood.',
        'Identity crisis resolves into purpose. The world opens its doors.',
        'Teenage dreams crystallize into adult ambitions.',
      ],
      regress: [
        'An unexpected setback forces you to question your path.',
        'The weight of responsibility proves too heavy for your years.',
      ],
    },
    transitionRules: {
      canAdvance: true,
      canRegress: true,
    },
  },

  'young-adulthood': {
    name: 'Young Adulthood',
    ageRange: [18, 35],
    transitionNarratives: {
      advance: [
        'The reckless energy of youth begins to settle into mature resolve.',
        'Career paths diverge, relationships deepen or wither, purpose emerges.',
        'The fire of ambition finds its true fuel.',
      ],
      regress: [
        'A career collapse or relationship failure sends you back to rebuild.',
        'Mid-course correction proves painful but necessary.',
      ],
    },
    transitionRules: {
      canAdvance: true,
      canRegress: true,
    },
  },

  adulthood: {
    name: 'Adulthood',
    ageRange: [36, 55],
    transitionNarratives: {
      advance: [
        'The wisdom of experience begins to outweigh the vigor of youth.',
        'Generational responsibility passes to your shoulders.',
        'Achievements are take stock of; unfinished business demands attention.',
      ],
      regress: [
        'A major life disruption forces reflection and retrenchment.',
        'The peace of normality becomes a comfort rather than a constraint.',
      ],
    },
    transitionRules: {
      canAdvance: true,
      canRegress: true,
    },
  },

  'middle-adulthood': {
    name: 'Middle Adulthood',
    ageRange: [56, 75],
    transitionNarratives: {
      advance: [
        'The body slows but the spirit often quickens.',
        'Legacy becomes more important than ambition.',
        'The next generation looks to you for guidance.',
      ],
      regress: [
        'Health challenges force a reassessment of priorities.',
        'A loss in the family restructures your world.',
      ],
    },
    transitionRules: {
      canAdvance: true,
      canRegress: true,
    },
  },

  'old-age': {
    name: 'Old Age',
    ageRange: [76, 100],
    transitionNarratives: {
      advance: [
        'The final chapter approaches. A life fully lived awaits reflection.',
        'Time becomes the most precious commodity.',
        'Wisdom is offered to those who will carry it forward.',
      ],
      regress: [
        'A health scare reminds you of mortality\'s grip.',
        'The support systems of earlier years face new tests.',
      ],
    },
    transitionRules: {
      canAdvance: false,
      canRegress: true,
    },
  },
};

export const STAGE_ORDER: LifeStage[] = [
  'infancy',
  'childhood',
  'adolescence',
  'young-adulthood',
  'adulthood',
  'middle-adulthood',
  'old-age',
];

export function getNextStage(stage: LifeStage): LifeStage | null {
  const index = STAGE_ORDER.indexOf(stage);
  if (index === -1 || index === STAGE_ORDER.length - 1) {
    return null;
  }
  return STAGE_ORDER[index + 1];
}

export function getPreviousStage(stage: LifeStage): LifeStage | null {
  const index = STAGE_ORDER.indexOf(stage);
  if (index <= 0) {
    return null;
  }
  return STAGE_ORDER[index - 1];
}

export function getTransitionNarratives(
  from: LifeStage,
  to: LifeStage
): string[] {
  const fromDef = STAGE_DEFINITIONS[from];
  const fromIndex = STAGE_ORDER.indexOf(from);
  const toIndex = STAGE_ORDER.indexOf(to);

  if (fromIndex < toIndex) {
    return fromDef.transitionNarratives.advance;
  } else if (fromIndex > toIndex) {
    return fromDef.transitionNarratives.regress;
  }

  return [];
}

export function canTransition(current: LifeStage, target: LifeStage): boolean {
  if (current === target) {
    return false;
  }

  const currentIndex = STAGE_ORDER.indexOf(current);
  const targetIndex = STAGE_ORDER.indexOf(target);

  // Must be adjacent stages (difference of 1)
  if (Math.abs(currentIndex - targetIndex) !== 1) {
    return false;
  }

  const def = STAGE_DEFINITIONS[current];

  if (targetIndex > currentIndex) {
    return def.transitionRules.canAdvance;
  } else {
    return def.transitionRules.canRegress;
  }
}

export function getStageProgress(age: number, stage: LifeStage): number {
  const def = STAGE_DEFINITIONS[stage];
  const [minAge, maxAge] = def.ageRange;
  const stageSpan = maxAge - minAge;

  if (stageSpan <= 0) {
    return 100;
  }

  const progress = ((age - minAge) / stageSpan) * 100;
  return Math.min(100, Math.max(0, progress));
}

export function getStageConfig(stage: LifeStage): StageDefinition {
  return STAGE_DEFINITIONS[stage];
}

export function getStageForAge(age: number): LifeStage {
  for (const stage of STAGE_ORDER) {
    const [minAge, maxAge] = STAGE_DEFINITIONS[stage].ageRange;
    if (age >= minAge && age <= maxAge) {
      return stage;
    }
  }
  return 'old-age';
}
