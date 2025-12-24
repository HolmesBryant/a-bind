/**
 * @file a-bind.js
 * @description specific Data-binding for Custom Elements and ESM Modules.
 *              Features MutationObserver support, batched DOM updates via requestAnimationFrame,
 *              and intelligent throttling (Input Debounce / Output Rate Limiting).
 * @author Holmes Bryant <Holmes Bryant <https://github.com/HolmesBryant>
 * @version 2.6.0
 * @license GPL-3.0
 */

import { globalUpdateManager } from './UpdateManager.js';
import { crosstownBus } from './Bus.js';
import loader from './loader.js';
import ABindgroup from './a-bindgroup.js';

export { globalUpdateManager, crosstownBus, loader, ABindgroup };

/**
 * A Custom Element (<a-bind>) that provides two-way data binding between
 * JavaScript models/variables and DOM elements.
 *
 * @extends HTMLElement
 *
 * @note If you need a global handle, use this example
 * @example
 * <script type="module">
 *  import ABind from './a-bind.min.js';
 *  window.abind = ABind;
 * </script>
 */
export default class ABind extends HTMLElement {
  #elemAttr = 'value';
  #event = 'input';
  #func;
  #modelKey;
  #modelAttr;
  #once = false;
  #property;
  #pull = false;
  #push = false;
  #throttle = 0;

  #abortController;
  #bound;
  #busKey;
  #updateSubscribers;
  #childObserver;
  #group;
  #inputTimer;
  #isInitializing = true;
  #isConnected = false;
  #model;
  #updateManager = globalUpdateManager;

  static #pathCache = new Map();
  static #maxPathCacheSize = 500;

  /**
   * List o
   * @static
   * @returns {string[]} ['debug', 'elem-attr', 'event', 'func', 'model', 'model-attr', 'once', 'property', 'pull', 'push', 'throttle']
   */
  static observedAttributes = [
    'elem-attr',
    'event',
    'func',
    'model',
    'model-attr',
    'once',
    'property',
    'pull',
    'push',
    'throttle'
  ];


