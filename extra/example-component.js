class ExampleComponent extends HTMLElement {

	#foo = "bar";

	_notAnAttribute = true;

	static observedAttributes = ['foo'];

	constructor() {
		super();
	}

	attributeChangedCallback(attr, oldval, newval) {
		switch (attr) {
			case 'foo': this.#foo = newval; break;
		}

		if (window.abind) abind.update(this, attr, newval);
	}

	connectedCallback() {
		this.innerHTML = `<a-code highlight="javascript">\n${this.constructor.toString()}\n</a-code>`;
	}

	get foo() { return this.#foo }

	set foo(value) {
		this.setAttribute('foo', value);
	}

	get notAnAttribute() { return this._notAnAttribute }
	set notAnAttribute(value) {
		this._notAnAttribute = value;

		if (window.abind) abind.update(this, 'notAnAttribute', value);
	}
}

document.addEventListener('DOMContentLoaded', () => {
	if (!customElements.get('example-component')) customElements.define('example-component', ExampleComponent);
});
