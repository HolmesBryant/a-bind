// import ABind, { loader } from '../src/index.js';
import sheet from '../extra/styles.css' with {type:'css'};

const DEFAULTS = {
  text: "Initial Text",
  search: "Search Term",
  password: "password",
  tel: "123-456-7890",
  url: "https://url.com",
  email: "name@email.com",
  number: 12345,
  textarea: "Initial content.",
  date: "1914-12-25",
  time: "00:00",
  dateTime: "1914-12-24T10:00",
  week: "1970-W01",
  month: "1970-01",
  selected: "bar",
  selectMulti: 'foo, baz',
  checkbox: 'foo',
  checkboxBool: undefined,
  radioGroup: 'foo',
  button: "Click Me!",
  color: "#cd5c5c",
  range: '50',
  progress: '50',
  meter: '50',
  file: null,
  name: 'My Name',
  editable: "<p>Eiusmod magna eiusmod anim ut nostrud anim ullamco quis in consequat eu exercitation laboris culpa laboris.</p>"
};

class TestComponent extends HTMLElement {
  // -- Attributes --
  #text = "Initial Text";
  #search = "Search Term";
  #password = "password";
  #tel = "123-456-7890";
  #url = "https://url.com";
  #email = "name@email.com";
  #number = 12345;
  #textarea = "Initial content.";
  #date = "1914-12-25";
  #time = "00:00";
  #dateTime = "1914-12-24T10:00";
  #week = "1970-W01";
  #month = "1970-01";
  #selected = "bar";
  #selectMulti = 'foo, baz';
  #checkbox = 'foo';
  #checkboxBool = undefined;
  #radioGroup = 'foo';
  #button = "Click Me!";
  #color = "#cd5c5c";
  #range = 50;
  #progress = 50;
  #meter = 50;
  #file = null;
  #name = "My Name";
  #editable = "<p>Eiusmod magna eiusmod anim ut nostrud anim ullamco quis in consequat eu exercitation laboris culpa laboris.</p>";

  // -- Properties --
  #abortController;
  #editableFormatted = "";
  #editableRegex = /(<[^>]+>)(?=[^\r\n])/g;

  optionsA = [
    {value: 'foo', label: 'Foo!'},
    {value: 'bar', label: 'Bar!'},
    {value: 'baz', label: 'Baz!'}
  ];

  optionsB = 'foo, bar, baz';

  sections = [
    {
      inputType: 'text',
      inputId: 'inputtext',
      label: 'input type="text"',
      model: 'testObject',
      prop: 'text',
      newval: 'New Text',
      template: 'tmpl-section',
      control: [{
        template: 'tmpl-basic',
        inputType: 'text',
        inputId: 'inputtext',
        prop: 'text'
      }]
    },
    {
      inputType: 'date',
      inputId: 'inputdate',
      label: 'input type="date"',
      model: 'testObject',
      prop: 'date',
      newval: '1215-06-15',
      template: 'tmpl-section',
      control: [{
        template: 'tmpl-basic',
        inputType: 'date',
        inputId: 'inputdate',
        prop: 'date'
      }]
    },
    {
      inputId: 'select',
      label: 'select with dynamic option list',
      model: 'testObject',
      prop: 'selected',
      newval: 'baz',
      template: 'tmpl-section',
      control: [{
        template: 'tmpl-select',
        inputId: 'select',
        prop: 'selected',
        options: 'optionsA'
      }]
    }
  ];

  static observedAttributes = [
    "text",
    "search",
    "password",
    "tel",
    "url",
    "email",
    "number",
    "textarea",
    "date",
    "time",
    "date-time",
    "week",
    "month",
    "selected",
    "select-multi",
    "checkbox",
    "checkbox-bool",
    "radio-group",
    "button",
    "color",
    "range",
    "progress",
    "meter",
    "file",
    "name",
    "editable",
  ];

