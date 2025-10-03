class ExampleComponent extends HTMLElement {

	#foo = "foo";

	static observedAttributes = ['foo'];

	constructor() {
		super();
	}

	attributeChangedCallback(attr, oldval, newval) {
		this[attr] = newval;
	}

	connectedCallback() {
		this.innerHTML = `<a-code highlight="javascript">\n${this.constructor.toString()}\n</a-code>`;
	}

	get foo() { return this.#foo }

	set foo(value) {
		this.#foo = value;
		if (window.abind) abind.update(this, 'foo', value);
	}
}

document.addEventListener('DOMContentLoaded', () => {
	if (!customElements.get('example-component')) customElements.define('example-component', ExampleComponent);
});
