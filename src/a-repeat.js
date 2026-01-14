/**
 * @file a-repeat.js
 * @description List rendering for ABind.
 * Subscribes to ABind data updates and projects templates into target elements.
 * @author Holmes Bryant
 * @license GPL-3.0
 */

import Bus, { crosstownBus } from './Bus.js';
import loader from './loader.js';
import PathResolver from './PathResolver.js';

export default class ARepeat extends HTMLElement {
  #data = [];
  #isConnected = false;
  #model;
  #prop;
  #targetSelector;
  #targetElem;
  #templateSelector;
  #templatesList;

  #templateMap = new Map();
  #defaultTemplate;
  #unsubscribe;

  static observedAttributes = [
    'model',
    'prop',
    'target',
    'template',
    'templates'
  ];

  constructor() {
    super();
  }

  // --- Lifecycle ---

  async connectedCallback() {
    this.#isConnected = true;
    this.#initTemplates();

    // Resolve Target Element
    if (this.#targetSelector) {
      this.#targetElem = await loader.load(this.#targetSelector, this);
    } else {
      this.#targetElem = this;
    }

    // Attempt to sync if model/prop are already present
    if (this.#model && this.#prop) {
      this.#subscribe();
    }
  }

  disconnectedCallback() {
    this.#isConnected = false;
    this.#cleanup();
    this.#targetElem = null;
  }

  attributeChangedCallback(attr, oldval, newval) {
    if (oldval === newval) return;
    switch (attr) {
      case 'model':
        // Usually set via property, but if attribute is used, we assume it's a global or module key
        loader.load(newval).then(model => this.model = model);
        break;
      case 'prop':
        this.prop = newval;
        break;
      case 'target':
        this.#targetSelector = newval;
        break;
      case 'template':
        this.#templateSelector = newval;
        break;
      case 'templates':
        this.#templatesList = newval;
        break;
    }
  }

  // --- Public ---

  get model() { return this.#model; }
  set model(value) {
    if (this.#model !== value) {
      this.#model = value;
      this.#subscribe();
    }
  }

  get prop() { return this.#prop; }
  set prop(value) {
    if (this.#prop !== value) {
      this.#prop = value;
      this.#subscribe();
    }
  }

  /**
   * Direct setter for data if not using Pub/Sub
   */
  get items() { return this.#data; }
  set items(value) {
    this.#render(value);
  }

  // --- Private ---

  #cleanup() {
    if (this.#unsubscribe) {
      this.#unsubscribe();
      this.#unsubscribe = null;
    }
  }

  async #initTemplates() {
    this.#templateMap.clear();
    this.#defaultTemplate = null;

    // 1. Internal Templates
    const internalTemplates = Array.from(this.children).filter(el => el.localName === 'template');
    internalTemplates.forEach(tmpl => this.#registerTemplate(tmpl));

    // 2. External Single Template
    if (this.#templateSelector) {
      const tmpl = await loader.load(this.#templateSelector, this);
      if (tmpl) this.#registerTemplate(tmpl);
    }

    // 3. Fallback: If no templates found, treat own content as template
    if (this.#templateMap.size === 0 && !this.#defaultTemplate && this.childNodes.length > 0) {
      const range = document.createRange();
      range.selectNodeContents(this);
      this.#defaultTemplate = range.cloneContents();
      this.replaceChildren(); // Clear self to prepare for rendering
    }
  }

  /**
   * Traverses the cloned DOM tree to:
   * 1. Interpolate text tokens {{key}}
   * 2. Interpolate attribute tokens prop="{{key}}"
   * 3. Pass context to nested ARepeats
   */
  #interpolate(node, item, index) {
    // --- Context Injection for Nested Repeats ---
    // If we find a nested ARepeat, we assume it iterates over a property of the CURRENT item.
    // We must strictly set its model to 'item' so it can resolve its 'prop'.
    if (node.localName === 'a-repeat') {
      if (!node.hasAttribute('model')) {
        node.model = item;
      }
      // We do NOT recurse inside a nested repeat's structure here,
      // because that repeat will handle its own rendering when it connects.
      // However, we MUST interpolate its attributes (like prop="{{sublist}}") first.
    }

    // --- Attribute Interpolation ---
    if (node.attributes) {
      for (const attr of node.attributes) {
        if (attr.value.includes('{{')) {
          attr.value = this.#replaceTokens(attr.value, item, index);
        }
      }
    }

    // --- Text Node Interpolation ---
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.nodeValue;
      if (text.includes('{{')) {
        node.nodeValue = this.#replaceTokens(text, item, index);
      }
    }

    // --- Recursion ---
    // If it's a template element (nested template), we recurse into its content
    // to ensure tokens are replaced before the template is potentially used.
    if (node.localName === 'template') {
       this.#interpolate(node.content, item, index);
       return;
    }

    // Standard child recursion
    if (node.hasChildNodes()) {
      // Convert to array to avoid issues if DOM changes during iteration
      Array.from(node.childNodes).forEach(child =>
        this.#interpolate(child, item, index)
      );
    }
  }

  #registerTemplate(tmpl) {
    if (!(tmpl instanceof HTMLTemplateElement)) return;
    const type = tmpl.getAttribute('type');
    if (type) {
      this.#templateMap.set(type, tmpl.content);
    } else if (!this.#defaultTemplate) {
      this.#defaultTemplate = tmpl.content;
    }
  }

  #render(data) {
    // Validation
    if (!Array.isArray(data)) {
      if (data === null || data === undefined) data = [];
      else {
        console.warn('a-repeat: Data is not an array', data);
        return;
      }
    }

    this.#data = data;
    if (!this.#targetElem) return;

    const fragment = document.createDocumentFragment();

    data.forEach((item, index) => {
      // Determine Template Type (looks for 'type' or 'component' property in data)
      const itemType = item.type || item.component;
      const selectedTemplate = this.#templateMap.get(itemType) || this.#defaultTemplate;

      if (selectedTemplate) {
        const clone = selectedTemplate.cloneNode(true);
        this.#interpolate(clone, item, index);
        fragment.appendChild(clone);
      }
    });

    this.#targetElem.replaceChildren(fragment);
  }

  #replaceTokens(str, item, index) {
    return str.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (match, path) => {
      if (path === 'index') return index;
      if (path === 'this' || path === 'item') return item; // Edge case: array of primitives

      const val = PathResolver.getValue(item, path);
      // If undefined, return empty string to keep DOM clean.
      // If valid value, return it.
      return (val !== undefined && val !== null) ? val : '';
    });
  }

  /**
   * Subscribes to the crosstownBus.
   * This allows ARepeat to react whenever data is announced on the Bus.
   */
  #subscribe() {
    this.#cleanup();
    if (!this.#model || !this.#prop) return;

    // 1. Initial Sync: Get current value immediately
    const initialVal = PathResolver.getValue(this.#model, this.#prop);
    if (initialVal) this.#render(initialVal);

    // 2. Subscribe to future updates
    const busKey = Bus.getKey(this.#model, this.#prop);
    this.#unsubscribe = crosstownBus.hopOn(busKey, (val) => {
      this.#render(val);
    });
  }
}

if (!customElements.get('a-repeat')) customElements.define('a-repeat', ARepeat);
