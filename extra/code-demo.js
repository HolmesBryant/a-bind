import sheet from './styles.css' with { type: 'css' };

export default class CodeDemo extends HTMLElement {
  // -- Attributes --
  #attr = null;
  #attrVal;
  #prop = null;
  #propVal;

  // -- Private --
  #demosContainer;
  #codeContainer;
  #initialized = false;

  // Public

  // -- Static --

  static model = 'nope';

  static observedAttributes = ['attr', 'attr-val', 'prop', 'prop-val', 'model'];

  static template = document.createElement('template');
  static {
    this.template.innerHTML = `
    	<style>
	    	#demos > div { flex: 1 }
    	</style>

      <div id="wrapper">
        <div id="demos" class="flex stretch card">
    			<div><slot name="prop"></slot></div>
          <div><slot name="input"></slot></div>
        </div>

        <details>
          <summary class="nofrills">code</summary>

          <div id="code" class="flex stretch card">
            <div class="flex1">
              <slot name="code"></slot>
            </div>
          </div>
        </details>
      </div>
      <hr>
    `;
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  // -- Lifecycle --

  attributeChangedCallback(attr, oldval, newval) {
    if (oldval === newval) return;

    if (attr === 'attr') this.#attr = newval;
    if (attr === 'attr-val') this.#attrVal = newval;
    if (attr === 'prop') this.#prop = newval;
    if (attr === 'prop-val') this.#propVal = newval;
    if (attr === 'model') CodeDemo.model = newval;

    // Trigger render if connected
    if (this.#initialized && this.isConnected) {
      if (this.hasAttribute('norender')) {
        this.shadowRoot.innerHTML = "";
      } else {
        this.render();
      }
    }
  }

  connectedCallback() {
    if (!this.#initialized) {
      this.shadowRoot.append(CodeDemo.template.content.cloneNode(true));
      this.shadowRoot.adoptedStyleSheets = [sheet];

      this.#demosContainer = this.shadowRoot.querySelector('#demos');
      this.#codeContainer = this.shadowRoot.querySelector('#code');
      this.#initialized = true;
    }

    if (this.hasAttribute('norender')) {
      this.shadowRoot.innerHTML = "";
    } else {
      this.render();
    }
  }

  disconnectedCallback() {
    CodeDemo.model = null;
    this.#demosContainer = null;
    this.#codeContainer = null;
    this.#initialized = false;
  }

  render() {
    this.clearDynamicContent();
    if (this.#prop) this.renderPropDemo(this.#prop);
    if (this.#attr) this.renderAttrDemo(this.#attr);
  }

  clearDynamicContent() {
    const dynamicDemoNodes = this.#demosContainer.querySelectorAll('.dynamic-content');
    const dynamicCodeNodes = this.#codeContainer.querySelectorAll('.dynamic-content');
    dynamicDemoNodes.forEach(n => n.remove());
    dynamicCodeNodes.forEach(n => n.remove());
  }

  // Helper to safely create elements
  #createEl(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text) el.textContent = text;
    return el;
  }

  renderAttrDemo(value) {
    let newval;
		const container = this.querySelector('[slot="attr"]');
		if (!container) return;

    const slot = this.shadowRoot.querySelector('[name="attr"]');
    if (!slot) {
      const html = '<div><slot name="attr"></slot></div>';
      this.#demosContainer.insertAdjacentHTML('afterbegin', html);
    }

    const wrapper = this.#createEl('div', 'flex column dynamic-content');
    const label = this.#createEl('label', 'flex column');
    const span = this.#createEl('span');
    span.append("Attribute: ", this.#createEl('code', '', value));

    const bindPull = document.createElement('a-bind');
    bindPull.toggleAttribute('pull', true);
    bindPull.setAttribute('model-attr', value);
    bindPull.innerHTML = '<output>...</output>';
    label.append(span, bindPull);

    if (this.#attrVal !== 'null') {
      const bindPush = document.createElement('a-bind');
      bindPush.toggleAttribute('push', true);
      bindPush.setAttribute('model-attr', value);
      bindPush.setAttribute('event', 'click');

      newval = this.#attrVal || 'foo';
      const btn = this.#createEl('button', '', `Set attribute to '${newval}'`);
      btn.value = newval;
      bindPush.appendChild(btn);
      wrapper.append(label, bindPush);
    }

    container.append(wrapper);

    this.renderCodeBlock(value, 'model-attr', newval);
  }

  renderPropDemo(value) {
    let newval;
  	const container = this.querySelector('[slot="prop"]');
  	if (!container) return;
    const wrapper = this.#createEl('div', 'flex column dynamic-content');
    const label = this.#createEl('label', 'flex column');
    const span = this.#createEl('span');
    span.append("Property: ", this.#createEl('code', '', value));

    const bindPull = document.createElement('a-bind');
    bindPull.toggleAttribute('pull', true);
    bindPull.setAttribute('property', value);
    bindPull.innerHTML = '<output>...</output>';
    label.append(span, bindPull);

    if (this.#propVal !== 'null') {
      newval = this.#propVal || 'bar';
      const bindPush = document.createElement('a-bind');
      bindPush.toggleAttribute('push', true);
      bindPush.setAttribute('property', value);
      bindPush.setAttribute('event', 'click');
      const btn = this.#createEl('button', '', `Set property to '${newval}'`);
      btn.value = newval;
      bindPush.appendChild(btn);
      wrapper.append(label, bindPush);
    }


    container.append(wrapper);
    this.renderCodeBlock(value, 'property', newval);
  }

  renderCodeBlock(value, type, btnVal) {
    if (this.#propVal === 'null') return;
    const wrapper = this.#createEl('div', 'flex1 dynamic-content');
    const acode = this.#createEl('a-code');
    const textarea = document.createElement('textarea');
    acode.setAttribute('highlight', '');
    acode.setAttribute('indent', '2');
    textarea.textContent = `
			<a-bind
				pull
    model="${this.model}"
				${type}="${value}">
			 	<output></output>
			</a-bind>

			<a-bind
				push
    model="${this.model}"
				${type}="${value}"
				event="click">
			  <button
			  	value='${btnVal}'>
			  	...
			  </button>
			</a-bind>
    `;

    acode.append(textarea);
    wrapper.append(acode);
    this.#codeContainer.prepend(wrapper);
  }

  get model() { return CodeDemo.model; }
  set model(value) { this.setAttribute('model', value); }
}

if (!customElements.get('code-demo')) customElements.define('code-demo', CodeDemo);
