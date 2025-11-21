/**
 * @class ABind
 * @extends HTMLElement
 * @description A custom element that performs one-way and two-way data binding and function execution on events.
 * @author Holmes Bryant <https://github.com/HolmesBryant>
 * @license GPL-3.0
 */
export default class ABind extends HTMLElement {

	// Private properties
	#abortController;
	#boundElement;
	#hasUpdated = false;
	#isConnected = false;
	#resolvedModel;

	static observedAttributes = [
		'model',
		'property',
		'model-attr',
		'event',
		'elem-attr',
		'func',
		'pull',
		'push',
		'once',
		'debug'
	];

	constructor() {
		super();
		if (!window.abind) window.abind = ABind;
	}

	// Lifecycle Callbacks

	attributeChangedCallback(attr, oldval, newval) {
		if (oldval === newval) return;

		// If a core binding attribute changes, tear down old bindings and create new ones.
		if (['model', 'property', 'model-attr'].includes(attr) && this.#isConnected) {
			this.#teardown();
			this.#initialize();
		}
	}

	connectedCallback() {
		if (this.debug) { console.debug('Debugging:', this)}
		this.#isConnected = true;
		this.#initialize();
	}

	disconnectedCallback() {
		this.#isConnected = false;
		this.#teardown();
	}

	// Public Static Methods

	static update(model, property, value) {
		const event = new CustomEvent('abind:update', { detail: { model, property, value } });
		document.dispatchEvent(event);
	}

	static updateDefer(model, property, waitMs = 1) {
		setTimeout(() => {
			let value;
			if (this.property) {
				value = model[property];
			} else if (this.modelAttr) {
				value = model.getAttribute(property);
			}

			const event = new CustomEvent('abind:update', { detail: { model, property, value } });
			document.dispatchEvent(event);
		}, waitMs);
	}

	// Private Methods

	#executeFunction(event) {
    const funcPath = this.func;
    if (this.debug) { console.debug('#executeFunction', {
    	funcPath: funcPath,
    	Bail: !funcPath
    } )}

    if (!funcPath) return;

    let context = null;
    let func = null;
    const pathParts = funcPath.split('.');
    const funcName = pathParts.pop();
    const contextPath = pathParts.join('.');
    let potentialContext = this.#getObjectProperty(this.#resolvedModel, contextPath);

    if (potentialContext && typeof potentialContext[funcName] === 'function') {
      context = potentialContext;
      func = potentialContext[funcName];
    } else if (potentialContext && potentialContext[funcName]) {
      context = potentialContext;
  		func = funcName;
    } else {
      potentialContext = this.#getObjectProperty(window, contextPath);
      if (potentialContext && typeof potentialContext[funcName] === 'function') {
        context = potentialContext;
        func = potentialContext[funcName];
      }
    }

    if (typeof func === 'function') {
    	func.call(context, event);
    } else if (typeof func === 'string') {
	  	const proto = Object.getPrototypeOf(this.#resolvedModel);
	  	const descriptor = Object.getOwnPropertyDescriptor(proto, func);
	  	descriptor.set.call(context, event);
    } else {
      console.warn(`a-bind: Function "${funcPath}" not found on model or window.`, this);
    }

    if (this.debug) {
    	console.debug('#executeFunction', {
    		event: event,
    		context: context,
    		func: func,
    	});
    }
  }

