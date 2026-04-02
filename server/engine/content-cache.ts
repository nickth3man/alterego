/**
 * Content Cache — Event/NPC Loading + Hot-Reload
 *
 * Loads and caches event JSON files and NPC definitions.
 * Hot-reload support for development using fs.watch.
 */

import { readFile, readdir, stat, watch } from 'node:fs/promises';
import { join } from 'node:path';
import type { EventCategory, LifeStage, NPCDefinition, Storylet } from '../core/types.js';
import { zNPCDefinition, zStorylet } from '../core/schemas.js';

class ContentCache {
  private eventsDir: string;
  private npcsDir: string;
  private events: Map<string, Storylet> = new Map();
  private npcs: Map<string, NPCDefinition> = new Map();
  private loadedAt: number = 0;
  private watcherHandle: AsyncIterator<{ eventType: string; filename: string | null }> | null = null;
  private abortController: AbortController | null = null;
  private isWatching: boolean = false;

  constructor(eventsDir: string, npcsDir: string) {
    this.eventsDir = eventsDir;
    this.npcsDir = npcsDir;
  }

  /**
   * Load all events and NPCs from disk.
   */
  async loadAll(): Promise<void> {
    await Promise.all([
      this.loadEvents(),
      this.loadNPCs(),
    ]);
    this.loadedAt = Date.now();
  }

  /**
   * Load all event JSON files recursively.
   */
  private async loadEvents(): Promise<void> {
    this.events.clear();
    const eventFiles = await this.scanDirectory(this.eventsDir, '.json');

    await Promise.all(
      eventFiles.map(async (filePath) => {
        try {
          const content = await readFile(filePath, 'utf-8');
          const data = JSON.parse(content);
          const storylet = zStorylet.parse(data);
          this.events.set(storylet.id, storylet);
        } catch (err) {
          console.warn(`Failed to load event file ${filePath}:`, err);
        }
      })
    );
  }

  /**
   * Load NPC definitions from data/npcs/roster.json.
   */
  private async loadNPCs(): Promise<void> {
    this.npcs.clear();
    const rosterPath = join(this.npcsDir, 'roster.json');

    try {
      const content = await readFile(rosterPath, 'utf-8');
      const data = JSON.parse(content);

      const npcArray = Array.isArray(data) ? data : data.npcs ?? [data];

      for (const npcData of npcArray) {
        const npc = zNPCDefinition.parse(npcData);
        this.npcs.set(npc.id, npc);
      }
    } catch (err) {
      console.warn(`Failed to load NPC roster from ${rosterPath}:`, err);
    }
  }

  /**
   * Recursively scan directory for files with given extension.
   */
  private async scanDirectory(dir: string, extension: string): Promise<string[]> {
    const files: string[] = [];

    try {
      const entries = await readdir(dir);

      for (const entry of entries) {
        const fullPath = join(dir, entry);
        const stats = await stat(fullPath);

        if (stats.isDirectory()) {
          const subFiles = await this.scanDirectory(fullPath, extension);
          files.push(...subFiles);
        } else if (stats.isFile() && entry.endsWith(extension)) {
          files.push(fullPath);
        }
      }
    } catch {
    }

    return files;
  }

  /**
   * Get a single event by ID.
   */
  getEvent(eventId: string): Storylet | undefined {
    return this.events.get(eventId);
  }

  /**
   * Get all loaded events.
   */
  getAllEvents(): Storylet[] {
    return Array.from(this.events.values());
  }

  /**
   * Get events filtered by life stage.
   */
  getEventsByStage(stage: LifeStage): Storylet[] {
    return this.getAllEvents().filter(event => event.lifeStages.includes(stage));
  }

  /**
   * Get events filtered by category.
   */
  getEventsByCategory(category: EventCategory): Storylet[] {
    return this.getAllEvents().filter(event => event.category === category);
  }

  /**
   * Get a single NPC by ID.
   */
  getNPC(npcId: string): NPCDefinition | undefined {
    return this.npcs.get(npcId);
  }

  /**
   * Get all loaded NPCs.
   */
  getAllNPCs(): NPCDefinition[] {
    return Array.from(this.npcs.values());
  }

  /**
   * Reload all content from disk.
   */
  async reload(): Promise<void> {
    await this.loadAll();
  }

  /**
   * Get timestamp of last content load.
   */
  getLoadedAt(): number {
    return this.loadedAt;
  }

  /**
   * Get total number of loaded events.
   */
  getEventCount(): number {
    return this.events.size;
  }

  /**
   * Get NPC count.
   */
  getNPCCount(): number {
    return this.npcs.size;
  }

  /**
   * Start watching for file changes (hot-reload).
   * Only for development use — not production.
   */
  watch(): void {
    if (this.isWatching) {
      return;
    }

    this.isWatching = true;
    this.startWatching();
  }

  /**
   * Stop watching for file changes.
   */
  stopWatching(): void {
    if (this.watcherHandle != null && this.abortController != null) {
      this.abortController.abort();
      this.watcherHandle = null;
      this.abortController = null;
      this.isWatching = false;
    }
  }

  /**
   * Internal watch implementation.
   */
  private async startWatching(): Promise<void> {
    this.abortController = new AbortController();

    try {
      const eventsWatcher = watch(this.eventsDir, {
        recursive: true,
        signal: this.abortController.signal,
      });

      const npcsWatcher = watch(this.npcsDir, {
        recursive: true,
        signal: this.abortController.signal,
      });

      const processWatcher = async (
        watcher: AsyncIterable<{ eventType: string; filename: string | null }>,
        dir: string,
        type: 'event' | 'npc'
      ) => {
        for await (const { eventType, filename } of watcher) {
          if (eventType === 'rename' || eventType === 'change') {
            if (filename && filename.endsWith('.json')) {
              await this.handleFileChange(dir, filename, type);
            }
          }
        }
      };

      await Promise.all([
        processWatcher(eventsWatcher, this.eventsDir, 'event'),
        processWatcher(npcsWatcher, this.npcsDir, 'npc'),
      ]);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('Content watcher error:', err);
      }
    }
  }

  /**
   * Handle a file change event.
   */
  private async handleFileChange(
    dir: string,
    filename: string,
    type: 'event' | 'npc'
  ): Promise<void> {
    const fullPath = join(dir, filename);

    try {
      if (type === 'event') {
        await this.reloadEventFile(fullPath);
      } else {
        await this.loadNPCs();
      }

      console.log(`Content reloaded: ${filename}`);
    } catch (err) {
      console.warn(`Failed to reload ${filename}:`, err);
    }
  }

  /**
   * Reload a single event file.
   */
  private async reloadEventFile(filePath: string): Promise<void> {
    try {
      const content = await readFile(filePath, 'utf-8');
      const data = JSON.parse(content);
      const storylet = zStorylet.parse(data);
      this.events.set(storylet.id, storylet);
    } catch (err) {
      console.warn(`Failed to reload event file ${filePath}:`, err);
    }
  }
}

/**
 * Start hot-reload watching on a content cache.
 * Convenience function that calls cache.watch().
 */
export function startHotReload(cache: ContentCache): () => void {
  cache.watch();

  return () => {
    cache.stopWatching();
  };
}

// Types for export (matching the interface structure)
export type { ContentCache };

// Default export for convenience
export default ContentCache;
