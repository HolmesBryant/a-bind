export default class DataBar extends HTMLElement {
  #model;
  #property;
  #event = 'input';
  #elemAttr = 'value';
  #modelAttr;
  #inputid;
  #inputname;
  #attrbtn;
  #propbtn;
  #showcode = false;

  static observedAttributes = [
    'model',
    'property',
    'event',
    'elem-attr',
    'model-attr',
    'inputid',
    'inputname',
    'attrbtn',
    'propbtn',
    'showcode'
  ];

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  attributeChangedCallback(attr, oldval, newval) {
    if (oldval === newval) return;

    switch (attr) {
      case 'model':       this.#model = newval; break
      case 'property':    this.#property = newval; break
      case 'event':       this.#event = newval; break
      case 'elem-attr':   this.#elemAttr = newval; break
      case 'model-attr':  this.#modelAttr = newval; break
      case 'inputid':     this.#inputid = newval; break
      case 'inputname':   this.#inputname = newval; break
      case 'attrbtn':     this.#attrbtn = newval; break
      case 'propbtn':     this.#propbtn = newval; break
      case 'showcode':    this.#showcode = newval !== 'false' && newval !== false; break
    }
  }

  connectedCallback() {
    this.style.opacity = '1';
    this.render();
  }

  disconnectedCallback() {
    for (const child of this.children) {
      child.remove();
    }

    this.shadowRoot.innerHTML = "";
  }

  render() {
    const template = document.createElement('template');
    const hasOa = this.hasAttribute('model-attr');
    const hasPropBtn = this.hasAttribute('propbtn');

    template.innerHTML = `
  <style>
  	:host { display:block }

		/**** Backgrounds ****/

  		code
  		{ background: var(--bg1-color) }

			details[open],
			section,
			.card > div
		  { background: var(--bg2-color) }

			button,
			.card
			{ background: var(--bg3-color) }

  		.bg2
  		{ background-color: #f5f5f5; }

			hr,
			button:hover,
			button:active
			{ background: var(--accent-color); }

		/**** Borders ****/

			button
			{ border: 1px solid var(--border-color) }

			button
			{ border-radius: 5px; }

		/**** Text ****/

			button
			{ color: var(--text-color )}

			code
			{ font-family: ui-monospace }

      /*output
      { white-space: pre-wrap; }*/

		/**** Cursor ****/

			button,
			summary
			{ cursor: pointer }

		/**** Shadows ****/
			button:hover
			{ box-shadow: 2px 2px 5px black }

			button:active
			{ box-shadow: inset 5px 5px 10px black }

		/**** Misc ****/

      button
      { padding: var(--pad) }

  		code {
  			padding: 0.2em 0.4em;
  			margin: 0;
  			border-radius: 3px;
  		}

  		hr
  		{ height: 2px }

      textarea {
      	box-sizing: border-box;
      	width: 100%;
      }

			.card {
				min-height: 85px;
				padding:  var(--pad);
			}

			.card > div {
		    padding: var(--pad);
		  }

			.column
			{ flex-direction: column; }

      .column.start
      { justify-content: flex-start }

			.flex {
				align-items: center;
				display: flex;
				flex-wrap: wrap;
				gap: var(--gap);
				justify-content: space-around;
				row-gap: 1rem;
			}

			.flex1
			{ flex: 1; }

			.nofrills
      { padding: 0 2px; }

			.sticky {
				position: sticky;
				top: var(--min);
			}

      summary {
        width: max-content;
      }

			.stretch
			{ align-items: stretch; }

      .vstart { align-content: flex-start; }
  </style>

  <div class="card flex stretch">
    ${hasOa ? `
    <div class="flex1 flex column bg2" part="attribute">
      <span>Attribute <code>${this.modelAttr}</code></span>
      <a-bind model="${this.model}" model-attr="${this.modelAttr}" elem-attr="${this.elemAttr}">
        <output>...</output>
      </a-bind>
      <a-bind model="${this.model}" func="setAttribute:${this.modelAttr}" event="click">
        <button value="${this.attrbtn}">setAttribute('${this.modelAttr}', "${this.attrbtn}")</button>
      </a-bind>
    </div>` : ''}

    <div class="flex1 flex column" part="property">
      <span>Property <code>${this.property}</code></span>
      <a-bind model="${this.model}" property="${this.property}" elem-attr="${this.elemAttr}">
        <output>...</output>
      </a-bind>

      ${hasPropBtn ? `
      <div>${this.propbtn}</div>
      <a-bind model="${this.model}" func="${this.property}:bing" event="click">
        <button value="${this.propbtn}">${this.property} = "${this.propbtn}"</button>
      </a-bind>` : ''}
    </div>

    <div class="flex1 flex column" part="input">
      <span for="${this.inputid}">Input: ${this.modelAttr || this.inputname}</span>
      <slot name="input"></slot>
    </div>

    <details ${this.showcode ? 'open' : ''} style="width:100%" class="sticky">
      <summary class="nofrills">code</summary>
      <section class="card flex stretch">
        ${hasOa ? `
        <div class="flex1 flex column start" part="code-attribute">
          Attribute:
          <a-code highlight>
            <textarea readonly>

            <a-bind
              model="${this.model}"
              model-attr="${this.modelAttr}">
              <output></output>
            </a-bind>

            <a-bind
              oneway
              model="${this.model}"
              func="setAttribute:${this.modelAttr}"
              event="click">
              <button value="${this.attrbtn}">
                ...
              </button>
            </a-bind>

            </textarea>
          </a-code>
        </div>` : ''}

        <div class="flex1 flex column start" part="code-property">
          Property:
          <a-code highlight>
            <textarea readonly>

            <a-bind
              model="${this.model}"
              property="${this.property}">
              <output></output>
            </a-bind>

            <a-bind
              oneway
              model="${this.model}"
              property="${this.property}"
              event="click">
              <button value="${this.property}">
                ...
              </button>
            </a-bind>

            </textarea>
          </a-code>
        </div>

        <div class="flex1 flex column start" part="code-input">
          Input:
          <slot name="code-input"></slot>
        </div>
      </section>
    </details>
  </div>
  <hr>
  `;

    this.shadowRoot.appendChild(template.content.cloneNode(true));
  }

  get event() { return this.#event; }
  set event(value) { this.setAttribute('event', value) }

  get model() { return this.#model; }
  set model(value) { this.#model = value; }

  get property() { return this.#property; }
  set property(value) { this.setAttribute('property', value) }


  get elemAttr() { return this.#elemAttr; }
  set elemAttr(value) { this.setAttribute('elem-attr', value) }

  get modelAttr() { return this.#modelAttr; }
  set modelAttr(value) { this.setAttribute('model-attr', value) }

  get inputid() { return this.#inputid; }
  set inputid(value) { this.setAttribute('inputid', value) }

  get inputname() { return this.#inputname; }
  set inputname(value) { this.setAttribute('inputname', value) }

  get attrbtn() { return this.#attrbtn; }
  set attrbtn(value) { this.setAttribute('attrbtn', value) }

  get propbtn() { return this.#propbtn; }
  set propbtn(value) { this.setAttribute('propbtn', value) }

  get showcode() { return this.#showcode }
  set showcode(value) { this.setAttribute('showcode', value) }
}

document.addEventListener('DOMContentLoaded', () => {
	if (!customElements.get('data-bar')) customElements.define('data-bar', DataBar);
});
