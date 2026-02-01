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
		this.attachShadow({ mode: 'open' })
	}

	attributeChangedCallback(attr, oldval, newval) {
		if (oldval === newval) return;

		switch (attr) {
			case 'foo-bar':
				this.#fooBar = newval;
				break;
		}
	}

	connectedCallback() {
		this.shadowRoot.append(ExampleComponent.template.content.cloneNode(true));

		// Ignore this, it just displays this code.
		this.innerHTML = `<a-code highlight="javascript">\n${this.constructor.toString()}\n</a-code>`;
	}

	get fooBar() { return this.#fooBar }
	set fooBar(value) { this.setAttribute('foo-bar', value) }
}

document.addEventListener('DOMContentLoaded', () => {
	if (!customElements.get('example-component')) customElements.define('example-component', ExampleComponent);
});
