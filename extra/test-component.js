import { ABind, ABindgroup, ARepeat } from '../src/index.js';

const DEFAULTS = {
  heading: 'Binding Sandbox',
  quantity: 50,
  pickedColor: '#646cff',
  birthDate: '2023-01-01',
  notes: 'Initial textarea content...',
  activeFile: '',
  dynamicList: ['Apple', 'Banana', 'Cherry', 'Dragonfruit', 'Elderberry'],
  selectedFruit: 'Cherry',
  countryList: [
    { value: 'us', label: 'United States' },
    { value: 'ca', label: 'Canada' },
    { value: 'uk', label: 'United Kingdom' },
    { value: 'jp', label: 'Japan' }
  ],
  selectedCountry: 'ca',
  multiSelection: ['us', 'jp'],
  mirrorLabel: 'I reflect my model!',
  dialogOpen: false
};

class TestComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    // 1. Initialize properties
    Object.assign(this, JSON.parse(JSON.stringify(DEFAULTS)));

    // 2. Render the DOM
    this.render();

    // 3. Assign 'this' directly to the a-bindgroup instance.
    // This must happen after render so the element exists.
    const group = this.shadowRoot.querySelector('a-bindgroup');
    if (group) {
      group.model = this;
    }
  }

  openDialog(e) {
    const dialog = this.shadowRoot.querySelector('dialog');
    dialog.showModal();
  }

  closeDialog() {
    this.shadowRoot.querySelector('dialog').close();
  }

  resetAll() {
    Object.keys(DEFAULTS).forEach(key => {
      this[key] = JSON.parse(JSON.stringify(DEFAULTS[key]));
      ABind.update(this, key, this[key]);
    });
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; font-family: system-ui, sans-serif; max-width: 800px; margin: 2rem auto; padding: 2rem; background: #f9f9f9; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        h1 { margin-top: 0; }
        fieldset { border: 1px solid #ccc; border-radius: 4px; margin-bottom: 1rem; padding: 1rem; background: white; }
        legend { font-weight: bold; color: #333; }
        .row { display: flex; gap: 1rem; align-items: center; margin-bottom: 0.5rem; flex-wrap: wrap; }
        label { flex: 0 0 150px; font-weight: 500; }
        input, select, textarea { padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
        textarea { width: 100%; height: 80px; resize: vertical; }
        button { cursor: pointer; padding: 8px 16px; background: #eee; border: 1px solid #ccc; border-radius: 4px; transition: background 0.2s; }
        button:hover { background: #ddd; }
        .btn-mirror { background: #e3f2fd; border-color: #2196f3; color: #0d47a1; }
        dialog { border: none; box-shadow: 0 10px 25px rgba(0,0,0,0.2); border-radius: 8px; padding: 2rem; }
        progress { width: 100%; height: 20px; }
        code { background: #333; color: #fff; padding: 2px 6px; border-radius: 4px; }
      </style>

      <a-bindgroup>
        <a-bind prop="heading" elem-prop="textContent">
          <h1>Default Header</h1>
        </a-bind>

        <!-- 1. Text & Datalist -->
        <fieldset>
          <legend>Text & Dynamic Datalist</legend>
          <div class="row">
            <label>Fruit (Text):</label>
            <a-bind debug prop="selectedFruit">
               <input type="text" list="fruit-list" placeholder="Type a fruit...">
            </a-bind>
          </div>
          <div class="row">
            <label>Current Value:</label>
            <!-- Fix: a-bind wraps the code element -->
            <a-bind prop="selectedFruit" elem-prop="textContent">
               <code></code>
            </a-bind>
          </div>

          <datalist id="fruit-list">
            <a-repeat prop="dynamicList">
              <template><option value="{{ item }}"></option></template>
            </a-repeat>
          </datalist>
        </fieldset>

        <!-- 2. Numbers & Ranges -->
        <fieldset>
          <legend>Numbers & Synchronization</legend>
          <div class="row">
            <label>Number Input:</label>
            <a-bind prop="quantity">
              <input type="number" min="0" max="100">
            </a-bind>
          </div>
          <div class="row">
            <label>Range Input:</label>
            <a-bind prop="quantity">
              <input type="range" min="0" max="100">
            </a-bind>
          </div>
          <div class="row">
            <label>Progress:</label>
            <a-bind prop="quantity" push>
              <progress max="100"></progress>
            </a-bind>
          </div>
        </fieldset>

        <!-- 3. Colors & Date -->
        <fieldset>
          <legend>Color & Date</legend>
          <div class="row">
            <label>Color Picker:</label>
            <a-bind prop="pickedColor">
              <input type="color">
            </a-bind>

            <a-bind prop="pickedColor" elem-prop="style.backgroundColor">
               <div style="width: 30px; height: 30px; border:1px solid #000; margin-left: 10px;"></div>
            </a-bind>

            <!-- Fix: a-bind wraps the span -->
            <a-bind prop="pickedColor" elem-prop="textContent">
               <span style="margin-left: 10px;"></span>
            </a-bind>
          </div>

          <div class="row">
            <label>Date Input:</label>
            <a-bind prop="birthDate">
               <input type="date">
            </a-bind>
          </div>
        </fieldset>

        <!-- 4. Selects -->
        <fieldset>
          <legend>Selects & Options</legend>
          <div class="row">
            <label>Dynamic Select:</label>
            <a-bind prop="selectedCountry">
              <select>
                <option value="" disabled>Select a country</option>
                <a-repeat prop="countryList">
                  <template>
                    <option value="{{ item.value }}">{{ item.label }}</option>
                  </template>
                </a-repeat>
              </select>
            </a-bind>
          </div>
          <div class="row">
            <label>Selected Code:</label>
            <!-- Fix: a-bind wraps the code element -->
            <a-bind prop="selectedCountry" elem-prop="textContent">
               <code></code>
            </a-bind>
          </div>

          <div class="row">
            <label>Select Multiple:</label>
            <a-bind prop="multiSelection">
              <select multiple style="height: 80px;">
                 <a-repeat prop="countryList">
                  <template>
                    <option value="{{ item.value }}">{{ item.label }}</option>
                  </template>
                </a-repeat>
              </select>
            </a-bind>
          </div>
           <div class="row">
            <label>Multi Values:</label>
            <!-- Fix: a-bind wraps the code element -->
            <a-bind prop="multiSelection" elem-prop="textContent">
               <code></code>
            </a-bind>
          </div>
        </fieldset>

        <!-- 5. Files & Textarea -->
        <fieldset>
          <legend>Misc Inputs</legend>
          <div class="row">
            <label>File (Pull Only):</label>
            <a-bind prop="activeFile" pull>
              <input type="file">
            </a-bind>
            <!-- Fix: a-bind wraps the code element -->
            <a-bind prop="activeFile" elem-prop="textContent">
               <code style="margin-left: 1rem"></code>
            </a-bind>
          </div>

          <div class="row">
             <label>Textarea:</label>
             <a-bind prop="notes">
               <textarea></textarea>
             </a-bind>
          </div>
        </fieldset>

        <!-- 6. Buttons -->
        <fieldset>
          <legend>Buttons & Functions</legend>

          <div class="row">
            <a-bind func="openDialog">
              <button>Open Dialog (Action)</button>
            </a-bind>
          </div>

          <div class="row">
            <label>Label Editor:</label>
            <a-bind prop="mirrorLabel"><input type="text"></a-bind>

            <a-bind prop="mirrorLabel" elem-prop="textContent">
               <button class="btn-mirror">Initial Text</button>
            </a-bind>
          </div>

          <div class="row">
            <a-bind func="resetAll">
              <button style="background:#ffcdd2; border-color:#ef9a9a;">
                 Reset All Defaults
              </button>
            </a-bind>
          </div>
        </fieldset>

        <dialog>
          <h2>Dialog Opened</h2>
          <p>
            Current Header:
            <!-- Fix: a-bind wraps the strong tag -->
            <a-bind prop="heading" elem-prop="textContent">
                <strong></strong>
            </a-bind>
          </p>
          <form method="dialog">
            <button>Close</button>
          </form>
        </dialog>

      </a-bindgroup>
    `;
  }
}

customElements.define('test-component', TestComponent);
