import ABind from '../src/index.js';
import styles from './styles.css' assert {type: 'css'};

// 1. We wrap the HTML provided in the prompt into a Template String
const HTML_CONTENT = `
<style>
  :host { display: block;}
</style>

<details name="c-examples" open>
<summary class="nofrills">Inputs</summary>
  <a-bindgroup model="this">
    <a-repeat prop="sections">

      <template id="tmpl-section">
        <section class="flex column stretch">
          <div class="flex stretch">

            <div class="flex column flex1 card center">
              <strong>
                Property: <i>{{prop}}</i>
              </strong>

              <div class="flex center">
                <a-bind pull prop="{{prop}}">
                  <output for="{{inputId}}"></output>
                </a-bind>

                <a-bind push prop={{prop}} event="click">
                  <button value="{{newval}}">
                    Set to "{{newval}}"
                  </button>
                </a-bind>
              </div><!-- /output -->
            </div><!-- /card -->

            <a-repeat prop="control">
              <template id="tmpl-basic">
                <div class="flex column flex1 card center">
                  <label for="{{inputId}}">
                    {{label}}
                  </label>

                  <a-bind
                    prop="{{prop}}">
                    <input id="{{inputId}}" type="{{inputType}}" value="{{inputValue}}">
                  </a-bind>
                </div><!-- /card -->
              </template>

              <template id="tmpl-color">
                <div class="flex column flex1 card center">
                  <a-bind prop="{{prop}}" elem-prop="style.background">
                    <label for="{{inputId}}">
                      {{label}}
                    </label>
                  </a-bind>

                  <a-bind
                    prop="{{prop}}">
                    <input id="{{inputId}}" type="{{inputType}}" value="{{inputValue}}">
                  </a-bind>
                </div><!-- /card -->
              </template>

              <template id="tmpl-checkbox">
                <div class="flex column flex1 card center">
                  <label for="{{inputId}}">
                    {{label}}
                  </label>

                  <a-bind
                    prop="{{prop}}"
                    elem-prop="{{elemProp}}">
                    <input
                      id="{{inputId}}"
                      type="{{inputType}}">
                  </a-bind>
                </div><!-- /card -->
              </template>

              <template id="tmpl-input-arr">
                <fieldset class="flex column flex1 card">
                  <legend>{{label}}</legend>

                  <div>
                    <label class="flex row-reverse">
                        value="foo"

                      <a-bind prop="{{prop}}">
                        <input
                          id="input-arr-foo{{idx}}"
                          type="{{inputType}}"
                          name="input-arr-{{idx}}"
                          value="foo">
                      </a-bind>
                    </label>

                    <label class="flex row-reverse">
                        value="bar"

                      <a-bind prop="{{prop}}">
                        <input
                          id="input-arr-bar{{idx}}"
                          name="input-arr-{{idx}}"
                          type="{{inputType}}"
                          value="bar">
                      </a-bind>
                    </label>

                    <label class="flex row-reverse">
                        value="baz"

                      <a-bind prop="{{prop}}">
                        <input
                          id="input-arr-baz{{idx}}"
                          name="input-arr-{{idx}}"
                          type="{{inputType}}"
                          value="baz">
                      </a-bind>
                    </label>
                  </div><!-- /input -->
                </fieldset>
              </template>

              <template id="tmpl-select">
                <div class="flex column flex1 card center">
                  <label for="{{inputId}}">
                    {{label}}
                  </label>

                  <a-bind prop="{{prop}}">
                    <select id="{{inputId}}"></select>
                  </a-bind>

                  <a-repeat
                    target="#{{inputId}}"
                    prop="{{options}}"
                    scope="this">

                    <template>
                      <option value="{{value}}">{{label}}</option>
                    </template>
                  </a-repeat>
                </div><!-- /card -->
              </template>

              <template id="tmpl-select-multi">
                <div class="flex column flex1 card center">
                  <label for="{{inputId}}">
                    {{label}}
                  </label>

                  <a-bind
                    prop="{{prop}}">
                    <select multiple id="{{inputId}}"></select>
                  </a-bind>

                  <a-repeat
                    target="#{{inputId}}"
                    prop="{{options}}"
                    scope="this">

                    <template>
                      <option value="{{value}}">{{label}}</option>
                    </template>
                  </a-repeat>
                </div><!-- /card -->
              </template>

              <template id="tmpl-button">
                <div class="flex column flex1 card center">
                  <label for={{inputId}}>
                    {{label}}
                  </label>

                  <a-bind
                    prop="button"
                    elem-prop="{{elemProp}}"
                    event="click"
                    func="notify">
                    <button id="{{inputId}}" value={{inputValue}}>
                      Click Me!
                    </button>
                  </a-bind>
                </div><!-- /card -->
              </template>

              <template id="tmpl-progress">
                <div class="flex column flex1 card center">
                  <label for="{{inputId}}">
                    {{label}}
                  </label>

                  <a-bind
                    prop="{{prop}}">
                    <progress id="{{inputId}}" value="{{inputValue}}" max="100">foo</progress>
                  </a-bind>
                </div><!-- /card -->
              </template>

              <template id="tmpl-datalist">
                <div class="flex column flex1 card center">
                  <label for="{{inputId}}">
                    {{label}}
                  </label>

                  <a-bind
                    push
                    prop="text"
                    throttle="300">
                    <input id="{{inputId}}" list="o-datalist">
                  </a-bind>

                  <datalist id="o-datalist"></datalist>

                  <a-repeat
                    target="#o-datalist"
                    prop="{{prop}}"
                    scope="this">

                    <template>
                      <option value="{{item}}"></option>
                    </template>
                  </a-repeat>
                </div><!-- /card -->
              </template>

              <template id="tmpl-double-bind">
                <div class="flex column flex1 card center">
                  <label for={{inputId}}>
                    {{label}}
                  </label>

                  <a-bind
                    prop="button"
                    elem-prop="textContent">

                    <a-bind
                      prop="button"
                      event="click"
                      func="notify">
                      <button id="{{inputId}}"></button>
                    </a-bind>
                  </a-bind>
                </div><!-- /card -->
              </template>
            </a-repeat>

          </div><!-- row -->

          <details>
            <summary class="nofrills">code</summary>

            <div class="flex column stretch">

              <div class="flex stretch">
                <a-code highlight class="flex1 card">
                  <textarea>{{outputCode}}</textarea>
                </a-code>

                <a-code highlight class="flex1 card">
                  <textarea>{{inputCode}}</textarea>
                </a-code>
              </div><!-- /row -->

              <div class="flex column card">
                <strong>The Model</strong>
                <a-code highlight="javascript">{{modelCode}}</a-code>
              </div><!-- /row -->
            </div><!-- /column -->
          </details>
        </section>
        <hr>
      </template>

      <template id="tmpl-section-file">
        <section class="flex column stretch">

          <div class="flex column card center">
            <label for="{{inputId}}">
              {{label}}
            </label>

            <a-bind
              push
              event="change"
              func="fileInfo">
              <input id="{{inputId}}" type="file" multiple>
            </a-bind>
          </div><!-- /card -->
        </section>
      </template>
    </a-repeat>
  </a-bindgroup>
</details>

<details name="c-examples">
<summary class="nofrills">Form Submission</summary>
  <a-bindgroup
    model="this">

    <a-bind
      event="submit"
      func="submitForm">

      <form onsubmit="return false">
        <div class="flex column">
          <div class="flex column gap0">
            <label for="o-form-name">Name</label>

            <a-bind
              prop="name">

              <input
                id="o-form-name"
                type="text"
                name="name">
            </a-bind>
          </div>

          <div class="flex column gap0">
            <label for="o-form-email">Email</label>

            <a-bind
              prop="email">

              <input
                id="o-form-email"
                type="email"
                name="email">
            </a-bind>
          </div>

          <div class="flex center">
            <input type="submit">
            <input type="reset">
          </div>
        </div>
      </form>
    </a-bind>
  </a-bindgroup>
</details>

<details name="c-examples">
<summary class="nofrills">Content Editable</summary>
  <a-bindgroup model="this">
    <div class="flex stretch">
      <a-bind
        once
        prop="editable"
        elem-prop="innerHTML"
        class="flex1 card"
        throttle="300">

        <div contenteditable></div>
      </a-bind>

      <a-bind
        pull
        class="flex1 card"
        prop="editable">

        <output></output>
      </a-bind>
    </div>
  </a-bindgroup>
</details>
`;

