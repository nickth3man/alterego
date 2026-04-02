import { createSignal, Show, For } from 'solid-js';
import { gameStore } from '../store/gameStore';
import type { EventCategory } from '../../../server/core/types';

const CATEGORY_COLORS: Record<EventCategory, string> = {
  social: 'var(--color-social)',
  physical: 'var(--color-physical)',
  emotional: 'var(--color-emotional)',
  family: 'var(--color-family)',
  vocational: 'var(--color-vocational)',
};

const CATEGORY_ICONS: Record<EventCategory, string> = {
  social: '👥',
  physical: '💪',
  emotional: '💭',
  family: '🏠',
  vocational: '💼',
};

type NodeState = 'completed' | 'available' | 'locked';

interface TreeNode {
  id: string;
  title: string;
  category: EventCategory;
  state: NodeState;
  description: string;
}

const MOCK_EVENTS: TreeNode[] = [
  { id: 'e1', title: 'First Steps', category: 'physical', state: 'completed', description: 'You took your first steps, wobbling forward.' },
  { id: 'e2', title: 'Parent Bond', category: 'family', state: 'completed', description: 'A deep bond formed with your parent.' },
  { id: 'e3', title: 'Playground Friend', category: 'social', state: 'completed', description: 'You made your first friend at the playground.' },
  { id: 'e4', title: 'School Bully', category: 'emotional', state: 'completed', description: 'A bully confronted you at school.' },
  { id: 'e5', title: 'Talent Show', category: 'vocational', state: 'available', description: 'The school talent show beckons.' },
  { id: 'e6', title: 'First Crush', category: 'emotional', state: 'available', description: 'Butterflies stir when they walk by.' },
  { id: 'e7', title: 'Sports Tryouts', category: 'physical', state: 'available', description: 'The school team holds tryouts this week.' },
  { id: 'e8', title: 'Prom Night', category: 'social', state: 'locked', description: 'The biggest dance of the year.' },
  { id: 'e9', title: 'College Decision', category: 'vocational', state: 'locked', description: 'Will you pursue higher education?' },
];

export default function TreeView() {
  const [selectedNode, setSelectedNode] = createSignal<TreeNode | null>(null);
  const [searchQuery, setSearchQuery] = createSignal('');

  const availableEvents = () => gameStore.gameState()?.availableEvents ?? [];
  const completedEvents = () => gameStore.playerStats()?.experiencesCompleted ?? [];

  function resolveNodeState(node: TreeNode): NodeState {
    if (completedEvents().includes(node.id)) return 'completed';
    if (availableEvents().includes(node.id)) return 'available';
    return node.state;
  }

  const filteredNodes = () => {
    const query = searchQuery().toLowerCase();
    if (!query) return MOCK_EVENTS;
    return MOCK_EVENTS.filter(
      (n) => n.title.toLowerCase().includes(query) || n.category.includes(query),
    );
  };

  const completedCount = () =>
    MOCK_EVENTS.filter((n) => resolveNodeState(n) === 'completed').length;

  function nodeClass(state: NodeState): string {
    return `tree-node tree-node--${state}`;
  }

  return (
    <Show when={gameStore.showTree()}>
      <div class="tree-overlay">
        <button
          type="button"
          class="tree-backdrop"
          onClick={() => gameStore.closeTree()}
          aria-label="Close experience tree"
        />
        <div class="tree-panel">
          <button type="button" class="tree-panel__close" onClick={() => gameStore.closeTree()}>
            ✕
          </button>

          <header class="tree-panel__header">
            <h2 class="tree-panel__title">Experience Tree</h2>
            <div class="tree-panel__progress">
              {completedCount()} / {MOCK_EVENTS.length} completed
            </div>
          </header>

          <div class="tree-panel__search">
            <input
              type="text"
              class="tree-search__input"
              placeholder="Search events..."
              value={searchQuery()}
              onInput={(e) => setSearchQuery(e.currentTarget.value)}
            />
          </div>

          <div class="tree-panel__body">
            <For each={filteredNodes()}>
              {(node) => {
                const state = () => resolveNodeState(node);
                return (
                  <button
                    type="button"
                    class={nodeClass(state())}
                    onClick={() => state() !== 'locked' && setSelectedNode(node)}
                    disabled={state() === 'locked'}
                  >
                    <span class="tree-node__icon">{CATEGORY_ICONS[node.category]}</span>
                    <span class="tree-node__title">{node.title}</span>
                    <span
                      class="tree-node__category-dot"
                      style={{ 'background-color': CATEGORY_COLORS[node.category] }}
                    />
                  </button>
                );
              }}
            </For>
          </div>

          <Show when={selectedNode()}>
            {(node) => (
              <div class="tree-detail">
                <div class="tree-detail__header">
                  <span
                    class="tree-detail__category"
                    style={{ color: CATEGORY_COLORS[node().category] }}
                  >
                    {node().category}
                  </span>
                  <span class={`tree-detail__state tree-detail__state--${resolveNodeState(node())}`}>
                    {resolveNodeState(node())}
                  </span>
                </div>
                <h4 class="tree-detail__title">{node().title}</h4>
                <p class="tree-detail__description">{node().description}</p>
                <button type="button" class="tree-detail__close-btn" onClick={() => setSelectedNode(null)}>
                  Close
                </button>
              </div>
            )}
          </Show>

          <div class="tree-legend">
            <For each={Object.entries(CATEGORY_COLORS)}>
              {([cat, color]) => (
                <span class="tree-legend__item">
                  <span class="tree-legend__dot" style={{ 'background-color': color }} />
                  {cat}
                </span>
              )}
            </For>
          </div>
        </div>
      </div>
    </Show>
  );
}
