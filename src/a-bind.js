/**
 * @file a-bind.js
 * @description specific Data-binding for Custom Elements and ESM Modules.
 *              Features MutationObserver support, batched DOM updates via requestAnimationFrame,
 *              and intelligent throttling (Input Debounce / Output Rate Limiting).
 * @author Holmes Bryant <Holmes Bryant <https://github.com/HolmesBryant>
 * @version 2.0.0
 * @license GPL-3.0
 */

// --- Pub/Sub System ---
const modelObservers = new WeakMap();

/**
 * Handles the Publish/Subscribe pattern for data models.
 * Uses a WeakMap to ensure Models are garbage collected when no longer in use.
 * @private
 */
class ModelObserver {
  #subscribers = new Map();

  /**
   * Subscribes a callback function to a specific property change.
   * @param {string} property - The property name to observe.
   * @param {Function} callback - The function to execute when the property changes.
   */
  subscribe(property, callback) {
    if (!this.#subscribers.has(property)) {
      this.#subscribers.set(property, new Set());
    }
    this.#subscribers.get(property).add(callback);
  }

  /**
   * Unsubscribes a callback function from a specific property.
   * @param {string} property - The property name.
   * @param {Function} callback - The specific callback to remove.
   */
  unsubscribe(property, callback) {
    if (this.#subscribers.has(property)) {
      const set = this.#subscribers.get(property);
      set.delete(callback);
      if (set.size === 0) this.#subscribers.delete(property);
    }
  }

  /**
   * Publishes a value change to all subscribers of a property.
   * @param {string} property - The property name that changed.
   * @param {any} value - The new value.
   */
  publish(property, value) {
    if (this.#subscribers.has(property)) {
      this.#subscribers.get(property).forEach(cb => cb(value));
    }
  }
}

/**
 * Manages DOM updates to prevent layout thrashing.
 * Batches multiple updates into a single Animation Frame.
 * @private
 */
class UpdateManager {
  #pendingUpdates = new Map();
  #frameRequested = false;

  /**
   * Schedules an element update for the next animation frame.
   * @param {ABind} element - The a-bind element instance to update.
   * @param {any} value - The value to apply.
   */
  scheduleUpdate(element, value) {
    this.#pendingUpdates.set(element, value);
    if (!this.#frameRequested) {
      this.#frameRequested = true;
      requestAnimationFrame(() => this.#flushUpdates());
    }
  }

  #flushUpdates() {
    this.#pendingUpdates.forEach((value, element) => {
      if (element.isConnected) element.applyUpdate(value);
    });
    this.#pendingUpdates.clear();
    this.#frameRequested = false;
  }
}
const updateManager = new UpdateManager();

