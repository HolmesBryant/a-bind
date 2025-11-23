/**
 * Test Suite for ABind
 * @file abind.test.js
 */

import ATestRunner from './ATestRunner.min.js';
import ABind from '../src/a-bind.js';

const runner = new ATestRunner(import.meta.url);
const { group, test, equal, wait, spyOn, when, run } = runner;

// Setup global test model
window.testModel = {
    text: 'Initial Text',
    number: 42,
    nested: { val: 'Nested Value' },
    handleClick: () => console.log('Clicked')
};

async function setup() {
  await customElements.whenDefined('a-bind');

  document.body.innerHTML = `
    <a-bind model="testModel" property="text">
      <input id="text">
    </a-bind>
    <a-bind model="testModel" property="nested.val">
      <input id="nested">
    </a-bind>
    <a-bind model="testModel" property="number">
      <input id="number">
    </a-bind>
  `;
}

function cleanUp() {
  window.testModel.text = 'Initial Text';
  ABind.update(window.testModel, 'text', 'Initial Text');
}

await setup();

group('Initialization', async () => {
  test('Binds initial value to input', async () => {
    const input = document.body.querySelector('#text');
    await when(() => input.value === 'Initial Text');
    return input.value;
  }, 'Initial Text');

  test('Binds nested properties', async () => {
    const input = document.body.querySelector('#nested');
    await when(() => input.value === 'Nested Value');
    return input.value;
  }, 'Nested Value');
});

group('Two-Way Binding', async () => {
  test('View updates Model (Input)', async () => {
    const input = document.body.querySelector('#text');
    await when(() => input.value);

    input.value = 'Update Model';
    // FIX: Events must bubble to be realistic
    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));

    await when(() => window.testModel.text === 'Update Model');

    const result = window.testModel.text;
    cleanUp();
    return result;
  }, 'Update Model');

  test('Model updates View', async () => {
    const input = document.body.querySelector('#text');

    // Use ABind static update
    ABind.update(window.testModel, 'text', 'Update View');

    await when(() => input.value === 'Update View');

    const result = input.value;
    cleanUp();
    return result;
  }, 'Update View');
});

runner.run();
