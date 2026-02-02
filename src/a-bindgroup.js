/**
 * @file a-bindgroup.js
 * @author Holmes Bryant <https://github.com/HolmesBryant>
 * @license GPL-3.0
 */

import { loader } from './Loader.js';

/**
 * A Custom Element (<a-bindgroup>) that acts as a context provider for
 * child <a-bind> and <a-repeat> elements. It allows setting a shared 'model',
 * 'prop', or 'attr' on a parent level to avoid repetition on children.
 *
 * @extends HTMLElement
 */
export default class ABindgroup extends HTMLElement {
  #childObserver;
  #children = new Set();
  #debug;
  #isConnected = false;
  #modelAttr;
  #modelKey;
  #modelInstance;
  #property;
  #initPending = false;

  static observedAttributes = ['model', 'attr', 'prop', 'debug'];

  constructor() { super() }

  // --- Getters / Setters ---

  /**
   * Gets the resolved model instance.
   * Sets the model:
   * - If string: updates the 'model' attribute.
   * - If object: sets the internal instance and triggers initialization.
   * @type {object|string}
   */
  get model() { return this.#modelInstance }
  set model(value) {
    if (typeof value === 'string') {
      this.setAttribute('model', value);
    } else {
      this.#modelInstance = value;
      if (this.#isConnected) this.#init();
    }
  }

  /**
   * Gets or sets the 'attr' attribute.
   * Represents a shared attribute name to bind to on the model (if the model is an Element).
   * @type {string}
   */
  get modelAttr() { return this.#modelAttr }
  set modelAttr(value) { this.setAttribute('attr', value) }

  /**
   * Gets or sets the model key (identifier).
   * @type {string}
   */
  get modelKey() { return this.#modelKey }
  set modelKey(value) { this.#modelKey = value }

  /**
   * Gets or sets the 'prop' attribute.
   * Represents a shared property name to bind to on the model.
   * @type {string}
   */
  get property() { return this.#property }
  set property(value) { this.setAttribute('prop', value) }

  // -- Lifecycle --

  /**
   * Called when an observed attribute changes.
   * Updates internal state and propagates changes to registered children.
   *
   * @param {string} attr - The attribute name.
   * @param {string} oldval - The old value.
   * @param {string} newval - The new value.
   */
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

  /**
   * Called when the element is connected to the DOM.
   * Initializes the group. If children are not yet present, sets up a
   * MutationObserver to wait for them.
   */
  async connectedCallback() {
    this.#isConnected = true;
    // if a-bindgroup was inserted into DOM programatically without first appending children
    if (!this.firstElementChild) {
      if (this.#debug) console.warn('a-bindgroup: waiting for children');

      this.#childObserver = new MutationObserver(() => {
        if (this.#isConnected && this.querySelector('a-bind, a-repeat')) {
          if (this.#initPending) return;
          this.#initPending = true;
          requestAnimationFrame(() => {
            if (!this.#isConnected) return;
            if (this.#childObserver) {
              this.#childObserver.disconnect();
              this.#childObserver = null;
            }

            this.#initPending = false;
            if (this.#debug) console.warn('a-bindgroup: children have arrived');
            this.#init();
          });
        }
      });

      this.#childObserver.observe(this, { childList: true });
    } else if (this.#modelKey) {
      this.#init();
    }
  }

  /**
   * Called when disconnected from the DOM.
   * Clears the registry of child elements.
   */
  disconnectedCallback() {
    this.#children.clear();
  }

  // --- Public ---

  /**
   * Registers a child element (a-bind or a-repeat) with this group.
   * Applies the group's model, property, or attribute configurations to the child
   * if the child has not explicitly defined them.
   *
   * @param {HTMLElement} child - The child element to register.
   * @returns {Promise<void>}
   */
  async register(child) {
    this.#children.add(child);
    this.#applyDefaultsToChild(child);
  }

  /**
   * Unregisters a child element from the group.
   * @param {HTMLElement} child - The child element to remove.
   */
  unregister(child) {
    this.#children.delete(child);
  }

  // --- Private ---

  /**
   * Applies the group's default settings (debug, model, property, attr)
   * to a specific child element.
   *
   * @private
   * @param {HTMLElement} child - The target child element.
   */
  #applyDefaultsToChild(child) {
    if (this.#debug) child.toggleAttribute('debug', true);
    // only apply if child hasn't defined its own
    if (!child.model && this.#modelInstance) child.model = this.#modelInstance;

    if (!child.property && !child.modelAttr) {
      if (this.#property) child.property = this.#property;
      if (this.#modelAttr) child.modelAttr = this.#modelAttr;
    }
  }

  /**
   * Initializes the group.
   * Resolves the model instance (if needed) and registers existing children.
   *
   * @private
   * @returns {Promise<void>}
   */
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

  /**
   * Scans the DOM for nested <a-bind> or <a-repeat> elements
   * and registers them if they don't have their own model defined.
   *
   * @private
   */
  #registerChildren() {
    const children = this.querySelectorAll('a-bind, a-repeat');
    for (const child of children) {
      if (child.closest('a-bindgroup') === this && !child.hasAttribute('model')) {
        this.register(child);
      }
    }
  }

  /**
   * Resolves the model instance using the Loader.
   * Handles the special "this" keyword (resolves to ShadowRoot host).
   *
   * @private
   * @returns {Promise<object|HTMLElement|null>} The resolved model.
   */
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

  /**
   * Iterates over all registered children and re-applies defaults.
   * Used when group attributes (like 'prop' or 'attr') change dynamically.
   *
   * @private
   */
  #updateChildrenDefaults() {
    for (const child of this.#children) {
      this.#applyDefaultsToChild(child);
    }
  }
}

if (!customElements.get('a-bindgroup')) customElements.define('a-bindgroup', ABindgroup);
