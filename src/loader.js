/**
 * Handles loading and caching of modules and data models.
 * Features strict protocol handling, shadow DOM piercing, namespace isolation,
 * and race-condition handling via pending resolution.
 * @file Loader.js
 * @author Holmes Bryant
 * @license GPL-3.0
 */

import PathResolver from './PathResolver.js';

export default class Loader {
  #domReadyPromise = null;
  #namespace = null;
  #registry = new Map();
  #pending = new Map();
  #deferred = new Map();
  #validator = null;
  timeout = 2000;

  /**
   * Universal registration method.
   * Handles both specific Aliases and the Global Namespace.
   *
   * @param {string|Object} keyOrRoot - A string key (for alias) OR an object (for namespace).
   * @param {Object} [value] - The value (only required if first arg is a string).
   */
  define(keyOrRoot, value) {
    // Set Namespace (Object)
    if (typeof keyOrRoot === 'object' && keyOrRoot !== null) {
      this.#namespace = keyOrRoot;
      // Resolve pending waiters immediately
      for (const [key, { resolve, timer }] of this.#deferred) {
        const val = PathResolver.getValue(this.#namespace, key);
        if (val !== undefined) {
          clearTimeout(timer);
          this.#deferred.delete(key);
          resolve(val);
        }
      }
      return;
    }

    // Set Alias (String, Value)
    if (typeof keyOrRoot === 'string') {
      const key = keyOrRoot;
      this.#registry.set(key, value);
      // Resolve pending waiters
      if (this.#deferred.has(key)) {
        const { resolve, timer } = this.#deferred.get(key);
        clearTimeout(timer);
        this.#deferred.delete(key);
        resolve(value);
      }
    }
  }

  has(key) {
    return this.#registry.has(key);
  }

  async load(key, context = document, ...args) {
    if (!key || typeof key === 'object') return key;

    // Check Registry
    if (this.#registry.has(key)) return this.#registry.get(key);
    // Check Pending Imports
    if (this.#pending.has(key)) return this.#pending.get(key);

    // Normalize context
    let constructorArgs = args;
    let scope = context;
    if (!(context instanceof Node) && context !== null && context !== undefined) {
      constructorArgs = [context, ...args];
      scope = document;
    }

    const promise = this.#resolve(key, scope, ...constructorArgs);
    this.#pending.set(key, promise);

    try {
      const result = await promise;
      if (result !== undefined && result !== null) {
        // don't cache DOM nodes (to prevent return detached elements)
        if (!(result instanceof Node)) {
          this.#registry.set(key, result);
        }
      }
      return result;
    } finally {
      this.#pending.delete(key);
    }
  }

  async #resolve(key, context, ...args) {
    // Check protocol
    if (key.startsWith('mod:')) {
      return this.#importModule(key.substring(key.indexOf(':') + 1), ...args);
    }
    if (key.startsWith('dom:')) {
      return this.#getDomElement(key.substring(key.indexOf(':') + 1), context);
    }

     // Check if the key exists in the object passed to loader.define()
    if (this.#namespace) {
      const immediate = PathResolver.getValue(this.#namespace, key);
      if (immediate !== undefined) return immediate;
    }

    // If it's a simple key (no dots or slashes), assume it might be defined later.
    if (!key.includes('/') && !key.includes('#') && !key.includes('.')) {
      return this.#waitForDefinition(key);
    }

    // Fallback: DOM Selector
    return this.#getDomElement(key, context);
  }

  #waitForDefinition(key) {
    if (this.#deferred.has(key)) return this.#deferred.get(key).promise;

    let resolve, reject;
    const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
    const timer = setTimeout(() => {
      if (this.#deferred.has(key)) {
          this.#deferred.delete(key);
          reject(new Error(`Loader: Timeout waiting for definition of "${key}"`));
      }
    }, this.timeout);

    this.#deferred.set(key, { promise, resolve, timer });
    return promise;
  }

  async #importModule(path, ...args) {
    try {
      const mod = await import(path);
      return this.#instantiate(mod.default, ...args);
    } catch (error) {
      throw new Error(`Loader: Failed to import module "${path}"`, { cause: error });
    }
  }

  async #getDomElement(selector, context) {
      if (typeof document === 'undefined') return null;

      // wait for Document Ready if loading
      if (!context || context === document) {
        if (document.readyState === 'loading') {
          this.#domReadyPromise ??= new Promise(r => window.addEventListener('DOMContentLoaded', r, { once: true }));
          await this.#domReadyPromise;
        }
      }

      const root = (context && context.getRootNode) ? context.getRootNode() : document;

      const findNode = () => {
        if (selector.includes('>>>')) {
          const parts = selector.split('>>>').map(s => s.trim());
          let currentRoot = root;
          let target = null;
          for (const part of parts) {
            if (!currentRoot) return null;
            const found = currentRoot.querySelector(part);
            if (!found) return null;
            if (part === parts[parts.length - 1]) {
              target = found;
            } else if (found.shadowRoot) {
              currentRoot = found.shadowRoot;
            } else {
              return null;
            }
          }

          return target;
        }

        return root.querySelector(selector);
      };

      let elem;
      try {
        // Attempat to find the element, retry until timeout
        elem = await this.#when(findNode, this.timeout, 50);
      } catch (error) {
        // timeout reached
        return null;
      }

      // wait for custom elements
      if (elem?.localName.includes('-')) {
        await customElements.whenDefined(elem.localName);
      }

      return elem;
  }

  #isImportable(path) {
    if (this.#validator) return this.#validator(path);
    const normalized = path.replace(/\\/g, '/');
    return /^(\.\/|(?!\/\/)\/).*\.m?js$/.test(normalized);
  }

  #instantiate(obj, ...args) {
    if (typeof obj !== 'function') return obj;
    const isConstructor = obj.prototype && obj.prototype.constructor === obj;
    try { return isConstructor ? new obj(...args) : obj; } catch (e) { return obj; }
  }

  /**
   * Waits for a condition to become truthy, polling at a specified interval.
   * @async
   * @param {Function|*} condition - The condition to wait for. Can be a function or a value.
   * @param {number} [timeout=1000] - The maximum time to wait in milliseconds.
   * @param {number} [pollInterval=100] - The interval between checks in milliseconds.
   * @returns {Promise<*>} A promise that resolves with the result of the condition when it becomes truthy.
   * @throws {Error} If the condition function throws an error.
   */
  async #when(condition, timeout = 1000, pollInterval = 100) {
    const startTime = Date.now();
    const check = typeof condition === 'function' ? async () => condition() : async () => condition;
    while (true) {
      if (Date.now() - startTime >= timeout) return await check();
      try {
        const result = await check();
        if (result) return result;
      } catch (e) {
        throw e;
      }
      await this.wait(pollInterval);
    }
  }

  get keys() { return this.#registry.keys() }
  set validator(fn) { this.#validator = fn }
}

const loader = new Loader();
Object.freeze(loader);
export { loader };
