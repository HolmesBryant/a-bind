/**
 * @file a-bind.js
 * @author Holmes Bryant <https://github.com/HolmesBryant>
 * @license GPL-3.0
 * @version 2.5.2
 */
import { LogUtils } from './utils/LogUtils.js';
import { Loader } from './utils/Loader.js';
import { DomBinder } from './utils/DomBinder.js';
import { ModelObserver, Batcher } from './utils/observer.js';

export class ABind extends HTMLElement {
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
    'debug', 'elem-attr', 'event', 'func', 'model',
    'model-attr', 'once', 'property', 'pull', 'push', 'throttle'
  ];

  constructor() { super(); }

  // --- Public API ---

  get target() { return this.#boundElement; }

  get configuration() { return { ...this.#config }; }

  get model() { return this.#modelInstance; }

  set model(value) {
    if (this.#modelInstance === value) return;
    this.#teardown();
    this.#modelInstance = value;
    if (this.#isConnected) {
      this.#reinitialize();
    }
  }

  // --- Lifecycle ---

  attributeChangedCallback(attr, oldval, newval) {
    if (oldval === newval) return;
    this.#updateConfig(attr, newval);

    if (this.#isConnected && ['model', 'property', 'model-attr'].includes(attr)) {
      this.#reinitialize();
    }
  }

  connectedCallback() {
    this.#isConnected = true;
    this.#waitForChildren();
  }

  disconnectedCallback() {
    this.#isConnected = false;
    this.#teardown();
    this.#releaseModelReference();
    if (this.#childObserver) {
      this.#childObserver.disconnect();
      this.#childObserver = null;
    }

    const group = this.closest('a-bindgroup');
    if (group) group.unregister(this);
  }

  // --- Initialization ---

  #waitForChildren() {
    if (this.firstElementChild) {
      this.#initialize('Connected');
      return;
    }

    if (this.#childObserver) this.#childObserver.disconnect();

    this.#childObserver = new MutationObserver(() => {
      if (this.firstElementChild) {
        this.#childObserver.disconnect();
        this.#childObserver = null;
        this.#initialize('Child Inserted');
      }
    });
    this.#childObserver.observe(this, { childList: true });
  }

  async #initialize(trigger) {
    if (this.#isInitializing || !this.#isConnected) return;
    this.#isInitializing = true;

    this.#findTargetElement();
    if (!this.#boundElement) {
        this.#isInitializing = false;
        return;
    }

    // NEW: Manage Disabled State during Async Load
    // Prevents user interaction before the model is ready (The "Unbound Gap")
    const el = this.#boundElement;
    const canDisable = 'disabled' in el;
    const wasDisabled = el.disabled; // Remember original state (e.g. <input disabled>)

    if (canDisable) el.disabled = true;

    try {
      const source = await this.#resolveModelSource();

      if (!this.#isConnected || !this.#modelInstance) return;

      LogUtils.log(this.#logCtx, 'Initialized', {
        trigger,
        source,
        boundElement: LogUtils.getSignature(this.#boundElement)
      });

      this.#setupBinding();
    } catch (err) {
      console.error('a-bind error:', err);
    } finally {
      // NEW: Restore Disabled State
      // Only re-enable if we disabled it AND it wasn't originally disabled by the user
      if (canDisable && !wasDisabled && this.#isConnected) {
          el.disabled = false;
      }
      this.#isInitializing = false;
    }
  }

  #reinitialize() {
    this.#teardown();
    this.#hasUpdated = false;
    this.#initialize('Re-init');
  }

  // --- Model Resolution ---

  #findTargetElement() {
    let element = this.firstElementChild;
    while (element && element.localName === 'a-bind') {
      element = element.firstElementChild;
    }
    this.#boundElement = element;

    if (!this.#boundElement && this.#config.debug) {
      console.warn('a-bind: No valid target element found');
    }
  }

  async #resolveModelSource() {
    // 1. Check for Group
    const group = this.closest('a-bindgroup');
    if (group) {
      await customElements.whenDefined('a-bindgroup');
      if (!this.#isConnected) return 'Aborted';

      group.register(this);

      if (group.model) {
        this.#modelInstance = group.model;
        return 'Group (Immediate)';
      } else {
        return 'Group (Waiting)';
      }
    }

    // 2. Check for Manual/Existing Model
    if (this.#modelInstance) return 'Manual';

    // 3. Load from Attribute
    if (this.#config.model) {
      this.#modelInstance = await Loader.resolve(this.#config.model);
      if (!this.#isConnected) return 'Aborted';

      if (this.#modelInstance && typeof this.#config.model === 'string') {
        this.#modelKey = this.#config.model;
        Loader.incrementRef(this.#modelKey);
      }
      return `Loader (${this.#config.model})`;
    }

    return 'None';
  }

  // --- Binding & Events ---

  #setupBinding() {
    this.#abortController = new AbortController();

    // 1. DOM Listeners (Pull)
    const canListen = this.#config.property || this.#config.func || this.#config.modelAttr;
    if (canListen && this.#config.event && !this.#config.pull) {
      this.#boundElement.addEventListener(
        this.#config.event,
        (e) => this.#handleElementEvent(e),
        { signal: this.#abortController.signal }
      );
    }

    // 2. Model Listeners (Push)
    if (!this.#config.push) {
      this.#subscribeToModel();
      this.applyUpdate(undefined, 'Initial Sync');
    }
  }

  #subscribeToModel() {
    const observer = ModelObserver.get(this.#modelInstance, true);
    const prop = this.#config.property || this.#config.modelAttr;

    if (observer && prop) {
      this.#subscriptionCallback = (value) => {
        if (this.#config.once && this.#hasUpdated) return;
        Batcher.add(this, value, `Model Change (${prop})`);
      };
      observer.subscribe(prop, this.#subscriptionCallback);
    }
  }

  #handleElementEvent(event) {
    if (this.#config.func) {
      this.#executeFunction(event);
      return;
    }

    if (this.#config.push) return;
    if (!this.#config.property && !this.#config.modelAttr) return;

    const value = this.#extractValueFromEvent(event);
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

  #extractValueFromEvent(event) {
    const el = this.#boundElement;

    // 1. Select Multiple
    if (el.localName === 'select' && el.multiple) {
      return Array.from(el.selectedOptions).map(o => o.value);
    }

    // 2. Checkbox
    if (el.type === 'checkbox') {
        const currentModelVal = this.#getModelValue();
        if (Array.isArray(currentModelVal)) {
            const val = el.getAttribute('value') || el.value;
            const idx = currentModelVal.indexOf(val);
            const newArr = [...currentModelVal];

            if (el.checked && idx === -1) newArr.push(val);
            else if (!el.checked && idx > -1) newArr.splice(idx, 1);
            return newArr;
        }
        return el.checked;
    }

    // 3. Radio
    if (el.type === 'radio') {
        if (el.checked) {
            if (el.value === 'true') return true;
            if (el.value === 'false') return false;
            return el.value === 'on' ? true : el.value;
        }
        return undefined;
    }

    // 4. Custom Element
    if (event.target !== el && event.target.value !== undefined) {
      return event.target.value;
    }

    // 5. Standard fallback
    const val = this.#getDomValue(el, this.#config.elemAttr);
    if (val === 'true') return true;
    if (val === 'false') return false;
    return val;
  }

  // --- Updates ---

  applyUpdate(value, reason) {
    if (value === undefined) {
      value = this.#getModelValue();
    }

    const isDebug = this.#config.debug;
    const prevDom = isDebug ? this.#getDomValue(this.#boundElement, this.#config.elemAttr) : undefined;

    // Apply the update
    const attrs = this.#config.elemAttr.split(',').map(s => s.trim());
    attrs.forEach(attr => DomBinder.update(this.#boundElement, attr, value));
    this.#hasUpdated = true;

    // Capture the ACTUAL final state from the DOM
    const postDom = isDebug ? this.#getDomValue(this.#boundElement, this.#config.elemAttr) : undefined;

    LogUtils.log(this.#logCtx, 'Update DOM', {
        reason,
        value,
        previous: prevDom,
        actual: postDom // The "Post Update" value
    });
  }

  #updateModel(value) {
    if (value === undefined) return;

    const oldValue = this.#getModelValue();
    if (oldValue === value) return;

    if (this.#config.modelAttr) {
      this.#setModelAttr(value);
    } else {
      this.#setObjectProperty(this.#modelInstance, this.#config.property, value);
    }

    // Capture the final state from the Model
    const postModel = this.#config.debug ? this.#getModelValue() : undefined;

    LogUtils.log(this.#logCtx, 'Update Model', {
      value,
      previous: oldValue,
      actual: postModel // The "Post Update" value
    });

    const observer = ModelObserver.get(this.#modelInstance, false);
    const prop = this.#config.property || this.#config.modelAttr;
    if (observer && prop) observer.publish(prop, value);
  }

  // --- Helpers ---

  #getDomValue(el, attr) {
    if (attr.startsWith('style.')) {
      const prop = attr.substring(6);
      const val = getComputedStyle(el).getPropertyValue(prop);
      return val ? val.trim() : '';
    }
    if (attr in el) return el[attr];
    if (el.hasAttribute(attr)) return el.getAttribute(attr);
    return el.value;
  }

  #getModelValue() {
    if (!this.#modelInstance) return undefined;
    if (this.#config.modelAttr) {
      if (this.#config.modelAttr.startsWith('style.')) {
        return this.#modelInstance.style?.[this.#config.modelAttr.substring(6)];
      }
      return this.#modelInstance.getAttribute?.(this.#config.modelAttr);
    }

    // Computed Style from Model Element
    if (this.#modelInstance instanceof HTMLElement && this.#config.property.startsWith('style.')) {
        const prop = this.#config.property.substring(6);
        const val = getComputedStyle(this.#modelInstance).getPropertyValue(prop);
        return val ? val.trim() : '';
    }

    return this.#getObjectProperty(this.#modelInstance, this.#config.property);
  }

  #setModelAttr(value) {
    if (this.#config.modelAttr.startsWith('style.')) {
      this.#modelInstance.style.setProperty(this.#config.modelAttr.substring(6), value);
    } else {
      this.#modelInstance.setAttribute(this.#config.modelAttr, value);
    }
  }

  #executeFunction(event) {
    if (!this.#config.func) return;
    const parts = this.#config.func.split('.');
    const fnName = parts.pop();
    const ctxPath = parts.join('.');

    let ctx = ctxPath ? this.#getObjectProperty(this.#modelInstance, ctxPath) : this.#modelInstance;
    if (!ctx || typeof ctx[fnName] !== 'function') {
      ctx = ctxPath ? this.#getObjectProperty(window, ctxPath) : window;
    }

    if (ctx && typeof ctx[fnName] === 'function') {
      ctx[fnName].call(ctx, event, this.#boundElement, this.#modelInstance);
    } else {
      console.warn(`a-bind: Function ${this.#config.func} not found.`);
    }
  }

  #teardown() {
    this.#abortController?.abort();
    if (this.#inputTimer) clearTimeout(this.#inputTimer);

    const observer = ModelObserver.get(this.#modelInstance, false);
    const prop = this.#config.property || this.#config.modelAttr;
    if (observer && prop && this.#subscriptionCallback) {
      observer.unsubscribe(prop, this.#subscriptionCallback);
    }
    this.#subscriptionCallback = null;
  }

  #releaseModelReference() {
    if (this.#modelKey) {
      Loader.decrementRef(this.#modelKey);
      this.#modelKey = null;
    }
  }

  #updateConfig(attr, value) {
    const isBool = (v) => v !== null && v !== 'false';
    switch (attr) {
      case 'debug': this.#config.debug = isBool(value); break;
      case 'model': this.#config.model = value; break;
      case 'property': this.#config.property = value; break;
      case 'model-attr': this.#config.modelAttr = value; break;
      case 'event': this.#config.event = value; break;
      case 'elem-attr': this.#config.elemAttr = value || 'value'; break;
      case 'func': this.#config.func = value; break;
      case 'throttle': this.#config.throttle = parseInt(value) || 0; break;
      case 'pull': this.#config.pull = isBool(value); break;
      case 'push': this.#config.push = isBool(value); break;
      case 'once': this.#config.once = isBool(value); break;
    }
  }

  #getObjectProperty(obj, path) {
    if (!path || !obj) return undefined;
    const parts = path.split('.');
    if (this.#isUnsafePath(parts)) return undefined;
    try {
        return parts.reduce((acc, part) => acc && acc[part], obj);
    } catch (e) { return undefined; }
  }

  #setObjectProperty(obj, path, value) {
    if (!obj || !path) return;
    const parts = path.split('.');
    if (this.#isUnsafePath(parts)) return;

    const last = parts.pop();
    const target = parts.length ? this.#getObjectProperty(obj, parts.join('.')) : obj;
    if (target && typeof target === 'object') {
        if (target instanceof CSSStyleDeclaration && last.startsWith('--')) {
            target.setProperty(last, value);
        } else {
            target[last] = value;
        }
    }
  }

  #isUnsafePath(parts) {
    return parts.some(p => p === '__proto__' || p === 'constructor' || p === 'prototype');
  }

  get #logCtx() {
    const trace = {};
    if (this.#config.debug) {
        trace.modelInstance = this.#modelInstance;
        trace.boundElement = this.#boundElement;
        trace.modelProp = this.#config.property || this.#config.modelAttr || 'N/A';
        try {
            trace.modelValue = this.#modelInstance ? this.#getModelValue() : '<null>';
        } catch (e) { trace.modelValue = '<error>'; }
        trace.elemProp = this.#config.elemAttr;
        try {
            if (this.#boundElement) {
                trace.elemValue = this.#getDomValue(this.#boundElement, this.#config.elemAttr);
            } else { trace.elemValue = '<no-element>'; }
        } catch (e) { trace.elemValue = '<error>'; }
    }
    return {
      debug: this.#config.debug,
      type: 'bind',
      tagName: 'a-bind',
      signature: `${LogUtils.getSignature(this)} → ${LogUtils.getSignature(this.#boundElement)}`,
      trace
    };
  }
}
