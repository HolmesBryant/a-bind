/**
 * @file a-bindgroup.js
 * @author Holmes Bryant <https://github.com/HolmesBryant>
 * @license GPL-3.0
 * @version 2.6.0
 */

import loader from './loader.js';

export default class ABindgroup extends HTMLElement {
  #isConnected = false;
  #modelKey;
  #modelInstance;
  #children = new Set();
  #childObserver;

  static observedAttributes = ['model'];

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

  get modelKey() { return this.#modelKey }
  set modelKey(value) { this.#modelKey = value }

  attributeChangedCallback(attr, oldval, newval) {
    if (oldval === newval) return;
    if (attr === 'model') {
      this.#modelKey = newval;
      if (this.#isConnected) this.#init();
    }
  }

  async connectedCallback() {
    this.#isConnected = true;
    // if a-bindgroup was inserted into DOM programatically without first appending children
    if (!this.firstElementChild) {
      console.warn('a-bindgroup: waiting for children')
      this.#childObserver = new MutationObserver(() => {
        if (this.#isConnected && this.firstElementChild) {
          this.#childObserver.disconnect();
          this.#childObserver = null;
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
    if (!child.model) {
      child.model = this.#modelInstance;
      child.modelKey = this.#modelKey;
    }
  }

  unregister(child) {
    this.#children.delete(child);
  }

  // --- Private ---

  async #init() {
    if (!this.#isConnected) return;

    if (!this.#modelInstance && !this.#modelKey) {
      return console.error('a-bindgroup: A model is required');
    } else if (this.#modelInstance && !this.#modelKey) {
      this.#modelKey = Object.getPrototypeOf(this.#modelInstance).constructor.name;
    } else {
      this.#modelInstance = await this.#resolveModel();
    }

    this.#registerChildren();
  }

  #registerChildren() {
    const children = this.querySelectorAll('a-bind');
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
}

if (!customElements.get('a-bindgroup')) customElements.define('a-bindgroup', ABindgroup);
