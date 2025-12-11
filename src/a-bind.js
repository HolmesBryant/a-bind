/**
 * @file a-bind.js
 * @description specific Data-binding for Custom Elements and ESM Modules.
 *              Features MutationObserver support, batched DOM updates via requestAnimationFrame,
 *              and intelligent throttling (Input Debounce / Output Rate Limiting).
 * @author Holmes Bryant <Holmes Bryant <https://github.com/HolmesBryant>
 * @version 2.1.0
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
  #throttle = 0;

  // --- Internal State ---
  #abortController;
  #boundElement;
  #hasUpdated = false;
  #isConnected = false;
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
    if (this.#debug) console.groupCollapsed(`attributeChangedCallback(${attr}, ${oldval}, ${newval})`);
    if (oldval === newval) return;
    switch (attr) {
      case 'model':      this.#model = newval; break; // Note: String or Object handled in resolve
      case 'property':   this.#property = newval; break;
      case 'model-attr': this.#modelAttr = newval; break;
      case 'event':      this.#event = newval; break;
      case 'elem-attr':  this.#elemAttr = newval; break;
      case 'func':       this.#func = newval; break;
      case 'throttle':   this.#throttle = parseInt(newval) || 0; break;
      case 'pull':       this.#pull = newval !== null && newval !== 'false'; break;
      case 'push':       this.#push = newval !== null && newval !== 'false'; break;
      case 'once':       this.#once = newval !== null && newval !== 'false'; break;
      case 'debug':      this.#debug = newval !== null && newval !== 'false'; break;
    }

    if (this.#debug) {
      console.log('isConnected', this.#isConnected);
      console.groupEnd();
    }

    if (this.#isConnected && ['model', 'property', 'model-attr'].includes(attr)) {
      this.#reinitialize();
    }
  }

  /**
   * Called when the element is connected to the DOM.
   * Sets up MutationObservers to wait for child elements and initializes bindings.
   */
  connectedCallback() {
    if (this.#debug) console.log('connectedCallback()', this);
    if (!window.abind) window.abind = ABind;
    this.#isConnected = true;

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
    if (this.#debug) console.log('isConnected', this.#isConnected);
  }

  /**
   * Called when the element is disconnected from the DOM.
   * Cleans up observers, event listeners, and pending throttle timers.
   */
  disconnectedCallback() {
    if (this.#debug) console.log('disconnectedCallback', this);
    this.#teardown();
    if (this.#childObserver) {
      this.#childObserver.disconnect();
      this.#childObserver = null;
    }
    this.#isConnected = false;
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
      const value = this.#getObjectProperty(model, property);
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
    if (this.#debug) console.groupCollapsed(`applyUpdate(${value})`);
    this.#updateElement(value);
    if (this.#debug) console.groupEnd();
  }

  // --- Private Methods ---

  /**
   * Executes a defined function on the model or window scope.
   * @private
   * @param {Event} event
   */
  #executeFunction(event) {
    if (this.#debug) console.groupCollapsed(`#executeFunction(${event})`);
    const parts = this.#func.split('.');
    const fnName = parts.pop();
    const ctxPath = parts.join('.');

    // Look on Model first, then Window
    let ctx = ctxPath ? this.#getObjectProperty(this.#model, ctxPath) : this.#model;
    if (!ctx || typeof ctx[fnName] !== 'function') {
        ctx = ctxPath ? this.#getObjectProperty(window, ctxPath) : window;
    }

    if (ctx && typeof ctx[fnName] === 'function') {
        if (this.#debug) console.log('#executeFunction', { fnName, context: ctx, event });
        ctx[fnName].call(ctx, event);
    } else if (this.#debug) {
        console.warn(`Function ${this.#func} not found.`);
    }

    if (this.#debug) {
      console.log('fnName', fnName);
      console.log('ctx', ctx);
      console.log(this.#printDebug());
      console.groupEnd();
    }
  }

  #getObjectProperty(obj, path) {
    if (this.#debug) {
      console.groupCollapsed('#getObjectProperty()');
      console.log('obj', obj);
      console.log('path', path);
    }

    const value = (!path) ? obj : path.split('.').reduce((acc, part) => acc && acc[part], obj);
    if (this.#debug) {
      console.log('value', value);
      console.log(this.#printDebug());
      console.groupEnd();
    }
    return value;
  }

  /**
   * Handles events triggered by the DOM element (e.g., 'input', 'change').
   * Implements Debouncing: Waits for #throttle ms of inactivity before updating the model.
   *
   * @private
   * @param {Event} event - The DOM event.
   */
  #handleElementEvent(event) {
    if (this.#debug) {
      console.groupCollapsed(`#handleElementEvent(${event})`);
      console.log(this.#printDebug());
    }

    if (this.#func) this.#executeFunction(event);
    if (this.#pull || (!this.#property && !this.#modelAttr)) {
      if (this.#debug) console.groupEnd();
      return;
    }

    let value;
    const el = this.#boundElement;
    if (el.localName === 'select' && el.multiple) {
      value = Array.from(el.selectedOptions).map(o => o.value);
    } else if (el.type === 'checkbox') {
      value = el.checked ? (el.getAttribute('value') || true) : false;
    } else if (event.target.value !== undefined) {
      value = event.target.value;
    } else {
      value = el[this.#elemAttr];
    }

    if (this.#debug) {
      console.log('value', value);
      console.groupEnd();
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
    if (this.#debug) {
      console.groupCollapsed('#initialize()');
      console.log('isInitializing', this.#isInitializing);
    }

    if (this.#isInitializing) {
      if (this.#debug) console.groupEnd();
      return;
    }

    this.#isInitializing = true;

    try {
      if (!this.#model) {
        this.#isInitializing = false;
        if (this.#debug) {
          console.log('#initialize paused: No model present yet.');
          console.groupEnd();
        }
        return;
      }

      await this.#resolveModel();

      if (!this.firstElementChild) {
        this.#isInitializing = false;
        if (this.#debug) {
          console.log('firstElementChild', this.firstElementChild);
          console.log('isInitializing', this.#isInitializing);
          console.groupEnd();
        }
        return;
      }

      let element = this.firstElementChild;
      while (element && element.localName === 'a-bind') {
        element = element.firstElementChild;
      }
      this.#boundElement = element;

      if (!this.#boundElement) {
        console.error('a-bind: No valid child element to bind to.');
        this.#isInitializing = false;
        if (this.#debug) {
          console.log('boundElement', this.#boundElement);
          console.log('isInitializing', this.#isInitializing);
          console.groupEnd();
        }
        return;
      }

      if (this.#debug) {
        console.log('Initialized:', { boundElement: this.#boundElement });
        console.log(this.#printDebug());
        console.groupEnd();
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

  #printDebug() {
    let info = {};
    const attrs = ABind.observedAttributes;
    for (const attr of attrs) {
      switch (attr) {
        case 'model':      info.model = this.#model; break;
        case 'property':   info.property = this.#property; break;
        case 'model-attr': info.modelAttr = this.#modelAttr; break;
        case 'event':      info.event = this.#event; break;
        case 'elem-attr':  info.elemAttr = this.#elemAttr; break;
        case 'func':       info.func = this.#func; break;
        case 'throttle':   info.throttle = this.#throttle; break;
        case 'pull':       info.pull = this.#pull; break;
        case 'push':       info.push = this.#push; break;
        case 'once':       info.once = this.#once; break;
      }
    }
    return info;
  }

  /**
   * Re-runs the setup logic when attributes change.
   * @private
   */
  #reinitialize() {
    if (this.#debug) console.groupCollapsed('#reinitialize()');
    this.#teardown();
    this.#initialize();
    if (this.#debug) console.groupEnd();
  }

  /**
   * Resolves the 'model' attribute to a JavaScript object, DOM element, or Window property.
   * @private
   * @returns {Promise<void>}
   */
  async #resolveModel() {
    if (this.#debug) {
      console.groupCollapsed('#resolveModel()');
    }

    if (typeof this.#model === 'object') {
      if (this.#model.localName && this.#model.localName.includes('-')) {
        // It's a custom element
        await customElements.whenDefined(this.#model.localName);
        if (this.#debug) {
          console.log('resolved: model is custom element');
          console.log(this.#printDebug());
          console.groupEnd();
        }
        return;
      } else {
        // It's not a custom element
        if (this.#debug) {
          console.log('resolved: model is object');
          console.log(this.#printDebug());
          console.groupEnd();
        }
      return;
      }
    }

    // If string, try to find it
    const id = this.#model;
    if (typeof id === 'string') {
      // Try DOM Element
      const el = document.querySelector(id);

      if (el) {
        if (el.localName.includes('-')) {
          await customElements.whenDefined(el.localName);
          if (this.#debug) console.log('custom element');
        }

        this.#model = el;

        if (this.#debug) {
          console.log('resolved via DOM Selector:');
          console.log(this.#printDebug());
          console.groupEnd();
        }
        return
      }

      // Try Window Global
      const winObj = this.#getObjectProperty(window, id);
      if (winObj) {
        this.#model = winObj;
        if (this.#debug) {
          console.log('resolved via Window Scope');
          console.log(this.#printDebug());
          console.groupEnd();
        }
        return
      }
    }

    if (this.#debug) {
      console.warn('Model not resolved');
      console.log(this.#printDebug());
      console.groupEnd();
    }
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
    if (this.#debug) console.groupCollapsed(`#setElementAttribute(${element}, ${attribute}, ${value})`);
    // Check if it's a style
    if (attribute.startsWith('style.')) {
      const cssProp = attribute.split('.')[1];
      if (cssProp.startsWith('--')) {
        // CSS Variables require setProperty
        element.style.setProperty(cssProp, value);
      } else {
        // Standard properties (e.g. backgroundColor)
        element.style[cssProp] = value;
      }

      if (this.#debug) {
        console.log({ [cssProp]: value });
        console.groupEnd();
      }
      return;
    }

    // Attribute Setting
    if (element.localName === 'input' && (element.type === 'checkbox' || element.type === 'radio')) {
      element.checked = String(element.value) === String(value);
      if (this.#debug) console.log({ checked: element.checked });
    } else if (element.localName === 'select' && element.multiple) {
      const valArr = Array.isArray(value) ?
        value.map( item => String(item).trim()) :
        String(value).split(',').map(item => item.trim());
      for (const option of element.options) {
        option.selected = valArr.includes(option.value);
      }
      if (this.#debug) console.log('selectedOptions', element.selectedOptions);
    } else if (attribute in element) {
      element[attribute] = value;
    } else {
      element.setAttribute(attribute, value);
    }

    if (this.#debug) {
      console.log(this.#printDebug());
      console.groupEnd();
    }
  }

  #setObjectProperty(obj, path, value) {
    if (this.#debug) console.groupCollapsed(`#setObjectProperty(${obj}, ${path}, ${value})`);
    const parts = path.split('.');
    const last = parts.pop();
    const target = parts.length ? this.#getObjectProperty(obj, parts.join('.')) : obj;
    if (target && typeof target === 'object') target[last] = value;
    if (this.#debug) {
      console.log('target', target);
      console.log('last', last);
      console.log('target[last]', target[last]);
      console.log(this.#printDebug());
      console.groupEnd();
    }
  }

  /**
   * Sets up the two-way binding listeners.
   * 1. DOM -> Model (Event Listener with Debounce)
   * 2. Model -> DOM (Observer Subscription with Rate Limiting)
   * @private
   */
  #setupListeners() {
    if (!this.#property && !this.#func && !this.#modelAttr) return;
    if (this.#debug) console.groupCollapsed('#setupListeners()');

    // Element -> Model (Event)
    if (this.#event && !this.#pull) {
      if (this.#debug) {
        console.log('Element -> Model');
        console.log('boundElement', this.#boundElement);
      }
      this.#boundElement.addEventListener(
        this.#event,
        (e) => this.#handleElementEvent(e),
        { signal: this.#abortController.signal }
      );
    }

    // Model -> Element (Observer)
    if (this.#push) {
      if (this.#debug) {
        console.log(this.#printDebug());
        console.groupEnd();
      }
      return;
    }
    const observer = ABind.#getObserver(this.#model, true);
    this.#subscribedProperty = this.#property || this.#modelAttr;
    if (this.#debug) console.log('#setupListeners: Model -> Element', { property: this.#property, modelAttr: this.#modelAttr });

    if (observer && this.#subscribedProperty) {
      this.#subscriptionCallback = (value) => {
        if (this.#once && this.#hasUpdated) {
          if (this.#debug) {
            console.log('subscribedProperty', this.#subscribedProperty);
            console.log('hasUpdated', this.#hasUpdated);
            console.log(this.#printDebug());
            console.groupEnd();
          }
          return;
        }

        if (this.#throttle > 0) {
          const now = Date.now();
          const timeSinceLast = now - this.#lastOutputTime;

          if (timeSinceLast >= this.#throttle) {
            // Update immediately.
            this.#lastOutputTime = now;
            updateManager.scheduleUpdate(this, value);
            if (this.#debug) {
              console.log('scheduleUpdate', value);
              console.log(this.#printDebug());
              console.groupEnd();
            }
          } else {
            // Too fast. Save value for later.
            this.#pendingOutputValue = value;
            if (this.#debug) {
              console.log('Output throttled (Model -> UI)');
              console.log('pendingOutputValue', this.#pendingOutputValue);
              console.log('wait for', this.#throttle - timeSinceLast);
              console.log(this.#printDebug());
              console.groupEnd();
            }

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
    } else if (this.#debug) {
      console.log(this.#printDebug());
      console.groupEnd();
    }
  }

  /**
   * Cleans up listeners, abort controllers, and clears any active throttle timers (#inputTimer, #outputTimer).
   * @private
   */
  #teardown() {
    if (this.#debug) console.groupCollapsed('#teardown()');
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
    if (this.#debug) {
      console.log('abortController', this.#abortController);
      console.log('inputTimer', this.#inputTimer);
      console.log('outputTimer', this.#outputTimer);
      console.log('pendingOutputValue', this.#pendingOutputValue);
      console.log('subscribedProperty', this.#subscribedProperty);
      console.log('subscriptionCallback', this.#subscriptionCallback);
      console.groupEnd();
    }
  }

  /**
   * Updates the DOM element with a new value.
   * Handles various element types (input, select, checkbox) and attributes (style.*, standard attrs).
   *
   * @private
   * @param {any} value - The value to write to the element.
   */
  #updateElement(value) {
    if (this.#debug) {
      console.groupCollapsed(`#updateElement(${value})`);
    }

    if ((!this.#property && !this.#modelAttr) || (this.#once && this.#hasUpdated) || this.#push) {
      if (this.#debug) {
        console.log(this.#printDebug());
        console.groupEnd();
      }
      return;
    }

    if (value === undefined) {
      if (this.#modelAttr) {
        if (this.#modelAttr.startsWith('style.')) {
            //remove 'style.'
            const prop = this.#modelAttr.substring(6);
            // use getComputedStyle to also catch css variables
            value = getComputedStyle(this.#model).getPropertyValue(prop).trim();
        } else {
            if (this.#model.getAttribute) {
              value = this.#model.getAttribute(this.#modelAttr);
            } else {
              console.warn(`Attempting to use getAttribute(${this.#modelAttr}) on non-element`, this.#model)
            }
        }
      } else {
        value = this.#getObjectProperty(this.#model, this.#property);
      }
    }

    const attrs = this.#elemAttr.split(',').map(s => s.trim());
    attrs.forEach(attr => {
      this.#setElementAttribute(this.#boundElement, attr, value);
      if (this.#debug) console.log(attr, value);
    });

    this.#hasUpdated = true;
    if (this.#debug) {
      console.log('hasUpdated', this.#hasUpdated);
      console.log(this.#printDebug());
      console.groupEnd();
    }
  }

  /**
   * Updates the Model with a new value.
   * Publishes the change to other subscribers.
   *
   * @private
   * @param {any} value - The value to write to the model.
   */
  #updateModel(value) {
    if (this.#debug) console.groupCollapsed(`#updateModel(${value})`);
    let oldValue;

    if (this.#modelAttr) {
      if (this.#modelAttr.startsWith('style.')) {
        // remove 'style.'
        const prop = this.#modelAttr.substring(6);
        oldValue = this.#model.style.getPropertyValue(prop).trim();
      } else {
        oldValue = this.#model.getAttribute(this.#modelAttr);
      }
    } else {
      oldValue = this.#getObjectProperty(this.#model, this.#property);
    }

    if (this.#debug) {
      console.log({ value, oldValue });

    }

    // Loose equality check to handle 1 vs "1" to account for model attributes
    if (oldValue == value) {
      if (this.#debug) {
        console.log('Update skipped: Values are loosely equal.', { oldValue, value });
        console.groupEnd();
      }
      return;
    }

    if (this.#modelAttr) {
      if (this.#modelAttr.startsWith('style.')) {
          const prop = this.#modelAttr.substring(6);
          // setProperty works for both vars (--) and standard props (color)
          this.#model.style.setProperty(prop, value);
      } else {
          this.#model.setAttribute(this.#modelAttr, value);
      }
    } else {
      this.#setObjectProperty(this.#model, this.#property, value);
    }

    // Notify others
    const observer = ABind.#getObserver(this.#model, false);
    const prop = this.#property || this.#modelAttr;
    if (observer && prop) observer.publish(prop, value);
    if (this.#debug) {
      console.log('model', this.#model);
      console.log('observer.publish()', prop, value);
      console.log(this.#printDebug());
      console.groupEnd();
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

  // --- Getters / Setters  ---
  get model() { return this.#model; }
  set model(value) {
    this.#model = value;
    if(this.#isConnected) this.#reinitialize();
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
  #debug = false;
  #model;
  #modelKey = null;
  #modelInstance = null;
  #mutationObserver = null;

  static observedAttributes = ['debug', 'model'];

  constructor() {
    super();
  }

  // --- Lifecycle ---

  attributeChangedCallback(attr, oldval, newval) {
    if (oldval === newval) return;
    if (this.#debug) console.log(`attributeChangedCallback(${attr}, ${oldval}, ${newval})`);
    if (attr === 'debug') this.#debug = newval !== 'false';
    if (attr === 'model') this.#model = newval;
  }

  /**
   * Called when connected. Loads the module defined in the 'model' attribute,
   * instantiates the class, and assigns it to all children.
   */
  async connectedCallback() {
    if (this.#debug) {
      console.groupCollapsed('connectedCallback()');
    }
    try {
      const idx = this.#model;
      if (!idx) throw new Error('a-bindgroup requires "model" attribute.');

      const { modelInstance, modelKey } = await this.#loadModel(idx);
      this.#modelKey = modelKey;
      this.#modelInstance = modelInstance;

      // Ref Count
      const count = ABindgroup.modelReferenceCounts.get(this.#modelKey) || 0;
      ABindgroup.modelReferenceCounts.set(this.#modelKey, count + 1);

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

      if (this.#debug) {
        console.log({modelInstance, modelKey, count});
        console.groupEnd();
      }
    } catch (err) {
      console.error(err, this);
      console.groupEnd();
    }
  }

  /**
   * Called when disconnected. Decrements reference counts and removes the
   * model instance from the registry if count reaches zero.
   */
  disconnectedCallback() {
    if (this.#debug) console.groupCollapsed('disconnectedCallback()');
    this.#mutationObserver?.disconnect();

    if (this.#modelKey) {
      const count = ABindgroup.modelReferenceCounts.get(this.#modelKey);
      if (count === 1) {
        ABindgroup.modelRegistry.delete(this.#modelKey);
        ABindgroup.modelReferenceCounts.delete(this.#modelKey);
      } else {
        ABindgroup.modelReferenceCounts.set(this.#modelKey, count - 1);
      }
    }

    if (this.#debug) {
      console.log({
        modelRegistry: ABindgroup.modelRegistry,
        modelReferenceCounts: ABindgroup.modelReferenceCounts
      });
      console.groupEnd();
    }
  }

  // --- Private ---

  /**
   * Determines if a function/object can be called with the 'new' keyword.
   * Uses Reflect.construct for the most reliable check.
   * @param {any} func - The object or function to check.
   * @returns {boolean}
   */
  #isInstantiable(func) {
    if (this.#debug) console.groupCollapsed(`#isInstantiable(${func})`);
    if (typeof func !== 'function') {
      if (this.#debug) console.log('Not Instantiable');
      return false;
    }

    try {
      // Reflect.construct throws a TypeError if 'func' is not a constructor.
      Reflect.construct(func, [], func);
      if (this.#debug) console.log('Is Instantiable');
      return true;
    } catch (e) {
      if (this.#debug) console.log('Not Instantiable');
      return false;
    }
  }

  /**
   * Determines if a string looks like a path or URL pointing to a JS module.
   * @param {string} str - The input string.
   * @returns {boolean}
   */
  #isModulePath(str) {
    if (this.#debug) console.log(`#isModulePath(${str})`);
    return (
      str.startsWith('http://') ||
      str.startsWith('https://') ||
      str.startsWith('./') ||
      str.startsWith('../') ||
      str.endsWith('.js') ||
      str.endsWith('.mjs')
    );
  }

  /**
   * Loads a resource, which can be either a JavaScript module (URL/Path)
   * or a CSS selector for a DOM element.
   * * If a module is loaded:
   * 1. It checks for a 'default' export.
   * 2. It checks if the export is an instantiable constructor (class or function).
   * 3. It instantiates the constructor if possible, otherwise uses the object as-is.
   * * If a CSS selector is provided:
   * 1. It attempts to select the element in the DOM.
   * @param {string} key - The CSS selector or module URL/Path.
   * @returns {Promise<{model: any, key: string}>} - An object containing the loaded model/element and the original key.
   */
  async #loadModel(modelKey) {
    if (this.#debug) console.groupCollapsed(`#loadModel(${modelKey})`);

    // Check if the argument is a path/URL
    if (this.#isModulePath(modelKey)) {
      try {
        const mod = await import(modelKey);
        // does the file have a default export?
        let rawModel = mod.default;
        if (!rawModel) {
          // If not, grab the first exported item
          const modelName = Object.keys(mod)[0];
          rawModel = mod[modelName];
        }
        const model = this.#isInstantiable(rawModel) ? new rawModel() : rawModel;
        if (this.#debug) {
          console.log({ modelInstance:model, modelKey, moduleObject, rawModel })
          console.groupEnd();
        }
        return { modelInstance:model, modelKey };

      } catch (error) {
        // Re-throw the error, but add context
        console.error(`Failed to load or instantiate module: ${modelKey}`, error);
        console.groupEnd();
        throw new Error(`Module loading failed for modelKey: ${modelKey}`);
      }
    }

    // It's not a url. Maybe it's global var?
    if (window[modelKey]) {
      try {
        const modelObject = window[modelKey];
        const model = this.#isInstantiable(modelObject) ? new modelObject() : modelObject;

        if (this.#debug) {
          console.log({ modelInstance:model, modelKey, modelObject })
          console.groupEnd();
        }

        return { modelInstance:model, modelKey };
      } catch (error) {
        // Re-throw the error, but add context
        console.error(`Failed to load or instantiate module: ${modelKey}`, error);
        console.groupEnd();
        throw new Error(`Module loading failed for modelKey: ${modelKey}`);
      }
    }

    // Finally, treat it as a CSS selector
    try {
      const element = document.querySelector(modelKey);
      if (!element) throw new Error(`CSS selector matched no element: ${modelKey}`);
      // The modelInstance is the selected DOM element
      if (this.#debug) {
        console.log({ modelInstance: element, modelKey });
        console.groupEnd();
      }
      return { modelInstance: element, modelKey };
    } catch (error) {
      // Re-throw the error, but add context
      console.error(`Failed to select DOM element: ${modelKey}`, error);
      if (this.#debug) console.groupEnd();
      throw new Error(`DOM selection failed for modelKey: ${modelKey}`);
    }
  }

  /**
   * Scans for <a-bind> children that lack a model and assigns the group's model instance.
   * @private
   */
  #updateChildren() {
    if (this.#debug) {
      console.groupCollapsed('#updateChildren()');
      console.log('modelInstance', this.#modelInstance);
    }
    if (!this.#modelInstance) {
      console.groupEnd();
      return;
    }
    // Query all a-binds that don't have a model yet
    const binders = this.querySelectorAll('a-bind');
    if (this.#debug) console.groupCollapsed('binders');
    binders.forEach(binder => {
      // Direct property access is safer than checking attribute
      if (!binder.model) binder.model = this.#modelInstance;
      if (this.#debug) console.log(binder)
    });
    if (this.#debug) {
      console.groupEnd();
      console.groupEnd();
    }
  }

  // --- Getters / Setters

  get debug() { return this.#debug }
  set debug(value) { this.toggleAttribute('debug', value !== false )}

  get model() { return this.#model }
  set model(value) { this.setAttribute('model', value) }
}

if (!customElements.get('a-bind')) customElements.define('a-bind', ABind);
if (!customElements.get('a-bindgroup')) customElements.define('a-bindgroup', ABindgroup);
