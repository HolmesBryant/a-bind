class ExampleComponent extends HTMLElement {

	#foo = "foo";
	#fooBar = "foobar";

	static observedAttributes = ['foo', 'foo-bar'];

	constructor() {
		super();
	}

	attributeChangedCallback(attr, oldval, newval) {
		if (oldval === newval) return;
		let prop;

		switch (attr) {
			case 'foo':
				prop = 'foo';
				this.#foo = newval;
				break;
			case 'foo-bar':
				prop = 'fooBar';
				this.#fooBar = newval;
				break;
		}

		window.abind?.update?.(this, prop, newval);
	}

	connectedCallback() {
		// Ignore this, it just displays this code.
		this.innerHTML = `<a-code highlight="javascript">\n${this.constructor.toString()}\n</a-code>`;
	}

	get foo() { return this.#foo }
	set foo(value) { this.setAttribute('foo', value) }

	get fooBar() { return this.#fooBar }
	set fooBar(value) { this.setAttribute('foo-bar', value) }
}

document.addEventListener('DOMContentLoaded', () => {
	if (!customElements.get('example-component')) customElements.define('example-component', ExampleComponent);
});
