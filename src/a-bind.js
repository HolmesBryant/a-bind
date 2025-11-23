/**
 * @file a-bind.js
 * @description data-binding for Custom Elements and ESM Modules.
 *              Includes <a-bind> for individual element binding and <a-bindgroup>
 *              for providing a model to a group of a-bind elements.
 * @author Holmes Bryant <https://github.com/HolmesBryant>
 * @version 2.0.0
 * @license GPL-3.0
 */

// --- Pub/Sub ---
const modelObservers = new WeakMap();

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
      this.#subscribers.get(property).delete(callback);
      if (this.#subscribers.get(property).size === 0) {
        this.#subscribers.delete(property);
      }
    }
  }

  publish(property, value) {
    if (this.#subscribers.has(property)) {
      this.#subscribers.get(property).forEach(callback => callback(value));
    }
  }
}

// --- Update Manager ---
class UpdateManager {
  #pendingUpdates = new Map();
  #frameRequested = false;

  scheduleUpdate(element, value) {
    this.#pendingUpdates.set(element, value);
    if (!this.#frameRequested) {
      this.#frameRequested = true;
      requestAnimationFrame(() => this.#flushUpdates());
    }
  }

  #flushUpdates() {
    this.#pendingUpdates.forEach((value, element) => {
      if (element.isConnected) {
        element.applyUpdate(value);
      }
    });
    this.#pendingUpdates.clear();
    this.#frameRequested = false;
  }
}
const updateManager = new UpdateManager();


export default class ABind extends HTMLElement {

  // --- Private properties ---
  #debug = false;
  #elemAttr = 'value';
  #event = 'input';
  #func = null;
  #model = null;
  #modelAttr = null;
  #once = false;
  #property = null;
  #pull = false;
  #push = false;
  #throttle = 0;

  // --- Internal State ---
  #abortController;
  #boundElement;
  #hasUpdated = false;
  #isConnected = false;
  #isInitializing;
  #scheduledTimeout = null;
  #subscriptionCallback = null;
  #subscribedProperty = null;

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

  constructor() {
    super();
    this.#initializeStateFromAttributes();
  }

  // --- Static Helper Methods ---

  static #getObserver(model, createIfMissing = false) {
    if (!model || typeof model !== 'object') return null;

