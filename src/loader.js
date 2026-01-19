/**
 * Handles loading and caching of modules and data models.
 * Features strict protocol handling, shadow DOM piercing, namespace isolation,
 * and race-condition handling via pending resolution.
 * @file loader.js
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
  timeout = 1000;

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
      for (const [key, { resolve }] of this.#deferred) {
        if (Object.hasOwn(this.#namespace, key)) {
          this.#deferred.delete(key);
          resolve(this.#namespace[key]);
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
        const { resolve } = this.#deferred.get(key);
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
    // Protocols
    if (key.startsWith('mod:')) {
      return this.#importModule(key.substring(key.indexOf(':') + 1), ...args);
    }
    if (key.startsWith('dom:')) {
      return this.#getDomElement(key.substring(key.indexOf(':') + 1), context);
    }

    // Namespace Lookup
    if (this.#namespace) {
      // Check immediate sync availability first to avoid unnecessary 'await'
      const immediate = PathResolver.getValue(this.#namespace, key);
      if (immediate !== undefined) return immediate;

      try {
        return await this.when(
          () => PathResolver.getValue(this.#namespace, key),
          this.timeout,
          50
        );
      } catch (e) { /* Fallthrough */ }
    }

    // Import Path
    if (this.#isImportable(key)) return this.#importModule(key, ...args);

    // Pending Definition (Wait for define)
    if (!key.includes('/') && !key.includes('#') && !key.includes('.')) {
       return this.#waitForDefinition(key);
    }

    // DOM Selector
    return this.#getDomElement(key, context);
  }

  #waitForDefinition(key) {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        if (this.#deferred.has(key)) {
            this.#deferred.delete(key);
            resolve(undefined);
        }
      }, 2000);

      this.#deferred.set(key, {
        resolve: (val) => { clearTimeout(timer); resolve(val); }
      });
    });
  }

  async when(predicate, timeout = 1000, interval = 50) {
    const startTime = performance.now();
    while (true) {
      try {
        const result = await predicate();
        if (result !== undefined && result !== null && result !== false) return result;
      } catch (e) {}
      if (performance.now() - startTime >= timeout) throw new Error('Timeout');
      await this.wait(interval);
    }
  }

  wait(ms) { return new Promise(r => setTimeout(r, ms)); }

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
      if (!context || context === document) {
        if (document.readyState === 'loading') {
          this.#domReadyPromise ??= new Promise(r => window.addEventListener('DOMContentLoaded', r, { once: true }));
          await this.#domReadyPromise;
        }
      }
      const root = (context && context.getRootNode) ? context.getRootNode() : document;
      if (selector.includes('>>>')) {
        const parts = selector.split('>>>').map(s => s.trim());
        let currentRoot = root;
        let target = null;
        for (const part of parts) {
          if (!currentRoot) return null;
          const found = currentRoot.querySelector(part);
          if (!found) return null;
          if (part === parts[parts.length - 1]) target = found;
          else if (found.shadowRoot) currentRoot = found.shadowRoot;
          else return null;
        }
        if (target?.localName.includes('-')) await customElements.whenDefined(target.localName);
        return target;
      }
      const elem = root.querySelector(selector);
      if (elem?.localName.includes('-')) await customElements.whenDefined(elem.localName);
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

  get keys() { return this.#registry.keys() }
  set validator(fn) { this.#validator = fn }
}

const loader = new Loader();
Object.freeze(loader);
export { loader };
