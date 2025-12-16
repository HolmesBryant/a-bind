/**
 * @file a-bindgroup.js
 * @author Holmes Bryant <https://github.com/HolmesBryant>
 * @license GPL-3.0
 * @version 2.5.2
 */

import { Loader } from './utils/Loader.js';
import { LogUtils } from './utils/LogUtils.js';

export class ABindgroup extends HTMLElement {
  #debug = false;
  #model;
  #modelKey = null;
  #modelInstance = null;
  #children = new Set();

  static observedAttributes = ['debug', 'model'];

  constructor() { super(); }

  // --- Public API ---

  get debug() { return this.#debug }
  set debug(value) { this.toggleAttribute('debug', value !== false )}

  get model() { return this.#modelInstance; }
  set model(value) {
    this.#modelInstance = value;
    this.#notifyChildren();
  }

  get elements() { return Array.from(this.#children); }

  // --- Lifecycle ---

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
    this.#children.clear();
  }

  // --- Logic ---

  async #initializeGroup() {
    const key = this.#model;
    if (!key) return;

    LogUtils.log(this.#logCtx, 'Loading Model', { key });

    try {
      const instance = await Loader.resolve(key);
      if (!this.isConnected) return;
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

  get #logCtx() {
    return {
      debug: this.#debug,
      type: 'group',
      tagName: 'a-bindgroup',
      signature: LogUtils.getSignature(this)
    };
  }
}