  static template = document.createElement('template');
  static {
    this.template.innerHTML = `
      <a-bindgroup model="this">

        <a-repeat prop="sections">

          <template id="tmpl-section">
            <section class="flex column stretch">
              <div class="flex stretch">

                <div class="flex column flex1 card">
                  <label for="{{inputId}}-output">
                    Property: <i>{{prop}}</i>
                  </label>

                  <a-bind prop="{{prop}}" class="output">
                    <output id="{{inputId}}-output" for="{{inputId}}"></output>
                  </a-bind>

                  <a-bind debug push prop="{{prop}}">
                    <button value="{{newval}}">Set to "{{newval}}"</button>
                  </a-bind>
                </div><!-- card -->

                <div class="flex column flex1 card">
                  <label for="{{inputId}}">
                    {{label}}
                  </label>

                  <a-repeat prop="control">

                    <template id="tmpl-basic">
                      <a-bind prop="{{prop}}" class="input">
                        <input id="{{inputId}}" type="{{inputType}}">
                      </a-bind>
                    </template>

                    <template id="tmpl-select">
                      <a-bind prop="{{prop}}" class="input">
                        <select id="{{inputId}}"></select>
                      </a-bind>

                      <a-repeat
                        target="#{{inputId}}"
                        prop="{{options}}"
                        scope="testObject">

                        <template>
                          <option value="{{value}}">{{label}}</option>
                        </template>
                      </a-repeat>
                    </template><!-- tmpl-select -->

                  </a-repeat>

                </div><!-- card -->
              </div><!-- row -->

              <details>
                <summary id="{{inputId}}-details" class="nofrills">code</summary>
                <a-bind target="#{{inputId}}-details" event="click" func="grabCode"></a-bind>
                <div class="flex stretch">
                  <div class="flex1 card">
                    <a-code highlight>
                      <textarea class="output-code"></textarea>
                    </a-code>
                  </div><!-- card -->

                  <div class="flex1 card">
                    <a-code highlight>
                      <textarea class="input-code"></textarea>
                    </a-code>
                  </div><!-- card -->
                </div><!-- row -->
              </details>
            </section>
            <hr>
          </template>
        </a-repeat>
      </a-bindgroup>
    `;
  }

  constructor() {
    super();
    this.attachShadow( {mode:'open'} );
    this.shadowRoot.adoptedStyleSheets = [sheet];
  }

  attributeChangedCallback(attr, oldval, newval) {
    if (newval === oldval) return;

    switch (attr) {
      case "text":
        this.#text = newval;
        break;
      case "search":
        this.#search = newval;
        break;
      case "password":
        this.#password = newval;
        break;
      case "tel":
        this.#tel = newval;
        break;
      case "url":
        this.#url = newval;
        break;
      case "email":
        this.#email = newval;
        break;
      case "number":
        this.#number = newval;
        break;
      case "textarea":
        this.#textarea = newval;
        break;
      case "date":
        this.#date = newval;
        break;
      case "time":
        this.#time = newval;
        break;
      case "date-time":
        this.#dateTime = newval;
        break;
      case "week":
        this.#week = newval;
        break;
      case "month":
        this.#month = newval;
        break;
      case "selected":
        this.#selected = newval;
        break;
      case "select-multi":
        this.#selectMulti = newval;
        break;
      case "checkbox":
        this.#checkbox = newval;
        break;
      case "checkbox-bool":
        this.#checkboxBool = newval;
        break;
      case "radio-group":
        this.#radioGroup = newval;
        break;
      case "button":
        this.#button = newval;
        break;
      case "color":
        this.#color = newval;
        break;
      case "range":
        this.#range = newval;
        break;
      case "progress":
        this.#progress = newval;
        break;
      case "meter":
        this.#meter = newval;
        break;
      case "file":
        this.#file = newval;
        break;
      case "name":
        this.#name = newval;
        break;
      case "editable":
        this.#editable = newval;
        break;
    }
  }

  connectedCallback() {
    this.#abortController = new AbortController();
    this.shadowRoot.append(TestComponent.template.content.cloneNode(true));

  }

  disconnectedCallback() {
    if (this.#abortController) {
      this.#abortController.abort();
      this.#abortController = null;
    }
  }

  getFiles(event) {
    const fileList = event.target.files;
    this.file = fileList;
    const list = [];
    const elem = document.createElement('output');

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

  grabCode(event) {
    const elem = event.target.closest('details');
    const outputCodeContainer = elem.querySelector('.output-code');
    const inputCodeContainer = elem.querySelector('.input-code');
    if (outputCodeContainer.textContent.length > 1) return;

    const output = elem.parentElement.querySelector('.output');
    const input = elem.parentElement.querySelector('.input');

    if (output) {
      const outputElem = output.querySelector('output');
      outputElem.removeAttribute('class');
      outputElem.removeAttribute('id');
      outputElem.removeAttribute('for');
      output.setAttribute('model', 'testObject');
      outputElem.textContent = '';
      outputCodeContainer.textContent = this.formatCode(output);
    }

    if (input) {
      input.removeAttribute('class');
      for ( const child of input.children) child.removeAttribute('value');
      if (input.localName === 'a-bind') {
        input.setAttribute('model', 'testObject');
      } else {
        const repeater = input.querySelector('a-repeat');
        if (repeater) {
          repeater.removeAttribute('scope');
          repeater.setAttribute('model', this.localName);
        }
      }
      const datalist = input.querySelector('datalist');
      if (datalist) datalist.textContent = '';
      inputCodeContainer.textContent = this.formatCode(input);
    }
  }

  formatCode(node, level = 0) {
    const indent = "  ".repeat(level);
    const attrIndent = "  ".repeat(level + 1);
    const voidElements = ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'];

    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent.trim();
      return text ? `${indent}${text}\n` : "";
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const tagName = node.tagName.toLowerCase();
      const attrs = Array.from(node.attributes);
      const isVoid = voidElements.includes(tagName);

      let result = `${indent}<${tagName}`;

      // Handle Attributes
      if (attrs.length > 0) {
        result += "\n"; // Start attributes on new line
        attrs.forEach((attr, index) => {
          const isLast = index === attrs.length - 1;
          result += `${attrIndent}${attr.name}="${attr.value}"`;

          if (isLast) {
            result += isVoid ? " />\n" : ">\n";
          } else {
            result += "\n";
          }
        });
      } else {
        // No attributes: Close the tag on the same line
        result += isVoid ? " />\n" : ">\n";
      }

      // Handle Children/Content
      if (!isVoid) {
        const children = (tagName === 'template')
          ? node.content.childNodes
          : node.childNodes;

        for (const child of children) {
          result += this.formatCode(child, level + 1);
        }

        result += `${indent}</${tagName}>\n`;
      }

      return result;
    }

    if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
      let result = "";
      for (const child of node.childNodes) {
        result += this.formatCode(child, level);
      }
      return result;
    }

