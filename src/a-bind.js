/**
 * @class ABind
 * @extends HTMLElement
 * @description A custom element that performs one-way and two-way data binding for custom elements and javascript objects.
 * @author Holmes Bryant <https://github.com/HolmesBryant> (Refactored for robustness)
 * @license GPL-3.0
 */
export default class ABind extends HTMLElement {
	// Attributes
	#elemAttr = 'value';
	#event = 'input';
	#func = null;
	#model;
	#modelAttr = null;
	#once = false;
	#oneway = false;
	#property;

	// Private properties
	#abortController;
	#boundElement;
	#hasUpdated = false;
	#isConnected = false;
	#resolvedModel;

	// Public properties

	static observedAttributes = [
		'model',
		'property',
		'model-attr',
		'event',
		'elem-attr',
		'func',
		'one-way',
		'once'
	];

	constructor() {
		super();
		if (!window.abind) window.abind = ABind;
	}

	// Lifecycle

	attributeChangedCallback(attr, oldval, newval) {
		if (oldval === newval) return;
		const rebind = ['model', 'property', 'model-attr'];

		switch (attr) {
			case 'model':     this.#model = newval; break;
			case 'property':  this.#property = newval; break;
			case 'model-attr':this.#modelAttr = newval; break;
			case 'event':     this.#event = newval; break;
			case 'elem-attr': this.#elemAttr = newval; break;
			case 'func':      this.#func = newval; break;
			case 'one-way':   this.#oneway = newval !== 'false' && newval !== false; break;
			case 'once':      this.#once = newval !== 'false' && newval !== false; break;
		}

		// If a core binding attribute changes after the component is already live,
		// we must tear down the old bindings and create new ones.
		if (rebind.includes(attr) && this.#isConnected) {
			this._teardown();
			this._initialize();
		}
	}

	connectedCallback() {
		this._initialize();
		this.#isConnected = true;
	}

	disconnectedCallback() {
		this._teardown();
	}

	// Public

	static update(model, property, value) {
		if (property === 'inline') console.trace(value)
		const event = new CustomEvent('abind:update', { detail: { model, property, value } });
		document.dispatchEvent(event);
	}

