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
import PathResolver from './PathResolver.js';

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
  #debug;
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
        // model is resolved in reinit();
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
    this.log?.('disconnectedCallback()');
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
    let modelId;
    if (typeof model === 'object' && model !== null || typeof model === 'function') {
      modelId = ABind.#modelIds.get(model);
      if (!modelId) {
        modelId = `m${++ABind.#idCounter}`;
        ABind.#modelIds.set(model, modelId);
      }
    } else {
      modelId = String(model);
    }
    return `abind::${modelId}:${property}`;
  }

  static update(model, property, value) {
    const key = ABind.getBusKey(model, property);
    crosstownBus.announce(key, value)
  }

  // -- Private --

  #addListeners() {
    if (!this.#model) {
      return console.warn('a-bind.addListeners: No model present.', this)
    }

    this.log?.('addListeners()', {});
    const prop = this.#property || this.#modelAttr;

    // Element -> Model (Event)
    if (!this.#pull) {
      this.#bound.addEventListener(this.#event, event => {
        const value = this.#bound[this.#elemAttr];
        this.#updateModel(value, event);
      }, { signal: this.#abortController.signal });
    }

    // Model -> Element (Observer)
    if (!this.#push && !this.#once) {
      // Subscribe to pub/sub
      crosstownBus.hopOn(this.#busKey, this.#updateSubscribers);
      if (this.#push) return;

      // If model is an input or select element
      if (this.#model.addEventListener) {
        this.#model.addEventListener('input', event => {
          const prop = this.#property || this.#modelAttr;
          const value = this.#getPropertyValue(this.#model, prop);
          this.#applyUpdate(this.#bound, this.#elemAttr, value);
        }, { signal: this.#abortController.signal });

      }
    }
  }

  /**
   * Main entry point for applying updates to the DOM or Model.
   */
  #applyUpdate(target, name, value) {
    if (!this.#isConnected || !target || typeof name !== 'string') return;
    this.log?.('applyUpdate()', {target, name, value});

    // Boolean update logic
    if (name === 'checked' && target instanceof HTMLElement && (target.type === 'checkbox' || target.type === 'radio')) {
      return this.#handleBooleanUpdate(target, value);
    }

    // Select/Datalist logic
    if (target instanceof HTMLSelectElement || target instanceof HTMLDataListElement) {
      return this.#handleListUpdate(target, value);
    }

    // CSS variables
    if (name.startsWith('--') && target.style) {
      return target.style.setProperty(name, value);
    }

    // Nested paths
    if (name.includes('.')) {
      return this.#handleNestedUpdate(target, name, value);
    }

    // Standard property/attribute
    const isElement = typeof target.setAttribute === 'function';
    const parsedValue = this.#parsedValue(value);

    if (name in target) {
      try {
        target[name] = parsedValue;
      } catch (error) {
        if (isElement) target.setAttribute(name, value);
      }
    } else if (isElement) {
      if (value === null || value === undefined) {
        target.removeAttribute(name);
      } else {
        target.setAttribute(name, value);
      }
    }
  }

  async attachLogger() {
    const mods = await import('./Logger.js');
    const mod = mods.default;
    const logger = new mod(this);
    return (label, obj) => {
      const boundVal = this.bound?.[this.elemAttr];
      label = this.bound ? `${label}: ${this.bound.localName}: ${boundVal}` : label;
      logger.log(label, obj);
    }
  }

  #executeFunction(event) {
    if (!this.#func) return;
    this.log?.('executeFunction()', event);
    let context;

    try {
      const parts = PathResolver.getParts(this.#func);
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

    this.log?.('getBoundElement()', element);
    return element;
  }

  /**
   * Accounts for nested properties ie. user.name
   */
  #getPropertyValue(obj, path) {
    this.log?.('getPropertyValue()', {obj, path});
    return PathResolver.getValue(obj, path);
  }

   /**
   * logic for Radio and Checkbox 'checked' state.
   */

  #handleBooleanUpdate(target, value) {
    const modelValue = this.#parsedValue(value);

    // Compare against the 'value' attribute if it exists
    // otherwise, compare against boolean true
    const comparisonValue = target.hasAttribute('value')
      ? this.#parsedValue(target.getAttribute('value'))
      : true;

    target.checked = (modelValue === comparisonValue);

    this.log?.('handleBooleanUpdate()', {target, value, targetChecked: target.checked});
  }

  /**
   * logic for Select and Datalist options.
   */
  #handleListUpdate(target, value) {
    let items = null;
    if (Array.isArray(value)) {
      items = value;
    } else if (typeof value === 'string') {
      items = value.split(',').map( item => item.trim()).filter(Boolean);
    } else if (typeof value === 'string') {
      items = [value.trim()];
    }

    if (items) this.#setOptions(target, items);
    this.log?.('handleListUpdate()', {target, value, items});
  }

  /**
   * logic for nested paths (e.g., style.color).
   */
  #handleNestedUpdate(target, name, value) {
    this.log?.('handleNestedUpdate()', {target, name, value});
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
        current[lastProp] = this.#parsedValue(value);
      }
    } catch (error) {
      console.warn(`a-bind: Failed to set nested property "${name}"`, error);
    }
  }

  async #init() {
    if (this.debug) this.log = await this.attachLogger();
    this.log?.('init()');

    if (this.#model) {
      this.#modelKey = Object.getPrototypeOf(this.#model).constructor.name;
    } else if (this.#modelKey) {
      this.#model = await loader.load(this.#modelKey);
    }

    // Check if inside a group
    this.#group = this.closest('a-bindgroup');
    if (this.#group && (!this.#model || (!this.#property && !this.#modelAttr))) {
      this.log?.('init(): waiting for group to provide missing model or property');
      this.#isInitializing = false;
      return;
    }

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

      if (value !== undefined) {
        try {
          this.#applyUpdate(this.#bound, this.#elemAttr, value);
        } catch (error) {
          console.error('a-bind: #init: ', error);
          throw new Error('a-bind: #init failed');
        }
      }
    } else if (this.#push) {
      // initial sync Bound => Model
      const isCheckedType = this.#bound.type === 'radio' || this.#bound.type === 'checkbox';
      if (isCheckedType && this.#bound.checked) {
        const val = this.#bound.hasAttribute('value') ? this.#bound.value : true;
        this.#updateModel(val, { target: this.#bound });
      } else if (!isCheckedType && this.#bound[this.#elemAttr]) {
        this.#updateModel(this.#bound[this.#elemAttr], { target: this.#bound });
      }
    }

    this.#addListeners();
    this.#isInitializing = false;
  }

  #parsedValue(value) {
    if (value === 'true') value = true;
    if (value === 'false') value = false;
    this.log?.('parsedValue()', value);
    return value;
  }

  async #reinit() {
    this.log?.('reinit()', {});
    if (this.#isInitializing) return;
    this.#isInitializing = true;
    this.#teardown();
    await this.#init();
    this.#isInitializing = false;
  }

  /**
   * Builds option elements using the Option constructor.
   */
  #setOptions(target, items) {
    const optionElements = items.map( item => {
      if (item === null || item === undefined) return null;

      const text = typeof item === 'object' ?
        (item.text || item.label || item.name || JSON.stringify(item)) :
        String(item);

      const val = typeof item === 'object' ?
        (item.value !== undefined ? item.value : (item.id || text)) :
        String(item);

      return new Option(text, val);
    }).filter(Boolean); // remove nulls if an item is invalid

    target.replaceChildren(...optionElements);
    this.log?.('setOptions()', {target, items});
  }

  #teardown() {
    crosstownBus.hopOff(this.#busKey, this.#updateSubscribers);

    if (this.#abortController) {
      this.#abortController.abort();
      this.#abortController = null;
    }

    this.#updateManager.cancel(this);
    if (this.#busKey) {
      this.#updateManager.cancel(`abind-update::${this.#busKey}`);
    }
    this.log?.('teardown()', {});
  }

  #updateBound(value) {
    const prop = this.#property || this.#modelAttr;
    this.log?.('updateBound()', {prop, value});
    this.#updateManager.queue(this.#bound, value, (val) => {
      this.#applyUpdate(this.#bound, this.#elemAttr, val);
    }, this);
  }

  #updateModel(value, event) {
    const prop = this.#property || this.#modelAttr;
    if (this.#func) return this.#executeFunction(event);

    // Use the identity 'value' if present, otherwise stick to boolean 'checked'
    const isRadio = this.#bound instanceof HTMLInputElement && this.#bound.type === 'radio';
    if (isRadio && this.#elemAttr === 'checked' && this.#bound.hasAttribute('value')) {
      value = this.#bound.value;
    }

    // Use key for UpdateManager to ensure batching works
    const taskKey = `abind-update::${this.#busKey}`;
    const doUpdate = (newValue) => {
      const currentValue = this.#getPropertyValue(this.#model, prop);
      const hasChanged = this.#parsedValue(newValue) !== this.#parsedValue(currentValue);
      if (hasChanged && newValue !== undefined) {
        this.#applyUpdate(this.#model, prop, newValue);
        crosstownBus.announce(this.#busKey, newValue);
      }
    }

    if (this.#throttle > 0) {
      if (this.#inputTimer) clearTimeout(this.#inputTimer);
      this.#inputTimer = setTimeout(() => {
        this.#updateManager.queue(taskKey, value, doUpdate, this);
        this.#inputTimer = null;
      }, this.#throttle)
    } else {
      this.#updateManager.queue(taskKey, value, doUpdate, this);
    }

    this.log?.('updateModel()', {value, eventTarget: event.target, targetValue: event.target.value, event});
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

  // this resolves to the attribute 'model'
  get modelKey() { return this.#modelKey }
  set modelKey(value) { this.setAttribute('model', value) }

  // -- attributes --

  get elemAttr() { return this.#elemAttr }
  set elemAttr(value) { this.setAttribute('elem-attr', value) }

  get event() { return this.#event }
  set event(value) { this.setAttribute('event', value) }

  get func() { return this.#func }
  set func(value) { this.setAttribute('func', value) }

  get model() { return this.#model }
  set model(value) {
    if (typeof value === 'function' || typeof value === 'object' && value !== null) {
      this.#model = value;
      if (this.#isConnected) this.#reinit();
    } else {
      this.setAttribute('model', value);
    }
  }

  get modelAttr() { return this.#modelAttr }
  set modelAttr(value) { this.setAttribute('model-attr', value) }

  get once() { return this.#once }
  set once(value) { this.toggleAttribute('once', value !== false) }

  get property() { return this.#property }
  set property(value) { this.setAttribute('property', value) }

  get pull() { return this.#pull }
  set pull(value) { this.toggleAttribute('pull', value !== false) }

  get push() { return this.#push }
  set push(value) { this.toggleAttribute('push', value !== false) }

  get throttle() { return this.#throttle }
  set throttle(value) { this.setAttribute('throttle', parseInt(value)) }
}

if (!customElements.get('a-bind')) customElements.define('a-bind', ABind);
