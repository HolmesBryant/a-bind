/**
 * @file a-bindgroup.js
 * @author Holmes Bryant <https://github.com/HolmesBryant>
 * @license GPL-3.0
 * @version 2.6.0
 */

import loader from './loader.js';

export default class ABindgroup extends HTMLElement {
  isConnected = false;
  #model;
  #modelInstance;
  #children = new Set();

  /**
   * Shared registry to map instances back to keys for Bus communication
   * @type {Map<any, string>}
   */
  static modelRegistry = new Map();

  static observedAttributes = ['model'];

  constructor() { super() }

  get model() { return this.#model }
  set model(value) { this.setAttribute('model', value) }

  attributeChangedCallback(attr, oldval, newval) {
    if (oldval === newval) return;
    if (attr === 'model') {
      this.#model = newval;
      if (this.isConnected) this.#init();
    }
  }

  async connectedCallback() {
    this.isConnected = true;
    this.#init();
  }

  disconnectedCallback() {
    this.#children.clear();
  }

  // --- Public ---

  async register(child) {
    this.#children.add(child);
    if (!child.model) {
      if (this.#modelInstance) {
        child.resolvedModel = this.#modelInstance;
      } else {
        child.resolvedModel = await this.#resolveModel();
      }
    }
  }

  unregister(child) {
    this.#children.delete(child);
  }

  // --- Private ---

  async #init() {
    if (!this.isConnected) return;
    if (!this.#model) {
      console.error('a-bindgroup requires a "model" attribute');
      return null;
    }

    await this.#resolveModel();
  }

  async #resolveModel() {
    if (this.#modelInstance) return this.#modelInstance;
    try {
      const instance = await loader.load(this.#model);
      if (!instance) {
        throw new Error(`Could not resolve model: ${this.#model}`);
      }

      this.#modelInstance = instance;
      ABindgroup.modelRegistry.set(instance, this.#model);
      return this.#modelInstance;
    } catch (error) {
      console.error('a-bindgroup: ', error);
    }
  }
}

if (!customElements.get('a-bindgroup')) customElements.define('a-bindgroup', ABindgroup);
