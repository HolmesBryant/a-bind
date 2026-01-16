/**
 * @file a-bindgroup.js
 * @author Holmes Bryant <https://github.com/HolmesBryant>
 * @license GPL-3.0
 * @version 2.6.0
 */

import loader from './loader.js';

export default class ABindgroup extends HTMLElement {
  #childObserver;
  #children = new Set();
  #debug;
  #isConnected = false;
  #modelAttr;
  #modelKey;
  #modelInstance;
  #property;


  static observedAttributes = ['model', 'attr', 'prop', 'debug'];

  constructor() { super() }

  get model() { return this.#modelInstance }
  set model(value) {
    if (typeof value === 'string') {
      this.setAttribute('model', value);
    } else {
      this.#modelInstance = value;
      if (this.#isConnected) this.#init();
    }
  }

  get modelAttr() { return this.#modelAttr }
  set modelAttr(value) { this.setAttribute('attr', value) }

  get modelKey() { return this.#modelKey }
  set modelKey(value) { this.#modelKey = value }

  get property() { return this.#property }
  set property(value) { this.setAttribute('prop', value) }

  attributeChangedCallback(attr, oldval, newval) {
    if (oldval === newval) return;
    switch (attr) {
      case 'model':
        this.#modelKey = newval;
        if (this.#isConnected) this.#init();
        break;
      case 'attr':
        this.#modelAttr = newval;
        this.#updateChildrenDefaults();
        break;
      case 'prop':
        this.#property = newval;
        this.#updateChildrenDefaults();
        break;
      case 'debug':
        this.#debug = this.hasAttribute('debug');
    }
  }

  async connectedCallback() {
    this.#isConnected = true;
    // if a-bindgroup was inserted into DOM programatically without first appending children
    if (!this.firstElementChild) {
      if (this.#debug) console.warn('a-bindgroup: waiting for children');
      this.#childObserver = new MutationObserver(() => {
        if (this.#isConnected && this.firstElementChild) {
          this.#childObserver.disconnect();
          this.#childObserver = null;
          if (this.#debug) console.warn('a-bindgroup: children have arrived');
          this.#init();
        }
      });

      this.#childObserver.observe(this, { childList: true });
    } else if (this.#modelKey) {
      this.#init();
    }
  }

  disconnectedCallback() {
    this.#children.clear();
  }

  // --- Public ---

  async register(child) {
    this.#children.add(child);
    this.#applyDefaultsToChild(child);
  }

  unregister(child) {
    this.#children.delete(child);
  }

  // --- Private ---

  #applyDefaultsToChild(child) {
    if (this.#debug) child.toggleAttribute('debug', true);
    // only apply if child hasn't defined its own
    if (!child.model) child.model = this.#modelInstance;

    if (!child.property && !child.modelAttr) {
      if (this.#property) child.property = this.#property;
      if (this.#modelAttr) child.modelAttr = this.#modelAttr;
    }
  }

  async #init() {
    if (!this.#isConnected) return;

    if (!this.#modelInstance && !this.#modelKey) {
      return // silent wait
    } else if (this.#modelInstance && !this.#modelKey) {
      this.#modelKey = Object.getPrototypeOf(this.#modelInstance).constructor.name;
    } else {
      this.#modelInstance = await this.#resolveModel();
    }

    this.#registerChildren();
  }

  #registerChildren() {
    const children = this.querySelectorAll('a-bind, a-repeat');
    for (const child of children) {
      if (child.closest('a-bindgroup') === this) {
        this.register(child);
      }
    }
  }

  async #resolveModel() {
    if (!this.#modelKey) {
      console.error('a-bindgroup: model is required');
      return null;
    }

    if (this.#modelInstance) return this.#modelInstance;

    if (this.#modelKey === "this") {
      return this.getRootNode().host;
    }

    try {
      const instance = await loader.load(this.#modelKey);
      if (!instance) {
        throw new Error(`Could not resolve model: ${this.#modelKey}`);
      }

      return instance;
    } catch (error) {
      console.error('a-bindgroup: ', error);
    }
  }

  #updateChildrenDefaults() {
    for (const child of this.#children) {
      this.#applyDefaultsToChild(child);
    }
  }
}

if (!customElements.get('a-bindgroup')) customElements.define('a-bindgroup', ABindgroup);
