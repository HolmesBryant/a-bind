/**
 * @file a-bind.js
 * @description Data-binding for Custom Elements, ESM Modules, and Native DOM elements.
 * @author Holmes Bryant <https://github.com/HolmesBryant>
 * @version 2.5.0
 * @license GPL-3.0
 */

// --- Utilities ---

const LogUtils = {
  getSignature(el) {
    if (!el) return 'null';
    if (el.nodeType === 3) return '#text';
    let str = el.localName;
    if (el.id) str += `#${el.id}`;
    if (el.classList?.length) str += `.${[...el.classList].join('.')}`;
    return str;
  },

  log(context, topic, data = {}) {
    if (!context.debug) return;

    const isGroup = context.type === 'group';
    const bg = isGroup ? '#5e35b1' : '#00796b';
    const signature = context.signature || 'unknown';

    console.groupCollapsed(
      `%c ${context.tagName} %c ${signature} %c ${topic} `,
      `background: ${bg}; color: white; border-radius: 3px 0 0 3px; padding: 2px 5px; font-weight: bold;`,
      `background: #444; color: white; padding: 2px 5px;`,
      `background: transparent; color: unset; font-weight: bold; padding-left: 5px;`
    );

    if (data.reason) console.log(`%cReason: ${data.reason}`, 'font-weight:bold; color: #d81b60');

    try {
      const snapshot = JSON.parse(JSON.stringify(data, (k, v) => {
        if (v instanceof HTMLElement) return LogUtils.getSignature(v);
        return v;
      }));
      console.table(snapshot);
    } catch (e) { console.log(data); }

    if (data.raw) console.dir(data.raw);
    console.groupEnd();
  }
};

const modelObservers = new WeakMap();

const Batcher = {
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
        if (el.isConnected) el.applyUpdate(item.value, item.reason);
    });
    this.updates.clear();
    this.requested = false;
  }
};

const Loader = {
  registry: new Map(),
  refCounts: new Map(),
  pending: new Map(), // Track in-flight requests to prevent race conditions

  // Security: disallow remote modules
  isModulePath: (str) => /^(\.\/|\/|\.\.\/).*\.m?js$/.test(str),

  async resolve(key) {
    if (!key) return null;
    if (typeof key === 'object') return key;

    // Check Cache
    if (this.registry.has(key)) return this.registry.get(key);

    // Check Pending
    if (this.pending.has(key)) return this.pending.get(key);

    // Load
    const loadTask = (async () => {
      let instance = null;

      // Module Import
      if (this.isModulePath(key)) {
        try {
          const mod = await import(key);
          const raw = mod.default || mod[Object.keys(mod)[0]];
          instance = this.instantiate(raw);
        } catch (e) {
          console.error(`a-bind: Import failed for ${key}`, e);
          return null;
        }
      }
      // DOM Element / Global
      else {
        try {
          const el = document.getElementById(key) || document.querySelector(key);
          if (el) instance = el;
        } catch (e) {}

        if (!instance && key in window) {
          instance = this.instantiate(window[key]);
        }
      }

      if (instance?.localName?.includes('-')) {
        await customElements.whenDefined(instance.localName);
      }
      return instance;
    })();

    this.pending.set(key, loadTask);

    try {
      const instance = await loadTask;
      if (instance) {
        this.registry.set(key, instance);
        if (!this.refCounts.has(key)) this.refCounts.set(key, 0);
      }
      return instance;
    } finally {
      this.pending.delete(key);
    }
  },

  incrementRef(key) {
    if (key && typeof key === 'string') {
      const current = this.refCounts.get(key) || 0;
      this.refCounts.set(key, current + 1);
    }
  },

  decrementRef(key) {
    if (key && typeof key === 'string') {
      const current = this.refCounts.get(key);
      if (current !== undefined) {
        if (current <= 1) {
          this.refCounts.delete(key);
          this.registry.delete(key);
        } else {
          this.refCounts.set(key, current - 1);
        }
      }
    }
  },

  instantiate(obj) {
    try {
      return (typeof obj === 'function' && obj.prototype) ? new obj() : obj;
    } catch {
      return obj;
    }
  }
};

