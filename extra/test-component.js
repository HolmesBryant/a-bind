import ABind from '../src/index.js';

const DEFAULTS = {
  text: 'initial text',
  date: '1990-12-25',
  progress: 42,
  color: '#11df44',
  checkbox: 'foo',
  radio: 'foo',
  range: 50,
  button: 'button value',
  selected: 'two',
  selectedMulti: ['one', 'three'],
  file: null,
  optionsA: "Foo, Bar, Baz",

  optionsB: [
    {label: 'Option One', value: 'one'},
    {label: 'Option Two', value: 'two'},
    {label: 'Option Three', value: 'three'}
  ]
};

class TestComponent extends HTMLElement {
  #text;
  #date;
  #progress;
  #color;
  #checkbox;
  #radio;
  #range;
  #button;
  #selected;
  #selectedMulti;
  #file;
  #optionsA;
  #optionsB;

  sections = [
    {
      title: 'Text Input with Dynamic Datalist',
      label: 'input type="text" list="datalist"',
      inputId: 'input-text',
      inputType: 'text',
      inputProp: 'text',
      template: '#tmpl-input',
    },
    {
      title: 'The Datalist',
      label: 'datalist',
      inputId: 'datalist',
      inputProp: 'options-b',
      template: '#tmpl-datalist',
    },
    {
      title: 'Section Two',
      label: 'Progress Input',
      inputId: 'elem-progress',
      inputProp: 'progress',
      template: '#tmpl-progress',
    },
    {
      title: 'Section Three',
      label: 'Select Input',
      inputId: 'input-select',
      inputProp: 'selected',
      template: '#tmpl-select',
    }
  ];

  static observedAttributes = [
    'text',
    'date',
    'progress',
    'color',
    'checkbox',
    'radio',
    'range',
    'button',
    'selected',
    'selected-multi',
    'file',
    'options-a',
    'options-b',
  ];

