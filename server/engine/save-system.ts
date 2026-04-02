/**
 * Save System — Atomic JSON Save/Load
 *
 * Uses atomic file writes: write to temp file, then rename.
 * On same filesystem, fs.rename is atomic.
 */

import { mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { EconomySnapshot, GameState, SaveData } from '../core/types.js';
import { zSaveData } from '../core/schemas.js';

const SAVE_DIR = './saves';
const SAVE_EXTENSION = '.json';
const TEMP_EXTENSION = '.json.tmp';

export interface SaveFile {
  id: string;
  name: string;
  timestamp: string;
  stage: string;
  age: number;
  wealth: number;
}

class SaveSystem {
  private saveDir: string;

  constructor(saveDir: string) {
    this.saveDir = saveDir;
  }

  /**
   * Save game state to a new save file.
   * Uses atomic write: write to .tmp, then rename to .json
   */
  async save(
    gameState: GameState,
    saveName?: string,
    economySnapshot?: EconomySnapshot
  ): Promise<{ saveId: string; timestamp: string }> {
    await this.ensureSaveDir();

    const timestamp = new Date().toISOString();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const saveId = `${timestamp.replace(/[:.]/g, '-')}-${randomSuffix}`;

    const saveData: SaveData = {
      version: 1,
      timestamp,
      gameState,
      economySnapshot: economySnapshot ?? {
        careerEarnings: 0,
        passiveIncome: 0,
        expenses: 0,
        netWealthChange: 0,
      },
    };

    const tempPath = join(this.saveDir, `${saveId}${TEMP_EXTENSION}`);
    const finalPath = join(this.saveDir, `${saveId}${SAVE_EXTENSION}`);

    const jsonContent = JSON.stringify(saveData, null, 2);
    await writeFile(tempPath, jsonContent, 'utf-8');

    await rename(tempPath, finalPath);

    return { saveId, timestamp };
  }

  /**
   * Load a save file by ID.
   * Validates with zSaveData.parse().
   */
  async load(saveId: string): Promise<SaveData> {
    const filePath = join(this.saveDir, `${saveId}${SAVE_EXTENSION}`);
    const content = await readFile(filePath, 'utf-8');
    const parsed = JSON.parse(content);
    return zSaveData.parse(parsed);
  }

  /**
   * List all save files with metadata.
   * Reads all .json files in saves directory.
   */
  async listSaves(): Promise<SaveFile[]> {
    await this.ensureSaveDir();

    const files = await readdir(this.saveDir);
    const saveFiles: SaveFile[] = [];

    for (const file of files) {
      if (!file.endsWith(SAVE_EXTENSION) || file.endsWith(TEMP_EXTENSION)) {
        continue;
      }

      const saveId = file.replace(SAVE_EXTENSION, '');
      try {
        const saveData = await this.load(saveId);
        saveFiles.push({
          id: saveId,
          name: this.buildSaveName(saveData),
          timestamp: saveData.timestamp,
          stage: saveData.gameState.player.stats.currentStage,
          age: saveData.gameState.player.stats.age,
          wealth: saveData.gameState.player.stats.wealth,
        });
      } catch {
        continue;
      }
    }

    saveFiles.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return saveFiles;
  }

  /**
   * Delete a save file by ID.
   */
  async deleteSave(saveId: string): Promise<void> {
    const filePath = join(this.saveDir, `${saveId}${SAVE_EXTENSION}`);
    await rm(filePath);
  }

  /**
   * Get full path to a save file.
   */
  getSavePath(saveId: string): string {
    return join(this.saveDir, `${saveId}${SAVE_EXTENSION}`);
  }

  /**
   * Ensure saves directory exists.
   */
  private async ensureSaveDir(): Promise<void> {
    try {
      await mkdir(this.saveDir, { recursive: true });
    } catch {
    }
  }

  /**
   * Build a display name for a save file from game state.
   */
  private buildSaveName(saveData: SaveData): string {
    const { player } = saveData.gameState;
    const stageName = this.formatStageName(player.stats.currentStage);
    return `${player.name} (${stageName}, Age ${player.stats.age})`;
  }

  /**
   * Format life stage for display.
   */
  private formatStageName(stage: string): string {
    return stage
      .replace(/-/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  }
}

/**
 * Factory function to create a SaveSystem instance.
 */
export function createSaveSystem(saveDir: string = SAVE_DIR): SaveSystem {
  return new SaveSystem(saveDir);
}

// Default export for convenience
export default SaveSystem;
