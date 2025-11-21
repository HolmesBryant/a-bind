export class DataRow extends HTMLElement {

	#attr = null;
	#attrVal;
	#model;
	#prop;
	#propVal = null;
	_open = false;

	#connected = false;

	static observedAttributes = [
		'attr',
		'attr-val',
		'model',
		'prop',
		'prop-val',
		'open',
	];

	constructor() {
		super();
		this.attachShadow({ mode: 'open' });
	}

	attributeChangedCallback(attr, oldval, newval) {
		if (this.#connected && oldval === newval) return;

		switch (attr) {
			case 'attr': this.#attr = newval; break;
			case 'attr-val': this.#attrVal = newval; break;
			case 'model': this.#model = newval; break;
			case 'prop': this.#prop = newval; break;
			case 'prop-val': this.#propVal = newval; break;
			case 'open': this._open = newval !== 'false' && newval !== false;
			case 'val': this._val = newval; break;
		}
	}

	connectedCallback() {
		this.render();
		this.#connected = true;
	}

	disconnectedCallback() {
		this.shadowRoot.innerHTML = null;
	}

	render() {
		const hasAttr = this.attr;
		const hasPropVal = this.propVal;
		const isOpen = this.open;

		const propCode = `
		<a-code highlight slot="prop-code">
		  <textarea>
		    Property: ${this.#prop}
		    <a-bind
		    	pull
		      model="${this.#model}"
		      property="${this.#prop}">
		      <output></output>
		    </a-bind>

				${hasPropVal ? `
		    <a-bind
					push
		      model="${this.#model}"
		      property="${this.prop}"
		      event="click">
		      <button value="${this.propVal}">
		        ...
		      </button>
		    </a-bind>` : ''}
		  </textarea>
		</a-code>`;

		const attrCode = `
		<a-code highlight slot="attr-code">
	    <textarea>
	      Attribute: ${this.attr}
	      <a-bind
	      	pull
	        model="${this.#model}"
	        model-attr="${this.attr}">
	        <output></output>
	      </a-bind>

	      <a-bind
	      	push
	        model="${this.#model}"
					model-attr="${this.attr}"
	        event="click">
	        <button>
	          ...
	        </button>
	      </a-bind>
	    </textarea>
	  </a-code>`;

		const html = `
			<link rel="stylesheet" href="extra/styles.css">

			<article>
			  <section class="card flex stretch">
					${hasAttr === null ? "" : `
			    <div class="flex column flex1">
						${hasAttr === 'false' ?
						"Not recommended to use attributes with large strings."
						: `
						<span>
				      Attribute <code>${this.attr}</code>
						</span>
			      <a-bind
			      	model="${this.model}"
			      	model-attr="${this.attr}">
			        <output>...</output>
			      </a-bind>

			      <a-bind
							push
			      	model="${this.model}"
			      	model-attr="${this.attr}"
			      	event="click">
			        <button
			        	value="${this.attrVal}">
			        	Change to ${this.attrVal}
			        </button>
			      </a-bind>
						`}
			    </div>
					`}

			    <div class="flex column flex1">
			      <span>
			      	Property <code>${this.prop}</code>
						</span>

			      <a-bind
			      	pull
			      	model="${this.model}"
			      	property="${this.prop}">
			        <output>...</output>
			      </a-bind>

						${hasPropVal ? `
			      <a-bind
							push
			      	model="${this.model}"
			      	property="${this.prop}"
			      	event="click">
			        <button value="${this.propVal}">Change to ${this.propVal}</button>
			      </a-bind>` : ""}
			    </div>

			    <div class="flex column flex1">
			       <slot name="input">input</slot>
			    </div>
			  </section>

			  <details ${isOpen ? 'open':''} class="sticky">
			    <summary class="card nofrills">Code</summary>
			    <section class="card flex stretch">
			      ${hasAttr === null ? "" : `
			      <div class="flex column flex1">
			      	<slot name="attr-code"></slot>
			      </div>`}

			      <div class="flex column flex1">
			        <slot name="prop-code">prop-code</slot>
			      </div>

			      <div class="flex column flex1">
			        <slot name="input-code">input-code</slot>
			      </div>
			    </section>
			  </details>
			</article>
			<p><hr></p>

		`;

		if (hasAttr) {
			this.insertAdjacentHTML('beforeend', attrCode);
		}

		this.insertAdjacentHTML('beforeend', propCode);
		this.shadowRoot.innerHTML = html;
	}

	get attr() {return this.#attr}
	set attr(value) { this.setAttribute('attr', value); }

	get attrVal() { return this.#attrVal }
	set attrVal(value) { this.setAttribute('attr-val', value) }

	get model() {return this.#model }
	set model(value) { this.setAttribute('model', value); }

	get prop() {return this.#prop }
	set prop(value) { this.setAttribute('prop', value); }

	get propVal() {return this.#propVal }
	set propVal(value) { this.setAttribute('prop-val', value); }

	get open() { return this._open }
	set open(value) { this.toggleAttribute('open', (value !== 'false' && value !== false)) }

}

document.addEventListener('DOMContentLoaded', () => {
	if (!customElements.get('data-row')) customElements.define('data-row', DataRow);
});
