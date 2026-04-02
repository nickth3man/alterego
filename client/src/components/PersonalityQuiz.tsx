import { createSignal, Show, For } from 'solid-js';
import { gameStore } from '../store/gameStore';

interface QuizOption {
  label: string;
  effects: Record<string, number>;
}

interface QuizQuestion {
  text: string;
  options: QuizOption[];
}

const QUESTIONS: QuizQuestion[] = [
  {
    text: 'When you see someone crying, you...',
    options: [
      { label: 'Sit beside them and listen', effects: { empathy: 12, charm: 4 } },
      { label: 'Try to make them laugh', effects: { charm: 10, creativity: 4 } },
      { label: 'Offer practical advice', effects: { intellectual: 8, discipline: 6 } },
      { label: 'Feel overwhelmed and walk away', effects: { resilience: 3, independence: 8 } },
    ],
  },
  {
    text: 'At a party, you tend to...',
    options: [
      { label: 'Be the center of attention', effects: { charm: 12, confidence: 6 } },
      { label: 'Find a small group for deep conversation', effects: { empathy: 8, intellectual: 6 } },
      { label: 'Observe from the corner with a drink', effects: { resilience: 4, independence: 10 } },
      { label: 'Leave early — crowds drain you', effects: { discipline: 4, independence: 8 } },
    ],
  },
  {
    text: 'When faced with a difficult problem, you...',
    options: [
      { label: 'Research until you find the answer', effects: { intellectual: 12, discipline: 6 } },
      { label: 'Trust your gut instinct', effects: { confidence: 10, resilience: 4 } },
      { label: 'Brainstorm wildly creative solutions', effects: { creativity: 14 } },
      { label: 'Ask someone wiser for help', effects: { empathy: 6, charm: 8 } },
    ],
  },
  {
    text: 'Your ideal weekend involves...',
    options: [
      { label: 'Outdoor adventure and exercise', effects: { physical: 12, resilience: 4 } },
      { label: 'Reading, learning, or puzzles', effects: { intellectual: 10, discipline: 6 } },
      { label: 'Art, music, or making something', effects: { creativity: 12, empathy: 2 } },
      { label: 'Hanging out with friends', effects: { charm: 10, empathy: 4 } },
    ],
  },
  {
    text: 'When someone criticizes your work, you...',
    options: [
      { label: 'Feel hurt but hide it', effects: { empathy: 8, resilience: 2 } },
      { label: 'Analyze the feedback objectively', effects: { intellectual: 10, discipline: 6 } },
      { label: 'Use it as motivation to improve', effects: { resilience: 12, confidence: 4 } },
      { label: 'Get defensive and push back', effects: { confidence: 6, independence: 8 } },
    ],
  },
  {
    text: 'Which childhood memory resonates most?',
    options: [
      { label: 'Winning a competition', effects: { confidence: 10, physical: 4 } },
      { label: 'A long talk with a grandparent', effects: { empathy: 10, wisdom: 4 } },
      { label: 'Building something from scratch', effects: { creativity: 10, discipline: 4 } },
      { label: 'Standing up to a bully', effects: { resilience: 10, charm: 4 } },
    ],
  },
  {
    text: 'Your approach to money is...',
    options: [
      { label: 'Save religiously for the future', effects: { discipline: 12, intellectual: 4 } },
      { label: 'Invest boldly in opportunities', effects: { confidence: 8, creativity: 6 } },
      { label: 'Spend on experiences, not things', effects: { charm: 8, empathy: 6 } },
      { label: 'Rarely think about it', effects: { independence: 10, resilience: 4 } },
    ],
  },
  {
    text: 'What scares you the most?',
    options: [
      { label: 'Being forgotten', effects: { charm: 10, creativity: 4 } },
      { label: 'Losing someone I love', effects: { empathy: 14 } },
      { label: 'Being trapped in routine', effects: { creativity: 8, independence: 6 } },
      { label: 'Failing publicly', effects: { confidence: 4, discipline: 10 } },
    ],
  },
  {
    text: 'In a group project, you naturally...',
    options: [
      { label: 'Take charge and delegate', effects: { confidence: 10, discipline: 6 } },
      { label: 'Do the deep research', effects: { intellectual: 12 } },
      { label: 'Keep morale high and mediate', effects: { empathy: 10, charm: 4 } },
      { label: 'Work alone and combine at the end', effects: { independence: 10, creativity: 4 } },
    ],
  },
  {
    text: 'Which would you change about the world?',
    options: [
      { label: 'End all suffering', effects: { empathy: 14, resilience: 2 } },
      { label: 'Unlock everyone\'s potential', effects: { creativity: 8, intellectual: 6 } },
      { label: 'Make society more just', effects: { discipline: 8, confidence: 6 } },
      { label: 'Let people be truly free', effects: { independence: 12, charm: 2 } },
    ],
  },
];

export default function PersonalityQuiz() {
  const [currentIndex, setCurrentIndex] = createSignal(0);
  const [selectedOption, setSelectedOption] = createSignal<number | null>(null);
  const [transitioning, setTransitioning] = createSignal(false);
  const [profile, setProfile] = createSignal<Record<string, number>>({});

  const totalQuestions = QUESTIONS.length;
  const isLastQuestion = () => currentIndex() === totalQuestions - 1;

  function selectOption(index: number) {
    if (transitioning()) return;
    setSelectedOption(index);
  }

  function nextQuestion() {
    const selected = selectedOption();
    if (selected === null) return;

    const question = QUESTIONS[currentIndex()];
    const option = question.options[selected];

    const updated = { ...profile() };
    for (const [stat, delta] of Object.entries(option.effects)) {
      updated[stat] = (updated[stat] ?? 0) + delta;
    }
    setProfile(updated);

    if (isLastQuestion()) {
      gameStore.setPersonalityProfile(updated);
      gameStore.setGamePhase('char-create');
      return;
    }

    setTransitioning(true);
    setTimeout(() => {
      setCurrentIndex(currentIndex() + 1);
      setSelectedOption(null);
      setTransitioning(false);
    }, 350);
  }

  return (
    <div class="quiz">
      <div class="quiz__progress">
        <span class="quiz__progress-text">
          Question {currentIndex() + 1} of {totalQuestions}
        </span>
        <div class="quiz__progress-bar">
          <div
            class="quiz__progress-fill"
            style={{ width: `${((currentIndex() + 1) / totalQuestions) * 100}%` }}
          />
        </div>
      </div>

      <div class={`quiz__card ${transitioning() ? 'quiz__card--exit' : 'quiz__card--enter'}`}>
        <h2 class="quiz__question">{QUESTIONS[currentIndex()].text}</h2>

        <div class="quiz__options">
          <For each={QUESTIONS[currentIndex()].options}>
            {(option, index) => (
              <button
                type="button"
                class={`quiz__option ${selectedOption() === index() ? 'quiz__option--selected' : ''}`}
                onClick={() => selectOption(index())}
              >
                <span class="quiz__option-marker">
                  {String.fromCharCode(65 + index())}
                </span>
                <span class="quiz__option-label">{option.label}</span>
              </button>
            )}
          </For>
        </div>

        <Show when={selectedOption() !== null}>
          <button type="button" class="btn btn--primary quiz__next" onClick={nextQuestion}>
            {isLastQuestion() ? 'See Your Destiny →' : 'Continue →'}
          </button>
        </Show>
      </div>
    </div>
  );
}