/**
 * A Custom Element (<a-bind>) that provides two-way data binding between
 * JavaScript models/variables and DOM elements.
 *
 * @extends HTMLElement
 */
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
  #throttle = 150;

  // --- Internal State ---
  #abortController;
  #boundElement;
  #hasUpdated = false;
  #isInitializing = false;
  #subscriptionCallback = null;
  #subscribedProperty = null;
  #childObserver = null;

  // --- Throttling

  /** Timer for UI -> Model (Debounce) */
  #inputTimer = null;

  /** Timer for Model -> UI (Rate Limit) */
  #outputTimer = null;

  /** Timestamp of last UI render */
  #lastOutputTime = 0;

  /** Stores latest data value while waiting */
  #pendingOutputValue = null;

  /**
   * List of attributes to observe for changes.
   * @static
   * @returns {string[]} ['debug', 'elem-attr', 'event', 'func', 'model', 'model-attr', 'once', 'property', 'pull', 'push', 'throttle']
   */
  static observedAttributes = [
    'debug', 'elem-attr', 'event', 'func', 'model',
    'model-attr', 'once', 'property', 'pull', 'push', 'throttle'
  ];


  constructor() {
    super();
  }

  // --- Lifecycle ---

  /**
   * Called when an observed attribute has been added, removed, updated, or replaced.
   * Parses attributes and re-initializes binding if needed.
   * @param {string} attr - The attribute name.
   * @param {string} oldval - The old value.
   * @param {string} newval - The new value.
   */
  attributeChangedCallback(attr, oldval, newval) {
    if (oldval === newval) return;
    this.#updatePropertyFromAttribute(attr, newval);
    if (this.isConnected && ['model', 'property', 'model-attr'].includes(attr)) {
      this.#reinitialize();
    }
  }

  /**
   * Called when the element is connected to the DOM.
   * Sets up MutationObservers to wait for child elements and initializes bindings.
   */
  connectedCallback() {
    if (this.#debug) console.debug('Debugging:', this);
    if (!window.abind) window.abind = ABind;

    // Use MutationObserver instead of polling to wait for children
    if (!this.firstElementChild) {
      this.#childObserver = new MutationObserver(() => {
        if (this.firstElementChild) {
          this.#childObserver.disconnect();
          this.#childObserver = null;
          this.#initialize();
        }
      });
      this.#childObserver.observe(this, { childList: true });
    } else {
      this.#initialize();
    }
  }

  /**
   * Called when the element is disconnected from the DOM.
   * Cleans up observers, event listeners, and pending throttle timers.
   */
  disconnectedCallback() {
    this.#teardown();
    if (this.#childObserver) {
      this.#childObserver.disconnect();
      this.#childObserver = null;
    }
  }

  // --- Public API ---

  /**
   * Manually triggers a model update.
   * This is required because standard JS assignment (obj.prop = val) cannot be observed natively without Proxies.
   *
   * @param {Object|string} model - The model object or global variable name.
   * @param {string} property - The property to update.
   * @param {any} value - The new value to set and publish.
   */
  static update(model, property, value) {
    const observer = ABind.#getObserver(model, true);
    if (observer) observer.publish(property, value);
    else console.warn('a-bind: Invalid model for update', model);
  }

  /**
   * Defers a model update by a specified amount of time.
   * Useful for business logic delays (distinct from UI throttling).
   *
   * @param {Object} model - The model object.
   * @param {string} property - The property to update.
   * @param {number} [waitMs=0] - Milliseconds to wait before reading and updating.
   */
  static updateDefer(model, property, waitMs = 0) {
    setTimeout(() => {
      const value = ABind.#getObjectProperty(model, property);
      ABind.update(model, property, value);
    }, waitMs);
  }

  /**
   * Applies a specific value to the bound DOM element.
   * Called automatically by the UpdateManager.
   *
   * @param {any} value - The value to apply to the element's attribute or property.
   */
  applyUpdate(value) {
    this.#updateElement(value);
  }

  // --- Private Methods ---

  /**
   * Executes a defined function on the model or window scope.
   * @private
   * @param {Event} event
   */
  #executeFunction(event) {
    const parts = this.#func.split('.');
    const fnName = parts.pop();
    const ctxPath = parts.join('.');

    // Look on Model first, then Window
    let ctx = ctxPath ? ABind.#getObjectProperty(this.#model, ctxPath) : this.#model;
    if (!ctx || typeof ctx[fnName] !== 'function') {
        ctx = ctxPath ? ABind.#getObjectProperty(window, ctxPath) : window;
    }

    if (ctx && typeof ctx[fnName] === 'function') {
        ctx[fnName].call(ctx, event);
    } else if (this.#debug) {
        console.warn(`a-bind: Function ${this.#func} not found.`);
    }
  }

  /**
   * Handles events triggered by the DOM element (e.g., 'input', 'change').
   * Implements Debouncing: Waits for #throttle ms of inactivity before updating the model.
   *
   * @private
   * @param {Event} event - The DOM event.
   */
  #handleElementEvent(event) {
    if (this.#func) this.#executeFunction(event);
    if (this.#pull || (!this.#property && !this.#modelAttr)) return;

    // Extract Value (Standard logic)
    let value;
    const el = this.#boundElement;
    if (el.localName === 'select' && el.multiple) {
      value = Array.from(el.selectedOptions).map(o => o.value);
    } else if (el.type === 'checkbox') {
      value = el.checked ? (el.getAttribute('value') || true) : (el.getAttribute('value') ? null : false);
    } else if (event.target.value !== undefined) {
      value = event.target.value;
    } else {
      value = el[this.#elemAttr];
    }

    // Throttling Logic (Debounce)
    if (this.#throttle > 0) {
      if (this.#inputTimer) clearTimeout(this.#inputTimer);
      this.#inputTimer = setTimeout(() => {
        this.#updateModel(value);
        this.#inputTimer = null;
      }, this.#throttle);
    } else {
      this.#updateModel(value);
    }
  }

  /**
   * Core initialization logic. Resolves the model, finds the target child element,
   * and establishes listeners.
   * @private
   * @returns {Promise<void>}
   */
  async #initialize() {
    if (this.#isInitializing) return;
    this.#isInitializing = true;

    try {
      if (!this.#model) {
        // If no model yet (e.g., waiting for parent group), exit.
        // Logic in setters/parent will trigger this later.
        this.#isInitializing = false;
        return;
      }

      await this.#resolveModel();

      if (!this.firstElementChild) {
        // Should be caught by MutationObserver in connectedCallback, but double check here.
        this.#isInitializing = false;
        return;
      }

      let element = this.firstElementChild;
      while (element && element.localName === 'a-bind') {
        element = element.firstElementChild;
      }
      this.#boundElement = element;

      if (!this.#boundElement) {
        console.warn('a-bind: No valid child element to bind to.');
        this.#isInitializing = false;
        return;
      }

      this.#abortController = new AbortController();
      this.#setupListeners();

      // Initial Sync
      this.#updateElement();

    } catch (err) {
      console.error('a-bind initialization error:', err, this);
    } finally {
      this.#isInitializing = false;
    }
  }

  /**
   * Re-runs the setup logic when attributes change.
   * @private
   */
  #reinitialize() {
    this.#teardown();
    this.#initialize();
  }

  /**
   * Resolves the 'model' attribute to a JavaScript object, DOM element, or Window property.
   * @private
   * @returns {Promise<void>}
   */
  async #resolveModel() {
    // If model is already an object, we are good.
    if (typeof this.#model === 'object' && this.#model !== null) return;

    // If string, try to find it
    const id = this.#model;
    if (typeof id === 'string') {
        // Try DOM Element
        const el = document.querySelector(id);
        if (el) {
            if (el.localName.includes('-')) await customElements.whenDefined(el.localName);
            this.#model = el;
            return;
        }
        // Try Window Global
        const winObj = ABind.#getObjectProperty(window, id);
        if (winObj) {
            this.#model = winObj;
            return;
        }
    }

    if (this.#debug) console.warn('a-bind: Model not resolved:', id);
  }

  /**
   * Helper to set attributes or properties on the child element.
   * @private
   * @param {HTMLElement} element
   * @param {string} attribute
   * @param {any} value
   */
  #setElementAttribute(element, attribute, value) {
    if (value === undefined || value === null) value = '';

    if (attribute.startsWith('style.')) {
      element.style[attribute.split('.')[1]] = value;
      return;
    }

    // Attribute Setting
    if (element.localName === 'input' && (element.type === 'checkbox' || element.type === 'radio')) {
        element.checked = String(element.value) === String(value) || value === true;
    } else if (element.localName === 'select' && element.multiple) {
        const valArr = Array.isArray(value) ? value.map(String) : String(value).split(',');
        Array.from(element.options).forEach(opt => opt.selected = valArr.includes(opt.value));
    } else if (attribute in element) {
        element[attribute] = value;
    } else {
        element.setAttribute(attribute, value);
    }
  }

  #setObjectProperty(obj, path, value) {
    const parts = path.split('.');
    const last = parts.pop();
    const target = parts.length ? ABind.#getObjectProperty(obj, parts.join('.')) : obj;
    if (target && typeof target === 'object') target[last] = value;
  }

  /**
   * Sets up the two-way binding listeners.
   * 1. DOM -> Model (Event Listener with Debounce)
   * 2. Model -> DOM (Observer Subscription with Rate Limiting)
   * @private
   */
  #setupListeners() {
    if (!this.#property && !this.#func && !this.#modelAttr) return;

    // Element -> Model (Event)
    if (this.#event) {
      this.#boundElement.addEventListener(
        this.#event,
        (e) => this.#handleElementEvent(e),
        { signal: this.#abortController.signal }
      );
    }

    // Model -> Element (Observer)
    const observer = ABind.#getObserver(this.#model, true);
    this.#subscribedProperty = this.#property || this.#modelAttr;

    if (observer && this.#subscribedProperty) {
      this.#subscriptionCallback = (value) => {
        if (this.#once && this.#hasUpdated) return;
        // updateManager.scheduleUpdate(this, value);
        if (this.#throttle > 0) {
          const now = Date.now();
          const timeSinceLast = now - this.#lastOutputTime;

          if (timeSinceLast >= this.#throttle) {
            // Case 1: Cool down period over. Update immediately.
            this.#lastOutputTime = now;
            updateManager.scheduleUpdate(this, value);
          } else {
            // Case 2: Too fast! Save value for later.
            this.#pendingOutputValue = value;

            // Only schedule a delayed update if one isn't already waiting
            if (!this.#outputTimer) {
              const waitTime = this.#throttle - timeSinceLast;
              this.#outputTimer = setTimeout(() => {
                this.#lastOutputTime = Date.now();
                updateManager.scheduleUpdate(this, this.#pendingOutputValue);
                this.#outputTimer = null;
              }, waitTime);
            }
          }
        } else {
          // No throttle: Update immediately (handled by UpdateManager batching)
          updateManager.scheduleUpdate(this, value);
        }
      };
      observer.subscribe(this.#subscribedProperty, this.#subscriptionCallback);
    }
  }

  /**
   * Cleans up listeners, abort controllers, and clears any active throttle timers (#inputTimer, #outputTimer).
   * @private
   */
  #teardown() {
    this.#abortController?.abort();
    if (this.#inputTimer) clearTimeout(this.#inputTimer);
    if (this.#outputTimer) clearTimeout(this.#outputTimer);
    this.#inputTimer = null;
    this.#outputTimer = null;
    this.#pendingOutputValue = null;
    const observer = ABind.#getObserver(this.#model, false);
    if (observer && this.#subscribedProperty && this.#subscriptionCallback) {
      observer.unsubscribe(this.#subscribedProperty, this.#subscriptionCallback);
    }
    this.#subscribedProperty = null;
    this.#subscriptionCallback = null;
  }

  /**
   * Updates the DOM element with a new value.
   * Handles various element types (input, select, checkbox) and attributes (style.*, standard attrs).
   *
   * @private
   * @param {any} value - The value to write to the element.
   */
  #updateElement(value) {
    if ((!this.#property && !this.#modelAttr) || (this.#once && this.#hasUpdated) || this.#push) return;

    if (value === undefined) {
      value = this.#modelAttr
        ? this.#model.getAttribute(this.#modelAttr)
        : ABind.#getObjectProperty(this.#model, this.#property);
    }

    const attrs = this.#elemAttr.split(',').map(s => s.trim());
    attrs.forEach(attr => this.#setElementAttribute(this.#boundElement, attr, value));

    this.#hasUpdated = true;
  }

  /**
   * Updates the Model with a new value.
   * Publishes the change to other subscribers.
   *
   * @private
   * @param {any} value - The value to write to the model.
   */
  #updateModel(value) {
    let oldValue;
    if (this.#modelAttr) {
      oldValue = this.#model.getAttribute(this.#modelAttr);
    } else {
      oldValue = ABind.#getObjectProperty(this.#model, this.#property);
    }

    // Loose equality check to handle 1 vs "1" updates commonly found in HTML attributes
    if (oldValue == value) return;

    if (this.#modelAttr) {
      this.#model.setAttribute(this.#modelAttr, value);
    } else {
      this.#setObjectProperty(this.#model, this.#property, value);
    }

    // Notify others
    const observer = ABind.#getObserver(this.#model, false);
    const prop = this.#property || this.#modelAttr;
    if (observer && prop) observer.publish(prop, value);
  }

  /**
   * Updates the internal configuration based on attribute changes.
   * Handles 'throttle' logic (parsing int or setting default).
   * @private
   * @param {string} attr
   * @param {string} value
   */
  #updatePropertyFromAttribute(attr, value) {
    switch (attr) {
      case 'model':      this.#model = value; break; // Note: String or Object handled in resolve
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

  // --- Static Helpers ---

  static #getObserver(model, create) {
    if (!model || typeof model !== 'object') return null;
    if (!modelObservers.has(model) && create) {
      modelObservers.set(model, new ModelObserver());
    }
    return modelObservers.get(model) || null;
  }

  static #getObjectProperty(obj, path) {
    if (!path) return obj;
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
  }

  // --- Getters / Setters  ---
  get model() { return this.#model; }
  set model(value) {
    this.#model = value;
    if(this.isConnected) this.#reinitialize();
  }
}

/**
 * A Container Element (<a-bindgroup>) that loads an ES Module model
 * and shares a singleton instance with all child <a-bind> elements.
 *
 * @extends HTMLElement
 */
export class ABindgroup extends HTMLElement {
  static modelRegistry = new Map();
  static modelReferenceCounts = new Map();
  #modelUrl = null;
  #modelInstance = null;
  #mutationObserver = null;

  /**
   * Called when connected. Loads the module defined in the 'model' attribute,
   * instantiates the class, and assigns it to all children.
   */
  async connectedCallback() {
    try {
      const id = this.getAttribute('model');
      if (!id) throw new Error('a-bindgroup requires "model" attribute.');

      // Load Model
      const { modelInstance, modelUrl } = await this.#getModel(id);
      this.#modelUrl = modelUrl;
      this.#modelInstance = modelInstance;

      // Ref Count
      const count = ABindgroup.modelReferenceCounts.get(modelUrl) || 0;
      ABindgroup.modelReferenceCounts.set(modelUrl, count + 1);

      // Apply to existing children
      this.#updateChildren();

      // Watch for new children
      this.#mutationObserver = new MutationObserver((mutations) => {
        let needsUpdate = false;
        for (const mut of mutations) {
            if (mut.addedNodes.length > 0) needsUpdate = true;
        }
        if (needsUpdate) this.#updateChildren();
      });
      this.#mutationObserver.observe(this, { childList: true, subtree: true });

    } catch (err) {
      console.error(err, this);
    }
  }

  /**
   * Called when disconnected. Decrements reference counts and removes the
   * model instance from the registry if count reaches zero.
   */
  disconnectedCallback() {
    this.#mutationObserver?.disconnect();

    if (this.#modelUrl) {
      const count = ABindgroup.modelReferenceCounts.get(this.#modelUrl);
      if (count === 1) {
        ABindgroup.modelRegistry.delete(this.#modelUrl);
        ABindgroup.modelReferenceCounts.delete(this.#modelUrl);
      } else {
        ABindgroup.modelReferenceCounts.set(this.#modelUrl, count - 1);
      }
    }
  }

  /**
   * Scans for <a-bind> children that lack a model and assigns the group's model instance.
   * @private
   */
  #updateChildren() {
    if (!this.#modelInstance) return;
    // Query all a-binds that don't have a model yet
    const binders = this.querySelectorAll('a-bind');
    binders.forEach(binder => {
      // Direct property access is safer than checking attribute
      if (!binder.model) {
        binder.model = this.#modelInstance;
      }
    });
  }

  /**
   * Resolves the module URL relative to the current import meta.
   * @private
   * @param {string} identifier - The model filename or path.
   * @returns {Promise<{modelInstance: Object, modelUrl: string}>}
   */
  async #getModel(identifier) {
    // Determine URL (Relative to import.meta.url)
    let url;
    if (identifier.match(/\.(js|mjs)$/) || identifier.includes('/')) {
        url = new URL(identifier, import.meta.url).href;
    } else {
        // Try .js, fallback to .mjs handled in catch
        url = new URL(`${identifier}.js`, import.meta.url).href;
    }

    return this.#fetchModel(url, identifier);
  }

  /**
   * Imports the module and manages the singleton registry.
   * @private
   * @param {string} url - The full URL of the module.
   * @param {string} originalId - The original identifier for fallback logic.
   * @returns {Promise<Object>}
   */
  async #fetchModel(url, originalId) {
    if (ABindgroup.modelRegistry.has(url)) {
        return { modelInstance: ABindgroup.modelRegistry.get(url), modelUrl: url };
    }

    try {
        const mod = await import(url);
        if (typeof mod.default !== 'function') throw new Error(`Module ${url} missing default class export.`);
        const instance = new mod.default();
        ABindgroup.modelRegistry.set(url, instance);
        return { modelInstance: instance, modelUrl: url };
    } catch (e) {
        // Fallback to .mjs if .js failed and looks like a generic name
        if (url.endsWith('.js') && !originalId.endsWith('.js')) {
            const mjsUrl = url.replace('.js', '.mjs');
            return this.#fetchModel(mjsUrl, originalId);
        }
        throw e;
    }
  }
}

if (!customElements.get('a-bind')) customElements.define('a-bind', ABind);
if (!customElements.get('a-bindgroup')) customElements.define('a-bindgroup', ABindgroup);