	async #getModel(modelName, wait = 0.5) {
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
				// Assume its an object
				resolvePromise(window[modelName]);
			} else {
				// Assume its a custom element
				const elem = document.querySelector(modelName);
				modelName = elem.localName;
				customElements.whenDefined(modelName)
				.then(() => resolvePromise(elem))
				.catch(() => resolvePromise(null));
			}
		});
	}

	#getObjectProperty(obj, path) {
		return !path ?
			obj :
			path.split('.').reduce((acc, part) => acc && acc[part], obj);
	}

	#handleElementEvent(event) {
    if (this.func) this.#executeFunction(event);

    // Do not update the model if this.pull is true, or if no binding target is specified.
		if (this.pull || (!this.property && !this.modelAttr)) return;

		let value;
		const { localName, type, checked, selectedOptions } = this.#boundElement;

		if (localName === 'select' && this.#boundElement.multiple) {
			value = Array.from(selectedOptions).map(option => option.value);
		} else if (type === 'checkbox') {
			value = checked ? this.#boundElement.value : false;
		} else if (event.target.value) {
			value = event.target.value;
		} else {
			value = this.#boundElement[this.elemAttr];
		}

		if (this.debug) {
			console.debug('#handleElementEvent', {
				event: event,
				value: value
			});
		}

		this.#updateModel(value);
	}

	#handleModelUpdate(event) {
    const isBoundToProperty = this.property && this.property === event.detail.property;
    const isBoundToAttr = this.modelAttr && this.modelAttr === event.detail.property;

    const bail = () => {
    	return ((this.once && this.#hasUpdated) || (this.#resolvedModel !== event.detail.model || !(isBoundToProperty || isBoundToAttr)))
    };

    if (this.debug) {
    	console.debug('#handleModelUpdate', {
    		event: event,
    		event_detail: event.detail,
    		isBoundToProperty: isBoundToProperty,
    		isBoundToAttr: isBoundToAttr,
    		once: this.once,
    		hasUpdated: this.#hasUpdated,
    		Bail: bail()
    	});
    }

    if (bail()) return;

		this.#updateElement(event.detail.value);
	}

	async #initialize() {
		const modelName = this.model;
		if (!modelName) {
			return console.error('a-bind: "model" attribute is required.', this);
		}

		// Allows for nested a-bind instances
		let element = this.children[0];
		while (element && element.localName === 'a-bind') {
			element = element.children[0];
		}

		this.#boundElement = element;

		if (!this.#boundElement) {
			console.error('a-bind: Must have one child element.', this);
			throw new Error('a-bind: Must have one child element.')
		}

		this.#resolvedModel = await this.#getModel(modelName);

		if (!this.#resolvedModel) {
			return console.error(`a-bind: Model "${modelName}" not found.`, this);
		}

		this.#abortController = new AbortController();

		if (this.debug) {
			console.debug("#initialize", {
				'boundElement': this.#boundElement,
				'model': this.#resolvedModel,
			});
		}
		this.#setupListeners();
		this.#updateElement();
	}

	#setObjectProperty(obj, path, value) {
		const pathParts = path.split('.');
		const lastPart = pathParts.pop();
		const target = pathParts.length ? this.#getObjectProperty(obj, pathParts.join('.')) : obj;
		if (target && typeof target === 'object') {
			target[lastPart] = value;
		}

		if (this.debug) {
			console.debug('#setObjectProperty', {
				obj: obj,
				path: path,
				value: value,
				target: target,
				lastPart: lastPart
			});
		}
	}

	#setElementAttribute(element, attribute, value) {
		if (value === undefined || value === null) value = '';
		const { localName, type } = element;

		if (this.debug) {
			console.debug('#setElementAttribute', {
				element: element,
				attribute: attribute,
				value: value
			});
		}

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
				if (element.multiple) {
					const values = Array.isArray(value) ? value.map(String) : String(value).split(/[,\s]+/);
					for (const option of element.options) option.selected = values.includes(option.value);
				} else {
					element[attribute] = value;
				}
				break;
			default:
				element[attribute] = value;
		}
	}

	#setupListeners() {
		if (!this.property && !this.func && !this.modelAttr) return;

		const { signal } = this.#abortController;
		this.#boundElement.addEventListener(this.event, (e) => this.#handleElementEvent(e), { signal });

		if (this.property || this.modelAttr) {
			document.addEventListener('abind:update', (e) => this.#handleModelUpdate(e), { signal });
		}
	}

	#teardown() {
		this.#abortController?.abort();
		this.#abortController = null;
		this.#boundElement = null;
		this.#resolvedModel = null;
	}

	#updateElement(value) {
		const bail = () => {
			return (!this.property && !this.modelAttr) || (this.once && this.#hasUpdated) || (this.push);
		}

		if (this.debug) {
			console.debug('#updateElement', {
				property: this.property,
				modelAttr: this.modelAttr,
				once: this.once,
				hasUpdated: this.#hasUpdated,
				push: this.push,
				Bail: bail()
			});
		}

		if (bail()) return;

		if (value === undefined) {
			value = this.modelAttr ?
				this.#resolvedModel.getAttribute(this.modelAttr) ?? '' :
				this.#getObjectProperty(this.#resolvedModel, this.property);
		}

		if (this.debug) { console.debug('#updateElement', {value: value})}

		this.elemAttr.split(/[,\s]+/).forEach(attribute => {
			this.#setElementAttribute(this.#boundElement, attribute.trim(), value);
		});
		this.#hasUpdated = true;
	}

	#updateModel(value) {
		let oldValue;
    // Determine the old value from either the attribute or the property.
    if (this.modelAttr) {
        oldValue = this.#resolvedModel.getAttribute(this.modelAttr);
    } else {
        oldValue = this.#getObjectProperty(this.#resolvedModel, this.property);
    }

    const bail = () => String(oldValue) === String(value);

    if (this.debug) {
    	console.debug('#updateModel', {
    		value: value,
    		oldValue: oldValue,
    		Bail: bail()
    	});
    }

    if (bail()) return;

    // Only update if the value has changed.
		if (this.modelAttr) {
			this.#resolvedModel.setAttribute(this.modelAttr, value);
		} else {
			this.#setObjectProperty(this.#resolvedModel, this.property, value);
		}

    // For dispatching, we need a property name. Infer from model-attr if necessary.
    const propertyName = this.property || this.modelAttr.replace(/-(.)/g, (_, letter) => letter.toUpperCase());
		ABind.update(this.#resolvedModel, propertyName, value);
	}

	// --- Getters/Setters ---

	get elemAttr() { return this.getAttribute('elem-attr') || 'value'; }
	set elemAttr(value) { this.setAttribute('elem-attr', value); }

	get event() { return this.getAttribute('event') || 'input'; }
	set event(value) { this.setAttribute('event', value); }

	get func() { return this.getAttribute('func'); }
	set func(value) { this.setAttribute('func', value); }

	get model() { return this.getAttribute('model'); }
	set model(value) { this.setAttribute('model', value); }

	get modelAttr() { return this.getAttribute('model-attr'); }
	set modelAttr(value) { this.setAttribute('model-attr', value); }

	get once() { return this.hasAttribute('once'); }
	set once(value) { this.toggleAttribute('once', Boolean(value)); }

	get pull() { return this.hasAttribute('pull'); }
	set pull(value) { this.toggleAttribute('pull', Boolean(value)); }

	get push() { return this.hasAttribute('push'); }
	set push(value) { this.toggleAttribute('push', Boolean(value)); }

	get property() { return this.getAttribute('property'); }
	set property(value) { this.setAttribute('property', value); }

	get debug() { return this.hasAttribute('debug') }
	set debug(value) { this.toggleAttribute('debug', Boolean(value)); }
}

if (!customElements.get('a-bind')) {
	customElements.define('a-bind', ABind);
}
