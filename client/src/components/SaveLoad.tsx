import { createSignal, Show, For } from 'solid-js';
import { gameStore } from '../store/gameStore';
import type { SaveFile } from '../../../server/core/types';

export default function SaveLoad() {
  const [saveName, setSaveName] = createSignal('');
  const [confirmDeleteId, setConfirmDeleteId] = createSignal<string | null>(null);
  const [operationStatus, setOperationStatus] = createSignal<string | null>(null);

  const saves = () => gameStore.saves();
  const isLoading = () => gameStore.loading();

  function formatTimestamp(ts: string): string {
    try {
      return new Date(ts).toLocaleString();
    } catch {
      return ts;
    }
  }

  async function handleSave(): Promise<void> {
    const name = saveName().trim();
    if (!name) {
      setOperationStatus('Please enter a save name.');
      return;
    }
    const ok = await gameStore.saveGame(name);
    setOperationStatus(ok ? 'Game saved!' : 'Save failed.');
    if (ok) setSaveName('');
    setTimeout(() => setOperationStatus(null), 3000);
  }

  async function handleLoad(saveId: string): Promise<void> {
    const ok = await gameStore.loadGame(saveId);
    if (!ok) {
      setOperationStatus('Failed to load save.');
      setTimeout(() => setOperationStatus(null), 3000);
    }
  }

  async function handleDelete(saveId: string): Promise<void> {
    const ok = await gameStore.deleteSave(saveId);
    setConfirmDeleteId(null);
    setOperationStatus(ok ? 'Save deleted.' : 'Delete failed.');
    setTimeout(() => setOperationStatus(null), 3000);
  }

  function confirmDelete(saveId: string): void {
    setConfirmDeleteId(saveId);
  }

  function cancelDelete(): void {
    setConfirmDeleteId(null);
  }

  return (
    <Show when={gameStore.showSaveLoad()}>
      <div class="saveload-overlay">
        <button
          type="button"
          class="saveload-backdrop"
          onClick={() => gameStore.closeSaveLoad()}
          aria-label="Close save and load panel"
        />
        <div class="saveload-panel">
          <button type="button" class="saveload-panel__close" onClick={() => gameStore.closeSaveLoad()}>
            ✕
          </button>

          <header class="saveload-panel__header">
            <h2 class="saveload-panel__title">Save & Load</h2>
          </header>

          <Show when={gameStore.gameState()}>
            <section class="saveload-panel__section">
              <h3 class="saveload-panel__section-title">Save Game</h3>
              <div class="saveload-save-form">
                <input
                  type="text"
                  class="saveload-input"
                  placeholder="Save name..."
                  value={saveName()}
                  onInput={(e) => setSaveName(e.currentTarget.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                />
                <button
                  type="button"
                  class="saveload-btn saveload-btn--save"
                  onClick={handleSave}
                  disabled={isLoading() || !saveName().trim()}
                >
                  Save
                </button>
              </div>
            </section>
          </Show>

          <section class="saveload-panel__section">
            <h3 class="saveload-panel__section-title">Saved Games</h3>
            <Show
              when={saves().length > 0}
              fallback={<div class="saveload-empty">No saved games found.</div>}
            >
              <div class="saveload-list">
                <For each={saves()}>
                  {(save: SaveFile) => (
                    <div class="saveload-entry">
                      <div class="saveload-entry__info">
                        <span class="saveload-entry__name">{save.name}</span>
                        <span class="saveload-entry__meta">
                          {formatTimestamp(save.timestamp)}
                        </span>
                        <span class="saveload-entry__details">
                          {save.stage.replace(/-/g, ' ')} · Age {save.age} · Wealth {save.wealth}
                        </span>
                      </div>
                      <div class="saveload-entry__actions">
                        <Show
                          when={confirmDeleteId() === save.id}
                          fallback={
                            <>
                              <button
                                type="button"
                                class="saveload-btn saveload-btn--load"
                                onClick={() => handleLoad(save.id)}
                                disabled={isLoading()}
                              >
                                Load
                              </button>
                              <button
                                type="button"
                                class="saveload-btn saveload-btn--delete"
                                onClick={() => confirmDelete(save.id)}
                              >
                                Delete
                              </button>
                            </>
                          }
                        >
                          <div class="saveload-confirm">
                            <span class="saveload-confirm__text">Delete this save?</span>
                            <button
                              type="button"
                              class="saveload-btn saveload-btn--confirm-yes"
                              onClick={() => handleDelete(save.id)}
                            >
                              Yes
                            </button>
                            <button
                              type="button"
                              class="saveload-btn saveload-btn--confirm-no"
                              onClick={cancelDelete}
                            >
                              No
                            </button>
                          </div>
                        </Show>
                      </div>
                    </div>
                  )}
                </For>
              </div>
            </Show>
          </section>

          <Show when={operationStatus()}>
            {(status) => <div class="saveload-status">{status()}</div>}
          </Show>
        </div>
      </div>
    </Show>
  );
}