	formatForJson(str) {
		let match;
		str = str.trim();

		const simple = /^(\p{L}+)$/u;
		const quoted = /["'](\p{L}+)["']/gu;
		const arr = /(?<=[\s,\[])(?:true|false|null|undefined|-?\d+(?:\.\d+)?|\p{L}+)(?=[\s,\]])/gu;
		const obj = /(?<=[\s,{:])(?:true|false|null|undefined|-?\d+(?:\.\d+)?|[\p{L}\p{N}_$]+)(?=[\s,}:])/gu;

		match = str.match(simple);
		if (match) return str.replace(simple, `"$1"`);

		match = str.match(obj);
		if (match) return str.replaceAll(obj, '"$&"');

		match = str.match(quoted);
		if (match) return str.replace(quoted, `"$1"`);

		match = str.match(arr);
		if (match) return JSON.stringify(match);

		return str;
	}

	// Private

	_executeFunction(value) {
		let context, func, args;
		let prop = this.#property;
		const arr = value.split(';');
		let funcPath = arr.shift();

		if (arr.length > 0) {
			args = arr.pop().split(',').map(item => item.trim());
			if (arr[0]) prop = arr[0].trim();
		}

		if (!args) args = [this.#boundElement[this.elemAttr]];

		// Case 1: The function path contains a dot (e.g., "console.log")
		if (funcPath.includes('.')) {
			this._executeFunctionPath(funcPath, contextPath, prop, args);
		}
		// Case 2: The function is a direct property of the model or window (e.g., "setAttribute")
		else {
			this._executeFunctionProp(funcPath, prop, args);
		}

		if (typeof func === 'function') {
			func.call(context, prop, args);
		}
	}

	_executeFunctionPath(funcPath, prop, args) {
		let context, func;
		const contextPath = funcPath.substring(0, funcPath.lastIndexOf('.'));
		const funcName = funcPath.split('.').pop();

		// First, try to resolve the context and function from the model.
		context = this._getObjectProperty(this.#resolvedModel, contextPath);
		func = context ? context[funcName] : undefined;

		// If not found on the model, try the window object.
		if (typeof func !== 'function') {
			context = this._getObjectProperty(window, contextPath);
			func = context ? context[funcName] : undefined;
		}

		if (typeof func === 'function') {
			func.call(context, prop, args);
		}
	}

	_executeFunctionProp(funcPath, prop, args) {
		let context, func;

		// Prioritize the model.
		context = this.#resolvedModel;

		if (typeof this.#resolvedModel[funcPath] === 'function') {
			// If funcPath is a function
			func = this.#resolvedModel[funcPath];
		} else if (this.#resolvedModel[funcPath] !== undefined) {
			// If funcPath is a property
			context[funcPath] = args;
		}
		// Fall back to the window.
		else if (typeof window[funcPath] === 'function') {
			func = window[funcPath];
			context = window;
		}

		if (typeof func === 'function') {
			func.call(context, prop, args);
		}
	}

	async _getModel(modelName, wait = 0.5) {
		return new Promise((resolve) => {
			const timeoutId = setTimeout(() => {
				console.error(`Timeout: ${modelName} not found.`);
				resolve(null);
			}, wait * 1000);

			const resolvePromise = (model) => {
				clearTimeout(timeoutId);
				resolve(model);
			};

			if (window[modelName]) {
				resolvePromise(window[modelName]);
			} else {
				const [elementName, ...id] = modelName.split('#');
				const selector = id.length ? `${elementName}#${id.join('#')}` : elementName;
				customElements.whenDefined(elementName)
					.then(() => resolvePromise(document.querySelector(selector)))
					.catch(() => {
						console.error(`${modelName} is not a valid JavaScript object or custom element.`);
						resolvePromise(null);
					});
			}
		});
	}

	_getObjectProperty(obj, path) {
		if (!path) return obj;
		return path.split('.').reduce((acc, part) => acc && acc[part], obj);
	}

	_handleElementEvent(event) {
		event.preventDefault();
		let value;

		if (this.#oneway || this.#func) {
			// In oneway mode, we still allow function calls, just not model property updates.
			// value = this.#boundElement[this.#elemAttr] || this.#func;
			if (this.#func) {
				return this._executeFunction(this.#func);
			} else {
				return;
			}
		}

		const { localName, type, checked, selectedOptions } = this.#boundElement;

		if (localName === 'select' && this.#boundElement.hasAttribute('multiple')) {
			value = Array.from(selectedOptions).map(option => option.value);
		} else if (type === 'checkbox') {
			value = checked ? this.#boundElement.value : "";
		} else {
			value = this.#boundElement[this.#elemAttr];
		}

		this._updateModel(value);
	}

	_handleModelUpdate(event) {
		if (this.#resolvedModel !== event.detail.model || this.#property !== event.detail.property) {
			return;
		}
		if (this.#modelAttr && this.#resolvedModel instanceof HTMLElement) {
			const observed = this.#resolvedModel.constructor.observedAttributes;
			if (!observed || !observed.includes(this.#modelAttr)) return;
		}
		if (this.#once && this.#hasUpdated) return;

		if (this.#modelAttr) {
			this.#boundElement[this.#elemAttr] = this.#resolvedModel.getAttribute(this.#modelAttr);
		} else {
			this._updateElement(event.detail.value);
		}
		this.#hasUpdated = true;
	}

	/**
	 * Finds the model, sets up the element, and attaches all necessary listeners.
	 */
	async _initialize() {
		this.#model = this.getAttribute('model');
		if (!this.#model) {
			return console.error('a-bind requires a model to bind to: model="..."', this);
		}

		this.#boundElement = this.children[0];
		if (!this.#boundElement) {
			return console.error('a-bind element must have one child which is an HTML element', this);
		}

		this.#resolvedModel = await this._getModel(this.#model);
		if (!this.#resolvedModel) {
			return console.error(`The model "${this.#model}" could not be found.`);
		}

		if (this.#modelAttr) {
			if (/[\p{Lu}]/u.test(this.#modelAttr)) {
				console.warn(`a-bind: The 'model-attr' value "${this.#modelAttr}" contains uppercase characters. HTML attributes are typically lower-kebab-case.`, this);
			}
			if (!this.#property) {
				this.#property = this.#modelAttr.replace(/-(.)/g, (match, letter) => letter.toUpperCase());
			}
		}

		this.#abortController = new AbortController();
		this._setupListeners();
		this._updateElement();
	}

	_setElementAttribute(element, attribute, value) {
		if (!value || value === 'undefined') value = "";
		const { localName, type } = element;

		if (attribute.startsWith('style.')) {
			element.style[attribute.split('.')[1]] = value;
			return;
		}

		switch (localName) {
			case 'input':
				if (type === 'checkbox' || type === 'radio') {
					element.checked = element.value === String(value);
				} else if (type !== 'file') {
					element[attribute] = value;
				}
				break;
			case 'select':
				if (element.hasAttribute('multiple')) {
					const values = Array.isArray(value) ? value : String(value).split(/[,\s]+/);
					for (const option of element.options) option.selected = values.includes(option.value);
				} else {
					element[attribute] = value;
				}
				break;
			default:
				element[attribute] = value;
		}
	}

	_setupListeners() {
		if (!this.#property && !this.#func) return;
		if (!this.#boundElement) return;

		this.#boundElement.addEventListener(this.#event, this._handleElementEvent.bind(this), { signal: this.#abortController.signal });

		if (this.#property) {
			document.addEventListener('abind:update', this._handleModelUpdate.bind(this), { signal: this.#abortController.signal });
		}
	}

	_setObjectProperty(obj, path, value) {
		const pathParts = path.split('.');
		const lastPart = pathParts.pop();
		const target = pathParts.length ? this._getObjectProperty(obj, pathParts.join('.')) : obj;
		if (target && typeof target === 'object') {
			target[lastPart] = value;
		}
	}

	/**
	 * Tears down all active bindings and event listeners to prevent memory leaks.
	 */
	_teardown() {
		if (this.#abortController) {
			this.#abortController.abort();
			this.#abortController = null;
		}
		this.#boundElement = null;
		this.#resolvedModel = null;
	}

	_updateElement(value) {
		if (!this.#property && !this.#modelAttr) return;
		if (this.#oneway && this.#hasUpdated) return;

		if (value === undefined) {
			if (this.#modelAttr) {
				value = this.#resolvedModel.getAttribute(this.#modelAttr) ?? "";
			} else if (this.#property.startsWith('--') && this.#resolvedModel instanceof HTMLElement) {
				value = getComputedStyle(this.#resolvedModel).getPropertyValue(this.#property);
			} else {
				value = this._getObjectProperty(this.#resolvedModel, this.#property);
			}
		}

		const attributes = this.#elemAttr.split(/[,\s]+/);
		for (const attribute of attributes) {
			this._setElementAttribute(this.#boundElement, attribute.trim(), value);
		}
		this.#hasUpdated = true;
	}

	_updateModel(value) {
		if (this.#property) {
			const oldValue = this._getObjectProperty(this.#resolvedModel, this.#property);

			// Only update the model and dispatch an event if the value has actually changed.
			if (oldValue !== value) {
				if (this.#modelAttr) {
					this.#resolvedModel.setAttribute(this.#modelAttr, value);
				} else if (this.#property.startsWith('--')) {
					this.#resolvedModel.style.setProperty(this.#property, value);
				} else {
					this._setObjectProperty(this.#resolvedModel, this.#property, value);
				}

				ABind.update(this.#resolvedModel, this.#property, value);
			}
		}

		// A function call should always execute regardless of whether the model's state has changed.
		if (this.#func) this._executeFunction(value);
	}

	// --- Getters/Setters ---

	get elemAttr() { return this.#elemAttr; }
	set elemAttr(value) { this.setAttribute('elem-attr', value); }

	get event() { return this.#event; }
	set event(value) { this.setAttribute('event', value); }

	get func() { return this.#func; }
	set func(value) { this.setAttribute('func', value); }

	get model() { return this.#model; }
	set model(value) { this.setAttribute('model', value); }

	get modelAttr() { return this.#modelAttr; }
	set modelAttr(value) { this.setAttribute('model-attr', value); }

	get once() { return this.#once; }
	set once(value) { this.setAttribute('once', String(value)); }

	get oneWay() { return this.#oneway; }
	set oneWay(value) { this.setAttribute('one-way', String(value)); }

	get property() { return this.#property; }
	set property(value) { this.setAttribute('property', value); }
}

document.addEventListener('DOMContentLoaded', () => {
	if (!customElements.get('a-bind')) {
		customElements.define('a-bind', ABind);
	}
});
