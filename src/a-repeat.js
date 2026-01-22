/**
 * @file a-repeat.js
 * @description A DOM-based template engine and list renderer.
 * @author Holmes Bryant
 * @license GPL-3.0
 */

import Bus, { crosstownBus } from './Bus.js';
import { loader } from './Loader.js';
import PathResolver from './PathResolver.js';

const TOKEN_REGEX = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g;
const PROTOCOL_REGEX = /^[a-zA-Z][a-zA-Z0-9+.-]*:/; // RFC 3986 Scheme validation
const ALLOWED_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:', 'ftp:']);

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
      const content = range.cloneContents();
      const bindings = this.#compile(content);
      this.#defaultTemplate = { content, bindings };
      this.replaceChildren();
    }

    // Validate Compatibility with Keyed Rendering
    if (this.#key) {
      let valid = true;
      let invalidName = '';

      // Check Default Template
      if (this.#defaultTemplate && this.#defaultTemplate.content.children.length !== 1) {
        valid = false;
        invalidName = 'Default Template';
      }

      // Check Named Templates
      if (valid) {
        for (const [id, def] of this.#templateMap) {
          if (def.content.children.length !== 1) {
            valid = false;
            invalidName = `Template "#${id}"`;
            break;
          }
        }
      }

      // Fallback if invalid
      if (!valid) {
        console.warn(
          `a-repeat: Keyed rendering disabled. ${invalidName} has ${this.#defaultTemplate?.content.children.length || 'multiple'} root elements (must be exactly 1 Element). Falling back to index-based rendering.`,
          this
        );
        this.#key = null;
        this.removeAttribute('key');
      }
    }
  }

  /**
   * Scans a DocumentFragment for bindings and returns a list of instructions.
   * Walk the DOM once at startup rather than every render.
   */
  #compile(fragment) {
    const bindings = [];

    const crawl = (node, path) => {
      // Text Nodes
      if (node.nodeType === Node.TEXT_NODE) {
        const parts = this.#parseTemplateString(node.nodeValue);
        if (parts) {
          bindings.push({ type: 'text', path: [...path], parts });
        }
        return;
      }

      // Elements
      if (node.nodeType === Node.ELEMENT_NODE) {
        // Attributes
        if (node.hasAttributes()) {
          for (const attr of node.attributes) {
            const parts = this.#parseTemplateString(attr.value);
            if (parts) {
              bindings.push({ type: 'attr', path: [...path], name: attr.name, parts });
            }
          }
        }

        // Nested Repeats: Stop recursion here.
        // The nested repeat will handle its own templates when it upgrades.
        if (node.localName === 'a-repeat') {
          bindings.push({ type: 'nest-repeat', path: [...path] });
          return;
        }

        // Nested Templates
        if (node.localName === 'template') {
          const contentBindings = this.#compile(node.content);
          if (contentBindings.length > 0) {
            bindings.push({
              type: 'template-content',
              path: [...path],
              bindings: contentBindings
            });
          }
          return;
        }

        // Recursion
        const children = node.childNodes;
        for (let i = 0; i < children.length; i++) {
          crawl(children[i], [...path, i]);
        }
      }
    };

    const children = fragment.childNodes;
    for (let i = 0; i < children.length; i++) {
      crawl(children[i], [i]);
    }

    return bindings;
  }

  #parseTemplateString(str) {
    if (!str.includes('{{')) return null;

    const parts = [];
    let lastIndex = 0;
    // Use local RegExp to avoid global state issues
    const regex = new RegExp(TOKEN_REGEX);
    let match;

    while ((match = regex.exec(str)) !== null) {
      if (match.index > lastIndex) {
        parts.push(str.slice(lastIndex, match.index));
      }
      parts.push({ token: match[1] });
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < str.length) {
      parts.push(str.slice(lastIndex));
    }

    return parts.length > 0 ? parts : null;
  }

  /**
   * Applies data to a cloned template instance using pre-compiled bindings.
   */
  #applyBindings(root, bindings, item, index) {
    for (const binding of bindings) {
      const node = this.#getNode(root, binding.path);
      if (!node) continue;

      switch (binding.type) {
        case 'text':
          node.nodeValue = this.#resolveBinding(binding.parts, item, index);
          break;
        case 'attr':
          const val = this.#resolveBinding(binding.parts, item, index);
          // Block event handlers
          if (binding.name.startsWith('on')) {
            console.warn(`a-repeat: Blocked interpolation into event handler "${binding.name}"`, this);
            node.removeAttribute(binding.name);
          } else {
            node.setAttribute(binding.name, val);
          }
          break;
        case 'nest-repeat':
          // Pass context to nested repeats
          if (!node.hasAttribute('model')) node.model = item;
          if (!node.hasAttribute('scope') && this.scope) node.scope = this.#scope;
          break;
        case 'template-content':
          // Recurse for <template> tags inside the template
          this.#applyBindings(node.content, binding.bindings, item, index);
          break;
      }
    }
  }

  #getNode(root, path) {
    let node = root;
    for (const i of path) {
      if (!node.childNodes || !node.childNodes[i]) return null;
      node = node.childNodes[i];
    }
    return node;
  }

  #resolveBinding(parts, item, index) {
    let result = '';
    for (const part of parts) {
      if (typeof part === 'string') {
        result += part;
      } else {
        result += this.#evaluateToken(part.token, item, index);
      }
    }
    return result;
  }

  #evaluateToken(path, item, index) {
    if (path === 'index') return index;
    if (path === 'this' || path === 'item') {
      return (typeof item === 'object') ? '' : item;
    }

    let val = PathResolver.getValue(item, path);

    if (val === undefined && this.#scope) {
      val = PathResolver.getValue(this.#scope, path);
    }

    // Security Whitelist for URLs
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (PROTOCOL_REGEX.test(trimmed)) {
        try {
          const url = new URL(trimmed);
          if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
            console.warn(`a-repeat: blocked unsafe URI protocol "${url.protocol}"`, this);
            return '';
          }
        } catch (e) {
          // Not absolute URL, pass through
        }
      }
    }

    if (val === undefined || val === null || typeof val === 'object') {
      return '';
    } else {
      return val;
    }
  }

  #registerTemplate(tmpl) {
    if (!(tmpl instanceof HTMLTemplateElement)) return;
    const content = tmpl.content;
    const bindings = this.#compile(content);
    const def = { content, bindings };

    const template = tmpl.id;
    if (template) {
      this.#templateMap.set(template, def);
    } else if (!this.#defaultTemplate) {
      this.#defaultTemplate = def;
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

    // Helper: Create DOM content for a single item
    const createNode = (item, index) => {
      let templateId = item.template;
      if (typeof templateId === 'string' && templateId.startsWith('#')) {
        templateId = templateId.slice(1);
      }
      const selectedTemplate = this.#templateMap.get(templateId) || this.#defaultTemplate;

      if (selectedTemplate) {
        const clone = selectedTemplate.content.cloneNode(true);
        this.#applyBindings(clone, selectedTemplate.bindings, item, index);
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
