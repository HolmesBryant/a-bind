/*
* Save the provided HTML and the CustomElement script into a file named index.html.
* Save the test suite code below into a file named abind.test.js.
* Install the necessary development dependency, jsdom: npm install --save-dev jsdom
* Run the tests from the terminal: node --test abind.test.js
*/


import { test, describe, before, beforeEach, mock } from 'node:test';
import assert from 'node:assert';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'fs';
import path from 'path';

// --- Test Environment Setup ---

// Load the ABind class and the HTML file content
const ABindCode = readFileSync(path.resolve('../src/a-bind.js'), 'utf8');
const html = readFileSync(path.resolve('./tests-ui.html'), 'utf8');

// A helper function to introduce a micro-delay for DOM updates if needed.
const tick = () => new Promise(resolve => setTimeout(resolve, 0));

describe('ABind Custom Element', () => {
let document, window, customElement;

// Before any tests run, set up the JSDOM environment
before(() => {
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    resources: 'usable',
    url: 'http://localhost'
  });

  // Expose JSDOM globals to the test environment
  global.window = dom.window;
  global.document = dom.window.document;
  global.HTMLElement = dom.window.HTMLElement;
  global.CustomEvent = dom.window.CustomEvent;
  global.customElements = dom.window.customElements;

  // Inject and execute the ABind script into the JSDOM instance
  const scriptEl = global.document.createElement('script');
  scriptEl.textContent = ABindCode.replace('export default', ''); // Remove export for script execution
  global.document.head.appendChild(scriptEl);

  document = global.document;
  window = global.window;
});

// Before each test, grab a fresh reference to the custom element model
beforeEach(() => {
    customElement = document.querySelector('custom-element');
});

describe('Two-Way Data Binding', () => {
  test('should bind text input value to model property', () => {
    const input = document.querySelector('#my-input');

    // 1. Model -> Element (Initial State)
    assert.strictEqual(input.value, 'foo', 'Input value should be initialized from model property');
    assert.strictEqual(customElement.myInput, 'foo', 'Model property should be initialized correctly');

    // 2. Element -> Model
    input.value = 'bar';
    input.dispatchEvent(new window.Event('input'));
    assert.strictEqual(customElement.myInput, 'bar', 'Model property should update when input changes');

    // 3. Model -> Element (Programmatic Update)
    window.abind.update(customElement, 'myInput', 'baz');
    assert.strictEqual(input.value, 'baz', 'Input value should update when model changes');
  });

  test('should bind single-select value to model property', () => {
    const select = document.querySelector('#my-select');

    // 1. Model -> Element (Initial State)
    assert.strictEqual(select.value, 'foo', 'Select value should be initialized from model');

    // 2. Element -> Model
    select.value = 'baz';
    select.dispatchEvent(new window.Event('input'));
    assert.strictEqual(customElement.mySelect, 'baz',
      'Model should update on select change');

    // 3. Model -> Element
    window.abind.update(customElement, 'mySelect', 'bar');
    assert.strictEqual(select.value, 'bar',
      'Select value should update on model change');
  });

  test('should bind multiple-select values to model property', () => {
    const select = document.querySelector('#my-select-multi');

    // 1. Model -> Element (Initial State)
    const initialValues = Array.from(select.selectedOptions).map(opt => opt.value);
    assert.deepStrictEqual(initialValues, ['foo', 'bar'],
      'Multiple select should initialize with ["foo", "bar"]');

    // 2. Element -> Model
    select.options[2].selected = true; // Select 'baz'
    select.dispatchEvent(new window.Event('input'));
    assert.deepStrictEqual(customElement.mySelectmulti, ['foo', 'bar', 'baz'],
      'Model should update with all selected options');

    // 3. Model -> Element
    window.abind.update(customElement, 'mySelectmulti', ['baz']);
    const updatedValues = Array.from(select.selectedOptions).map(opt => opt.value);
    assert.deepStrictEqual(updatedValues, ['baz'],
      'Multiple select should update to only have "baz" selected');
  });

  test('should bind checkbox checked state to model property', () => {
    const checkbox = document.querySelector('#my-checkbox');

    // 1. Model -> Element (Initial State)
    assert.strictEqual(checkbox.checked, true,
      'Checkbox should be checked initially');
    assert.strictEqual(customElement.myCheckbox, 'foo',
      'Model property should be "foo" initially');

    // 2. Element -> Model (Uncheck)
    checkbox.checked = false;
    checkbox.dispatchEvent(new window.Event('input'));
    assert.strictEqual(customElement.myCheckbox, '',
      'Model property should be empty when unchecked');

    // 3. Model -> Element (Check)
    window.abind.update(customElement, 'myCheckbox', 'foo');
    assert.strictEqual(checkbox.checked, true,
      'Checkbox should become checked on model update');
  });

  test('should bind radio group selection to model property', () => {
    const radioFoo = document.querySelector('#rad-foo');
    const radioBar = document.querySelector('#rad-bar');

    // 1. Model -> Element (Initial State)
    assert.strictEqual(radioFoo.checked, true,
      'Radio "foo" should be checked initially');
    assert.strictEqual(radioBar.checked, false,
      'Radio "bar" should be unchecked initially');

    // 2. Element -> Model
    radioBar.checked = true;
    // Note: In a real browser, changing one radio deselects others. We dispatch from the newly selected one.
    radioBar.dispatchEvent(new window.Event('input'));
    assert.strictEqual(customElement.myRadiogroup,
      'bar', 'Model property should update to "bar"');

    // 3. Model -> Element
    window.abind.update(customElement, 'myRadiogroup', 'foo');
    assert.strictEqual(radioFoo.checked, true,
      'Radio "foo" should become checked on model update');
    assert.strictEqual(radioBar.checked, false,
      'Radio "bar" should become unchecked');
  });
});