  static template = document.createElement('template');
  static {
    this.template.innerHTML = `
      <style>
        :host {
          display: block;
        }

        hr {
          background: var(--accent-color);
          border-radius: 2px;
          height: 2px;
        }

        output {
          border: 1px dotted var(--border-color);
          display: flex;
          padding: 2px;
        }

        section {
          background: var(--bg2-color);
          padding: var(--pad);
        }

        summary {
          border: 1px solid var(--border-color);
          cursor: pointer;
        }

        details:hover > summary,
        details[open] > summary {
          background: var(--accent-color);
        }

        .flex {
          display: flex;
          gap: var(--gap);
        }

        .column {
          align-items: center;
          flex-direction: column;
        }

        .flex1 {
          flex: 1;
        }

        .card {
          background: var(--bg3-color);
          border: 1px solid var(--border-color);
          padding: 1rem 5px;
        }
      </style>

      <a-bindgroup model="this">
        <div id="container"></div>

        <a-repeat prop="sections">
          <template id="tmpl-input">
            <section>
              <h3>{{title}}</h3>
              <div class="flex">

                <div class="card flex column flex1">
                  <label for="out-{{inputId}}">Attribute: <i>{{inputProp}}</i></label>
                  <a-bind pull attr="text">
                    <output id="out-{{inputId}}" for="{{inputId}}"></output>
                  </a-bind>
                </div>

                <div class="card flex1">
                  <form method="dialog" class="flex column">
                  <label for="{{inputId}}">{{label}}</label>
                  <a-bind attr="text">
                    <input type="{{inputType}}" id="{{inputId}}">
                  </a-bind>

                  <input type="reset" value="clear">
                  </form>
                </div>

              </div><!--/card-->

              <details>
                <summary>code</summary>
                <div class="flex">
                  <div class="card flex1">
                      foo
                  </div>

                  <div class="card flex1">
                    bar
                  </div>
                </div>
            </section>
            <hr>
          </template>

          <template id="tmpl-datalist">
            <section>
              <h3>{{title}}</h3>
              <div class="card flex column">
                <div class="flex column flex1">
                  <label for="out-{{inputId}}">
                    Attribute: <em>{{inputProp}}</em>
                  </label>

                  <a-bind attr="{{inputProp}}">
                    <output id="out-{{inputId}}" for="{{inputId}}">...</output>
                  </a-bind>
                </div>

                <datalist id="{{inputId}}"></datalist>

                <a-repeat scope="this" prop="optionsB" target="#{{inputId}}">
                  <template>
                    <option value="{{value}}">{{label}}</option>
                  </template>
                </a-repeat
                </div>
              </div><!--/card-->
            </section>
          </template>

          <template id="tmpl-progress">
            <section>
              <h3>{{title}}</h3>
              <label for="{{inputId}}">{{label}}</label><br>
              <progress id="{{inputId}}" max="100"></progress>
            </section>
          </template>

          <template id="tmpl-select">
            <section>
              <h3>{{title}}</h3>
              <label for="{{inputId}}">{{label}}</label><br>

              <select id="{{inputId}}"></select>

              <a-repeat scope="app" prop="selectOptions" target="#{{inputId}}">

                <template>
                  <option value="{{value}}">{{label}}</option>
                </template>
              </a-repeat>
            </section>
          </template>
        </a-repeat>
      </a-bindgroup>
    `;
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  get text() { return this.#text }
  set text(value) { this.setAttribute('text', value) }

  get date() {return this.#date }
  set date(value) { this.setAttribute('date', value) }

  get progress() { return this.#progress }
  set progress(value) { this.setAttribute('progress', value) }

  get color() { return this.#color }
  set color(value) { this.setAttribute('color', value) }

  get checkbox() { return this.#checkbox }
  set checkbox(value) { this.setAttribute('checkbox', value) }

  get radio() { return this.#radio }
  set radio(value) { this.setAttribute('radio', value) }

  get range() { return this.#range }
  set range(value) { this.setAttribute('range', value) }

  get button() { return this.#button }
  set button(value) { this.setAttribute('button', value) }

  get selected() { return this.#selected }
  set selected(value) { this.setAttribute('selected', value) }
  get selectedMulti() { return this.#selectedMulti }
  set selectedMulti(value) { this.setAttribute('selected-multi', JSON.stringify(value)) }

  get file() { return this.#file }
  set file(value) { this.setAttribute('file', value) }

  get optionsA() { return this.#optionsA }
  set optionsA(value) { this.setAttribute('options-a', value) }

  get optionsB() { return this.#optionsB }
  set optionsB(value) { this.setAttribute('options-b', JSON.stringify(value)) }

  attributeChangedCallback(attr, oldval, newval) {
    if (newval === oldval) return;
    let update = true;

    switch (attr) {
    case 'text':
      this.#text = newval;
      break;
    case 'date':
      this.#date = newval;
      break;
    case 'progress':
      this.#progress = newval;
      break;
    case 'color':
      this.#color = newval;
      break;
    case 'checkbox':
      this.#checkbox = newval;
      break;
    case 'radio':
      this.#radio = newval;
      break;
    case 'range':
      this.#range = newval;
      break;
    case 'button':
      this.#button = newval;
      break;
    case 'selected':
      this.#selected = newval;
      break;
    case 'selected-multi':
      const selected = JSON.parse(newval);
      this.#selectedMulti = selected;
      update = false;
      ABind.update(this, attr, selected);
      break;
    case 'file':
      this.#file = newval;
      break;
    case 'options-a':
      this.#optionsA = newval;
      break;
    case 'options-b':
      const options = JSON.parse(newval);
      this.#optionsB = options;
      update = false;
      ABind.update(this, attr, options);
      break;
    }

    if (update) ABind.update(this, attr, newval);
  }

  connectedCallback() {
    this.reset();
    this.shadowRoot.append(TestComponent.template.content.cloneNode(true));
    customElements.whenDefined('a-repeat').then(() => {
        this.shadowRoot.querySelector('#input-text').setAttribute('list','datalist');
    });
  }

  openDialog(event) {
    const dialog = this.shadowRoot.querySelector('dialog');
    dialog.showModal();
  }

  reset() {
    Object.keys(DEFAULTS).forEach(key => {
      this[key] = DEFAULTS[key];
      ABind.update(this, key, this[key]);
    });
  }
}

customElements.define('test-component', TestComponent);
