/**
 * @file a-bind.js
 * @description specific Data-binding for Custom Elements and ESM Modules.
 *              Features MutationObserver support, batched DOM updates via requestAnimationFrame,
 *              and intelligent throttling (Input Debounce / Output Rate Limiting).
 * @author Holmes Bryant <Holmes Bryant <https://github.com/HolmesBryant>
 * @version 2.6.0
 * @license GPL-3.0
 */

import { schedule } from './Schedule.js';
import Bus, { crosstownBus } from './Bus.js';
import Loader, { loader } from './loader.js';
import PathResolver from './PathResolver.js';

export {
  schedule,
  crosstownBus,
  loader,
  PathResolver
};

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
  #elemProp = 'value';
  #event = 'input';
  #func;
  #modelKey;
  #modelAttr;
  #once = false;
  #property;
  #pull = false;
  #push = false;
  #target;
  #throttle = 0;

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
  #updateManager = schedule;

  /**
   * List o
   * @static
   * @returns {string[]} ['debug', 'elem-prop', 'event', 'func', 'model', 'attr', 'once', 'prop', 'pull', 'push', 'throttle']
   */
  static observedAttributes = [
    'elem-prop',
    'event',
    'func',
    'model',
    'attr',
    'once',
    'prop',
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
        this.#modelAttr = newval;
        break;
      case 'once':
        this.#once = this.hasAttribute('once');
        break;
      case 'prop':
        this.#property = newval;
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
      this.#observer.observe(this, { childList: true });
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
    this.log?.('disconnectedCallback()');
  }

  // -- Static --

  static update(model, property, value) {
    const key = Bus.getKey(model, property);
    crosstownBus.announce(key, value)
  }

  // -- Public --

  /**
   * Main entry point for applying updates to the DOM or Model.
   */
  applyUpdate(target, name, value) {
    if (!this.#isConnected || !target || typeof name !== 'string') return;
    this.log?.('applyUpdate()', {target, name, value});

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
      return;
    }

    // Boolean update logic
    if (name === 'checked' && target instanceof HTMLElement && (target.type === 'checkbox' || target.type === 'radio')) {
      return this.#handleBooleanUpdate(target, value);
    }

    // Select/Datalist logic
    if (
      (target instanceof HTMLSelectElement || target instanceof HTMLDataListElement)
      && name !== 'value'
    ) {
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

    if (target instanceof HTMLSelectElement && target.multiple && name === 'value') {
      if (value === null || value === undefined) value = [];
      const values = Array.isArray(value) ? value : String(value).split(',').map(member => member.trim());
      for (const option of target.options) {
        const optVal = option.value || option.text;
        option.selected = values.includes(optVal);
      }
      return;
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

  // -- Private --

  #addListeners() {
    if (!this.#model) {
      return console.warn('a-bind.addListeners(): No model present, aborting.', this)
    }

    this.log?.('addListeners()', {});
    const prop = this.#property || this.#modelAttr;

    // Element -> Model (Event)
    if (!this.#pull) {
      /*this.#bound.addEventListener('focus', () => {
        this.#bound.select();
      }, { signal: this.#abortController.signal });*/

      this.#bound.addEventListener(this.#event, event => {
        const value = this.#bound[this.#elemProp];
        this.#updateModel(value, event);
      }, { signal: this.#abortController.signal });
    }

    // Model -> Element (Observer)
    if (!this.#push && !this.#once) {
      // Subscribe to pub/sub
      crosstownBus.hopOn(this.#busKey, this.#updateSubscribers);
      if (this.#push) return;

      // If model is an html element
      if (this.#model.addEventListener) {
        this.#model.addEventListener('input', event => {
          if (event.target === this.#bound || event.composedPath().includes(this.#bound)) {
            return;
          }
          const prop = this.#property || this.#modelAttr;
          const value = this.#getPropertyValue(this.#model, prop);
          this.applyUpdate(this.#bound, this.#elemProp, value);
        }, { signal: this.#abortController.signal });
      }
    }
  }

  async #attachLogger() {
    try {
      const mods = await import('./Logger.js');
      const mod = mods.default;
      const logger = new mod(this);
      return (label, obj) => {
        const boundVal = this.bound?.[this.elemProp];
        label = this.bound ? `${label}: ${this.bound.localName}: ${boundVal}` : label;
        logger.log(label, obj);
      }
    } catch (error) {
      console.warn('a-bind.attachLogger() Failed', error);
    }
  }

  #canHaveChildren(elem) {
    // Text nodes and Comments cannot have children
    if (elem.nodeType !== Node.ELEMENT_NODE) return false;

    const voidElements = [
      'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
      'link', 'meta', 'param', 'source', 'track', 'wbr'
    ];
    return !voidElements.includes(elem.localName);
  }

  #executeFunction(event) {
    if (!this.#func) return;
    this.log?.('executeFunction()', event);
    let context;

    try {
      const parts = PathResolver.getParts(this.#func);
      const fnName = parts.pop();

      if (parts.length > 0) {
        const contextPath = parts.join('.');
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
    let element = this.firstChild;

    // find the first relevant node
    while (element) {
      // If it's an Element, we found it.
      if (element.nodeType === Node.ELEMENT_NODE) {
        // skip templates. they are definitions, not targets.
        if (element.localName === 'template') {
          element = element.nextSibling;
          continue;
        }

        // If it's a nested a-bind, drill down
        if (element.localName === 'a-bind') {
          return element.firstElementChild || element.firstChild;
        }
        return element;
      }

      // If it's a Text Node, check if it has actual content
      if (element.nodeType === Node.TEXT_NODE) {
        if (element.nodeValue.trim().length > 0) {
          return element;
        }
      }

      // If it was whitespace or comment, move to next
      element = element.nextSibling;
    }

    this.log?.('getBoundElement()', null);
    return null;
  }

  /**
   * Accounts for nested properties ie. user.name
   */
  #getPropertyValue(obj, path) {
    this.log?.('getPropertyValue()', {obj, path});
    return PathResolver.getValue(obj, path) || obj?.getAttribute?.(path);
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

  #handleMutation() {
    if (!this.isConnected) return;

    // wait for child
    if (!this.#bound && this.firstChild) {
      this.#observer.disconnect();
      this.#init();
      return;
    }

    // update model if bound element changes
    if (this.#bound && this.#model) {
      const prop = this.#property || this.#modelAttr;
      const val = this.#getPropertyValue(this.#model, prop);
      this.applyUpdate(this.#bound, this.#elemProp, val);
    }
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
    const gen = this.#initIdx;
    if (this.#shouldBail(gen)) return;
    if (this.debug && !this.log) this.log = await this.#attachLogger();
    this.log?.('init()');

    // first attempt. suppress errors
    let modelReady = await this.#resolveModel(gen, true);

    if (!modelReady) {
      this.log?.('init(): Model not found, waiting...');

      // wait for network/DOM/whitelist
      await new Promise( resolve => setTimeout( resolve, 50));
      if (this.#shouldBail(gen)) return;

      // second attempt
      modelReady = await this.#resolveModel(gen);
    }

    if (!modelReady) return;
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

    const prop = this.#property || this.#modelAttr;
    this.#busKey = Bus.getKey(this.#model, prop);
    this.#updateSubscribers = this.#updateBound.bind(this);

    this.#syncView();
    this.#addListeners();
  }

  #parsedValue(value) {
    if (value === 'true') value = true;
    if (value === 'false') value = false;
    if (value === null || value === undefined) value = '';
    this.log?.('parsedValue()', value);
    return value;
  }

  async #reinit() {
    this.log?.('reinit()');
    this.#initIdx++;
    this.#teardown();
    await this.#init();
  }

  #resolveGroup() {
    this.log?.('resolveGroup()');
    this.#group = this.closest('a-bindgroup');

    if (this.#group) {
      this.#group.register(this);
    }

    if (
      this.#group &&
      (!this.#model ||
        (!this.#property && !this.#modelAttr && !this.#func)
      )
    ) {
      this.log?.('resolveGroup(): Waiting for group to provide model or property');
      return false;
    }

    return true;
  }

  async #resolveModel(gen, suppressError = false) {
    this.log?.('resolveModel()', {gen});
    if (this.#model && !this.#modelKey) {
      this.#modelKey = Object.getPrototypeOf(this.#model).constructor.name;
      return true;
    }

    if (!this.#modelKey) return true; // Deferred to ABindgroup or ARepeat

    // If bindings are in a custom element's shadow dom
    if (this.#modelKey === "this") {
      this.#model = await loader.load(this.getRootNode().host, this);
      this.#modelKey = Object.getPrototypeOf(this.#model).constructor.name;
      return true;
    }

    try {
      this.#model = await loader.load(this.#modelKey, this);
      return true;
    } catch (error) {
      if (!suppressError) {
        console.error(`a-bind: Failed to load model "${this.#modelKey}"`, error);
      }
      return false;
    }
  }

  async #resolveTarget(selector) {
    this.log?.('#resolveTarget()', {target: selector});
    try {
      return await loader.load(selector, this);
    } catch (error) {
      console.error(`a-bind: Failed to load target element. ${this.target}`, this, error);
      return;
    }
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

  /**
   * Check if reinit() was called during load, or element was removed from the DOM.
   */
  #shouldBail(idx) {
    return (this.#initIdx !== idx || !this.#isConnected);
  }

  #syncView() {
    if (this.#push) return;
    const prop = this.#property || this.#modelAttr;
    const value = (this.#property) ?
      this.#getPropertyValue(this.#model, this.#property) :
      this.#model.getAttribute?.(this.#modelAttr);

    if (value !== undefined) {
      try {
        this.applyUpdate(this.#bound, this.#elemProp, value);
      } catch (error) {
        throw new Error('a-bind.syncView(): Failed', {cause: error});
      }
    }

    // Observe content changes made after initial parse
    if (this.#canHaveChildren(this.#bound)) {
      this.#observer.disconnect();
      this.#observer.observe(this.#bound, { childList: true });
    }

    this.log?.('syncView()');
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
    this.#updateManager.defer(this, value, (val) => {
      this.applyUpdate(this.#bound, this.#elemProp, val);
    }, this);
  }

  #updateModel(value, event) {
    const prop = this.#property || this.#modelAttr;
    if (this.#func) return this.#executeFunction(event);

    // Use the identity 'value' if present, otherwise stick to boolean 'checked'
    const isRadio = this.#bound instanceof HTMLInputElement && this.#bound.type === 'radio';
    if (isRadio && this.#elemProp === 'checked' && this.#bound.hasAttribute('value')) {
      value = this.#bound.value;
    }

    // Use key for UpdateManager to ensure batching works
    const taskKey = `abind-update::${this.#busKey}`;
    const doUpdate = (newValue) => {
      const currentValue = this.#getPropertyValue(this.#model, prop);
      const hasChanged = this.#parsedValue(newValue) !== this.#parsedValue(currentValue);
      if (hasChanged && newValue !== undefined) {
        this.applyUpdate(this.#model, prop, newValue);
        crosstownBus.announce(this.#busKey, newValue);
      }
    }

    if (this.#throttle > 0) {
      if (this.#inputTimer) clearTimeout(this.#inputTimer);
      this.#inputTimer = setTimeout(() => {
        this.#updateManager.defer(taskKey, value, doUpdate, this);
        this.#inputTimer = null;
      }, this.#throttle)
    } else {
      this.#updateManager.defer(taskKey, value, doUpdate, this);
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
    if (value instanceof HTMLElement || value instanceof Text) {
      this.#bound = value;
    } else {
      console.error('a-bind: Bound element must be HTML element or Text node', value, this);
    }
  }

  // this resolves to the attribute 'model'
  get modelKey() { return this.#modelKey }
  set modelKey(value) { this.setAttribute('model', value) }

  // -- attributes --

  get elemProp() { return this.#elemProp }
  set elemProp(value) { this.setAttribute('elem-prop', value) }

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
  set modelAttr(value) { this.setAttribute('attr', value) }

  get once() { return this.#once }
  set once(value) { this.toggleAttribute('once', value !== false) }

  get property() { return this.#property }
  set property(value) { this.setAttribute('prop', value) }

  get pull() { return this.#pull }
  set pull(value) { this.toggleAttribute('pull', value !== false) }

  get push() { return this.#push }
  set push(value) { this.toggleAttribute('push', value !== false) }

  get throttle() { return this.#throttle }
  set throttle(value) { this.setAttribute('throttle', parseInt(value)) }

  get target() { return this.#target }
  set target(value) { this.setAttribute('target', value) }
}

if (!customElements.get('a-bind')) customElements.define('a-bind', ABind);
