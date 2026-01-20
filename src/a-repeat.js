/**
 * @file a-repeat.js
 * @description A highly performant, data-driven, reactive, DOM-based template engine and list renderer that can handle complex, nested, and polymorphic layouts.
 *  Works in both Light DOM and Shadow DOM.
 * @author Holmes Bryant
 * @license GPL-3.0
 */

import Bus, { crosstownBus } from './Bus.js';
import { loader } from './loader.js';
import PathResolver from './PathResolver.js';

const TOKEN_REGEX = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g;

export default class ARepeat extends HTMLElement {
  // -- Attributes --
  #key;
  #model;
  #prop;
  #scope;
  #target;
  #template;
  #templates;

  // -- Properties --
  #data = [];
  #defaultTemplate;
  #isConnected = false;
  #targetElem;
  #templateMap = new Map();
  #unsubscribe;

  static observedAttributes = [
    'key',
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
      case 'key':
        this.#key = newval;
        break;
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
        if (newval === "this") {
          this.#scope = this.getRootNode().host;
          if (this.#isConnected) this.#subscribe();
          return;
        }
        loader.load(newval)
        .then( scope => {
          this.#scope = scope;
          if (this.#isConnected) this.#subscribe();
        }).catch ( error => {
          console.error(`a-repeat: Failed to load scope: ${newval}`, this, error);
        });
        break;
      case 'target':
        this.#target = newval;
        break;
      case 'template':
        this.#template = newval;
        break;
      case 'templates':
        try {
          const list = JSON.parse(newval);
          this.#templates = list;
        } catch (error) {
          console.error('a-repeat: Invalid JSON in "templates" attribute', this, error);
        }

        break;
    }
  }

  async connectedCallback() {
    this.#isConnected = true;
    this.#upgrade('model');
    this.#upgrade('scope');
    this.#initTemplates();

    // Resolve Target Element
    if (this.#target) {
      try {
        this.#targetElem = await loader.load(this.#target, this);
      } catch (error) {
        console.error(`a-repeat: Failed to load target element. ${this.target}`, this, error);
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
    if (this.#template) {
      const tmpl = await loader.load(this.#template, this);
      if (tmpl) this.#registerTemplate(tmpl);
    }

    // Self-Templating (Implicit Default)
    if (this.#templateMap.size === 0 && !this.#defaultTemplate && this.childNodes.length > 0) {
      const range = document.createRange();
      range.selectNodeContents(this);
      this.#defaultTemplate = range.cloneContents();
      this.replaceChildren();
    }

    // Validate Compatibility with Keyed Rendering
    if (this.#key) {
      let valid = true;
      let invalidName = '';

      // Check Default Template
      if (this.#defaultTemplate && this.#defaultTemplate.children.length !== 1) {
        valid = false;
        invalidName = 'Default Template';
      }

      // Check Named Templates
      if (valid) {
        for (const [id, fragment] of this.#templateMap) {
          if (fragment.children.length !== 1) {
            valid = false;
            invalidName = `Template "#${id}"`;
            break;
          }
        }
      }

      // Fallback if invalid
      if (!valid) {
        console.warn(
          `a-repeat: Keyed rendering disabled. ${invalidName} has ${this.#defaultTemplate?.children.length || 'multiple'} root elements (must be exactly 1 Element). Falling back to index-based rendering.`,
          this
        );
        this.#key = null;
        this.removeAttribute('key');
      }
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

    if (!this.#targetElem) {
      this.#data = data;
      return;
    }

    const parent = this.#targetElem;
    const oldData = this.#data;
    this.#data = data;

    // Generate DOM content for a single item
    const createNode = (item, index) => {
      let templateId = item.template;
      if (typeof templateId === 'string' && templateId.startsWith('#')) {
        templateId = templateId.slice(1);
      }
      const selectedTemplate = this.#templateMap.get(templateId) || this.#defaultTemplate;

      if (selectedTemplate) {
        const clone = selectedTemplate.cloneNode(true);
        this.#interpolate(clone, item, index);
        return clone;
      }
      return null;
    };

    // If the template is compatable with key-based rendering
    if (this.#key) {
      const keyMap = new Map();
      const children = Array.from(parent.children);

      // Snapshot existing DOM nodes by Key
      children.forEach(child => {
        if (child.__arepeat_key !== undefined) {
          keyMap.set(child.__arepeat_key, child);
        }
      });

      // Iterate new data: Move, Update, or Create
      data.forEach((item, index) => {
        const itemVal = PathResolver.getValue(item, this.#key);
        const itemKey = (itemVal !== undefined && itemVal !== null) ? String(itemVal) : null;

        if (itemKey === null) {
          // Fallback if key missing in data
          const frag = createNode(item, index);
          if (frag) parent.insertBefore(frag, parent.children[index] || null);
          return;
        }

        let node = keyMap.get(itemKey);

        if (node) {
          // reuse if element exists
          keyMap.delete(itemKey); // Mark as used

          // Move if position is different
          if (parent.children[index] !== node) {
            parent.insertBefore(node, parent.children[index] || null);
          }

          // Update Context: If the object reference changed, update
          // child bindings (a-bind/a-repeat) within this node.
          if (node.model !== item) {
            node.model = item;
            const boundChildren = node.querySelectorAll('a-bind, a-repeat');
            for (const child of boundChildren) {
              // avoid crossing into nested repeat scopes
              if (!child.closest('a-repeat') || child.closest('a-repeat') === this) {
                child.model = item;
              }
            }
          }
        } else {
          // create New Element
          const frag = createNode(item, index);
          if (frag) {
            // tag the root element with the key to find it later.
            // Note: This assumes the template produces a single root Element.
            const element = frag.firstElementChild;
            if (element) {
              element.__arepeat_key = itemKey;
              element.model = item; // Store model ref on DOM
            }
            parent.insertBefore(frag, parent.children[index] || null);
          }
        }
      });

      // Remove nodes whose keys are no longer in the data
      keyMap.forEach(node => node.remove());
      return;
    }

    // Fallback, index-based rendering

    // only optimize if the current child count matches the previous data length.
    const canOptimize = parent.children.length === oldData.length;

    if (canOptimize) {
      const children = Array.from(parent.children);

      // Remove excess DOM nodes if the new list is shorter
      while (children.length > data.length) {
        children.pop().remove();
      }

      // Update existing items or Append new ones
      data.forEach((item, index) => {
        // If data reference is identical, skip
        if (index < oldData.length && item === oldData[index]) {
          return;
        }

        const newNode = createNode(item, index);
        if (newNode) {
          if (index < children.length) {
            // Replace changed item in place
            children[index].replaceWith(newNode);
          } else {
            // Append new item
            parent.append(newNode);
          }
        }
      });
    } else {
      // Full Re-render for templates with multiple root nodes or length mismatch
      const fragment = document.createDocumentFragment();
      data.forEach((item, index) => {
        const node = createNode(item, index);
        if (node) fragment.append(node);
      });
      parent.replaceChildren(fragment);
    }
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

  /**
   * Captures properties set on the instance before the class was upgraded.
   * Deletes the own property and resets it to trigger the class setter.
   */
  #upgrade(prop) {
    if (Object.prototype.hasOwnProperty.call(this, prop)) {
      const value = this[prop];
      delete this[prop];
      this[prop] = value;
    }
  }

   // --- Public ---

  get key() { return this.#key }
  set key(value) {
    if (this.#key === value) return;
    this.setAttribute('key', value);
  }

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

  get target() { return this.#target }
  set target(value) {
    if (this.#target === value) return;
    this.setAttribute('target', value);
  }

  get template() { return this.#template }
  set template(value) {
    if (this.#template === value) return;
    this.setAttribute('template', value);
  }

  get templates() { return this.#templates }
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
