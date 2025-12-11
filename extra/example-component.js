class ExampleComponent extends HTMLElement {

	#foo = "bar";

	static observedAttributes = ['foo'];

	constructor() {
		super();
	}

	attributeChangedCallback(attr, oldval, newval) {
		if (oldval === newval) return;

		switch (attr) {
			case 'foo':
				this.#foo = newval;
				break;
		}

		window.abind?.update?.(this, attr, newval);
	}

	connectedCallback() {
		// Ignore this. It just displays the code of this class
		this.innerHTML = `<a-code highlight="javascript">\n${this.constructor.toString()}\n</a-code>`;
	}

	get foo() {
		return this.#foo;
	}

	set foo(value) {
		this.setAttribute('foo', value);
	}
}

document.addEventListener('DOMContentLoaded', () => {
	if (!customElements.get('example-component')) customElements.define('example-component', ExampleComponent);
});
