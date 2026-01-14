/**
 * @file src/Schedule.js
 */
export default class Schedule {
  #tasks = new Map();
  #ticking = false;

  /**
   * Schedules a task for the next frame.
   * Last-write-wins: if called multiple times, only the last state/callback is used.
   *
   * @param {string} key - Unique identifier for the task (prevents duplicates).
   * @param {any} state - Data to pass to the callback (e.g., the mouse position).
   * @param {Function} callback - The function to run.
   */
  defer(key, state, callback) {
    this.#tasks.set(key, { state, callback });
    this.#scheduleFlush();
  }

  cancel(key) {
    this.#tasks.delete(key);
  }

  #scheduleFlush() {
    if (!this.#ticking) {
      this.#ticking = true;
      requestAnimationFrame(() => this.#flush());
    }
  }

  #flush() {
    const batch = this.#tasks;
    this.#tasks = new Map();
    this.#ticking = false;

    // We pass 'state' into the callback
    batch.forEach(({ state, callback }) => {
      try { callback(state); } catch (error) {
        console.error(error);
      }
    });
  }
}

export const schedule = new Schedule();
