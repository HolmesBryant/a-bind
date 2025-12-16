/**
 * @file observer.js
 * @author Holmes Bryant <https://github.com/HolmesBryant>
 * @license GPL-3.0
 * @version 2.5.2
 */
const modelObservers = new WeakMap();

export class ModelObserver {
  #subscribers = new Map();

  subscribe(property, callback) {
    if (!this.#subscribers.has(property)) {
      this.#subscribers.set(property, new Set());
    }
    this.#subscribers.get(property).add(callback);
  }

  unsubscribe(property, callback) {
    if (this.#subscribers.has(property)) {
      const set = this.#subscribers.get(property);
      set.delete(callback);
      if (set.size === 0) this.#subscribers.delete(property);
    }
  }

  publish(property, value) {
    if (this.#subscribers.has(property)) {
      // Create a copy of subscribers to prevent concurrent modification errors during iteration
      const subs = Array.from(this.#subscribers.get(property));
      subs.forEach(callback => callback(value));
    }
  }

  static get(model, create = false) {
    if (!model || typeof model !== 'object') return null;
    if (!modelObservers.has(model) && create) {
      modelObservers.set(model, new ModelObserver());
    }
    return modelObservers.get(model) || null;
  }
}

export const Batcher = {
  updates: new Map(),
  requested: false,

  add(element, value, reason) {
    this.updates.set(element, { value, reason });
    if (!this.requested) {
      this.requested = true;
      requestAnimationFrame(() => this.flush());
    }
  },

  flush() {
    this.updates.forEach((item, el) => {
      if (el.isConnected && typeof el.applyUpdate === 'function') {
        el.applyUpdate(item.value, item.reason);
      }
    });
    this.updates.clear();
    this.requested = false;
  }
};
