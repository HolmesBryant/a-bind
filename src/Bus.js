/**
 * We're all bozos on this Bus
 * @file Bus.js
 * @author Holmes Bryant <Holmes Bryant <https://github.com/HolmesBryant>
 * @version 1.0.0
 * @license GPL-3.0
 */

/**
 * A simple event bus implementation for managing pub/sub patterns.
 */
class Bus {
  /**
   * Internal map of event names to sets of listener functions.
   * @private
   * @type {Map<any, Set<Function>>}
   */
  #bozos = new Map();
  static #modelIds = new WeakMap();
  static #idCounter = 0;

  static getKey(model, property) {
    let modelId;
    if (typeof model === 'object' &&
      model !== null ||
      typeof model === 'function') {
      modelId = Bus.#modelIds.get(model);
      if (!modelId) {
        // Add "ref:" prefix for Objects
        modelId = `ref:m${++Bus.#idCounter}`;
        Bus.#modelIds.set(model, modelId);
      }
    } else {
      // Add "val:" prefix for Primitives
      modelId = `val:${String(model)}`;
    }

    return `abus::${modelId}:${property}`;
  }

  /**
   * Checks if a specific event has any registered listeners.
   * @param {any} bozo - The event name/identifier.
   * @returns {boolean} True if the event has listeners.
   */
  has(bozo) {
    return this.#bozos.has(bozo);
  }

  /**
   * Subscribes a function to an event.
   * @param {any} bozo - The event name/identifier.
   * @param {Function} funk - The callback function to execute when the event is announced.
   * @returns {Function} An unsubscribe function to remove this specific listener.
   */
  hopOn(bozo, funk) {
    if (typeof funk !== 'function') {
      console.error('Bus: funk must be a function');
      return () => {};
    }

    let troupe = this.#bozos.get(bozo);
    if (!troupe) {
      troupe = new Set();
      this.#bozos.set(bozo, troupe);
    }

    troupe.add(funk);
    return () => this.hopOff(bozo, funk);
  }

  /**
   * Unsubscribes a specific function from an event.
   * @param {any} bozo - The event name/identifier.
   * @param {Function} funk - The callback function to remove.
   */
  hopOff(bozo, funk) {
    const troupe = this.#bozos.get(bozo);
    if (troupe) {
      troupe.delete(funk);
      if (troupe.size === 0) this.#bozos.delete(bozo);
    }
  }

  /**
   * Triggers an event, executing all subscribed functions with the provided arguments.
   * @param {any} bozo - The event name/identifier.
   * @param {...any} argue - Arguments to pass to the listener functions.
   */
  announce(bozo, ...argue) {
    const troupe = this.#bozos.get(bozo);
    if (!troupe) return;
    for (const trouper of troupe) {
      try {
        trouper(...argue);
      } catch (error) {
        console.error(`Bus: error announcing "${bozo}"`, error);
      }
    }
  }

  /**
   * Subscribes a function to an event for a single execution.
   * @param {any} bozo - The event name/identifier.
   * @param {Function} funk - The callback function to execute once.
   * @returns {Function} An unsubscribe function.
   */
  once(bozo, funk) {
    const off = this.hopOn(bozo, (...argue) => {
      off();
      funk(...argue);
    });
    return off;
  }

  /**
   * Gets a list of all currently registered event names.
   * @type {Array<any>}
   */
  get bozos() { return Array.from(this.#bozos.keys()) }
}

// Global instance
const crosstownBus = new Bus();
Object.freeze(crosstownBus);

export { crosstownBus }
export default Bus;