  constructor() { super(); }

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
      case 'elem-attr':
        this.#elemAttr = newval;
        break;
      case 'event':
        this.#event = newval;
        break;
      case 'func':
        this.#func = newval;
        break;
      case 'model':
        this.#modelKey = newval;
        break;
      case 'model-attr':
        this.#modelAttr = newval;
        break;
      case 'once':
        this.#once = this.hasAttribute('once');
        break;
      case 'property':
        this.#property = newval;
        break;
      case 'pull':
        this.#pull = this.hasAttribute('pull');
        break;
      case 'push':
        this.#push = this.hasAttribute('push');
        break;
      case 'throttle':
        this.#throttle = parseInt(newval) || 0;
        break;
    }

    if (this.#isConnected && ['model', 'property', 'model-attr'].includes(attr)) {
      this.#updateManager.queue(this, null, () => {
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

    // if a-bind was inserted into DOM programatically without first appending child element
    if (!this.firstElementChild) {
      console.warn('a-bind: waiting for child element')
      this.#childObserver = new MutationObserver(() => {
        if (this.#isConnected && this.firstElementChild) {
          this.#childObserver.disconnect();
          this.#childObserver = null;
          this.#init();
        }
      });

      this.#childObserver.observe(this, { childList: true });
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
    if (this.#childObserver) this.#childObserver.disconnect();
    this.#updateSubscribers = null;
    this.#isConnected = false;
    this.#model = null;
    this.#bound = null;
  }

  // -- Static --

  static #modelIds = new WeakMap();
  static #idCounter = 0;

  /**
   * Generates a deterministic string key for the Bus.
   * Handles both string identifiers and object instances.
   * @param {string|Object} model - The model identifier or instance.
   * @param {string} property - The property path.
   * @returns {string}
   */
  static getBusKey(model, property) {
    let modelId  = ABind.#modelIds.get(model);
    if (!modelId) {
      modelId = `m${++ABind.#idCounter}`;
      ABind.#modelIds.set(model, modelId);
    }
    return `${modelId}:${property}`;
  }

  /**
   * Retrieves path parts from cache or generates them.
   * Uses LRU logic to prevent memory exhaustion.
   */
  static #getPathParts(path) {
    // Check if path is already cached
    if (ABind.#pathCache.has(path)) {
      const parts = ABind.#pathCache.get(path);

      // LRU Move item to end of Map:
      ABind.#pathCache.delete(path);
      ABind.#pathCache.set(path, parts);

      return [...parts];
    }

    // Generate the value. Prevent mutation
    // const parts = Object.freeze(path.split('.'));
    const parts = path.split('.');

    // If cache is full, remove the oldest item.
    if (ABind.#pathCache.size >= ABind.#maxPathCacheSize) {
      const oldestKey = ABind.#pathCache.keys().next().value;
      ABind.#pathCache.delete(oldestKey);
    }

    // Cache the new result
    ABind.#pathCache.set(path, parts);
    return parts;
  }

  static update(model, property, value) {
    const key = ABind.getBusKey(model, property);
    crosstownBus.announce(key, value)
  }

  // -- Private --

  #addListeners() {
    const prop = this.#property || this.#modelAttr;

    // Element -> Model (Event)
    if (!this.#pull) {
      this.#bound.addEventListener(this.#event, event => {
        const value = this.#bound[this.#elemAttr];
        this.#updateModel(value, event);
      }, {signal:this.#abortController.signal});
    }

    // Model -> Element (Observer)
    if (!this.#push || !this.#once) {
      crosstownBus.hopOn(this.#busKey, this.#updateSubscribers);

      if (this.#model.addEventListener) {
        // If model is an input or select element
        this.#model.addEventListener('change', event => {
          const prop = this.#property || this.#modelAttr;
          const value = this.#getPropertyValue(this.#model, prop);
          this.#applyUpdate(this.#bound, this.#elemAttr, value);
        }, {signal:this.#abortController.signal});

      }
    }
  }

  /**
   * Sets a value on a target (Element, Custom Element, or Plain Object).
   * Prioritizes properties, handles nested paths, and falls back to attributes only for DOM elements.
   */
  #applyUpdate(target, name, value) {
    if (!this.#isConnected || !target || typeof name !== 'string') return;

    // is target a Select or Datalist element?
    const isList = target instanceof HTMLSelectElement || target instanceof HTMLDataListElement;
    if (isList) {
      let items = null;

      // handle Array input
      if (Array.isArray(value)) {
        items = value;
      }
      // handle comma separated values
      else if (typeof value === 'string' && value.includes(',')) {
        items = value.split(',').map(s => s.trim()).filter(Boolean);
      }
      // handle single string (no comma) as a single option
      else if (typeof value === 'string') {
        items = [value.trim()];
      }

      if (items) {
        this.#setOptions(target, items);
        return;
      }
    }

    // Handle CSS Variables
    if (name.startsWith('--') && target.style) {
      target.style.setProperty(name, value);
      return;
    }

    // Handle Nested Paths (e.g., 'style.color', 'config.theme.dark')
    if (name.includes('.')) {
      // clone to avoid mutating cache
      const parts = ABind.#getPathParts(name);
      const lastProp =  parts.pop();
      let current = target;

      for (const part of parts) {
        if (current[part] === undefined || current[part] === null) {
          if (typeof target.setAttribute === 'function') {
            target.setAttribute(name, value);
          }
          return;
        }

        current = current[part];
      }

      try {
        if (current instanceof CSSStyleDeclaration) {
          current.setProperty(lastProp, value);
        } else {
          current[lastProp] = value;
        }

      } catch (error) {
        console.warn(`a-bind: Failed to set nested property "${name}"`, error);
      }

      return;
    }

    // Main Logic: Property vs Attribute fallback
    const isElement = typeof target.setAttribute === 'function';

    if (name in target) {
      // It's a property
      try {
        target[name] = value;
      } catch (error) {
        // Fallback for read-only properties on elements
        console.debug('target property might be read-only, setting Attribute instead.');
        if (isElement) target.setAttribute(name, value);
      }
    } else if (isElement) {
      // It's not a property, but it is an element: set as attribute
      if (value === null || value === undefined) {
        target.removeAttribute(name);
      } else {
        target.setAttribute(name, value);
      }
    }
  }

  #executeFunction(event) {
    if (!this.#func) return;
    let context;

    try {
      const parts = ABind.#getPathParts(this.#func);
      // don't pop!
      const fnName = parts[parts.length - 1];

      if (parts.length > 1) {
        const contextPath = parts.slice(0, -1).join('.');
        context = this.#getPropertyValue(this.#model, contextPath);
        if (!context || typeof context[fnName] !== 'function') {
          context = this.#getPropertyValue(window, contextPath);
        }
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
  }

  #getBoundElement() {
    let element = this;
    // handle bound elements inside nested a-bind instances
    while (element && element.localName === 'a-bind') {
      element = element.firstElementChild;
    }
    return element;
  }

  /**
   * Accounts for nested properties ie. user.name
   */
  #getPropertyValue(obj, path) {
    if (!path) return obj;
    const parts = ABind.#getPathParts(path);
    if (this.#isUnsafePath(parts)) return undefined;
    return parts.reduce((acc, part) => acc && acc[part], obj);
  }

  async #init() {

    if (this.#model) {
      this.#modelKey = Object.getPrototypeOf(this.#model).constructor.name;
    } else if (this.#modelKey) {
      this.#model = await loader.load(this.#modelKey);
    } else {
      throw new Error('a-bind: #init: No model found');
    }

    // Check if inside a group
    this.#group = this.closest('a-bindgroup');
    if (this.#group) await this.#group.register(this);

    this.#abortController = new AbortController();
    this.bound = this.#getBoundElement();
    const prop = this.#property || this.#modelAttr;
    this.#busKey = ABind.getBusKey(this.#model, prop);
    this.#updateSubscribers = this.#updateBound.bind(this);

    if (!this.#push) {
      // initial sync Model => Bound
      const value = (this.#property) ?
        this.#getPropertyValue(this.#model, this.#property) :
        this.#model.getAttribute?.(this.#modelAttr);

      if (value) {
        try {
          this.#applyUpdate(this.#bound, this.#elemAttr, value);
        } catch (error) {
          console.error('a-bind: #init: ', error);
          throw new Error('a-bind: #init failed');
        }
      }
    }

    this.#addListeners();
    this.#isInitializing = false;
  }

  #isUnsafePath(parts) {
    return parts.some(p => p === '__proto__' || p === 'constructor' || p === 'prototype');
  }

  async #reinit() {
    if (this.#isInitializing) return;
    this.#isInitializing = true;
    this.#teardown();
    await this.#init();
    this.#isInitializing = false;
  }

  /**
   * Safely builds options using the Option constructor.
   */
  #setOptions(target, items) {
    items.forEach(item => {
      const text = typeof item === 'object' ? (item.text || item.label) : item;
      const val = typeof item === 'object' ? (item.value || item.id) : item;
      target.add(new Option(text, val));
    });
  }

  #teardown() {
    crosstownBus.hopOff(this.#busKey, this.#updateSubscribers);

    if (this.#abortController) {
      this.#abortController.abort();
      this.#abortController = null;
    }
  }

  #updateBound(value) {
    const prop = this.#property || this.#modelAttr;
    this.#updateManager.queue(this.#bound, value, (val) => {
      this.#applyUpdate(this.#bound, this.#elemAttr, val);
    }, this);
  }

  #updateModel(value, event) {
    const prop = this.#property || this.#modelAttr;
    if (this.#func) return this.#executeFunction(event);

    // const taskKey = `${this.#busKey}:model`;
    const taskKey = Symbol(`${this.#busKey}`);
    const doUpdate = (value) => this.#applyUpdate(this.#model, prop, value);
    if (this.#throttle > 0) {
      if (this.#inputTimer) clearTimeout(this.#inputTimer);
      this.#inputTimer = setTimeout(() => {
        this.#updateManager.queue(taskKey, value, doUpdate, this);
        this.#inputTimer = null;
      }, this.#throttle)
    } else {
      this.#updateManager.queue(taskKey, value, doUpdate, this);
    }
  }

  // -- Getters / Setters --

  // -- properties --

  get debug() { return this.hasAttribute('debug') }
  get bus() { return crosstownBus }
  get busKey() { return this.#busKey }
  get prop() { return this.#property || this.#modelAttr }

  get bound() { return this.#bound }
  set bound(value) {
    if (value instanceof HTMLElement) {
      this.#bound = value;
    } else {
      console.error('a-bind: Bound element must be HTML element', value);
    }
  }

  get model(){ return this.#model }
  set model(value){
    if (typeof value === 'object' && value !== null) {
      this.#model = value;
    } else {
      console.error('a-bind: model must be of type "object"')
    }
  }

  // -- attributes --

  get elemAttr(){ return this.#elemAttr }
  set elemAttr(value){ this.setAttribute('elem-attr', value) }

  get event(){ return this.#event }
  set event(value){ this.setAttribute('event', value) }

  get func(){ return this.#func }
  set func(value){ this.setAttribute('func', value) }

  get modelAttr(){ return this.#modelAttr }
  set modelAttr(value){ this.setAttribute('model-attr', value) }

  // this resolves to the attribute 'model'
  get modelKey(){ return this.#modelKey }
  set modelKey(value){ this.setAttribute('model', value) }

  get once(){ return this.#once }
  set once(value){ this.toggleAttribute('once', value !== false) }

  get property(){ return this.#property }
  set property(value){ this.setAttribute('property', value) }

  get pull(){ return this.#pull }
  set pull(value){ this.toggleAttribute('pull', value !== false) }

  get push(){ return this.#push }
  set push(value){ this.toggleAttribute('push', value !== false) }

  get throttle(){ return this.#throttle }
  set throttle(value){ this.setAttribute('throttle', parseInt(value)) }
}

if (!customElements.get('a-bind')) customElements.define('a-bind', ABind);
