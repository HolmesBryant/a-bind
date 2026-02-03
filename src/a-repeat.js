/**
 * @file a-repeat.js
 * @description A DOM-based template engine and list renderer.
 * @author Holmes Bryant
 * @license GPL-3.0
 */

import Bus, { crosstownBus } from './Bus.js';
import { loader } from './Loader.js';
import PathResolver from './PathResolver.js';
import Logger from './Logger.js';

const TOKEN_REGEX = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g;
const PROTOCOL_REGEX = /^[a-zA-Z][a-zA-Z0-9+.-]*:/; // RFC 3986 Scheme validation
const ALLOWED_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:', 'ftp:']);

/**
 * A Custom Element (<a-repeat>) that iterates over an array (from a model or property)
 * and renders a template for each item. Supports data binding, nested scopes,
 * keyed rendering, and external templates.
 *
 * @extends HTMLElement
 */
export default class ARepeat extends HTMLElement {
  // -- Attributes --
  #debug;
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
  #modelLoadId = 0;
  #scopeLoadId = 0;
  #implicitTemplate;

  /**
   * List of attributes to observe for changes.
   * @static
   * @returns {string[]} ['key', 'model', 'prop', 'scope', 'target', 'template', 'templates']
   */
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
    this.attachShadow({mode:'open'});
    this.shadowRoot.innerHTML = '<style>:host{ display:contents }</style><slot></slot>';
  }

  // --- Lifecycle ---

  /**
   * Called when an observed attribute has been added, removed, updated, or replaced.
   * Handles loading of models and scopes, parsing JSON templates, and triggering subscriptions.
   *
   * @param {string} attr - The attribute name.
   * @param {string} oldval - The old value.
   * @param {string} newval - The new value.
   */
  attributeChangedCallback(attr, oldval, newval) {
    if (oldval === newval) return;
    switch (attr) {
      case 'key':
        this.#key = newval;
        break;

      case 'model':
        const currentModelId = ++this.#modelLoadId;
        loader.load(newval)
        .then( model => {
          if (this.#modelLoadId !== currentModelId) return;
          if (!this.#isConnected) return;
          this.#model = model
          this.#subscribe();
        })
        .catch( error => {
          // only log errors for the active request
          if (this.#modelLoadId !== currentModelId) return;
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

        const currentScopeId = ++this.#scopeLoadId;

        loader.load(newval)
        .then( scope => {
          if (this.#scopeLoadId !== currentScopeId) return;
          if (!this.#isConnected) return;
          this.#scope = scope;
          this.#subscribe();
        }).catch ( error => {
          if (this.#scopeLoadId !== currentScopeId) return;
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

  /**
   * Called when the element is connected to the DOM.
   * Initializes templates, resolves the target container, and sets up initial data binding.
   */
  async connectedCallback() {
    this.#isConnected = true;
    if (this.debug && !this.log) this.log = await this.#attachLogger();

    this.log?.('connectedCallback()', this.#logProps());
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

  /**
   * Called when the element is disconnected from the DOM.
   * Cleans up event bus subscriptions and references.
   */
  disconnectedCallback() {
    this.#isConnected = false;
    this.#cleanup();
    this.#targetElem = null;
    this.log?.('disconnectedCallback()', this.#logProps());
  }

  // --- Private ---

  /**
   * Applies data to a cloned template instance using pre-compiled bindings.
   * Handles text nodes, attributes, nested repeats, and nested template recursion.
   *
   * @private
   * @param {DocumentFragment|Element} root - The root of the cloned template.
   * @param {Array<object>} bindings - The compilation instructions.
   * @param {any} item - The current data item.
   * @param {number} index - The index of the item in the list.
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

    this.log?.('#applyBindings()', this.#logProps({root, bindings, item, index}));
  }

  /**
   * attaches a Logger instance for debugging.
   * @private
   * @returns {Promise<Function>} A logging function wrapper.
   */
  async #attachLogger() {
    try {
      const logger = new Logger(this, ARepeat.observedAttributes);
      return (label, obj) => {
        logger.log(label, obj);
      }
    } catch (error) {
      console.warn('a-repeat.attachLogger() Failed', error);
    }
  }

  /**
   * Unsubscribes from the event bus.
   * @private
   */
  #cleanup() {
    if (this.#unsubscribe) {
      this.#unsubscribe();
      this.#unsubscribe = null;
    }
    this.log?.('#cleanup()', this.#logProps());
  }

  /**
   * Scans a DocumentFragment for mustache-style bindings ({{ }}) and returns a list of instructions.
   * This walks the DOM once at startup to create a compilation definition.
   *
   * @private
   * @param {DocumentFragment} fragment - The template content to parse.
   * @returns {Array<object>} A list of binding instructions.
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
        // this.log?.('#compile()', this.#logProps({fragment});
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
          // this.log?.('#compile()', this.#logProps({fragment});
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
          // this.log?.('#compile()', this.#logProps({fragment});
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

    this.log?.('#compile()', this.#logProps({fragment}));
    return bindings;
  }

  /**
   * Evaluates a single token path against the item or scope.
   * Includes security checks for unsafe URL protocols.
   *
   * @private
   * @param {string} path - The property path (e.g. "user.name" or "index").
   * @param {any} item - The current list item.
   * @param {number} index - The current index.
   * @returns {string|any} The resolved value.
   */
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

    // this.log?.('#evaluateToken()', this.#logProps({path, item, index});
    if (val === undefined || val === null || typeof val === 'object') {
      return '';
    } else {
      return val;
    }
  }

  /**
   * Helper to traverse the DOM using a path array (child indices).
   *
   * @private
   * @param {Node} root - The starting node.
   * @param {Array<number>} path - Array of childNode indices.
   * @returns {Node|null}
   */
  #getNode(root, path) {
    let node = root;
    for (const i of path) {
      if (!node.childNodes || !node.childNodes[i]) return null;
      node = node.childNodes[i];
    }
    // this.log?.('#getNode()', this.#logProps({root, path});
    return node;
  }

  /**
   * parses and registers available templates.
   * Checks for:
   * 1. Internal <template> children.
   * 2. External templates via 'template' attribute.
   * 3. Implicit templates (the element's own initial children).
   * Also validates compatibility with keyed rendering.
   *
   * @private
   */
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
    // Only proceed if no explicit templates are found.

    if (this.#templateMap.size === 0 && !this.#defaultTemplate) {
      if (this.#implicitTemplate) {
        this.#defaultTemplate = this.#implicitTemplate;
      } else if (this.childNodes.length > 0) {
        // Parse children as template (first run)
        const range = document.createRange();
        range.selectNodeContents(this);
        const content = range.cloneContents();
        const bindings = this.#compile(content);

        // save content and bindings so they'll persist across disconnect/reconnect
        this.#implicitTemplate = { content, bindings };
        this.#defaultTemplate = this.#implicitTemplate;
        this.replaceChildren();
      }
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

    // this.log?.('#initTemplates()', this.#logProps());
  }

  #logProps(method_args = {}) {
    return {
      method_args,
      data: this.#data,
      defaultTemplate: this.#defaultTemplate,
      isConnected: this.#isConnected,
      targetElem: this.#targetElem,
      templateMap: this.#templateMap,
      modelLoadId: this.#modelLoadId,
      scopeLoadId: this.#scopeLoadId,
      implicitTemplate: this.#implicitTemplate,
    }
  }

  /**
   * Parses a string for `{{ token }}` patterns.
   *
   * @private
   * @param {string} str - The string to parse.
   * @returns {Array<string|object>|null} Array of static strings and token objects, or null if no bindings found.
   */
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
    this.log?.('#parseTemplateString()', this.#logProps({str}));
    return parts.length > 0 ? parts : null;
  }

  /**
   * Compiles and stores a template definition in the internal map.
   *
   * @private
   * @param {HTMLTemplateElement} tmpl - The template element.
   */
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

    this.log?.('#registerTemplate()', this.#logProps({tmpl}));
  }

  /**
   * The core rendering loop.
   * Handles:
   * 1. Target resolution (where to render).
   * 2. Keyed rendering (moving/reusing nodes based on a unique ID).
   * 3. Index-based rendering (reusing nodes based on position).
   * 4. Full re-rendering (fallback).
   *
   * @private
   * @param {Array} data - The list of data to render.
   */
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
          this.log?.('#render()', this.#logProps({data}));
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
      this.log?.('#render()', this.#logProps({data}));
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
          this.log?.('#render()', this.#logProps({data}));
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
    this.log?.('#render()', this.#logProps({data}));
  }

  /**
   * Resolves a list of string parts and tokens into a final string value.
   *
   * @private
   * @param {Array} parts - Mixed array of strings and token objects.
   * @param {any} item - Data context.
   * @param {number} index - Loop index.
   * @returns {string} The resolved string.
   */
  #resolveBinding(parts, item, index) {
    let result = '';
    for (const part of parts) {
      if (typeof part === 'string') {
        result += part;
      } else {
        result += this.#evaluateToken(part.token, item, index);
      }
    }
    this.log?.('#resolveBinding()', this.#logProps({parts, item, index}));
    return result;
  }

  /**
   * Subscribes to the crosstownBus.
   * Connects the component to the Model/Property for reactive updates.
   *
   * @private
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
    this.log?.('#subscribe()', this.#logProps());
  }

  /**
   * Captures properties set on the instance before the class was upgraded.
   * Deletes the own property and resets it to trigger the class setter.
   *
   * @private
   * @param {string} prop - The property name.
   */
  #upgrade(prop) {
    if (Object.prototype.hasOwnProperty.call(this, prop)) {
      const value = this[prop];
      delete this[prop];
      this[prop] = value;
    }

    this.log?.(`#upgrade(${prop})`, this.#logProps());
  }

   // --- Public ---

  // --- Getters / Setters ---

  get debug() { return this.hasAttribute('debug') }
  set debug(value) { this.setAttribute('debug', !!value) }

  /**
   * Gets or sets the unique key property name for keyed rendering.
   * @type {string}
   */
  get key() { return this.#key }
  set key(value) {
    if (this.#key === value) return;
    this.setAttribute('key', value);
  }

  /**
   * Gets or sets the model source.
   * If an object is passed, it sets the internal reference and subscribes.
   * If a string is passed, it updates the attribute (triggering the Loader).
   * @type {object|string}
   */
  get model() { return this.#model; }
  set model(value) {
    if (this.#model === value) return;
    if (typeof value === 'string') {
      this.setAttribute('model', value);
    } else {
      this.#model = value;
      if (this.#isConnected && this.#prop) this.#subscribe();
    }
  }

  /**
   * Gets or sets the property name to observe on the model.
   * @type {string}
   */
  get prop() { return this.#prop; }
  set prop(value) {
    if (this.#prop === value) return;
    this.setAttribute('prop', value);
  }

  /**
   * Gets or sets the fallback scope object.
   * Used for variable resolution if a property is not found on the loop item.
   * @type {object|string}
   */
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

  /**
   * Gets or sets the target selector.
   * Defines where the list should be rendered (if not inside the element itself).
   * @type {string}
   */
  get target() { return this.#target }
  set target(value) {
    if (this.#target === value) return;
    this.setAttribute('target', value);
  }

  /**
   * Gets or sets the external template selector.
   * @type {string}
   */
  get template() { return this.#template }
  set template(value) {
    if (this.#template === value) return;
    this.setAttribute('template', value);
  }

  /**
   * Gets or sets the 'templates' JSON configuration.
   * @type {string|object}
   */
  get templates() { return this.#templates }
  set templates(value) {
    if (!value) return this.removeAttribute('templates');
    const str = typeof value === 'string' ? value : JSON.stringify(value);
    this.setAttribute('templates', str);
  }

  /**
   * Direct setter for the data array.
   * Bypasses the Bus/Model lookup and renders immediately.
   * @type {Array}
   */
  get items() { return this.#data; }
  set items(value) {
    this.#render(value);
  }
}

if (!customElements.get('a-repeat')) customElements.define('a-repeat', ARepeat);
