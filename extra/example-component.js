class ExampleComponent extends HTMLElement {

	#fooBar = "foobar";

	static observedAttributes = ['foo-bar'];

	static template = document.createElement('template');

	static {
		this.template.innerHTML = `
			<style>
				:host { display: block }
			</style>

			<slot></slot>
		`;
	}

	constructor() {
		super();
		this.sttachShadow({ mode: 'open' })
	}

	attributeChangedCallback(attr, oldval, newval) {
		if (oldval === newval) return;
		let prop;

		switch (attr) {
			case 'foo-bar':
				prop = 'fooBar';
				this.#fooBar = newval;
				break;
		}
	}

	connectedCallback() {
		this.shadowRoot.append(ExampleComponent.template.content.cloneNode(true));

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
