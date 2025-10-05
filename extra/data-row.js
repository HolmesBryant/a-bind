export class DataRow extends HTMLElement {

	_attr = "";
	_attrFunc;
	_model;
	_prop;
	_propFunc;
	// _propValue;
	_open = false;

	#connected = false;

	static observedAttributes = [
		'attr',
		'attr-func',
		'model',
		'prop',
		'prop-func',
		'open'
	];

	constructor() {
		super();
		this.attachShadow({ mode: 'open' });
	}

	attributeChangedCallback(attr, oldval, newval) {
		if (this.#connected && oldval === newval) return;

		switch (attr) {
			case 'attr': this._attr = newval; break;
			case 'attr-func': this._attrFunc = newval; break;
			case 'model': this._model = newval; break;
			case 'prop': this._prop = newval; break;
			case 'prop-func': this._propFunc = newval; break;
			// case 'prop-value': this._propValue = newval; break;
			case 'open': this._open = newval !== 'false' && newval !== false;
		}
	}

	connectedCallback() {
		// this.render();
		this.#connected = true;
	}

	disconnectedCallback() {
		this.shadowRoot.innerHTML = null;
	}

	render() {
		const hasAttr = this._attr;
		const isOpen = this._open;
		const attrLive = ``;
		const attrCode = ``;
		const html = `
			<link rel="stylesheet" href="extra/styles.css">

			<article>
			  <section class="card flex stretch">
			    <div class="flex column flex1">
						${hasAttr === 'false' ?`
							Not recommended to use attributes with large strings.
						` : hasAttr === null ? `
						` : `
						<span>
				      Attribute <code>${this._attr}</code>
						</span>
			      <a-bind
			      	oneway
			      	model="${this._model}"
			      	model-attr="${this._attr}">
			        <output>...</output>
			      </a-bind>

			      <a-bind model="${this._model}" func="${this._attrFunc}" event="click">
			        <button>${this._attrFunc}</button>
			      </a-bind>
						`}
			    </div>

			    <div class="flex column flex1">
			      <span>
			      	Property <code>${this._prop}</code>
						</span>

			      <a-bind
			      	oneway
			      	model="${this._model}"
			      	property="${this.prop}">
			        <output>...</output>
			      </a-bind>

			      <a-bind model="${this._model}" func="${this._propFunc}" event="click">
			        <button>${this._propFunc}</button>
			      </a-bind>
			    </div>

			    <div class="flex column flex1">
			      <a-bind model="${this._model}" property="${this._prop}">
			        <slot name="input">input</slot>
			      </a-bind>
			    </div>
			  </section>

			  <details ${isOpen ? 'open':''} class="sticky">
			    <summary class="nofrills">Code</summary>
			    <section class="card flex stretch">
			      <div class="flex column flex1">
			      	${ hasAttr === 'false' || hasAttr === null ? `
			      	` : `
			      	<a-code highlight>
			          <textarea>
			            Attribute: ${this._attr}
			            <a-bind oneway
			              model="${this._model}"
			              model-attr="${this.attr}">
			              <output></output>
			            </a-bind>

			            <a-bind
			              model="${this._model}"
			              func="${this._attrFunc}"
			              event="click">
			              <button>
			                ...
			              </button>
			            </a-bind>
			          </textarea>
			        </a-code>
			      	`}
			      </div>

			      <div class="flex column flex1">
			        <a-code highlight>
			          <textarea>
			            Property: ${this._prop}
			            <a-bind oneway
			              model="${this._model}"
			              property="${this._prop}">
			              <output></output>
			            </a-bind>

			            <a-bind
			              model="${this._model}"
			              func="${this._propFunc}"
			              event="click">
			              <button>
			                ...
			              </button>
			            </a-bind>
			          </textarea>
			        </a-code>
			      </div>

			      <div class="flex column flex1">
			        <slot name="input-code">input-code</slot>
			      </div>
			    </section>
			  </details>
			</article>
			<p> </p>
		`;

		this.shadowRoot.innerHTML = html;
	}

	get attr() {return this._attr}
	set attr(value) { this.setAttribute('attr', value); }

	get attrFunc() {return this._attrFunc }
	set attrFunc(value) { this.setAttribute('attr-func', value); }

	get model() {return this._model }
	set model(value) { this.setAttribute('model', value); }

	get prop() {return this._prop }
	set prop(value) { this.setAttribute('prop', value); }

	get propLabel() {return this._proplabel }
	set propLabel(value) { this.setAttribute('prop-func', value); }

	get open() { return this._open }
	set open(value) { this.toggleAttribute('open', (value !== 'false' && value !== false)) }
}

document.addEventListener('DOMContentLoaded', () => {
	if (!customElements.get('data-row')) customElements.define('data-row', DataRow);
});
