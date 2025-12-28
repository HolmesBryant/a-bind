export default class UpdateManager {
  #pending = new Map();
  #frameRequested = false;

  queue(key, value, callback, context) {
    this.#pending.set(key, { value, callback, context });
    if (!this.#frameRequested) {
      this.#frameRequested = true;
      requestAnimationFrame(() => this.#flush());
    }
  }

  cancel(key) {
    this.#pending.delete(key);
  }

  #flush() {
    const batch = this.#pending;
    this.#pending = new Map();
    this.#frameRequested = false;

    batch.forEach(({ value, callback, context }) => {
      try {
        callback.call(context, value);
      } catch (error) {
        console.error('UpdateManager: Error', error);
      }
    });
  }
}
export const globalUpdateManager = new UpdateManager();