class ModelObserver {
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
      this.#subscribers.get(property).forEach(cb => cb(value));
    }
  }
}

// -- Main Component ---
export default class ABind extends HTMLElement {
  #config = {
    debug: false,
    elemAttr: 'value',
    event: 'input',
    func: null,
    model: null,
    modelAttr: null,
    once: false,
    property: null,
    pull: false,
    push: false,
    throttle: 0
  };

  #abortController;
  #boundElement;
  #hasUpdated = false;
  #modelKey = null;
  #modelInstance = null;
  #isConnected = false;
  #isInitializing = false;
  #subscriptionCallback = null;
  #childObserver = null;
  #inputTimer = null;

  static observedAttributes = [
    'debug',
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

  get #logCtx() {
    return {
      debug: this.#config.debug,
      type: 'bind',
      tagName: 'a-bind',
      signature: `${LogUtils.getSignature(this)} → ${LogUtils.getSignature(this.#boundElement)}`
    };
  }

  attributeChangedCallback(attr, oldval, newval) {
    if (oldval === newval) return;
    const val = newval !== null;

    switch (attr) {
      case 'debug': this.#config.debug = val && newval !== 'false'; break;
      case 'model': this.#config.model = newval; break;
      case 'property': this.#config.property = newval; break;
      case 'model-attr': this.#config.modelAttr = newval; break;
      case 'event': this.#config.event = newval; break;
      case 'elem-attr': this.#config.elemAttr = newval || 'value'; break;
      case 'func': this.#config.func = newval; break;
      case 'throttle': this.#config.throttle = parseInt(newval) || 0; break;
      case 'pull': this.#config.pull = val && newval !== 'false'; break;
      case 'push': this.#config.push = val && newval !== 'false'; break;
      case 'once': this.#config.once = val && newval !== 'false'; break;
    }

    if (this.#isConnected && ['model', 'property', 'model-attr'].includes(attr)) {
      this.#reinitialize();
    }
  }

  connectedCallback() {
    if (!window.abind) window.abind = ABind;
    this.#isConnected = true;

    if (!this.firstElementChild) {
      this.#childObserver = new MutationObserver(() => {
        if (this.firstElementChild) {
          this.#childObserver.disconnect();
          this.#childObserver = null;
          this.#initialize('Child Inserted');
        }
      });
      this.#childObserver.observe(this, { childList: true });
    } else {
      this.#initialize('Connected');
    }
  }

  disconnectedCallback() {
    this.#teardown();
    if (this.#modelKey) {
      Loader.decrementRef(this.#modelKey);
      this.#modelKey = null;
    }
    if (this.#childObserver) {
      this.#childObserver.disconnect();
      this.#childObserver = null;
    }
    this.#isConnected = false;

    const group = this.closest('a-bindgroup');
    if (group) group.unregister(this);
  }

  async #initialize(trigger) {
    if (this.#isInitializing) return;
    this.#isInitializing = true;

    try {
      let element = this.firstElementChild;
      while (element && element.localName === 'a-bind') {
        element = element.firstElementChild;
      }
      this.#boundElement = element;

      if (!this.#boundElement) {
        if(this.#config.debug) console.warn('a-bind: No element to bind');
        return;
      }

      let source = 'None';
      const group = this.closest('a-bindgroup');

      if (group) {
        group.register(this);
        if (!this.#modelInstance) {
          if (group.model) {
            this.#modelInstance = group.model;
            source = 'Group (Immediate)';
          } else {
            LogUtils.log(this.#logCtx, 'Waiting for Group', { group: LogUtils.getSignature(group) });
            return;
          }
        } else {
          source = 'Manual/Existing';
        }
      } else if (!this.#modelInstance && this.#config.model) {
        this.#modelInstance = await Loader.resolve(this.#config.model);
        source = `Loader (${this.#config.model})`;

        if (this.#modelInstance && typeof this.#config.model === 'string') {
          this.#modelKey = this.#config.model;
          Loader.incrementRef(this.#modelKey);
        }
      }

      if (!this.#isConnected) return;

      LogUtils.log(this.#logCtx, 'Initialized', {
        trigger,
        source,
        boundElement: LogUtils.getSignature(this.#boundElement),
        raw: { model: this.#modelInstance }
      });

      if (!this.#modelInstance) return;

      this.#abortController = new AbortController();
      this.#setupListeners();

      if (!this.#config.push) {
        this.applyUpdate(undefined, 'Initial Sync');
      }
    } catch (err) {
      console.error('a-bind error:', err);
    } finally {
      this.#isInitializing = false;
    }
  }

  #reinitialize() {
    this.#teardown();
    this.#initialize('Re-init');
  }

  #teardown() {
    this.#abortController?.abort();
    if (this.#inputTimer) clearTimeout(this.#inputTimer);
    this.#inputTimer = null;

    const observer = ABind.#getObserver(this.#modelInstance, false);
    const prop = this.#config.property || this.#config.modelAttr;

    if (observer && prop && this.#subscriptionCallback) {
      observer.unsubscribe(prop, this.#subscriptionCallback);
    }

    this.#subscriptionCallback = null;
  }

  #setupListeners() {
    if (!this.#config.property && !this.#config.func && !this.#config.modelAttr) return;

    if (this.#config.event && !this.#config.pull) {
      this.#boundElement.addEventListener(
        this.#config.event,
        (e) => this.#handleElementEvent(e),
        { signal: this.#abortController.signal }
      );
    }

    if (this.#config.push) return;

    const observer = ABind.#getObserver(this.#modelInstance, true);
    const prop = this.#config.property || this.#config.modelAttr;

    if (observer && prop) {
      this.#subscriptionCallback = (value) => {
        if (this.#config.once && this.#hasUpdated) return;
        Batcher.add(this, value, `Model Change (${prop})`);
      };
      observer.subscribe(prop, this.#subscriptionCallback);
    }
  }

  applyUpdate(value, reason) {
    if ((!this.#config.property && !this.#config.modelAttr) || (this.#config.once && this.#hasUpdated) || this.#config.push) {
      return;
    }

    let fetched = false;
    if (value === undefined) {
      fetched = true;
      if (this.#config.modelAttr) {
        if (this.#config.modelAttr.startsWith('style.')) {
          const prop = this.#config.modelAttr.substring(6);
          value = this.#modelInstance.style ? this.#modelInstance.style[prop] : undefined;
        } else {
          value = this.#modelInstance.getAttribute ? this.#modelInstance.getAttribute(this.#config.modelAttr) : undefined;
        }
      } else {
        value = this.#getObjectProperty(this.#modelInstance, this.#config.property);
      }
    }

    LogUtils.log(this.#logCtx, 'Update DOM', { reason, value, fetched, target: this.#config.elemAttr });

    const attrs = this.#config.elemAttr.split(',').map(s => s.trim());
    attrs.forEach(attr => this.#setElementAttribute(this.#boundElement, attr, value));

    this.#hasUpdated = true;
  }

  #handleElementEvent(event) {
    if (this.#config.func) {
      this.#executeFunction(event);
      return;
    }

    if (this.#config.pull || (!this.#config.property && !this.#config.modelAttr)) return;

    let value;
    const el = this.#boundElement;

    // Select Multiple Handling
    if (el.localName === 'select' && el.multiple) {
      value = Array.from(el.selectedOptions).map(o => o.value);
    } else if (el.type === 'checkbox') {
      value = el.checked ? (el.getAttribute('value') || true) : false;
    } else if (event.target.value !== undefined) {
      value = event.target.value;
    } else {
      value = el[this.#config.elemAttr] ?? el.value;
    }

    LogUtils.log(this.#logCtx, 'DOM Event', { type: event.type, value });

    if (this.#config.throttle > 0) {
      if (this.#inputTimer) clearTimeout(this.#inputTimer);
      this.#inputTimer = setTimeout(() => {
        this.#updateModel(value);
        this.#inputTimer = null;
      }, this.#config.throttle);
    } else {
      this.#updateModel(value);
    }
  }

  #updateModel(value) {
    let oldValue;

    if (this.#config.modelAttr) {
      if (this.#config.modelAttr.startsWith('style.')) {
        const prop = this.#config.modelAttr.substring(6);
        oldValue = this.#modelInstance.style?.[prop];
      } else {
        oldValue = this.#modelInstance.getAttribute?.(this.#config.modelAttr);
      }
    } else {
      oldValue = this.#getObjectProperty(this.#modelInstance, this.#config.property);
    }

    if (oldValue == value) return;

    LogUtils.log(this.#logCtx, 'Update Model', { value, target: this.#config.property || this.#config.modelAttr });

    if (this.#config.modelAttr) {
      if (this.#config.modelAttr.startsWith('style.')) {
        this.#modelInstance.style.setProperty(this.#config.modelAttr.substring(6), value);
      } else {
        this.#modelInstance.setAttribute(this.#config.modelAttr, value);
      }
    } else {
      this.#setObjectProperty(this.#modelInstance, this.#config.property, value);
    }

    const observer = ABind.#getObserver(this.#modelInstance, false);
    const prop = this.#config.property || this.#config.modelAttr;
    if (observer && prop) observer.publish(prop, value);
  }

  #executeFunction(event) {
    const parts = this.#config.func.split('.');
    const fnName = parts.pop();
    const ctxPath = parts.join('.');
    let ctx = ctxPath ? this.#getObjectProperty(this.#modelInstance, ctxPath) : this.#modelInstance;

    if (!ctx || typeof ctx[fnName] !== 'function') {
      ctx = ctxPath ? this.#getObjectProperty(window, ctxPath) : window;
    }

    LogUtils.log(this.#logCtx, 'Exec Func', { func: this.#config.func, found: !!ctx });

    if (ctx && typeof ctx[fnName] === 'function') {
      ctx[fnName].call(ctx, event);
    } else {
      console.warn(`Function ${this.#config.func} not found.`);
    }
  }

  #getObjectProperty(obj, path) {
    if (!path) return obj;
    const parts = path.split('.');
    // Security Check
    if (parts.some(p => p === '__proto__' || p === 'constructor' || p === 'prototype')) return undefined;
    return parts.reduce((acc, part) => acc && acc[part], obj);
  }

  #setObjectProperty(obj, path, value) {
    const parts = path.split('.');
    if (parts.some(p => p === '__proto__' || p === 'constructor' || p === 'prototype')) return;
    const last = parts.pop();
    const target = parts.length ? this.#getObjectProperty(obj, parts.join('.')) : obj;
    if (target && typeof target === 'object') target[last] = value;
  }

  #setElementAttribute(element, attribute, value) {
    if (value === undefined || value === null) value = '';

    // Handle Style
    if (attribute.startsWith('style.')) {
        const cssProp = attribute.substring(6);
        if (cssProp.startsWith('--')) element.style.setProperty(cssProp, value);
        else element.style[cssProp] = value;
        return;
    }

    // Handle Select Multiple (Only if binding to 'value' or 'selected')
    if (element.localName === 'select' && element.multiple && (attribute === 'value' || attribute === 'selected')) {
        const valArr = Array.isArray(value) ? value : (String(value).includes(',') ? String(value).split(',') : [value]);
        const cleanArr = valArr.map(item => String(item).trim());
        for (const option of element.options) {
            option.selected = cleanArr.includes(option.value);
        }
        return;
    }

    // Handle Checkbox/Radio (Only if binding to 'checked')
    // check if attribute is explicitly 'checked' OR if the user bound to 'value' on a boolean input
    // but respect elem-attr to allow binding other attrs.
    const isBoolInput = element.localName === 'input' && (element.type === 'checkbox' || element.type === 'radio');
    if (isBoolInput && (attribute === 'checked' || (attribute === 'value' && typeof value === 'boolean'))) {
        element.checked = String(element.value) === String(value) || value === true;
        return;
    }

    // Properties / Attributes
    // prioritize properties for known DOM properties (innerHTML, textContent, value, disabled, etc.)
    // avoid property setting for read-only conflicts (like 'list' on input) or SVG 'className'.

    // Check if property is writable or explicitly mapped
    const prop = attribute;
    const hasProp = prop in element;

    // Special case: 'list', 'form' on inputs are read-only properties, must use setAttribute
    const useAttrForce = ['list', 'form', 'type', 'width', 'height'].includes(prop);

    if (hasProp && !useAttrForce) {
      try {
        // Try setting the property
        element[prop] = value;

        // If it's a boolean attribute that became false, remove the attribute to clean up DOM
        if (value === false && element.getAttribute(prop) !== null) {
          element.removeAttribute(prop);
        }
      } catch (e) {
        // Fallback to attribute if property assignment fails (e.g. SVG className)
        element.setAttribute(prop, value);
      }
    } else {
      // Standard Attribute
      if (value === false || value === null) {
        element.removeAttribute(attribute);
      } else {
        element.setAttribute(attribute, value);
      }
    }
  }

  static #getObserver(model, create) {
    if (!model || typeof model !== 'object') return null;
    if (!modelObservers.has(model) && create) {
        modelObservers.set(model, new ModelObserver());
    }
    return modelObservers.get(model) || null;
  }

  // --- Public Static API ---

  static update(model, property, value) {
    const observer = ABind.#getObserver(model, true);
    if (observer) observer.publish(property, value);
  }

  static updateDefer(model, property, waitMs = 0) {
    setTimeout(() => {
      const parts = property.split('.');
      const val = parts.reduce((acc, part) => acc && acc[part], model);
      ABind.update(model, property, val);
    }, waitMs);
  }

  get model() { return this.#modelInstance; }
  set model(value) {
    this.#modelInstance = value;
    this.#reinitialize();
  }
}

// --- Container (<a-bindgroup>) ---

export class ABindgroup extends HTMLElement {
  #debug = false;
  #model;
  #modelKey = null;
  #modelInstance = null;
  #children = new Set();

  static observedAttributes = ['debug', 'model'];

  constructor() { super(); }

  get #logCtx() {
    return {
      debug: this.#debug,
      type: 'group',
      tagName: 'a-bindgroup',
      signature: LogUtils.getSignature(this)
    };
  }

  attributeChangedCallback(attr, oldval, newval) {
    if (oldval === newval) return;
    if (attr === 'debug') this.#debug = newval !== 'false';
    if (attr === 'model') {
      this.#model = newval;
      if (this.isConnected) this.#initializeGroup();
    }
  }

  async connectedCallback() {
    if (this.#model) await this.#initializeGroup();
  }

  disconnectedCallback() {
    if (this.#modelKey) Loader.decrementRef(this.#modelKey);
  }

  async #initializeGroup() {
    const key = this.#model;
    if (!key) return;

    LogUtils.log(this.#logCtx, 'Loading Model', { key });

    try {
      const instance = await Loader.resolve(key);
      if (!instance) throw new Error(`Could not resolve model: ${key}`);

      this.#modelInstance = instance;
      this.#modelKey = key;
      if (typeof key === 'string') Loader.incrementRef(key);

      this.#notifyChildren();
      LogUtils.log(this.#logCtx, 'Model Loaded', { childCount: this.#children.size });

    } catch (err) {
      console.error('a-bindgroup:', err);
    }
  }

  register(child) {
    this.#children.add(child);
    if (this.#modelInstance && !child.model) {
      child.model = this.#modelInstance;
    }
  }

  unregister(child) {
    this.#children.delete(child);
  }

  #notifyChildren() {
    if (!this.#modelInstance) return;
    for (const child of this.#children) {
      child.model = this.#modelInstance;
    }
  }

  get debug() { return this.#debug }
  set debug(value) { this.toggleAttribute('debug', value !== false )}

  get model() { return this.#modelInstance; }
  set model(value) {
    this.#modelInstance = value;
    this.#notifyChildren();
  }
}

if (!customElements.get('a-bind')) customElements.define('a-bind', ABind);
if (!customElements.get('a-bindgroup')) customElements.define('a-bindgroup', ABindgroup);
