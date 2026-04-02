/**
 * TagIndex — O(1) inverted index mapping tags → event IDs for narrative callbacks.
 *
 * Enables efficient lookups like:
 *   "player did X in childhood → tag 'stood-up-to-bully' → adolescence event references it"
 *
 * Index maps: tag → Set<eventId> for fast reverse lookups.
 * Also maintains: eventId → Set<tag> for forward lookups.
 */
export class TagIndex {
  private tagToEvents: Map<string, Set<string>> = new Map();
  private eventToTags: Map<string, Set<string>> = new Map();

  constructor() {
    // Intentionally empty — ready for immediate use
  }

  /**
   * Adds a single tag → eventId mapping.
   */
  addTag(tag: string, eventId: string): void {
    if (!this.tagToEvents.has(tag)) {
      this.tagToEvents.set(tag, new Set());
    }
    this.tagToEvents.get(tag)!.add(eventId);

    if (!this.eventToTags.has(eventId)) {
      this.eventToTags.set(eventId, new Set());
    }
    this.eventToTags.get(eventId)!.add(tag);
  }

  /**
   * Removes a tag → eventId mapping.
   */
  removeTag(tag: string, eventId: string): void {
    const events = this.tagToEvents.get(tag);
    if (events) {
      events.delete(eventId);
      if (events.size === 0) {
        this.tagToEvents.delete(tag);
      }
    }

    const tags = this.eventToTags.get(eventId);
    if (tags) {
      tags.delete(tag);
      if (tags.size === 0) {
        this.eventToTags.delete(eventId);
      }
    }
  }

  /**
   * Returns all event IDs associated with a given tag.
   */
  getEventsByTag(tag: string): Set<string> {
    return this.tagToEvents.get(tag) ?? new Set<string>();
  }

  /**
   * Returns all tags associated with a given event.
   */
  getTagsForEvent(eventId: string): Set<string> {
    return this.eventToTags.get(eventId) ?? new Set<string>();
  }

  /**
   * Checks if a tag exists in the index.
   */
  hasTag(tag: string): boolean {
    return this.tagToEvents.has(tag);
  }

  /**
   * Returns all tags currently in the index.
   */
  getAllTags(): Set<string> {
    return new Set(this.tagToEvents.keys());
  }

  /**
   * Bulk add multiple tags for a single event.
   */
  addTags(tags: string[], eventId: string): void {
    for (const tag of tags) {
      this.addTag(tag, eventId);
    }
  }

  /**
   * Resets the index to empty state.
   */
  clear(): void {
    this.tagToEvents.clear();
    this.eventToTags.clear();
  }

  /**
   * Returns the number of unique tags.
   */
  getTagCount(): number {
    return this.tagToEvents.size;
  }

  /**
   * Returns the number of tracked events.
   */
  getEventCount(): number {
    return this.eventToTags.size;
  }
}