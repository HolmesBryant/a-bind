/**
 * @file a-repeat.js
 * @description List rendering.
 * Subscribes to crosstownBus data updates and projects templates into target elements.
 * @author Holmes Bryant
 * @license GPL-3.0
 */

import Bus, { crosstownBus } from './Bus.js';
import loader from './loader.js';
import PathResolver from './PathResolver.js';

const TOKEN_REGEX = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g;

export default class ARepeat extends HTMLElement {
  #data = [];
  #isConnected = false;
  #model;
  #prop;
  #scope;
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
    'scope',
    'target',
    'template',
    'templates'
  ];

  constructor() {
    super();
  }

  // --- Lifecycle ---

  attributeChangedCallback(attr, oldval, newval) {
    if (oldval === newval) return;
    switch (attr) {
      case 'model':
        loader.load(newval)
        .then( model => {
          this.#model = model
          if (this.#isConnected) this.#subscribe();
        })
        .catch( error => {
          console.error(`a-repeat: Failed to load model: ${newval}`, error);
        });
        break;
      case 'prop':
        this.#prop = newval;
        this.#subscribe();
        break;
      case 'scope':
        loader.load(newval)
        .then( scope => {
          this.#scope = scope;
          if (this.#isConnected) this.#subscribe();
        }).catch ( error => {
          console.error(`a-repeat: Failed to load scope: ${newval}`, this, error);
        });
        break;
      case 'target':
        this.#targetSelector = newval;
        break;
      case 'template':
        this.#templateSelector = newval;
        break;
      case 'templates':
        try {
          const list = JSON.parse(newval);
          this.#templatesList = list;
        } catch (error) {
          console.error('a-repeat: Invalid JSON in "templates" attribute', this, error);
        }

        break;
    }
  }

  async connectedCallback() {
    this.#isConnected = true;
    this.#initTemplates();

    // Resolve Target Element
    if (this.#targetSelector) {
      try {
        this.#targetElem = await loader.load(this.#targetSelector, this);
      } catch (error) {
        console.error(`a-repeat: Failed to load target element. ${this.targetSelector}`, this, error);
        return;
      }
    } else {
      this.#targetElem = this;
    }

    // Attempt to sync if model/prop are already present
    if (this.#model && this.#prop) {
      this.#subscribe();
    } else if (this.#data.length > 0) {
      this.#render(this.#data);
    }
  }

  disconnectedCallback() {
    this.#isConnected = false;
    this.#cleanup();
    this.#targetElem = null;
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

    // Internal Templates
    const internalTemplates = Array.from(this.children).filter(el => el.localName === 'template');
    internalTemplates.forEach(tmpl => this.#registerTemplate(tmpl));

    // External Single Template
    if (this.#templateSelector) {
      const tmpl = await loader.load(this.#templateSelector, this);
      if (tmpl) this.#registerTemplate(tmpl);
    }

    // If no templates found, treat own content as template
    if (this.#templateMap.size === 0 && !this.#defaultTemplate && this.childNodes.length > 0) {
      const range = document.createRange();
      range.selectNodeContents(this);
      this.#defaultTemplate = range.cloneContents();
      // Clear self to prepare for rendering
      this.replaceChildren();
    }
  }

  /**
   * Traverses the cloned DOM tree to:
   * 1. Interpolate text tokens {{key}}
   * 2. Interpolate attribute tokens prop="{{key}}"
   * 3. Pass context to nested ARepeats
   */
  #interpolate(node, item, index) {
    const isNestedRepeat = node.localName === 'a-repeat';

    // --- Context Injection for Nested Repeats ---
    if (isNestedRepeat) {
      if (!node.hasAttribute('model')) {
        node.model = item;
      }

      if (!node.hasAttribute('scope') && this.scope) {
        node.scope = this.#scope;
      }
    }

    // --- Attribute Interpolation ---
    if (node.attributes) {
      for (const attr of node.attributes) {
        if (attr.value.includes('{{')) {
          attr.value = this.#replaceTokens(attr.value, item, index);
        }
      }
    }

    if (isNestedRepeat) return;

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
    const template = tmpl.id;
    if (template) {
      this.#templateMap.set(template, tmpl.content);
    } else if (!this.#defaultTemplate) {
      this.#defaultTemplate = tmpl.content;
    }
  }

  #render(data) {
    // Validation
    if (!Array.isArray(data)) {
      if (data === null || data === undefined) {
        data = [];
      } else {
        console.warn('a-repeat: Data is not an array', data, this);
        return;
      }
    }

    this.#data = data;
    if (!this.#targetElem) return;

    const fragment = document.createDocumentFragment();

    data.forEach((item, index) => {
      let templateId = item.template;
      if (typeof templateId === 'string' && templateId.startsWith('#')) {
        templateId = templateId.slice(1);
      }

      const selectedTemplate = this.#templateMap.get(templateId) || this.#defaultTemplate;

      if (selectedTemplate) {
        const clone = selectedTemplate.cloneNode(true);
        this.#interpolate(clone, item, index);
        fragment.append(clone);
      }
    });

    this.#targetElem.replaceChildren(fragment);
  }

  #replaceTokens(str, item, index) {
    return str.replace(TOKEN_REGEX, (match, path) => {
      if (path === 'index') return index;
      // Edge case: array of primitives
      if (path === 'this' || path === 'item') {
        return (typeof item === 'object') ? '' : item;
      }

      let val = PathResolver.getValue(item, path);

      if (val === undefined && this.#scope) {
        val = PathResolver.getValue(this.#scope, path);
      }

      if (typeof val === 'string' && val.toLowerCase().trim().startsWith('javascript:')) {
        console.warn('a-repeat: blocked unsafe javascript URI', this);
        return '';
      }

      if (val === undefined  || val === null || typeof val === 'object') {
        return '';
      } else {
        return val;
      }
    });
  }

  /**
   * Subscribes to the crosstownBus.
   * This allows ARepeat to react whenever data is announced on the Bus.
   */
  #subscribe() {
    this.#cleanup();
    if (!this.#prop) return;

    let source = this.#model;
    let initialValue = this.#model ?
      PathResolver.getValue(this.#model, this.#prop) :
      undefined;

    // If not found on model, try scope
    if (initialValue === undefined && this.#scope) {
      initialValue = PathResolver.getValue(this.#scope, this.#prop);
      if (initialValue !== undefined) source = this.#scope;
    }

    if (initialValue) this.#render(initialValue);
    if(!source) return;

    const busKey = Bus.getKey(source, this.#prop);
    this.#unsubscribe = crosstownBus.hopOn(busKey, (val) => { this.#render(val) });
  }

   // --- Public ---

  get model() { return this.#model; }
  set model(value) {
    if (this.#model === value) return;
    if (typeof value === 'object' && value !== null) {
      this.#model = value;
      if (this.#isConnected && this.#prop) this.#subscribe();
    } else {
      this.setAttribute('model', value);
    }
  }

  get prop() { return this.#prop; }
  set prop(value) {
    if (this.#prop === value) return;
    this.setAttribute('prop', value);
  }

  get scope() { return this.#scope }
  set scope(value) {
    if (this.#scope === value) return;
    if (typeof value === 'object' && value !== null) {
      this.#scope = value;
      if (this.#isConnected && this.#prop) this.#subscribe();
    } else {
      this.setAttribute('scope', value);
    }
  }

  get target() { return this.#targetSelector }
  set target(value) {
    if (this.#targetSelector === value) return;
    this.setAttribute('target', value);
  }

  get template() { return this.#templateSelector }
  set template(value) {
    if (this.#templateSelector === value) return;
    this.setAttribute('template', value);
  }

  get templates() { return this.#templatesList }
  set templates(value) {
    if (!value) return this.removeAttribute('templates');
    const str = typeof value === 'string' ? value : JSON.stringify(value);
    this.setAttribute('templates', str);
  }

  /**
   * Direct setter for data if not using Pub/Sub
   */
  get items() { return this.#data; }
  set items(value) {
    this.#render(value);
  }
}

if (!customElements.get('a-repeat')) customElements.define('a-repeat', ARepeat);
