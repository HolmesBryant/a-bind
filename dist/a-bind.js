/**
 * @file a-bind.js
 * Data-binding for Custom Elements and ESM Modules.
 * @author Holmes Bryant <Holmes Bryant <https://github.com/HolmesBryant>
 * @license GPL-3.0
 * @version 3.5
 */

/**
 * A lightweight task scheduler using requestAnimationFrame.
 * Implements a "last-write-wins" strategy for batching updates.
 *
 * @author Holmes Bryant <Holmes Bryant <https://github.com/HolmesBryant>
 * @license GPL-3.0
 * @version 1.0
 */
class Schedule {
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
 * Singleton instance
 * @type {Schedule}
 */
const scheduler = new Schedule();
Object.freeze(scheduler);

/**
 * We're all bozos on this Bus.
 * A simple event bus implementation for managing pub/sub patterns.
 * Supports unique key generation for object identity tracking.
 *
 * @author Holmes Bryant <Holmes Bryant <https://github.com/HolmesBryant>
 * @license GPL-3.0
 * @version 1.0
 */

/**
 * A simple event bus implementation for managing pub/sub patterns.
 * Supports unique key generation for object identity tracking.
 */
class Bus {
  /**
   * Internal map of event names to sets of listener functions.
   * @private
   * @type {Map<any, Set<Function>>}
   */
  #bozos = new Map();

  /**
   * WeakMap to associate objects with unique string IDs without modifying them.
   * @private
   */
  static #modelIds = new WeakMap();

  /**
   * Counter for generating unique model IDs.
   * @private
   */
  static #idCounter = 0;

  /**
   * Generates a unique subscription key for a specific model and property.
   * - If the model is an Object, it is assigned a persistent ID via WeakMap (`ref:m...`).
   * - If the model is a Primitive, the value is used directly (`val:...`).
   *
   * @param {object|function|string|number} model - The data model or primitive value.
   * @param {string} property - The property name being observed.
   * @returns {string} A namespaced key (e.g., `abus::ref:m1:propName`).
   */
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
   * Safely catches errors in listeners to prevent blocking other listeners.
   *
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
   * Automatically unsubscribes after the first trigger.
   *
   * @param {any} bozo - The event name/identifier.
   * @param {Function} funk - The callback function to execute once.
   * @returns {Function} An unsubscribe function (can be called before the event fires).
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

/**
 * Global singleton instance of the Bus.
 * @type {Bus}
 */
const crosstownBus = new Bus();
Object.freeze(crosstownBus);

/**
 * Static utility class for resolving dot-notation paths on objects and DOM elements.
 * Includes caching, security checks against prototype pollution, and special handling
 * for CSS variables and style properties.
 *
 * @author Holmes Bryant <https://github.com/HolmesBryant>
 * @license GPL-3.0
 * @version 1.0
 */

class PathResolver {
  /**
   * Internal LRU cache for parsed path arrays.
   * @private
   * @static
   * @type {Map<string, string[]>}
   */
  static #pathCache = new Map();

  /**
   * Maximum size of the path cache before older entries are evicted.
   * @private
   * @static
   * @type {number}
   */
  static #maxPathCacheSize = 500;

  /**
   * Retrieves path parts from cache or generates them.
   * Implements a simple Least Recently Used (LRU) eviction policy.
   *
   * @static
   * @param {string} path - The dot-notation path string.
   * @returns {string[]} An array of path segments.
   */
  static getParts(path) {
    // return cached parts if they exist
    if (this.#pathCache.has(path)) {
      const parts = this.#pathCache.get(path);
      this.#pathCache.delete(path);
      this.#pathCache.set(path, parts);
      return [...parts];
    }

    const parts = path.split('.');

    if (this.#pathCache.size >= this.#maxPathCacheSize) {
      const oldestKey = this.#pathCache.keys().next().value;
      this.#pathCache.delete(oldestKey);
    }

    this.#pathCache.set(path, parts);
    return [...parts];
  }

  /**
   * Safely retrieves a value from an object or DOM element using a path.
   * Features:
   * - CSS Variables: Returns computed value if path starts with `--`.
   * - DOM Styles: Handles `style.propertyName`, falling back to `getComputedStyle`.
   * - Nested Objects: Traverses dot notation.
   * - Security: Blocks unsafe paths (prototype pollution).
   *
   * @static
   * @param {object|HTMLElement} obj - The source object or element.
   * @param {string} path - The path to resolve.
   * @returns {any} The resolved value, or undefined.
   */
  static getValue(obj, path) {
    if (!path) return obj;

    // handle css variables (--my-var)
    if (path.startsWith('--') && obj instanceof HTMLElement) {
      return getComputedStyle(obj).getPropertyValue(path).trim();
    }

    const parts = this.getParts(path);
    if (this.isUnsafe(parts)) return undefined;

    // handle css style paths (style.backgroundColor)
    if (obj instanceof HTMLElement && parts[0] === 'style' && parts.length > 1) {
      const styleProp = parts[1];
      // look for inline style first, then try computed style
      return obj.style[styleProp] || getComputedStyle(obj)[styleProp];
    }

    // standard object path
    return parts.reduce((acc, part) => acc?.[part], obj);
  }

