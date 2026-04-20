/**
 * A lightweight task scheduler using requestAnimationFrame.
 * Implements a "last-write-wins" strategy for batching updates.
 *
 * @author Holmes Bryant <Holmes Bryant <https://github.com/HolmesBryant>
 * @license GPL-3.0
 * @version 1.0
 */
export default class Schedule {
  /**
   * Internal map of pending tasks.
   * @private
   * @type {Map<string, {state: any, callback: Function}>}
   */
  #tasks = new Map();

  /**
   * Flag indicating if a frame is currently scheduled.
   * @private
   * @type {boolean}
   */
  #ticking = false;

  /**
   * Schedules a task for the next animation frame.
   * Uses a "Last-write-wins" strategy: if called multiple times with the same key
   * in the same frame, only the last state and callback provided will be executed.
   *
   * @param {string} key - Unique identifier for the task (prevents duplicates).
   * @param {any} state - Data to pass to the callback (e.g., the new value).
   * @param {Function} callback - The function to run. Receives `state` as an argument.
   */
  defer(key, state, callback) {
    this.#tasks.set(key, { state, callback });
    this.#scheduleFlush();
  }

  /**
   * Cancels a pending task if it hasn't run yet.
   * @param {string} key - The unique identifier of the task to remove.
   */
  cancel(key) {
    this.#tasks.delete(key);
  }

  /**
   * Internal method to request an animation frame if one isn't already pending.
   * @private
   */
  #scheduleFlush() {
    if (!this.#ticking) {
      this.#ticking = true;
      requestAnimationFrame(() => this.#flush());
    }
  }

  /**
   * The execution loop.
   * Iterates through all batched tasks, executes them, and clears the queue.
   * @private
   */
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

/**
 * Singleton instance of the Schedule class.
 * @type {Schedule}
 */
const scheduler = new Schedule();
Object.freeze(scheduler);
export { scheduler };
