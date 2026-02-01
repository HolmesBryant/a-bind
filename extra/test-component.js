import ABind from '../src/index.js';
import styles from './styles.css' assert {type: 'css'};

export class TestComponent extends HTMLElement {
  text = "Initial Text";
  email = "name@email.com";
  number = 12345;
  textarea = "Initial content.";
  date = "1914-12-25";
  selected = "bar";
  selectMulti = ['foo', 'baz'];
  checkbox = 'foo';
  checkboxBool = false;
  checkboxArr = ['foo', 'baz'];
  radioGroup = 'foo';
  button = "Initial Value";
  color = "#cd5c5c";
  range = 50;
  progress = 50;
  name = "My Name";
  editable = "<p>Eiusmod magna eiusmod anim</p>";

  optionsA = [
    {value: 'foo', label: 'Foo!'},
    {value: 'bar', label: 'Bar!'},
    {value: 'baz', label: 'Baz!'}
  ];

  options = ['foo', 'bar', 'baz'];

  static template = `
    <style>
      :host { display: block;}
    </style>

    <section class="flex column stretch">
      <div class="flex stretch">
        <div class="flex1 card flex center">
          <div class="flex column">
            <strong>Property: {{prop}}</strong>

            <a-bindgroup model="this" prop="{{prop}}" class="flex center">
              <a-bind pull>
                <output></output>
              </a-bind>

              <a-bind push event="click">
                <button value='{{newval}}'>
                  set to ' {{newval}} '
                </button>
              </a-bind>
            </a-bindgroup>
          </div>
        </div> <!-- /output -->

        <div class="flex1 card flex center">
          <label class="flex column">
            {{label}}
            <slot name="input">input</slot>
          </label>
        </div>
      </div><!-- /row -->

      <details class="flex1">
        <summary class="nofrills">code</summary>
        <div class="flex column stretch">
          <div class="flex stretch">
            <div class="flex1 card">
              <em>Shadow DOM</em>
              <a-code highlight>
                <textarea id="output-code"></textarea>
              </a>
            </div>

            <div class="flex1 card">
              <em>Light DOM</em>
              <slot name="input-code">input code</slot>
            </div>
          </div><!-- /row -->

          <div class="flex column stretch">
            <strong>The Model</strong>
            <div class="card">
              <slot name="model-code">model code</slot>
            </div>
          </div>
        </div>
      </details>
    </section>`;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.shadowRoot.adoptedStyleSheets = [styles];
    this.render();
  }

  render() {
    const content = this.interpolate(TestComponent.template);
    const frag = document.createRange().createContextualFragment(content);
    const outputCode = frag.querySelector('#output-code');
    outputCode.value = this.outputCode();
    this.shadowRoot.append(frag);
  }

  interpolate(str) {
    const props = ['prop', 'label', 'newval'];
    return str
      .replace(/{{prop}}/g, this.prop)
      .replace(/{{label}}/g, this.label)
      .replace(/{{newval}}/g, this.newval);
  }

  outputCode() {
    const str = `
      <a-bindgroup
        model="this"
        prop="{{prop}}">

        <a-bind pull>
          <output></output>
        </a-bind>

        <a-bind
          push
          event="click">

          <button
            value="{{newval}}">
            change to '{{newval}}'
          </button>
        </a-bind>
      </a-bindgroup>
    `;
    return this.interpolate(str);
  }

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

  submitForm(event) {
    const formdata = new FormData(event.target);
    const elem = document.createElement('form');
    const data = Array.from(formdata);
    elem.value = JSON.stringify(data);
    const fakeEvent = {
      type: 'submit',
      target: elem
    };

    this.notify(fakeEvent);
  }

  // --- Getters / Setters ---

  get prop() { return this.getAttribute('prop') }
  set prop(value) { this.setAttribute('prop', value) }

  get label() { return this.getAttribute('label') }
  set label(value) { this.setAttribute('label', value) }

  get newval() { return this.getAttribute('newval') }
  set newval(value) { this.setAttribute('newval', value) }
}

if (!customElements.get('test-component')) {
  customElements.define('test-component', TestComponent);
}
