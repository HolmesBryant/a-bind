/**
 * Handles loading and caching of modules (default exports only) and DOM elements.
 * @file loader.js
 * @author Holmes Bryant <https://github.com/HolmesBryant>
 * @license GPL-3.0
 * @version 1.0.0
 */
class Loader {
  /**
   * Optional white list of allowed module import paths/urls
   * @type {string[]|null}
   */
  #allowed = null;

  /**
   * @private
   * @type {Promise<void>|null}
   */
  #domReadyPromise = null;

  /**
   * @private
   * @type {Map<string, *>}
   */
  #registry = new Map();

  /**
   * @private
   * @type {Map<string, Promise<*>>}
   */
  #pending = new Map();

  /**
   * Loads a resource based on the provided key. Caches results for subsequent calls.
   * @param {string|*} key - The module path or CSS selector to load.
   * @param {...*} args - Arguments to pass if the loaded resource is a class constructor.
   * @returns {Promise<*>} The resolved module instance, DOM element, or null.
   */
  async load(key, ...args) {
    if (!key || typeof key === 'object') return key;
    if (this.#registry.has(key)) return this.#registry.get(key);
    if (this.#pending.has(key)) return this.#pending.get(key);

    const promise = this.#resolve(key, ...args);
    this.#pending.set(key, promise);

    try {
      const result = await promise;
      if (result !== null) this.#registry.set(key, result);
      return result;
    } finally {
      this.#pending.delete(key);
    }
  }

  /**
   * Resolves the key into a module or DOM element.
   * @private
   * @param {string} key
   * @param {...*} args
   * @returns {Promise<*>}
   */
  async #resolve(key, ...args) {
    // Module Loading
    if (this.#isImportable(key)) {
      try {
        const mod = await import(key);
        return this.#instantiate(mod.default, ...args);
      } catch (e) {
        return null;
      }
    }

    // CSS Selector
    const isSelector = key.includes('#') || key.startsWith('[') || key.includes('>');
    if (isSelector) {
      // Only warn about dot-ambiguity if it actually looks like a file
      if (key.startsWith('.') && ( key.endsWith('.js') || key.endsWith('.mjs') )) {
        console.warn(`Loader: Ambiguous key. Did you mean "./${key}"? Treating as CSS selector: ${key}`);
      }

      if (key.endsWith('.js') || key.endsWith('.mjs')) {
        console.error(`Loader: CSS selector cannot end with ".js" or ".mjs": ${key}`);
        return null;
      }

      return this.#getDomElement(key);
    }

    // Global Check
    /*if (Object.prototype.hasOwnProperty.call(globalThis, key)) {
      console.warn(`Loader: Access to global "${key}" is forbidden.`);
      return null;
    }*/

    console.error(`Loader: Resource "${key}" could not be resolved as a module or DOM element.`);
    return null;
  }

  /**
   * Selects a DOM element, waiting for DOMContentLoaded and Custom Element definition if necessary.
   * Allows html tags (<div>), IDs (#foo), CSS classes (.bar) and attributes ([data-model])
   * but NOT compound selectors like div > p.
   * @private
   * @param {string} selector
   * @returns {Promise<Element|null>}
   */
  async #getDomElement(selector) {
    if (typeof document === 'undefined') return null;
    selector = selector.replace(/[<>]/g, '');
    const query = () => document.querySelector(selector);
    let el = query();

    if (!el && document.readyState === 'loading') {
      this.#domReadyPromise ??= new Promise(r => window.addEventListener('DOMContentLoaded', r, { once: true }));
      await this.#domReadyPromise;
      el = query();
    }

    if (el?.localName.includes('-')) {
      await customElements.whenDefined(el.localName);
    }

    return el;
  }

  /**
   * Instantiates a class/function or returns the object/function if no constructor.
   * @private
   * @param {*} obj
   * @param {...*} args
   * @returns {*}
   */
  #instantiate(obj, ...args) {
    if (typeof obj !== 'function') return obj;
    const isConstructor = obj.prototype && obj.prototype.constructor === obj;
    try {
      return isConstructor ? new obj(...args) : obj;
    } catch (error) {
      return obj;
    }
  }

  /**
   * Validates if a path is allowed to be imported based on the whitelist or default security regex.
   * @private
   * @param {string} path
   * @returns {boolean}
   */
  #isImportable(path) {
    // If whitelist is set, strictly follow it.
    if (this.#allowed) return this.#allowed.includes(path);

    const normalized = path.replace(/\\/g, '/');
    // Default: Only allow local relative JS files
    return /^(\.\/|\.\.\/|(?!\/\/)\/).*\.m?js$/.test(normalized);
  }

  /**
   * Returns an iterator of all currently cached resource keys.
   * @returns {IterableIterator<string>}
   */
  get keys() { return this.#registry.keys() }

  /**
   * Gets the current whitelist of allowed import paths.
   * @returns {string[]|null}
   */
  get allowed() { return this.#allowed }

  /**
   * Sets the whitelist of allowed import paths.
   * @param {string|string[]} arr - A single path or an array of permitted paths.
   */
  set allowed(arr) { this.#allowed = Array.isArray(arr) ? arr : [arr] }
};

const loader = new Loader();
Object.freeze(loader);
export default loader;
export { Loader as FreeLoader }