describe('One-Way Data Binding', () => {
  test('pull: should only bind from model to element attribute', () => {
    const output = document.querySelector('a-bind[pull][model-attr="some-attr"] output');

    // 1. Model -> Element (Initial State)
    assert.strictEqual(customElement.getAttribute('some-attr'), 'attr value');
    assert.strictEqual(output.value, 'attr value', 'Output should pull initial attribute value');

    // 2. Model -> Element (Update)
    customElement.setAttribute('some-attr', 'new value');
    window.abind.update(customElement, 'someAttr', 'new value'); // Trigger update
    assert.strictEqual(output.value, 'new value', 'Output should update when model attribute changes');
  });

  test('push: should only bind from element event to model attribute', () => {
    const button = document.querySelector('#button1');
    const output = document.querySelector('a-bind[pull][model-attr="some-attr"] output');

    // 1. Check initial state
    assert.strictEqual(customElement.getAttribute('some-attr'), 'attr value');
    assert.strictEqual(output.value, 'attr value');

    // 2. Element -> Model
    button.dispatchEvent(new window.MouseEvent('click'));

    // 3. Verify model and other bound elements were updated
    assert.strictEqual(customElement.getAttribute('some-attr'), 'updated by button',
      'Model attribute should be updated on button click');
    assert.strictEqual(output.value, 'updated by button',
      'Output bound to the same attribute should be updated');
  });
});

describe('Function Execution', () => {
  test('should execute a function on the model on event', () => {
    const button = document.querySelector('a-bind[func="handleClick"] button');
    // Spy on the handleClick method of our custom element instance
    mock.method(customElement, 'handleClick');

    assert.strictEqual(customElement.handleClick.mock.calls.length, 0, 'handleClick should not have been called yet');

    button.dispatchEvent(new window.MouseEvent('click'));

    assert.strictEqual(customElement.handleClick.mock.calls.length, 1, 'handleClick should be called once on click');
    const eventArg = customElement.handleClick.mock.calls[0].arguments[0];
    assert.ok(eventArg instanceof window.Event, 'The first argument should be an event object');
  });

  test('should execute a global function (console.log)', () => {
    const button = document.querySelector('a-bind[func="console.log"] button');
    // Spy on console.log
    mock.method(console, 'log');

    assert.strictEqual(console.log.mock.calls.length, 0);

    button.dispatchEvent(new window.MouseEvent('click'));

    assert.strictEqual(console.log.mock.calls.length, 1, 'console.log should be called once');

    // Restore original method
    console.log.mock.restore();
  });
});

describe('Advanced Attribute Binding', () => {
  test('should bind to multiple element attributes (elem-attr)', () => {
    const button = document.querySelector('a-bind[elem-attr="textContent, value"] button');

    // 1. Model -> Element (Initial State)
    assert.strictEqual(customElement.myButton, 'foo',
      'Initial model property is "foo"');
    assert.strictEqual(button.textContent, 'foo',
      'Button textContent should be initialized');
    assert.strictEqual(button.value, 'foo', 'Button value should be initialized');

    // 2. Model -> Element (Update)
    window.abind.update(customElement, 'myButton', 'new text');
    assert.strictEqual(button.textContent, 'new text',
      'Button textContent should update on model change');
    assert.strictEqual(button.value, 'new text',
      'Button value should update on model change');
  });

  test('should bind a model property to a boolean attribute like "disabled"', async () => {
    const nestedInput = document.querySelector('a-bind[property="isDisabled"] > a-bind > input');

    // 1. Model -> Element (Initial State)
    assert.strictEqual(customElement.isDisabled, true,
      'Model isDisabled property is initially true');
    // Need a tick to allow the nested a-bind to initialize and update
    await tick();
    assert.strictEqual(nestedInput.disabled, true, 'Input should be disabled initially');

    // 2. Model -> Element (Update)
    customElement.isDisabled = false;
    window.abind.update(customElement, 'isDisabled', false);
    await tick();
    assert.strictEqual(nestedInput.disabled, false, 'Input should become enabled when model property is false');
  });
});