    return "";
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
    const cleanup = function(evt) {
      dialog.removeEventListener('close', cleanup);
      dialog.remove();
    }

    dialog.id = 'btn-dialog';
    dialog.innerHTML = html;
    dialog.addEventListener('close', cleanup);
    document.body.append(dialog);
    dialog.showModal();
  }

  reset(event) {
    const props = DEFAULTS;

    for (const prop in props) {
      this[prop] = DEFAULTS[prop];
    }
  }

  resetForm(event) {
    // ABind?.update?.(this, 'name', DEFAULTS['name']);
    // ABind?.update?.(this, 'email', DEFAULTS['email']);
  }

  sendForm(event) {
    const form = event.target.localName === 'form' ? event.target : event.target.form;
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

  get text() { return this.#text }
  set text(value) { this.setAttribute("text", value) }

  get search() { return this.#search }
  set search(value) { this.setAttribute("search", value) }

  get password() { return this.#password}
  set password(value) { this.setAttribute("password", value) }

  get tel() { return this.#tel }
  set tel(value) { this.setAttribute("tel", value) }

  get url() { return this.#url }
  set url(value) { this.setAttribute("url", value) }

  get email() { return this.#email }
  set email(value) { this.setAttribute("email", value) }

  get number() { return this.#number }
  set number(value) { this.setAttribute("number", value) }

  get textarea() { return this.#textarea }
  set textarea(value) { this.setAttribute("textarea", value) }

  get date() { return this.#date }
  set date(value) { this.setAttribute("date", value) }

  get time() { return this.#time }
  set time(value) { this.setAttribute("time", value) }

  get dateTime() { return this.#dateTime }
  set dateTime(value) { this.setAttribute("date-time", value) }

  get week() { return this.#week }
  set week(value) { this.setAttribute("week", value) }

  get month() { return this.#month }
  set month(value) { this.setAttribute("month", value) }

  get selected() { return this.#selected }
  set selected(value) { this.setAttribute("selected", value) }

  get selectMulti() { return this.#selectMulti }
  set selectMulti(value) { this.setAttribute("select-multi", value) }

  get checkbox() { return this.#checkbox }
  set checkbox(value) { this.setAttribute("checkbox", value) }

  get checkboxBool() { return this.#checkboxBool }
  set checkboxBool(value) { this.setAttribute("checkbox-bool", value) }

  get radioGroup() { return this.#radioGroup }
  set radioGroup(value) { this.setAttribute("radio-group", value) }

  get button() { return this.#button }
  set button(value) { this.setAttribute("button", value) }

  get color() { return this.#color }
  set color(value) { this.setAttribute("color", value) }

  get range() { return this.#range }
  set range(value) { this.setAttribute("range", value) }

  get progress() { return this.#progress }
  set progress(value) { this.setAttribute("progress", value) }

  get meter() { return this.#meter }
  set meter(value) { this.setAttribute("meter", value) }

  get file() { return this.#file; }
  set file(value) { this.setAttribute("file", value) }

  get name() { return this.#name }
  set name(value) { this.setAttribute("name", value) }

  get editable() {
    if (!this.#editable) return "";
    if (this.#editableFormatted) {
      return this.#editableFormatted;
    } else {
      this.#editableFormatted = this.#editable.replace(this.#editableRegex, "\n$1\n").trim();
      return this.#editableFormatted;
    }
  }
  set editable(value) { this.setAttribute("", value) }
}

customElements.define('test-component', TestComponent);
