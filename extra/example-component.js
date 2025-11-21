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

		if (window.abind) {
			abind.update(this, attr, newval);
			// or abind.updateDefer(this, attr);
		}
	}

	connectedCallback() {
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