describe('Gap Coverage Tests', () => {

  test('once: should bind initial value but not update afterwards', () => {
    const output = document.querySelector('#once-output');

    // 1. Check initial value from model property "myInput"
    assert.strictEqual(output.value, 'foo',
      'Output should have the initial value');

    // 2. Update the model
    window.abind.update(customElement, 'myInput', 'new value');

    // 3. Assert that the element with "once" did NOT update
    assert.strictEqual(output.value, 'foo',
      'Output value should not change after model update');
  });

  test('elem-attr: should bind to a CSS style property', () => {
    const div = document.querySelector('#style-binding-div');

    // 1. Check initial style (JSDOM might not compute this, so we check property)
    assert.strictEqual(div.style.color, 'blue',
      'Div initial color should be blue');

    // 2. Update the model
    customElement.myColor = 'red';
    window.abind.update(customElement, 'myColor', 'red');

    // 3. Assert that the style was updated
    assert.strictEqual(div.style.color, 'red',
      'Div color should update to red');
  });

  test('disconnectedCallback: should teardown listeners when removed from DOM', () => {
    // Create a temporary element for this test
    const container = document.createElement('div');
    container.innerHTML = `
        <a-bind model="custom-element" property="myButton">
            <output id="disconnect-test-output"></output>
        </a-bind>
    `;
    document.body.appendChild(container);

    const abindElement = container.querySelector('a-bind');
    const output = document.querySelector('#disconnect-test-output');

    // 1. Verify initial binding
    assert.strictEqual(output.value, 'foo',
      'Output is bound correctly initially');

    // 2. Remove the a-bind element from the DOM
    abindElement.remove();

    // 3. Update the model. The listener should be gone.
    window.abind.update(customElement, 'myButton', 'updated value');

    // 4. Assert that the disconnected element's child did NOT update
    assert.strictEqual(output.value, 'foo',
      'Output value should not change after its a-bind parent is removed');
  });

  test('attributeChangedCallback: should re-bind when "property" attribute changes', async () => {
    const abindElement = document.querySelector('#rebind-test');
    const output = abindElement.querySelector('output');

    // 1. Check initial binding to 'propA'
    assert.strictEqual(output.value, 'Value A', 'Initially bound to propA');

    // 2. Dynamically change the 'property' attribute to bind to 'propB'
    abindElement.setAttribute('property', 'propB');

    // Allow a micro-task for the attribute change and re-initialization to process
    await tick();

    // 3. Verify it now shows the value of the new property
    assert.strictEqual(output.value, 'Value B',
      'Output should now display value of propB');

    // 4. Update the OLD property and verify the element does NOT change
    window.abind.update(customElement, 'propA', 'New Value A');
    assert.strictEqual(output.value, 'Value B',
      'Output should no longer listen to propA');

    // 5. Update the NEW property and verify the element DOES change
    window.abind.update(customElement, 'propB', 'New Value B');
    assert.strictEqual(output.value, 'New Value B',
      'Output should now listen to propB');
  });

  test('Error Handling: should log error if "model" attribute is missing', () => {
    mock.method(console, 'error'); // Spy on console.error

    const el = document.createElement('a-bind');
    el.innerHTML = `<input>`;
    document.body.appendChild(el); // connectedCallback triggers initialize

    assert.strictEqual(console.error.mock.calls.length, 1,
      'console.error should have been called');
    assert.ok(console.error.mock.calls[0].arguments[0].includes('"model" attribute is required'), 'The error message is correct');

    console.error.mock.restore();
    el.remove();
  });

  test('Error Handling: should log error if child element is missing', () => {
    mock.method(console, 'error');

    const el = document.createElement('a-bind');
    el.setAttribute('model', 'custom-element');
    document.body.appendChild(el);

    assert.strictEqual(console.error.mock.calls.length, 1);
    assert.ok(console.error.mock.calls[0].arguments[0].includes('Must have one child element'), 'The error message is correct');

    console.error.mock.restore();
    el.remove();
  });

  test('Nested Properties: should perform two-way binding on nested object property', () => {
    const input = document.querySelector('#nested-prop-input');

    // 1. Model -> Element (Initial State)
    assert.strictEqual(input.value, 'Alice',
      'Input should be initialized with nested property value');

    // 2. Element -> Model
    input.value = 'Bob';
    input.dispatchEvent(new window.Event('input'));
    assert.strictEqual(customElement.user.name, 'Bob',
      'Nested model property should update');

    // 3. Model -> Element
    window.abind.update(customElement, 'user.name', 'Charlie');
    assert.strictEqual(input.value, 'Charlie', 'Input should update when nested model property changes');
  });

  test('Debug Attribute: should log debug messages when "debug" attribute is present', () => {
    mock.method(console, 'debug');
    const input = document.querySelector('#debug-input');

    // The first debug message comes from connectedCallback/initialize
    assert.ok(console.debug.mock.calls.length > 0, 'console.debug should be called on initialization');

    const initialCallCount = console.debug.mock.calls.length;

    // Trigger an event that causes more logging
    input.dispatchEvent(new window.Event('input'));

    assert.ok(console.debug.mock.calls.length > initialCallCount, 'console.debug should be called again on event handling');

    console.debug.mock.restore();
  });
});
});