  /**
   * Safely sets a value on an object or DOM element using a path.
   * Features:
   * - CSS Variables: Uses `style.setProperty` if path starts with `--`.
   * - DOM Styles: Uses `style.setProperty` for kebab-case properties.
   * - Nested Objects: Traverses dot notation.
   * - Security: Blocks unsafe paths (prototype pollution).
   *
   * @static
   * @param {object|HTMLElement} target - The target object or element.
   * @param {string} path - The path to set.
   * @param {any} value - The value to assign.
   * @returns {boolean} True if assignment was successful, False otherwise.
   */
  static setValue(target, path, value) {
    if (!target || !path) return false;

    // handle css variables (--my-var)
    if (path.startsWith('--') && target instanceof HTMLElement) {
      target.style.setProperty(path, value);
      return true;
    }

    const parts = this.getParts(path);
    if (this.isUnsafe(parts)) {
      console.warn(`PathResolver: Blocked attempt to modify unsafe path "${path}"`);
      return false;
    }

    const lastProp = parts.pop();
    let current = target;

    for (const part of parts) {
      if (current[part] === undefined || current[part] === null) {
        return false; // Path does not exist on target
      }
      current = current[part];
    }

    try {
      // handle style object using setProperty (supports kebab-case)
      if (current instanceof CSSStyleDeclaration && lastProp.includes('-')) {
        current.setProperty(lastProp, value);
      } else {
        current[lastProp] = value;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Checks if a path array contains restricted keywords.
   * Blocks: `__proto__`, `constructor`, `prototype`.
   *
   * @static
   * @param {string[]} parts - The path segments.
   * @returns {boolean} True if the path is unsafe.
   */
  static isUnsafe(parts) {
    return parts.some(p => p === '__proto__' || p === 'constructor' || p === 'prototype');
  }
}

/**
 * A utility class for resolving dependencies, managing a registry of objects,
 * and retrieving DOM elements (including Shadow DOM piercing).
 * Handles loading and caching of modules and data models.
 * Features strict protocol handling, shadow DOM piercing, namespace isolation,
 * and race-condition handling via pending resolution.
 *
 * @author Holmes Bryant
 * @license GPL-3.0
 * @version 1.0
 */


class Loader {
  #domReadyPromise = null;
  #namespace = null;
  #registry = new Map();
  #pending = new Map();
  #deferred = new Map();
  #validator = null;

  /**
   * Default timeout in milliseconds for waiting for DOM elements or deferred definitions.
   * @type {number}
   */
  timeout = 2000;

  // --- Public ---

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

  /**
   * Checks if a key exists in the internal registry.
   * @param {string} key - The key to check.
   * @returns {boolean}
   */
  has(key) {
    return this.#registry.has(key);
  }

  /**
   * Main entry point to load a resource.
   * Supports:
   * - Registry lookups.
   * - Protocol specific loads (`mod:`, `dom:`).
   * - Namespace path resolution.
   * - Deferred waiting (if a definition is pending).
   * - DOM selection (fallback).
   *
   * @async
   * @param {string} key - The identifier to load.
   * @param {Node} [context=document] - The context for DOM queries.
   * @param {...any} args - Arguments to pass to the constructor if the result is a class.
   * @returns {Promise<any>} The resolved resource.
   */
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

  // --- Private ---

  /**
   * Resolves a DOM element selector.
   * Features:
   * - Waits for `DOMContentLoaded`.
   * - Supports Shadow DOM piercing via `>>>` syntax.
   * - Waits for Custom Elements to be defined.
   * - Retries until timeout.
   *
   * @private
   * @param {string} selector - The CSS selector.
   * @param {Node} context - The root node to search within.
   * @returns {Promise<Element|null>}
   */
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
        // Attempt to find the element, retry until timeout
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

  /**
   * Dynamically imports a module and instantiates it if it is a class.
   *
   * @private
   * @param {string} path - The module path.
   * @param {...any} args - Constructor arguments.
   * @returns {Promise<any>}
   */
  async #importModule(path, ...args) {
    try {
      const mod = await import(path);
      return this.#instantiate(mod.default, ...args);
    } catch (error) {
      throw new Error(`Loader: Failed to import module "${path}"`, { cause: error });
    }
  }

  /**
   * Helper to instantiate a value if it is a class constructor.
   * @private
   * @param {any} obj - The object to check.
   * @param {...any} args - Constructor arguments.
   * @returns {any} The instance or the original object.
   */
  #instantiate(obj, ...args) {
    if (typeof obj !== 'function') return obj;
    const isConstructor = obj.prototype && obj.prototype.constructor === obj;
    try { return isConstructor ? new obj(...args) : obj; } catch (e) { return obj; }
  }

  /**
   * Validates if a string is a valid import path.
   * @private
   * @param {string} path - The path to check.
   * @returns {boolean}
   */
  #isImportable(path) {
    if (this.#validator) return this.#validator(path);
    const normalized = path.replace(/\\/g, '/');
    return /^(\.\/|(?!\/\/)\/).*\.m?js$/.test(normalized);
  }

  /**
   * Routing logic for resolution strategies.
   *
   * @private
   * @param {string} key - The resource key.
   * @param {Node} context - DOM context.
   * @param {...any} args - Constructor arguments.
   * @returns {Promise<any>}
   */
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

  /**
   * Creates a pending Promise that waits for `define()` to be called with the specific key.
   * Used to handle race conditions where a consumer requests a dependency before it is registered.
   *
   * @private
   * @param {string} key - The missing key.
   * @returns {Promise<any>}
   */
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

  /**
   * Waits for a condition to become truthy, polling at a specified interval.
   * @async
   * @private
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

  // --- Getters / Setters ---

  /**
   * Returns an iterator of registered keys.
   * @returns {Iterator<string>}
   */
  get keys() { return this.#registry.keys() }

  /**
   * Sets a custom validator function for import paths.
   * @param {Function} fn - The validator function.
   */
  set validator(fn) { this.#validator = fn; }
}

/**
 * Singleton instance of the Loader.
 * @type {Loader}
 */
const loader = new Loader();
Object.freeze(loader);

/**
 * A dedicated debugging utility for a-bind instances.
 * Provides formatted console output for inspecting binding state, model values, and attributes.
 *
 * @author Holmes Bryant <https://github.com/HolmesBryant>
 * @license GPL-3.0
 * @version 1.0
 */
class Logger {
	/**
	 * The host a-bind element instance being debugged.
	 * @type {HTMLElement}
	 */
	host;

	/**
	 * Array of property names on host
	 * @type {array}
	 */
	props;

	/**
   * Creates an instance of Logger.
   * @param {HTMLElement} host - The a-bind instance to inspect.
   * @param {array} props - Array of host property names.
   */
	constructor(host, props) {
		this.host = host;
		this.props = props;
	}

	/**
   * Outputs a collapsed group of debug information to the console.
   * Includes current model value, bound element state, and configuration attributes.
   *
   * @param {string} label - The label for the console group.
   * @param {object} [object] - Optional extra data/arguments to log.
   */
	log(label, object) {
		console.groupCollapsed(label);
			console.log('Debugging: ', this.host);
			if (object) console.log('other', object);
			for (const prop of this.props) {
				console.log(`${prop} : `, this.host[prop]);
			}
		console.groupEnd();
	}
}

/**
 * @file a-bind.js
 * Data-binding for Custom Elements and ESM Modules.
 * @author Holmes Bryant <Holmes Bryant <https://github.com/HolmesBryant>
 * @license GPL-3.0
 * @version 3.5
 */


class ABind extends HTMLElement {
  #debug;
  #elemProp = 'value';
  #event = 'input';
  #func;
  #modelKey;
  #attr;
  #once = false;
  #prop;
  #pull = false;
  #push = false;
  #target;
  #throttle = 0;

  /* only relevant if model is an HTML element */
  #modelEvent = 'input';

  #abortController;
  #bound;
  #busKey;
  #updateSubscribers;
  #observer;
  #group;
  #inputTimer;
  #initIdx = 0;
  #isConnected = false;
  #model;
  #updateManager = scheduler;

  #currentValue;

  /**
   * List o
   * @static
   * @returns {string[]} ['debug', 'elem-prop', 'event', 'func', 'model', 'attr', 'once', 'prop', 'pull', 'push', 'throttle']
   */
  static observedAttributes = [
    'model',
    'prop',
    'attr',
    'elem-prop',
    'event',
    'func',
    'once',
    'pull',
    'push',
    'target',
    'throttle'
  ];


  constructor() {super(); }

  // --- Lifecycle ---

  /**
   * Called when an observed attribute has been added, removed, updated, or replaced.
   * Parses attributes and re-#initializes binding if needed.
   * @param {string} attr - The attribute name.
   * @param {string} oldval - The old value.
   * @param {string} newval - The new value.
   */
  attributeChangedCallback(attr, oldval, newval) {
    if (oldval === newval) return;
    switch (attr) {
      case 'elem-prop':
        this.#elemProp = newval;
        break;
      case 'event':
        this.#event = newval;
        break;
      case 'func':
        this.#func = newval;
        break;
      case 'model':
        this.#modelKey = newval;
        // model is resolved in reinit();
        break;
      case 'attr':
        this.#attr = newval;
        break;
      case 'once':
        this.#once = this.hasAttribute('once');
        break;
      case 'prop':
        this.#prop = newval;
        break;
      case 'pull':
        this.#pull = this.hasAttribute('pull');
        break;
      case 'push':
        this.#push = this.hasAttribute('push');
        break;
      case 'target':
        this.#target = newval;
        break;
      case 'throttle':
        this.#throttle = parseInt(newval) || 0;
        break;
    }

    if (this.#isConnected && ['model', 'prop', 'attr'].includes(attr)) {
      this.#updateManager.defer(this, null, () => {
        if (this.#isConnected) this.#reinit();
      }, this);
    }
  }

  /**
   * Called when the element is connected to the DOM.
   * Sets up MutationObservers to wait for child elements and #initializes bindings.
   */
  connectedCallback() {
    this.#isConnected = true;

    // If 'model' was set before upgrade, reset it to trigger the setter.
    if (this.hasOwnProperty('model')) {
      let value = this.model;
      delete this.model;
      this.model = value;
    }

    this.#observer = new MutationObserver(() => this.#handleMutation());

    // check if there's a bound element already
    const bound = this.#getBoundElement();

    if (!bound && !this.target) {
      console.debug('a-bind: Waiting for valid child.');
      this.#observer.observe(this, { childList: true, subtree: true });
    } else {
      this.#init();
    }
  }

  /**
   * Called when the element is disconnected from the DOM.
   * Cleans up observers, event listeners, and pending throttle timers.
   */
  disconnectedCallback() {
    this.#teardown();
    if (this.#group) this.#group.unregister(this);
    if (this.#observer) this.#observer.disconnect();
    this.#updateSubscribers = null;
    this.#isConnected = false;
    this.#model = null;
    this.#bound = null;
    this.log?.('disconnectedCallback()', this.#logProps());
  }

  // -- Static --

  /**
   * Static helper to announce an update to the global event bus.
   * Useful for manually triggering updates from outside the element.
   *
   * @param {object|string} model - The model object or identifier.
   * @param {string} property - The property name on the model.
   * @param {any} value - The new value.
   */
  static update(model, property, value) {
    const key = Bus.getKey(model, property);
    crosstownBus.announce(key, value);
  }

  // -- Public --

  /**
   * Main entry point for applying updates to the DOM or Model.
   * Handles attribute binding, boolean updates, CSS variables, and nested paths.
   *
   * @param {HTMLElement} target - The element to update.
   * @param {string} name - The property, attribute, or CSS variable name.
   * @param {any} value - The value to apply.
   * @returns {void}
   */
  applyUpdate(target, name, value) {
    if (!this.#isConnected || !target || typeof name !== 'string') return;

    // Check if the target is the focused element within its own scope (Document or ShadowRoot).
    // This prevents loopback updates from resetting the caret while typing.
    if (target.getRootNode) {
      const root = target.getRootNode();
      if (root.activeElement === target && target.isContentEditable) {
        return;
      }
    }


    // Bind to attribute of bound element
    if (name.startsWith('$')) {
      const attrName = name.slice(1);

      // Handle removal for null/undefined/false
      if (value === null || value === undefined || value === false) {
        target.removeAttribute(attrName);
      } else {
        // Handle boolean attributes (true becomes empty string: disabled="")
        const attrValue = (value === true) ? '' : String(value);
        target.setAttribute(attrName, attrValue);
      }

      this.log?.('#applyUpdate()', this.#logProps({target, name, value}));
      return;
    }

    // Boolean update logic
    if (target instanceof HTMLElement && (target.type === 'checkbox' || target.type === 'radio')) {
      if (name === 'checked' || name === this.#elemProp) {
        this.log?.('#applyUpdate()', this.#logProps({target, name, value}));
        return this.#handleBooleanUpdate(target, value);
      }
    }

    // CSS variables
    if (name.startsWith('--') && target.style) {
      this.log?.('#applyUpdate()', this.#logProps({target, name, value}));
      return target.style.setProperty(name, value);
    }

    // Nested paths
    if (name.includes('.')) {
      this.log?.('#applyUpdate()', this.#logProps({target, name, value}));
      return this.#handleNestedUpdate(target, name, value);
    }

    // Prevent "selectedOptions" from triggering list replacement.
    // Redirect it to "value" to handle multi-selection updates correctly.
    if (target instanceof HTMLSelectElement && name === 'selectedOptions') {
      name = 'value';
    }

    if (target instanceof HTMLSelectElement && target.multiple && name === 'value') {
      if (value === null || value === undefined) value = [];
      const values = Array.isArray(value) ? value : [String(value)];
      for (const option of target.options) {
        const optVal = option.value || option.text;
        option.selected = values.includes(optVal);
      }
      this.log?.('#applyUpdate()', this.#logProps({target, name, value}));
      return;
    }

    // Standard property/attribute
    const parsedValue = this.#parsedValue(value, target);

    if (name in target) {
      try {
        target[name] = parsedValue;
        // browser prevented setting value because invalid value.
        // try converting value to float.
        if ((target.type === 'number' || target.type === 'range') && !target[name]) {
          const val = parseFloat(parsedValue.replace(/[^.\d]/g, ''));
          target[name] = val;
        }
      } catch (error) {
        target.setAttribute(name, value);
      }
    } else {
      if (value === null || value === undefined) {
        target.removeAttribute(name);
      } else {
        target.setAttribute(name, value);
      }
    }

    this.log?.('#applyUpdate()', this.#logProps({target, name, value}));
  }

  // -- Private --

  /**
   * Sets up event listeners on the bound element (View -> Model) and
   * subscriptions to the Bus (Model -> View).
   * @private
   */
  #addListeners() {
    if (!this.#model) {
      return console.warn('a-bind.addListeners(): No model present, aborting.', this)
    }

    const prop = this.#prop || this.#attr;

    // Element -> Model (Event)
    if (!this.#pull) {
      this.log?.('#addListeners() : event', this.#logProps({event: this.#event}));
      this.#bound.addEventListener(this.#event, event => {
        let value = this.#bound[this.#elemProp];
        const isCheckbox = this.#bound instanceof HTMLInputElement && this.#bound.type === 'checkbox';

        // checkbox Array Mutation OR Boolean Toggle
        if (isCheckbox && this.#model) {
          const currentModelVal = this.#getPropertyValue(this.#model, prop);

          if (Array.isArray(currentModelVal)) {
            const boxValue = this.#bound.value;
            const isChecked = this.#bound.checked;
            // Clone array to trigger immutability detection/reactivity
            value = isChecked ?
              [...currentModelVal, boxValue] :
              currentModelVal.filter(item => item !== boxValue);
          } else if (typeof currentModelVal === 'boolean') {
            // If boolean, ignore 'value' attribute and toggle state
            value = this.#bound.checked;
          } else if (!this.#bound.checked) {
            // even if bound element has a value, if not checked set value to null
            value = null;
          }
        }

        // Multi-select
        if (this.#bound instanceof HTMLSelectElement && this.#bound.multiple) {
          value = Array.from(this.#bound.selectedOptions).map(option => option.value || option.text);
        }

        this.#updateModel(value, event);
      }, { signal: this.#abortController.signal });
    }

    // Model -> Element (Observer)
    if (!this.#push && !this.#once) {
      // Subscribe to pub/sub
      crosstownBus.hopOn(this.#busKey, this.#updateSubscribers);
      this.log?.('#addListeners() : subscribe', this.#logProps());

      // If model is an html element
      if (this.#model.addEventListener) {
        this.#model.addEventListener(this.#modelEvent, event => {
          if (event.target === this.#bound || event.composedPath().includes(this.#bound)) {
            return;
          }
          const prop = this.#prop || this.#attr;
          const value = this.#getPropertyValue(this.#model, prop);
          this.applyUpdate(this.#bound, this.#elemProp, value);
        }, { signal: this.#abortController.signal });

        this.log?.('#addListeners()', this.#logProps({elem:this.#model, event: this.#modelEvent}));
      }

    }
  }

  /**
   * attaches a Logger instance for debugging.
   * @private
   * @returns {Promise<Function>} A logging function wrapper.
   */
  async #attachLogger() {
    const publicProps = [];
    for (const prop of ABind.observedAttributes) {
      publicProps.push(prop.replace(/-./g, x => x[1].toUpperCase()));
    }
    publicProps.push('modelValue');
    publicProps.push('boundValue');
    // publicProps
    try {
      const logger = new Logger(this, publicProps);
      return (label, obj) => {
        logger.log(label, obj);
      }
    } catch (error) {
      console.warn('a-bind.attachLogger() Failed', error);
    }
  }

  /**
   * Determines if a specific HTML element can accept child nodes.
   * Used to pause MutationObservers during updates.
   *
   * @private
   * @param {HTMLElement} elem - The element to check.
   * @returns {boolean} True if the element is not a void element.
   */
  #canHaveChildren(elem) {
    // Text nodes and Comments cannot have children
    if (elem.nodeType !== Node.ELEMENT_NODE) return false;

    const voidElements = [
      'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
      'link', 'meta', 'param', 'source', 'track', 'wbr'
    ];
    return !voidElements.includes(elem.localName);
  }

  /**
   * Executes a specific function defined on the model when an event occurs.
   * Used when the 'func' attribute is present.
   *
   * @private
   * @param {Event} event - The DOM event triggered.
   */
  #executeFunction(event) {
    if (!this.#func) return;
    let context;

    try {
      const parts = PathResolver.getParts(this.#func);
      const fnName = parts.pop();

      if (parts.length > 0) {
        const contextPath = parts.join('.');
        context = this.#getPropertyValue(this.#model, contextPath);
      } else {
        context = this.#model;
        if (typeof context[fnName] !== 'function') {
          console.warn(`${fnName}() not found in model. Execution blocked.`);
        }
      }

      if (context && typeof context[fnName] === 'function') {
        context[fnName].call(context, event, this.#bound, this.#model);
      } else {
        console.warn(`a-bind: Function ${this.#func} not found.`);
      }
    } catch (error) {
      console.error('a-bind: executeFunction()', error);
    }

    this.log?.('#executeFunction()', this.#logProps({event}));
  }

  /**
   * Locates the valid child element to bind to.
   * Drills down through templates or nested <a-bind> elements to find the real target.
   *
   * @private
   * @returns {HTMLElement|null} The target element.
   */
  #getBoundElement() {
    const findTarget = (root) => {
      let child = root.firstElementChild;

      while (child) {
        // Skip templates
        if (child.localName === 'template') {
          child = child.nextElementSibling;
          continue;
        }

        // If it is another a-bind, drill down to find the real element.
        if (child.localName === 'a-bind') {
          const deepTarget = findTarget(child);
          // If the nested bind has a target, return it.
          // If not, keep looking at siblings.
          if (deepTarget) return deepTarget;
        }
        // If it is NOT an a-bind, it is our target
        else {
          return child;
        }

        child = child.nextElementSibling;
      }

      return null;
    };

    const element = findTarget(this);
    this.log?.('#getBoundElement()', this.#logProps({element: element}));
    return element;
  }

  /**
   * safe getter for nested object properties (e.g. user.name).
   *
   * @private
   * @param {object} obj - The source object.
   * @param {string} path - The dot-notation path.
   * @returns {any} The resolved value.
   */
  #getPropertyValue(obj, path) {
    this.log?.('#getPropertyValue()', this.#logProps({obj, path}));
    const value = PathResolver.getValue(obj, path);
    return (value !== undefined) ? value : obj?.getAttribute?.(path);
  }


  /**
   * Handles logic for Radio and Checkbox 'checked' state updates.
   * Supports boolean toggles and array mutations (for multi-select).
   *
   * @private
   * @param {HTMLInputElement} target - The checkbox or radio input.
   * @param {any} value - The value from the model.
   */
  #handleBooleanUpdate(target, value) {
    const modelValue = this.#parsedValue(value, target);
    let comparisonValue;

    if (this.#elemProp === 'checked') {
      comparisonValue = target.hasAttribute('value')
        ? this.#parsedValue(target.getAttribute('value'), target)
        : true;
    } else {
      comparisonValue = (this.#elemProp in target)
        ? target[this.#elemProp]
        : target.getAttribute(this.#elemProp);
      comparisonValue = this.#parsedValue(comparisonValue, target);
    }

    // Support Array.includes for Multi-Select Checkboxes
    if (Array.isArray(modelValue) && target.type === 'checkbox') {
      target.checked = modelValue.includes(comparisonValue);
    } else if (typeof modelValue === 'boolean' && target.type === 'checkbox') {
      // Support strict Boolean binding (ignoring value attribute)
      target.checked = modelValue;
    } else {
      target.checked = (modelValue === comparisonValue);
    }

    this.log?.('#handleBooleanUpdate()', this.#logProps({target, value}));
  }

  /**
   * Handles DOM mutations (children added/removed).
   * Re-syncs the model value to the view if the bound element changes.
   * @private
   */
  #handleMutation() {
    if (!this.isConnected) return;

    // wait for child
    if (!this.#bound && this.firstElementChild) {
      this.#observer.disconnect();
      this.#init();
      return;
    }

    // DOM change. re-sync model -> view
    if (this.#bound && this.#model) {
      // stop watching temporarily to prevent infinite loops
      this.#observer.disconnect();
      try {
        const prop = this.#prop || this.#attr;
        const val = this.#getPropertyValue(this.#model, prop);

        // re-apply model value to DOM
        this.applyUpdate(this.#bound, this.#elemProp, val);
      } finally {
        // start watching again
        if (this.#canHaveChildren(this.#bound)) {
          this.#observer.observe(this.#bound, { childList: true });
        }
      }
    }
  }

  /**
   * Handles updates for nested paths on the DOM element (e.g., style.color).
   *
   * @private
   * @param {HTMLElement} target - The target element.
   * @param {string} name - The nested path string.
   * @param {any} value - The value to set.
   */
  #handleNestedUpdate(target, name, value) {
    this.log?.('#handleNestedUpdate()', this.#logProps({target, name, value}));
    const parts = PathResolver.getParts(name);
    if (PathResolver.isUnsafe(parts)) {
      console.warn(`a-bind: Blocked attempt to modify unsafe path "${name}"`);
      return;
    }

    const lastProp = parts.pop();
    let current = target;

    for (const part of parts) {
      if (current[part] === undefined || current[part] === null) {
        // ONLY fallback to setAttribute if we aren't dealing with styles.
        if (!name.startsWith('style.') && typeof target.setAttribute === 'function') {
          target.setAttribute(name, value);
        }
        return;
      }

      current = current[part];
    }

    try {
      if (current instanceof CSSStyleDeclaration) {
        // if it has a dash use setProperty, otherwise set the property directly.
        if (lastProp.includes('-')) {
          current.setProperty(lastProp, value);
        } else {
          current[lastProp] = value;
        }
      } else {
        current[lastProp] = this.#parsedValue(value, target);
      }
    } catch (error) {
      console.warn(`a-bind: Failed to set nested property "${name}"`, error);
    }
  }

  /**
   * Main initialization logic.
   * Resolves the model, target, group, and sets up subscribers.
   * @private
   * @returns {Promise<void>}
   */
  async #init() {
    const gen = this.#initIdx;
    if (this.#shouldBail(gen)) return;
    if (this.debug && !this.log) this.log = await this.#attachLogger();
    this.log?.('#init()', this.#logProps());

    // Attempt to resolve model. This will wait (via Loader) if the model is pending.
    const modelReady = await this.#resolveModel(gen);

    if (!modelReady) return;
    if (this.#shouldBail(gen)) return;

    if (!this.#resolveGroup()) return;

    // resolveGroup() might trigger a model setter which triggers reinit().
    // If that happened, initIdx has changed. bail to prevent duplicate listeners/errors.
    if (this.#shouldBail(gen)) return;

    this.#abortController = new AbortController();

    if (!this.bound && this.#target) {
      this.bound = await this.#resolveTarget(this.#target);
    } else {
      this.bound = this.#getBoundElement();
    }

    const prop = this.#prop || this.#attr;
    this.#busKey = Bus.getKey(this.#model, prop);
    this.#updateSubscribers = this.#updateBound.bind(this);

    this.#syncView();
    this.#addListeners();
  }

  #logProps(method_args = {}) {
    return {
      method_args,
      bound: this.#bound,
      busKey: this.#busKey,
      group: this.#group,
      initIdx: this.#initIdx,
      isConnected: this.#isConnected,
      model: this.#model,
    }
  }

  /**
   * Parses and coerces values based on the target element type.
   * Converts strings 'true'/'false' to booleans for checkboxes/radios.
   *
   * @private
   * @param {any} value - The raw value.
   * @param {HTMLElement} target - The target element.
   * @returns {any} The parsed value.
   */
  #parsedValue(value, target) {
    // Only coerce strings to boolean if the target is a Checkbox or Radio
    if (target instanceof HTMLInputElement && (target.type === 'checkbox' || target.type === 'radio')) {
      if (value === 'true') value = true;
      if (value === 'false') value = false;
    }
    if (value === null || value === undefined) value = '';
    this.log?.('#parsedValue()', this.#logProps({value, target}));
    return value;
  }

  /**
   * Tears down existing bindings and re-runs initialization.
   * Used when critical attributes (like model or prop) change.
   * @private
   */
  async #reinit() {
    this.log?.('#reinit()', this.#logProps());
    this.#initIdx++;
    this.#teardown();
    await this.#init();
  }

  /**
   * Checks for a parent <a-bindgroup> and registers this element with it.
   *
   * @private
   * @returns {boolean} False if waiting for group data, True otherwise.
   */
  #resolveGroup() {
    this.#group = this.closest('a-bindgroup');

    if (this.#group) {
      this.#group.register(this);
    }

    if (
      this.#group &&
      (!this.#model ||
        (!this.#prop && !this.#attr && !this.#func)
      )
    ) {
      this.log?.('#resolveGroup(): Waiting for group to provide model or property', this.#logProps());
      return false;
    }

    this.log?.('#resolveGroup()', this.#logProps());
    return true;
  }

  /**
   * Resolves the model object using the Loader.
   * Handles 'this', string keys, and deferred loading.
   *
   * @private
   * @param {number} idx - The generation index for race condition checking.
   * @returns {Promise<boolean>} True if model resolved, false if failed.
   */
  async #resolveModel(idx) {

    if (this.#model && !this.#modelKey) {
      this.#modelKey = Object.getPrototypeOf(this.#model).constructor.name;
      this.log?.('#resolveModel()', this.#logProps({idx}));
      return true;
    }

    if (!this.#modelKey) return true; // Deferred to ABindgroup or ARepeat

    // If bindings are in a custom element's shadow dom
    if (this.#modelKey === "this") {
      this.#model = await loader.load(this.getRootNode().host, this);
      this.#modelKey = Object.getPrototypeOf(this.#model).constructor.name;
      this.log?.('#resolveModel()', this.#logProps({idx}));
      return true;
    }

    try {
      if (!this.#model) this.#model = await loader.load(this.#modelKey, this);
      this.log?.('#resolveModel()', this.#logProps({idx}));
      return true;
    } catch (error) {
      console.error(`a-bind: Failed to load model "${this.#modelKey}"`, error, this);
      return false;
    }
  }

  /**
   * Resolves a custom target selector using the Loader.
   *
   * @private
   * @param {string} selector - The selector string.
   * @returns {Promise<HTMLElement>} The resolved element.
   */
  async #resolveTarget(selector) {
    this.log?.('#resolveTarget()', this.#logProps({selector}));
    try {
      return await loader.load(selector, this);
    } catch (error) {
      console.error(`a-bind: Failed to load target element. ${this.target}`, this, error);
      return;
    }
  }

  /**
   * Checks if initialization should abort due to race conditions or disconnection.
   *
   * @private
   * @param {number} idx - The generation index at the start of the async process.
   * @returns {boolean} True if the process should stop.
   */
  #shouldBail(idx) {
    return (this.#initIdx !== idx || !this.#isConnected);
  }

  /**
   * Pushes the current Model value to the DOM (View).
   * @private
   */
  #syncView() {
    if (this.#push) return;
    const value = (this.#prop) ?
      this.#getPropertyValue(this.#model, this.#prop) :
      this.#model.getAttribute?.(this.#attr);

    // if () console.log(this.#bound, this.#elemProp, value)
    if (value !== undefined) {
      try {
        this.applyUpdate(this.#bound, this.#elemProp, value);
      } catch (error) {
        console.error('a-bind.syncView(): Failed', error, this);
      }
    }

    // Observe content changes made after initial parse
    if (this.#canHaveChildren(this.#bound)) {
      this.#observer.disconnect();
      this.#observer.observe(this.#bound, { childList: true });
    }

    this.log?.('#syncView()', this.#logProps());
  }

  /**
   * Cleans up subscriptions, abort controllers, and pending scheduler tasks.
   * @private
   */
  #teardown() {
    crosstownBus.hopOff(this.#busKey, this.#updateSubscribers);

    if (this.#abortController) {
      this.#abortController.abort();
      this.#abortController = null;
    }

    if (this.#inputTimer) {
      clearTimeout(this.#inputTimer);
      this.#inputTimer = null;
    }

    this.#updateManager.cancel(this);
    if (this.#busKey) {
      this.#updateManager.cancel(`abind-update::${this.#busKey}`);
    }
    this.log?.('#teardown()', this.#logProps());
  }

  /**
   * Callback for Bus subscriptions.
   * Schedules a DOM update via the UpdateManager.
   *
   * @private
   * @param {any} value - The new value from the Bus.
   */
  #updateBound(value) {
    this.log?.('#updateBound()', this.#logProps({value}));
    this.#updateManager.defer(this, value, (val) => {
      this.applyUpdate(this.#bound, this.#elemProp, val);
    }, this);
  }

  /**
   * Handles View -> Model updates (e.g., input events).
   * Parses values, handles throttling, and announces changes to the Bus.
   *
   * @private
   * @param {any} value - The value from the DOM element.
   * @param {Event} event - The triggering event.
   */
  #updateModel(value, event) {
    const prop = this.#prop || this.#attr;

    // auto convert text values that look like objects or arrays
    if (typeof value === 'string' && (value.includes('[') || value.includes('{'))) {
      try {
        value = JSON.parse(value);
      } catch (error) {
        // pass through
      }
    }

    // Use the identity 'value' if present, otherwise stick to boolean 'checked'
    const isRadio = this.#bound instanceof HTMLInputElement && this.#bound.type === 'radio';
    if (isRadio && this.#elemProp === 'checked' && this.#bound.hasAttribute('value')) {
      value = this.#bound.value;
    }

    // Use key for Scheduler to ensure batching works
    // For functions, use 'this' to prevent batching different elements calling different functions
    const taskKey = this.#func ? this : `abind-update::${this.#busKey}`;
    // const taskKey = `abind-update::${this.#busKey}`;

    const doUpdate = (newValue) => {
      if (this.#func) return this.#executeFunction(event);

      const currentValue = this.#getPropertyValue(this.#model, prop);
      const hasChanged = this.#parsedValue(newValue, this.#bound) !== this.#parsedValue(currentValue, this.#bound);
      if (hasChanged && newValue !== undefined) {
        this.applyUpdate(this.#model, prop, newValue);
        crosstownBus.announce(this.#busKey, newValue);
      }
    };

    if (this.#throttle > 0) {
      if (this.#inputTimer) clearTimeout(this.#inputTimer);
      this.#inputTimer = setTimeout(() => {
        this.#updateManager.defer(taskKey, value, doUpdate);
        this.#inputTimer = null;
        console.log('throttled', this.#throttle);
      }, this.#throttle);
    } else {
      this.#updateManager.defer(taskKey, value, doUpdate, this);
    }

    this.log?.('#updateModel()', this.#logProps({value, event}));
  }

  // -- Getters / Setters --

  /**
   * Checks if debug mode is enabled.
   * @returns {boolean}
   */
  get debug() { return this.hasAttribute('debug') }
  set debug(value) { this.toggleAttribute('debug', true); }

  /**
   * Returns the shared Bus instance.
   * @returns {Bus}
   */
  get bus() { return crosstownBus }

  /**
   * Returns the computed unique key for the Bus subscription.
   * @returns {string}
   */
  get busKey() { return this.#busKey }

  /**
   * Returns the model's property name or attribute name being bound.
   * @returns {string}
   */
  get property() { return this.#prop || this.#attr }
  get boundValue() { return PathResolver.getValue(this.bound, this.elemProp) }
  get modelValue() { return PathResolver.getValue(this.model, this.property) }
  // get modelValue() { return [this.model, this.property] }

  /**
   * Gets or sets the actual DOM element being bound.
   * @type {HTMLElement}
   */
  get bound() { return this.#bound }
  set bound(value) {
    if (value instanceof HTMLElement) {
      this.#bound = value;
    } else {
      console.error('a-bind: Bound element must be HTML element', value, this);
    }
  }

  /**
   * Gets the model key string (attribute value).
   * Sets the 'model' attribute.
   * @type {string}
   */
  get modelKey() { return this.#modelKey }
  set modelKey(value) { this.setAttribute('model', value); }

  /**
   * Gets/Sets the 'elem-prop' attribute.
   * Defines which property on the DOM element to bind to (e.g., 'value', 'checked').
   * @type {string}
   */
  get elemProp() { return this.#elemProp }
  set elemProp(value) { this.setAttribute('elem-prop', value); }

  /**
   * Gets/Sets the 'event' attribute.
   * Defines which DOM event triggers a model update (default: 'input').
   * @type {string}
   */
  get event() { return this.#event }
  set event(value) { this.setAttribute('event', value); }

  /**
   * Gets/Sets the 'func' attribute.
   * If set, this function is called instead of updating a property.
   * @type {string}
   */
  get func() { return this.#func }
  set func(value) { this.setAttribute('func', value); }

  /**
   * Gets or sets the Model object.
   * If a string is passed, it sets the attribute. If an object is passed, it sets the internal instance.
   * @type {object|string}
   */
  get model() { return this.#model }
  set model(value) {
    if (typeof value === 'function' || typeof value === 'object' && value !== null) {
      this.#model = value;
      if (this.#isConnected) this.#reinit();
    } else {
      this.setAttribute('model', value);
    }
  }

  /**
   * Gets/Sets the 'attr' attribute.
   * Used when binding to a model that is also an HTML element (attribute binding).
   * @type {string}
   */
  get attr() { return this.#attr }
  set attr(value) { this.setAttribute('attr', value); }

  /**
   * Gets/Sets the 'once' attribute.
   * If true, binding is one-time only (no listeners).
   * @type {boolean}
   */
  get once() { return this.#once }
  set once(value) { this.toggleAttribute('once', value !== false); }

  /**
   * Gets/Sets the 'prop' attribute.
   * The property name on the model object.
   * @type {string}
   */
  get prop() { return this.#prop }
  set prop(value) { this.setAttribute('prop', value); }

  /**
   * Gets/Sets the 'pull' attribute.
   * If true, data only flows Model -> View (one-way).
   * @type {boolean}
   */
  get pull() { return this.#pull }
  set pull(value) { this.toggleAttribute('pull', value !== false); }

  /**
   * Gets/Sets the 'push' attribute.
   * If true, data only flows View -> Model (one-way).
   * @type {boolean}
   */
  get push() { return this.#push }
  set push(value) { this.toggleAttribute('push', value !== false); }

  /**
   * Gets/Sets the 'throttle' attribute.
   * Time in milliseconds to debounce/throttle input events.
   * @type {number}
   */
  get throttle() { return this.#throttle }
  set throttle(value) { this.setAttribute('throttle', parseInt(value) ||0); }

  /**
   * Gets/Sets the 'target' attribute.
   * A CSS selector to find the element to bind to (if not a direct child).
   * @type {string}
   */
  get target() { return this.#target }
  set target(value) { this.setAttribute('target', value); }
}

globalThis[Symbol.for('abind.update')] = ABind.update;

if (!customElements.get('a-bind')) customElements.define('a-bind', ABind);

export { Logger, PathResolver, crosstownBus, ABind as default, loader, scheduler };