    if (!modelObservers.has(model) && createIfMissing) {
      modelObservers.set(model, new ModelObserver());
    }
    return modelObservers.get(model) || null;
  }

  static #getObjectProperty(obj, path) {
    return !path ? obj : path.split('.').reduce((acc, part) => acc && acc[part], obj);
  }

  #initializeStateFromAttributes() {
    for (const attr of ABind.observedAttributes) {
      if (this.hasAttribute(attr)) {
        this.#updatePropertyFromAttribute(attr, this.getAttribute(attr));
      }
    }
  }

  // --- Lifecycle Callbacks ---

  attributeChangedCallback(attr, oldval, newval) {
    if (oldval === newval) return;
    this.#updatePropertyFromAttribute(attr, newval);
    if (this.#isConnected && ['model', 'property', 'model-attr'].includes(attr)) {
      this.#teardown();
      this.#initialize();
    }
  }

  #updatePropertyFromAttribute(attr, value) {
    switch (attr) {
      case 'model':      this.#model = value; break;
      case 'property':   this.#property = value; break;
      case 'model-attr': this.#modelAttr = value; break;
      case 'event':      this.#event = value || 'input'; break;
      case 'elem-attr':  this.#elemAttr = value || 'value'; break;
      case 'func':       this.#func = value; break;
      case 'throttle':   this.#throttle = parseInt(value) || 0; break;
      case 'pull':       this.#pull = value !== null && value !== 'false'; break;
      case 'push':       this.#push = value !== null && value !== 'false'; break;
      case 'once':       this.#once = value !== null && value !== 'false'; break;
      case 'debug':      this.#debug = value !== null && value !== 'false'; break;
    }
  }

  connectedCallback() {
    this.style.display = 'contents';
    this.#isConnected = true;
    this.#initialize();
  }

  disconnectedCallback() {
    this.#isConnected = false;
    this.#teardown();
  }

  // --- Public Static API Methods ---

  static update(model, property, value) {
    const observer = ABind.#getObserver(model, true);
    if (observer) {
      observer.publish(property, value);
    } else if (model !== undefined) {
      const modelType = model === null ? 'null' : typeof model;
      console.warn(
        `a-bind: Invalid model argument for ABind.update(). Expected an object, but received type '${modelType}'. The correct signature is 'ABind.update(model, property, value)'.`,
        model
      );
    }
  }

  static updateDefer(model, property, waitMs = 0) {
    if (!model || typeof model !== 'object') {
      const modelType = model === null ? 'null' : typeof model;
      console.warn(
        `a-bind: Invalid model argument for ABind.updateDefer(). Expected an object, but received type '${modelType}'.`,
        model
      );
      return;
    }

    setTimeout(() => {
      const value = ABind.#getObjectProperty(model, property);
      ABind.update(model, property, value);
    }, waitMs);
  }

  // --- Public Instance Methods ---

  applyUpdate(value) { this.#updateElement(value); }

  // --- Private Instance Methods ---

  async #initialize() {
    if (this.#isInitializing) return;
    this.#isInitializing = true;
    try {
      const modelIdentifier = this.#model;
      if (!modelIdentifier) return;
      let resolvedModel = null;
      if (typeof modelIdentifier === 'object' && modelIdentifier !== null) {
        resolvedModel = modelIdentifier;
      } else if (typeof modelIdentifier === 'string') {
        const potentialElement = document.querySelector(modelIdentifier);
        if (potentialElement) {
          if (potentialElement.localName.includes('-')) {
            await customElements.whenDefined(potentialElement.localName);
          }
          resolvedModel = potentialElement;
        } else {
          resolvedModel = ABind.#getObjectProperty(window, modelIdentifier);
        }
      }
      if (!resolvedModel) {
        if (this.#debug) console.debug('a-bind: Model not found yet, will retry if attributes change.', this);
        this.#isInitializing = false;
        return;
      }
      this.#model = resolvedModel;
      if (!this.children[0]) await this.#waitForBoundElement();
      let element = this.children[0];
      while (element && element.localName === 'a-bind') {
        element = element.children[0];
      }
      this.#boundElement = element;
      if (!this.#boundElement) throw new Error('a-bind: Must have one child element.');
      this.#abortController = new AbortController();
      this.#setupListeners();
      this.#updateElement();
    } catch (error) {
      console.error(error, this);
    } finally {
      this.#isInitializing = false;
    }
  }

  #executeFunction(event) {
    const funcPath = this.#func;
    if (!funcPath) return;
    let context = null;
    let func = null;
    const pathParts = funcPath.split('.');
    const funcName = pathParts.pop();
    const contextPath = pathParts.join('.');
    let potentialContext = ABind.#getObjectProperty(this.#model, contextPath);
    if (potentialContext && typeof potentialContext[funcName] === 'function') {
      context = potentialContext;
      func = potentialContext[funcName];
    } else {
      potentialContext = ABind.#getObjectProperty(window, contextPath);
      if (potentialContext && typeof potentialContext[funcName] === 'function') {
        context = potentialContext;
        func = potentialContext[funcName];
      }
    }
    if (typeof func === 'function') {
      func.call(context, event);
    } else {
      console.warn(`a-bind: Function "${funcPath}" not found on model or window.`, this);
    }
  }

  #handleElementEvent(event) {
    if (this.#func) this.#executeFunction(event);
    if (this.#pull || (!this.#property && !this.#modelAttr)) return;
    let value;
    const { localName, type, checked, selectedOptions } = this.#boundElement;
    if (localName === 'select' && this.#boundElement.multiple) {
      value = Array.from(selectedOptions).map(option => option.value);
    } else if (type === 'checkbox') {
      value = checked ? this.#boundElement.value : false;
    } else if (event.target.value !== undefined) {
      value = event.target.value;
    } else {
      value = this.#boundElement[this.#elemAttr];
    }
    this.#updateModel(value);
  }

  #setObjectProperty(obj, path, value) {
    const pathParts = path.split('.');
    const lastPart = pathParts.pop();
    const target = pathParts.length ? ABind.#getObjectProperty(obj, pathParts.join('.')) : obj;
    if (target && typeof target === 'object') {
      target[lastPart] = value;
    }
  }

  #setElementAttribute(element, attribute, value) {
    if (value === undefined || value === null) value = '';
    const { localName, type } = element;
    if (attribute.startsWith('style.')) {
      element.style[attribute.split('.')[1]] = value;
      return;
    }
    switch (localName) {
      case 'input':
        if (type === 'checkbox' || type === 'radio') {
          element.checked = element.value === String(value);
        } else if (type !== 'file') {
          element[attribute] = value;
        }
        break;
      case 'select':
        if (element.multiple) {
          const values = Array.isArray(value) ? value.map(String) : String(value).split(/[,\s]+/);
          for (const option of element.options) option.selected = values.includes(option.value);
        } else {
          element[attribute] = value;
        }
        break;
      default:
        if (attribute in element) {
          element[attribute] = value;
        } else {
          element.setAttribute(attribute, value);
        }
    }
  }

  #setupListeners() {
    if (!this.#property && !this.#func && !this.#modelAttr) return;
    const { signal } = this.#abortController;
    this.#boundElement.addEventListener(this.#event, (e) => this.#handleElementEvent(e), { signal });
    const observer = ABind.#getObserver(this.#model, true);
    this.#subscribedProperty = this.#property || this.#modelAttr;
    if (observer && this.#subscribedProperty) {
      this.#subscriptionCallback = (value) => {
        if (this.#once && this.#hasUpdated) return;
        updateManager.scheduleUpdate(this, value);
      };
      observer.subscribe(this.#subscribedProperty, this.#subscriptionCallback);
    }
  }

  #teardown() {
    this.#abortController?.abort();
    if (this.#scheduledTimeout) {
      clearTimeout(this.#scheduledTimeout);
    }
    const observer = ABind.#getObserver(this.#model, false);
    if (observer && this.#subscribedProperty && this.#subscriptionCallback) {
      observer.unsubscribe(this.#subscribedProperty, this.#subscriptionCallback);
      this.#subscribedProperty = null;
      this.#subscriptionCallback = null;
    }
  }

  #updateElement(value) {
    if ((!this.#property && !this.#modelAttr) || (this.#once && this.#hasUpdated) || this.#push) {
      return;
    }
    if (value === undefined) {
      value = this.#modelAttr ?
        this.#model.getAttribute(this.#modelAttr) :
        ABind.#getObjectProperty(this.#model, this.#property);
    }
    this.#elemAttr.split(/[,]+/).forEach(attribute => {
      this.#setElementAttribute(this.#boundElement, attribute.trim(), value);
    });
    this.#hasUpdated = true;
  }

  #updateModel(value) {
    let oldValue;
    if (this.#modelAttr) {
      oldValue = this.#model.getAttribute(this.#modelAttr);
    } else {
      oldValue = ABind.#getObjectProperty(this.#model, this.#property);
    }
    if (String(oldValue) === String(value)) return;
    if (this.#modelAttr) {
      this.#model.setAttribute(this.#modelAttr, value);
    } else {
      this.#setObjectProperty(this.#model, this.#property, value);
    }
    const observer = ABind.#getObserver(this.#model, false);
    const propertyName = this.#property || this.#modelAttr;
    if (observer && propertyName) {
      observer.publish(propertyName, value);
    }
  }

  #waitForBoundElement(timeout = 2000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const check = () => {
        if (this.children[0]) {
          resolve();
        } else if (Date.now() - startTime > timeout) {
          reject(new Error('a-bind: Timed out waiting for a child element.'));
        } else {
          setTimeout(check, 50);
        }
      };
      check();
    });
  }

  // --- Getters/Setters ---
  get model() { return this.#model; }
  set model(value) {
    if (typeof value === 'object') {
      this.#model = value;
      if (this.#isConnected) { this.#teardown(); this.#initialize(); }
    } else {
      this.setAttribute('model', String(value));
    }
  }

  get elemAttr() { return this.#elemAttr; }
  set elemAttr(value) { this.setAttribute('elem-attr', value); }

  get event() { return this.#event; }
  set event(value) { this.setAttribute('event', value); }

  get func() { return this.#func; }
  set func(value) { this.setAttribute('func', value); }

  get modelAttr() { return this.#modelAttr; }
  set modelAttr(value) { this.setAttribute('model-attr', value); }

  get property() { return this.#property; }
  set property(value) { this.setAttribute('property', value); }

  get once() { return this.#once; }
  set once(value) { this.toggleAttribute('once', Boolean(value)); }

  get pull() { return this.#pull; }
  set pull(value) { this.toggleAttribute('pull', Boolean(value)); }

  get push() { return this.#push; }
  set push(value) { this.toggleAttribute('push', Boolean(value)); }

  get debug() { return this.#debug; }
  set debug(value) { this.toggleAttribute('debug', Boolean(value)); }

  get throttle() { return this.#throttle; }
  set throttle(value) {
    const val = parseInt(value) || 0;
    if (val > 0) { this.setAttribute('throttle', val); }
    else { this.removeAttribute('throttle'); }
  }
}

export class ABindgroup extends HTMLElement {
  static modelRegistry = new Map();
  // track how many components are using a model URL.
  static modelReferenceCounts = new Map();
  // Store the modelUrl on the instance for cleanup.
  #modelUrl = null;

  async connectedCallback() {
    this.style.display = 'contents';
    try {
      const modelIdentifier = this.getAttribute('model');
      if (!modelIdentifier) {
        throw new Error('a-bindgroup requires a "model" attribute.');
      }
      const { modelInstance, modelUrl } = await this.#getModel(modelIdentifier);
      this.#modelUrl = modelUrl; // Store for disconnectedCallback

      const currentCount = ABindgroup.modelReferenceCounts.get(modelUrl) || 0;
      ABindgroup.modelReferenceCounts.set(modelUrl, currentCount + 1);

      this.#provideModelToChildren(modelInstance);
    } catch (error) {
      console.error(error, this);
    }
  }

  disconnectedCallback() {
    if (!this.#modelUrl) return;

    const currentCount = ABindgroup.modelReferenceCounts.get(this.#modelUrl);
    // If the count is 1, this is the last component using it.
    if (currentCount === 1) {
      ABindgroup.modelRegistry.delete(this.#modelUrl);
      ABindgroup.modelReferenceCounts.delete(this.#modelUrl);
      // Optional: For debugging memory usage.
      // console.log(`a-bind: Unloaded and released model from registry: ${this.#modelUrl}`);
    } else if (currentCount > 1) {
      // Otherwise, just decrement the count.
      ABindgroup.modelReferenceCounts.set(this.#modelUrl, currentCount - 1);
    }
  }

  async #getModel(identifier) {
    let modelUrl;
    if (identifier.includes('/') || identifier.endsWith('.js') || identifier.endsWith('.mjs')) {
      modelUrl = new URL(identifier, import.meta.url).href;
      const modelInstance = await this.#loadAndCacheModel(modelUrl);
      return { modelInstance, modelUrl };
    }

    const jsUrl = new URL(`${identifier}.js`, import.meta.url).href;

    try {
      modelUrl = jsUrl;
      const modelInstance = await this.#loadAndCacheModel(jsUrl);
      return { modelInstance, modelUrl };
    } catch (error) {
      if (error instanceof TypeError && (error.message.includes('fetch') || error.message.includes('module'))) {
        const mjsUrl = new URL(`${identifier}.mjs`, import.meta.url).href;
        modelUrl = mjsUrl;
        const modelInstance = await this.#loadAndCacheModel(mjsUrl);
        return { modelInstance, modelUrl };
      } else {
        throw error;
      }
    }
  }

  async #loadAndCacheModel(modelUrl) {

    if (ABindgroup.modelRegistry.has(modelUrl)) {
      return ABindgroup.modelRegistry.get(modelUrl);
    }

    try {
      const modelModule = await import(modelUrl);
      const ModelClass = modelModule.default;
      if (typeof ModelClass !== 'function') {
        throw new Error(`The module at ${modelUrl} must have a default export.`);
      }
      const modelInstance = new ModelClass();
      ABindgroup.modelRegistry.set(modelUrl, modelInstance);
      return modelInstance;
    } catch (error) {
      console.error(`Failed to load or instantiate model from: ${modelUrl}`);
      throw error;
    }
  }

  #provideModelToChildren(modelInstance) {
    if (!modelInstance) return;
    const binders = this.querySelectorAll('a-bind');
    binders.forEach(binder => {
      if (!binder.model) {
        binder.model = modelInstance;
      }
    });
  }
}

if (!customElements.get('a-bind')) {
  customElements.define('a-bind', ABind);
}
if (!customElements.get('a-bindgroup')) {
  customElements.define('a-bindgroup', ABindgroup);
}