/**
 * Custom Element wrapping testObject logic
 */
export default class TestComponent extends HTMLElement {
  sections;

  #text = "Initial Text";
  #listInput = "";
  #email = "name@email.com";
  #number = 12345;
  #textarea = "Initial content.";
  #date = "1914-12-25";
  #selected = "bar";
  #selectMulti = ['foo', 'baz'];
  #checkbox = 'foo';
  #checkboxBool = false;
  #checkboxArr = ['foo', 'baz'];
  #radioGroup = 'foo';
  #button = "Initial Value";
  #color = "#cd5c5c";
  #range = 50;
  #progress = 50;
  #name = "My Name";
  #editable = "<p>Eiusmod magna eiusmod anim</p>";

  #optionsA = [
    {value: 'foo', label: 'Foo!'},
    {value: 'bar', label: 'Bar!'},
    {value: 'baz', label: 'Baz!'}
  ];

  #options = ['foo', 'bar', 'baz'];

  static template = document.createElement('template');
  static { this.template.innerHTML = HTML_CONTENT; }

  static observedAttributes = [
    'text',
    'listInput',
    'email',
    'number',
    'textarea',
    'date',
    'selected',
    'selectMulti',
    'checkbox',
    'checkboxBool',
    'checkboxArr',
    'radioGroup',
    'button',
    'color',
    'range',
    'progress',
    'name',
    'editable',
    'optionsA',
    'options',
  ];

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.sections = this.#getSections();
  }

  attributeChangedCallback(attr, oldval, newval) {
    if (newval === oldval) return;
    switch (attr) {
      case 'text':
        this.#text = newval;
        break;
      case 'list-input':
        this.#listInput = newval;
        break;
      case 'email':
        this.#email = newval;
        break;
      case 'number':
        this.#number = newval;
        break;
      case 'textarea':
        this.#textarea = newval;
        break;
      case 'date':
        this.#date = newval;
        break;
      case 'selected':
        this.#selected = newval;
        break;
      case 'select-multi':
        this.#selectMulti = newval;
        break;
      case 'checkbox':
        this.#checkbox = newval;
        break;
      case 'checkbox-bool':
        this.#checkboxBool = newval;
        break;
      case 'checkbox-arr':
        newval = newval.split(',');
        if (newval === this.#checkboxArr) return;
        this.#checkboxArr = newval;
        ABind.update(this, 'checkboxArr', newval);
        break;
      case 'radio-group':
        this.#radioGroup = newval;
        break;
      case 'button':
        this.#button = newval;
        break;
      case 'color':
        this.#color = newval;
        break;
      case 'range':
        this.#range = newval;
        break;
      case 'progress':
        this.#progress = newval;
        break;
      case 'name':
        this.#name = newval;
        break;
      case 'editable':
        this.#editable = newval;
        break;
      case 'options-a':
        this.#optionsA = newval;
        break;
      case 'options':
        newval = newval.split(',');
        if (newval === this.#options) return;
        this.#options = newval;
        ABind.update(this, 'options', newval);
        break;
    }
  }

  connectedCallback() {
    this.shadowRoot.adoptedStyleSheets = [styles];
    this.shadowRoot.append(TestComponent.template.content.cloneNode(true));
  }

  // --- Getters / Setters ---

  get text() { return this.#text }
  set text(value) { this.setAttribute('text', value) }

  get listInput() { return this.#listInput }
  set listInput(value) { this.setAttribute('list-input', value) }

  get email() { return this.#email }
  set email(value) { this.setAttribute('email', value) }

  get number() { return this.#number }
  set number(value) { this.setAttribute('number', value) }

  get textarea() { return this.#textarea }
  set textarea(value) { this.setAttribute('textarea', value) }

  get date() { return this.#date }
  set date(value) { this.setAttribute('date', value) }

  get selected() { return this.#selected }
  set selected(value) { this.setAttribute('selected', value) }

  get selectMulti() { return this.#selectMulti }
  set selectMulti(value) { this.setAttribute('select-multi', value) }

  get checkbox() { return this.#checkbox }
  set checkbox(value) { this.setAttribute('checkbox', value) }

  get checkboxBool() { return this.#checkboxBool }
  set checkboxBool(value) { this.setAttribute('checkbox-bool', value) }

  get checkboxArr() { return this.#checkboxArr }
  set checkboxArr(value) { this.setAttribute('checkbox-arr', value); }

  get radioGroup() { return this.#radioGroup }
  set radioGroup(value) { this.setAttribute('', value) }

  get button() { return this.#button }
  set button(value) { this.setAttribute('', value) }

  get color() { return this.#color }
  set color(value) { this.setAttribute('', value) }

  get range() { return this.#range }
  set range(value) { this.setAttribute('', value) }

  get progress() { return this.#progress }
  set progress(value) { this.setAttribute('', value) }

  get name() { return this.#name }
  set name(value) { this.setAttribute('', value) }

  get editable() { return this.#editable }
  set editable(value) { this.setAttribute('', value) }

  get optionsA() { return this.#optionsA }
  set optionsA(value) { this.setAttribute('', value) }

  get options() { return this.#options }
  set options(value) { this.setAttribute('options', value) }

  // --- Methods ---

  fileInfo(event) {
    const fileList = event.target.files;
    this.files = fileList;
    const list = [];
    const elem = document.createElement('input');
    elem.type="hidden";

    for (const item of fileList) {
      const obj = {
        name: item.name,
        modified: item.lastModifiedDate,
        size: item.size,
        type: item.type
      };
      list.push(obj);
    }

    const str = JSON.stringify(list, null, 2);
    elem.value = str;

    const fakeEvent = {
      type: 'change',
      target: elem
    };

    this.notify(fakeEvent);
  }

  notify(event) {
    const html = `
      <form method="dialog">
        <button>X</button>
      </form>
      <p><b>Argument passed:</b> Event</p>
      <p><b>Event type:</b> ${event.type}</p>
      <p><b>Event target:</b> ${event.target.localName}</p>
      <p><b>Event target value:</b> <pre>${event.target.value}</pre></p>
    `;
    const dialog = document.createElement('dialog');
    dialog.style.border = "1px solid #333";
    dialog.style.padding = "20px";
    dialog.style.background = "#fff";

    const cleanup = function(evt) {
      dialog.removeEventListener('close', cleanup);
      dialog.remove();
    }

    dialog.id = 'btn-dialog';
    dialog.innerHTML = html;
    dialog.addEventListener('close', cleanup);

    // Append to shadowRoot so it stays encapsulated, or body if you prefer global
    document.body.append(dialog);
    dialog.showModal();
  }

  reset(event) {
    // Reset logic would go here
    console.log("Reset Triggered");
  }

  submitForm(event) {
    // Handle Shadow DOM retargeting for forms
    const form = event.target.closest('form');
    if (!form) return;

    const formdata = new FormData(form);
    const data = [];
    const elem = document.createElement('form');

    for (const input of formdata) {
      data.push({ [input.shift()]: input.shift() });
    }

    const str = JSON.stringify(data, null, 2);
    elem.value = str;

    const fakeEvent = {
      type: 'submit',
      target: elem
    };

    this.notify(fakeEvent);
  }

  // Helper to return the massive sections array
  #getSections() {
    return [
      // text
      {
        prop: 'text',
        inputId: 'o-inputtext',
        model: 'this',
        newval: 'New Value',
        template: 'tmpl-section',
        control: [{
          template: 'tmpl-basic',
          label: 'input type="text"',
          inputType: 'text',
          inputId: 'o-inputtext',
          prop: 'text',
          elemProp: 'value'
        }],
        outputCode: `
          <a-bindgroup
            model="this">

            <a-bind
              pull
              prop="text">

              <output></output>
            </a-bind>

            <a-bind
              push
              prop="text"
              event="click">

              <button
                value="New Value">
                Set to "New Value"
              </button>
            </a-bind>
          </a-bindgroup>`,
        inputCode: `
          <a-bind
            model="this"
            prop="text">

            <input type="text">
          </a-bind>`,
        modelCode: `
          const testObject = {
            text: 'Initial Text'
          }
          `
      },
      // datalist
      {
        prop: 'options',
        inputId: 'o-input-with-list',
        model: 'this',
        newval: 'bing, bang, boom',
        template: 'tmpl-section',
        control: [{
          template: 'tmpl-datalist',
          label: 'dynamic datalist',
          inputId: 'o-input-with-list',
          prop: 'options',
        }],
        outputCode: `
          <a-bindgroup model="this">
            <a-bind
              pull
              prop="options">

              <output></output>
            </a-bind>

            <a-bind
              push
              prop="options"
              event="click">

              <button
                value="bing, bang, boom">
                Set to "bing, bang, boom"
              </button>
            </a-bind>
          </a-bindgroup>
        `,
      inputCode: `
        <a-bindgroup model="this">
          <a-bind
            push
            prop="text"
            throttle="300">
            <input list="o-datalist">
          </a-bind>

          <datalist
            id="o-datalist">
          </datalist>

          <a-repeat
            target="#o-datalist"
            prop="options"
            scope="this">

            <template>
              <option
                value="{{item}}">
              </option>
            </template>
          </a-repeat>
        </a-bindgroup>
      `,
      modelCode: `
        /* Must use ABind.update() here
        because the data transforms.
        New data is comma separated string
        which is transformed into array
        in attributeChangedCallback()*/

        import ABind from './path/to/a-bind.min.js';

        export default class TestComponent {

          #options: ['foo', 'bar', 'baz'];

          get options() { return this.#options }

          set options(value) {
            this.setAttribute('options', value);
          }

          attributeChangedCallback(attr, oldval, newval) {
            switch (attr) {
              case 'options':
                this.#options = value.split(',');
                ABind.update(this, 'options', this.#options);
                break;
            }
          }
        }`
      },
      // date
      {
        prop: 'date',
        inputId: 'o-inputdate',
        model: 'this',
        newval: '1215-06-15',
        template: 'tmpl-section',
        control: [{
          template: 'tmpl-basic',
          label: 'input type="date"',
          inputType: 'date',
          inputId: 'o-inputdate',
          prop: 'date',
          elemProp: 'value'
        }],
        outputCode: `
        <a-bindgroup
          model="this">

          <a-bind
            pull
            prop="date">

            <output></output>
          </a-bind>

          <a-bind
            push
            prop="date"
            event="click">

            <button
              value="1215-06-15">
              Set to "1215-06-15"
            </button>
          </a-bind>
        </a-bindgroup>
        `,
      inputCode: `
        <a-bind
          model="this"
          prop="date">

          <input type="date">
        </a-bind>`,
      modelCode: `
        const testObject = {
          date: "1914-12-25",
        }
        `
      },
      // color
      {
        prop: 'color',
        inputId: 'o-inputcolor',
        model: 'this',
        newval: '#049f9d',
        template: 'tmpl-section',
        control: [{
          template: 'tmpl-color',
          label: 'input type="color"',
          inputType: 'color',
          inputId: 'o-inputcolor',
          prop: 'color',
          elemProp: 'value'
        }],
        outputCode: `
          <a-bindgroup
            model="this">

            <a-bind
              pull
              prop="color">

              <output></output>
            </a-bind>

            <a-bind
              push
              prop="color"
              event="click">

              <button
                value="#049f9d">
                Set to "#049f9d"
              </button>
            </a-bind>
          </a-bindgroup>
        `,
        inputCode: `
          <a-bind
            model="this"
            prop="color">

            <input type="color">
          </a-bind>
        `,
        modelCode: `
          const testObject = {
            color: "#cd5c5c",
          }
        `
      },
      // selected
      {
        prop: 'selected',
        inputId: 'o-select',
        model: 'this',
        newval: 'baz',
        template: 'tmpl-section',
        control: [{
          template: 'tmpl-select',
          label: 'select',
          inputId: 'o-select',
          prop: 'selected',
          options: 'optionsA'
        }],
        outputCode: `
          <a-bindgroup
            model="this">

            <a-bind
              pull
              prop="selected">

              <output></output>
            </a-bind>

            <a-bind
              push
              prop="selected"
              event="click">

              <button
                value="baz">
                Set to "baz"
              </button>
            </a-bind>
          </a-bindgroup>
        `,
        inputCode: `
          <a-bind
            model="this"
            prop="selected">

            <select>
              <option
                value="foo">
                  Foo!
                </option>
              <option
                value="bar">
                Bar!
              </option>
              <option
                value="baz">
                Baz
              </option>
            </select>
          </a-bind>
        `,
        modelCode: `
          const testObject = {
            selected: "bar",
          }
        `
      },
      // selectMulti
      {
        prop: 'selectMulti',
        inputId: 'o-select-multi',
        model: 'this',
        template: 'tmpl-section',
        newval: 'bar, baz',
        control: [{
          template: 'tmpl-select-multi',
          label: 'dynamic select [multiple]',
          inputId: 'o-select-multi',
          prop: 'selectMulti',
          options: 'optionsA'
        }],
        outputCode: `
        <a-bindgroup
          model="this">

          <a-bind
            pull
            prop="selectMulti">

            <output></output>
          </a-bind>

          <a-bind
            push
            prop="selectMulti"
            event="click">

            <button
              value="bar, baz">
              Set to "bar, baz"
            </button>
          </a-bind>
        </a-bindgroup>
      `,
      inputCode: `
        <a-bind
          model="this"
          prop="selectMulti">

          <select
            multiple
            id="o-select-multi">
          </select>
        </a-bind>

        <a-repeat
          target="#o-select-multi"
          prop="optionsA"
          scope="this">

        <template>
          <option
            value="{{value}}">
            {{label}}
          </option>
        </template>
        </a-repeat>
      `,
      modelCode: `
        const testObject = {
          selectMulti: 'foo, baz',
          optionsA: [
            {value: 'foo', label: 'Foo!'},
            {value: 'bar', label: 'Bar!'},
            {value: 'baz', label: 'Baz!'}
          ],
        }
      `
      },
      // checkbox
      {
        prop: 'checkbox',
        inputId: 'o-checkbox',
        model: 'this',
        newval: 'bar',
        template: 'tmpl-section',
        control: [{
          template: 'tmpl-basic',
          label: 'checkbox value = "foo"',
          inputType: 'checkbox',
          inputId: 'o-checkbox',
          inputValue: 'foo',
          elemProp: 'value',
          prop: 'checkbox',
        }],
        outputCode: `
          <a-bindgroup
            model="this">

            <a-bind
              pull
              prop="checkbox">

              <output></output>
            </a-bind>

            <a-bind
              push
              prop="checkbox"
              event="click">

              <button
                value="bar">
                Set to "bar"
              </button>
            </a-bind>
          </a-bindgroup>
        `,
        inputCode: `
          <a-bind
            model="this"
            prop="checkbox">

            <input
              type="checkbox"
              value="foo">
          </a-bind>`,
        modelCode: `
          const testObject = {
            checkbox: 'foo',
          }
        `
      },
      // checkboxBool
      {
        prop: 'checkboxBool',
        inputId: 'o-checkbox-bool',
        newval: true,
        model: 'this',
        template: 'tmpl-section',
        control: [{
          template: 'tmpl-checkbox',
          label: 'checkbox (no value)',
          inputType: 'checkbox',
          inputId: 'o-checkbox-bool',
          inputValue: 'false',
          prop: 'checkboxBool',
          elemProp: 'checked'
        }],
        outputCode: `
          <a-bindgroup
            model="this">

            <a-bind
              pull
              prop="checkboxBool">

              <output></output>
            </a-bind>

            <a-bind
              push
              prop="checkboxBool"
              event="click">

              <button
                value="true">
                Set to "true"
              </button>
            </a-bind>
          </a-bindgroup>
        `,
        inputCode: `
        <a-bind
          model="this"
          prop="checkboxBool"
          elem-prop="checked">

          <input
            type="checkbox">
        </a-bind>`,
        modelCode: `
          const testObject = {
            checkboxBool: false,
          }
        `
      },
      // checkboxArr
      {
        prop: 'checkboxArr',
        idx: '1',
        inputId: 'input-arr',
        model: 'this',
        newval: 'bar',
        template: 'tmpl-section',
        control: [{
          template: 'tmpl-input-arr',
          label: 'checkboxes bound to array',
          inputType: 'checkbox',
          prop: 'checkboxArr',
        }],
        outputCode: `
          <a-bindgroup
            model="this">

            <a-bind
              pull
              prop="checkboxArr">

              <output></output>
            </a-bind>

            <a-bind
              push
              prop="checkboxArr"
              event="click">

              <button
                value="bar">
                Set to "bar"
              </button>
            </a-bind>
          </a-bindgroup>
        `,
        inputCode: `
          <a-bindgroup
            model="this">

            <a-bind
              prop="checkboxArr">

              <input
                type="checkbox"
                name="check-foo"
                value="foo">
            </a-bind>

            <a-bind
              prop="checkboxArr">

              <input
                type="checkbox"
                name="check-bar"
                value="bar">
            </a-bind>

            <a-bind
              prop="checkboxArr">

              <input
                type="checkbox"
                name="check-baz"
                value="baz">
            </a-bind>
          </a-bindgroup>
        `,
        modelCode: `
          const testObject = {
            _checkboxArr: ['foo', 'baz'],

            get checkboxArr() {
              return this._checkboxArr
            },

            set checkboxArr(value) {
              if (typeof value === 'string') {
                value = value.split(',');
              }
              if (value === this._checkboxArr) return;
              this._checkboxArr = value;
            },
          }
        `,
      },
      // radioGroup
      {
        prop: 'radioGroup',
        idx: '2',
        inputId: 'input-radiogroup',
        model: 'this',
        newval: 'bar',
        template: 'tmpl-section',
        control: [{
          template: 'tmpl-input-arr',
          label: 'radio group',
          inputType: 'radio',
          prop: 'radioGroup',
        }],
        outputCode: `
          <a-bindgroup
            model="this">

            <a-bind
              pull
              prop="radioGroup">

              <output></output>
            </a-bind>

            <a-bind
              push
              prop="radioGroup"
              event="click">

              <button
                value="bar">
                Set to "bar"
              </button>
            </a-bind>
          </a-bindgroup>
        `,
        inputCode: `
          <a-bindgroup
            model="this">

            <a-bind
              prop="radioGroup">

              <input
                type="radio"
                name="radio-group"
                value="foo">
            </a-bind>

            <a-bind
              prop="radioGroup">

              <input
                type="radio"
                name="radio-group"
                value="bar">
            </a-bind>

            <a-bind prop="radioGroup">
              <input
                type="radio"
                name="radio-group"
                value="baz">
            </a-bind>
          </a-bindgroup>
        `,
        modelCode: `
          const testObject = {
            radioGroup: 'foo',
          }
        `
      },
      // button 1
      {
        prop: 'button',
        inputId: 'input-button-1',
        model: 'this',
        newval: 'New Value',
        template: 'tmpl-section',
        control: [{
          template: 'tmpl-button',
          label: "button text mirrors property value, but button value doesn't",
          inputId: 'input-button-1',
          prop: 'button',
          inputValue: 'button value',
          elemProp: 'textContent'
        }],
        outputCode: `
          <a-bindgroup
            model="this">

            <a-bind
              pull
              prop="button">

              <output></output>
            </a-bind>

            <a-bind
              push
              prop="button"
              event="click">

              <button
                value="New Value">
                Set to "New Value"
              </button>
            </a-bind>
          </a-bindgroup>
        `,
        inputCode: `
        <a-bind
          model="this"
          prop="button"
          elem-prop="textContent"
          event="click"
          func="notify">

          <button
            value="button value">
          </button>
        </a-bind>
        `,
        modelCode: `
          const testObject = {
            button: 'Initial Value',

            notify(event) {
              const newValue = event.target.value;
              console.log(newValue);
            }
          }
        `
      },
      // button 2
      {
        prop: 'button',
        inputId: 'input-button-2',
        model: 'this',
        newval: 'Another New Property Value',
        template: 'tmpl-section',
        control: [{
          template: 'tmpl-button',
          label: "button text doesn't mirror property value, but button value does",
          inputId: 'input-button-2',
          prop: 'button',
          inputValue: 'button value',
          elemProp: 'value'
        }],
        outputCode: `
          <a-bindgroup
            model="this">

            <a-bind
              pull
              prop="button">

              <output></output>
            </a-bind>

            <a-bind
              push
              prop="button"
              event="click">

              <button
                value="Another New Property Value">
                Set to "Another New Property Value"
              </button>
            </a-bind>
          </a-bindgroup>
        `,
        inputCode: `
        <a-bind
          prop="button"
          event="click"
          func="notify">

          <button>
            Click Me!
          </button>
        </a-bind>
        `,
        modelCode: `
          const testObject = {
            button: 'Initial Value',
            notify(event) {
              const newValue = event.target.value;
              console.log(newValue);
            }
          }
        `
      },
      // button 3
      {
        prop: 'button',
        inputId: 'input-button-3',
        model: 'this',
        newval: 'foo',
        template: 'tmpl-section',
        control: [{
          template: 'tmpl-double-bind',
          label: "Both button text and value mirror property value",
          inputId: 'input-button-3',
          prop: 'button',
        }],
        outputCode: `
          <a-bindgroup
            model="this">

            <a-bind
              pull
              prop="button">

              <output></output>
            </a-bind>

            <a-bind
              push
              prop="button"
              event="click">

              <button
                value="foo">
                Set to "foo"
              </button>
            </a-bind>
          </a-bindgroup>
        `,
        inputCode: `
          <a-bindgroup
            model="this">

            <a-bind
              prop="button"
              elem-prop="textContent">

              <a-bind
                prop="button"
                event="click"
                func="notify">

                <button></button>
              </a-bind>
            </a-bind>
          </a-bindgroup>
        `,
        modelCode: `
          const testObject = {
            button: 'Initial Value',

            notify(event) {
              const newValue = event.target.value;
              console.log(newValue);
            }
          }
        `
      },
      // range
      {
        prop: 'range',
        model: 'this',
        newval: '80',
        inputId: 'o-inputrange',
        template: 'tmpl-section',
        control: [{
          template: 'tmpl-basic',
          label: 'input type="range"',
          inputType: 'range',
          inputId: 'o-inputrange',
          prop: 'range',
          elemProp: 'value'
        }],
        outputCode: `
          <a-bindgroup
            model="this">

            <a-bind
              pull
              prop="range">

              <output></output>
            </a-bind>

            <a-bind
              push
              prop="range"
              event="click">

              <button value="80">
                Set to "80"
              </button>
            </a-bind>
          </a-bindgroup>
        `,
        inputCode: `
          <a-bind
            prop="range">

            <input
              type="range">
          </a-bind>
        `,
        modelCode: `
          const testObject = {
            range: 50,
          }
        `
      },
      // progress
      {
        prop: 'progress',
        inputId: 'o-inputprogress',
        model: 'this',
        newval: '80',
        template: 'tmpl-section',
        control: [{
          template: 'tmpl-progress',
          label: 'progress',
          inputId: 'o-inputprogress',
          prop: 'progress',
        }],
        outputCode: `
          <a-bindgroup
            model="this">

            <a-bind
              pull
              prop="progress">

              <output></output>
            </a-bind>

            <a-bind
              push
              prop="progress"
              event="click">

              <button
                value="80">
                Set to "80"
              </button>
            </a-bind>
          </a-bindgroup>
        `,
        inputCode: `
          <a-bind
            pull
            prop="progress">

            <progress
              max="100">
            </progress>
          </a-bind>
        `,
        modelCode: `
          const testObject = {
            progress: 50,
          }
        `
      },
      // file
      {
        template: 'tmpl-section-file',
        inputId: 'o-inputfile',
        label: 'input type="file"',
        model: 'this',
        inputCode: `
          <a-bind
            push
            model="this"
            event="change"
            func="fileInfo">

            <input
              multiple
              type="file">
          </a-bind>
        `,
        modelCode: `
          const testObject = {
            fileInfo(event) {
             console.log(event.target.files);
            },
          }
        `
      },
    ];
  }
}

if (!customElements.get('test-component')) {
  customElements.define('test-component', TestComponent);
}
