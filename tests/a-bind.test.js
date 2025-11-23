import ATestRunner from './ATestRunner.min.js';
import ABind, { ABindgroup } from '../src/a-bind.js';

const runner = new ATestRunner(import.meta.url);

const { group, test, when, wait, spyOn, info } = runner;

// --- Setup ---

const getTestContainer = () => {
  const container = document.getElementById('test-container');
  container.innerHTML = '';
  return container;
};

// --- Tests ---

group("ABind Static Methods", () => {
  test("ABind.update() should update the bound element", async () => {
    const container = getTestContainer();
    const model = { greeting: "Hello" };

    container.innerHTML = `
        <a-bind property="greeting">
            <input type="text">
        </a-bind>
    `;
    const aBind = container.querySelector('a-bind');
    aBind.model = model;
    const input = container.querySelector('input');

    await wait(10); // allow for initialization

    ABind.update(model, 'greeting', 'World');

    return await when(() => input.value === 'World');
  }, true);

  test("ABind.updateDefer() should update the element after a delay", async () => {
    const container = getTestContainer();
    const model = { value: 1 };

    container.innerHTML = `
        <a-bind property="value">
            <span id="test-span"></span>
        </a-bind>
    `;
    const aBind = container.querySelector('a-bind');
    aBind.model = model;
    const span = container.querySelector('#test-span');

    model.value = 100;
    ABind.updateDefer(model, 'value', 50);

    // Value should not have changed yet
    const notChanged = span.textContent !== '100';

    // Wait for the deferred update to complete
    await wait(60);

    const changed = span.textContent === '100';

    return notChanged && changed;
  }, true);
});


group("ABind Core Functionality", () => {
  test("Model-to-element (push) binding works correctly", async () => {
    const container = getTestContainer();
    const model = { message: "Initial" };

    const aBind = document.createElement('a-bind');
    aBind.property = 'message';
    aBind.model = model;

    const input = document.createElement('input');
    aBind.append(input);
    container.append(aBind);

    await wait(10); // allow initialization

    model.message = "Updated";
    ABind.update(model, 'message', model.message);

    return await when(() => input.value === "Updated");
  }, true);

  test("Element-to-model (pull) binding works correctly", async () => {
    const container = getTestContainer();
    const model = { message: "Initial" };

    container.innerHTML = `
        <a-bind property="message">
            <input type="text">
        </a-bind>
    `;
    const aBind = container.querySelector('a-bind');
    aBind.model = model;
    const input = container.querySelector('input');

    await wait(10);

    input.value = "From Element";
    input.dispatchEvent(new Event('input', { bubbles: true }));

    return await when(() => model.message === "From Element");
  }, true);

  test("Two-way binding functions as expected", async () => {
    const container = getTestContainer();
    const model = { text: "A" };
    container.innerHTML = `<a-bind property="text"><input></a-bind>`;
    const aBind = container.querySelector('a-bind');
    const input = container.querySelector('input');
    aBind.model = model;

    await wait(10); // allow initialization

    // 1. Model -> Element
    model.text = "B";
    ABind.update(model, 'text', 'B');
    await when(() => input.value === 'B');

    // 2. Element -> Model
    input.value = "C";
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await when(() => model.text === 'C');

    return input.value === 'C' && model.text === 'C';
  }, true);
});

group("ABind Attribute Features", () => {
  test("'elem-attr' binds to different attributes like textContent", async () => {
    const container = getTestContainer();
    const model = { content: "Dynamic Content" };
    container.innerHTML = `<a-bind property="content" elem-attr="textContent"><div></div></a-bind>`;
    container.querySelector('a-bind').model = model;
    const div = container.querySelector('div');

    return await when(() => div.textContent === "Dynamic Content");
  }, true);

  test("'once' attribute prevents subsequent updates", async () => {
    const container = getTestContainer();
    const model = { value: 1 };
    container.innerHTML = `<a-bind property="value" once><input></a-bind>`;
    container.querySelector('a-bind').model = model;
    const input = container.querySelector('input');

    await when(() => input.value === '1');

    ABind.update(model, 'value', 2);
    await wait(20); // wait to see if it updates

    // It should NOT have updated
    return input.value === '1';
  }, true);

  test("'push' attribute makes binding one-way (model to element)", async () => {
    const container = getTestContainer();
    const model = { val: 'abc' };
    container.innerHTML = `<a-bind property="val" push><input></a-bind>`;
    container.querySelector('a-bind').model = model;
    const input = container.querySelector('input');

    await when(() => input.value === 'abc');

    input.value = 'xyz';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await wait(20);

    // Model should NOT have been updated
    return model.val === 'abc';
  }, true);

  test("'func' attribute executes a function on event", async () => {
    const container = getTestContainer();
    window.myTestModel = {
      counter: 0,
      increment: function() { this.counter++; }
    };

    const spy = spyOn(window.myTestModel, 'increment');
    container.innerHTML = `<a-bind model="myTestModel" func="increment" event="click"><button>Click Me</button></a-bind>`;

    await wait(10);
    container.querySelector('button').click();

    spy.restore();
    const called = spy.callCount === 1;
    delete window.myTestModel; // cleanup
    return called;
  }, true);
});

group("ABind With Different Element Types", () => {
  test("Works with <select>", async () => {
    const container = getTestContainer();
    const model = { selected: 'c' };
    container.innerHTML = `
      <a-bind property="selected">
        <select>
          <option value="a">A</option>
          <option value="b">B</option>
          <option value="c">C</option>
        </select>
      </a-bind>
    `;
    container.querySelector('a-bind').model = model;
    const select = container.querySelector('select');

    return await when(() => select.value === 'c');
  }, true);

  test("Works with <input type='checkbox'>", async () => {
    const container = getTestContainer();
    const model = { isChecked: true };
    container.innerHTML = `<a-bind property="isChecked" elem-attr="checked"><input type="checkbox" value="any_value"></a-bind>`;
    container.querySelector('a-bind').model = model;
    const checkbox = container.querySelector('input');

    await when(() => checkbox.checked === true);

    // Test element to model
    checkbox.checked = false;
    checkbox.dispatchEvent(new Event('input', { bubbles: true }));

    return await when(() => model.isChecked === false);
  }, true);
});

group("ABindgroup Functionality", () => {
  info("Note: ABindgroup tests require a server due to dynamic imports.");

  test("Loads a model and provides it to child a-bind elements", async () => {
    const container = getTestContainer();
    container.innerHTML = `
      <a-bindgroup model="./models/SimpleModel.js">
          <a-bind property="message" elem-attr="textContent">
              <span></span>
          </a-bind>
      </a-bindgroup>
    `;
    const span = container.querySelector('span');

    return await when(() => span.textContent === 'Hello from SimpleModel', 500);
  }, true);

  test("Model registry caches models to prevent re-importing", async () => {
    const container = getTestContainer();
    // The model from the previous test should be in the registry
    const hasSimpleModel = ABindgroup.modelRegistry.has(new URL('./models/SimpleModel.js', import.meta.url).href);

    // Now test with a new model
    container.innerHTML = `<a-bindgroup model="./models/CounterModel.mjs"></a-bindgroup>`;

    await wait(100); // allow time for import
    const hasCounterModel = ABindgroup.modelRegistry.has(new URL('./models/CounterModel.mjs', import.meta.url).href);

    return hasSimpleModel && hasCounterModel;
  }, true);

  test("Reference counting cleans up the model registry", async () => {
    const container = getTestContainer();
    const modelUrl = new URL('./models/CounterModel.mjs', import.meta.url).href;

    // At this point, the model from the previous test is in the registry.
    // Let's first clean up the DOM to remove the previous group.
    getTestContainer();
    await wait(10);
    // The disconnectedCallback should have run, but let's check the count by adding a new one.

    const group1 = document.createElement('a-bindgroup');
    group1.setAttribute('model', './models/CounterModel.mjs');
    container.append(group1);
    await wait(50);
    const countIsOne = ABindgroup.modelReferenceCounts.get(modelUrl) === 1;

    const group2 = document.createElement('a-bindgroup');
    group2.setAttribute('model', './models/CounterModel.mjs');
    container.append(group2);
    await wait(50);
    const countIsTwo = ABindgroup.modelReferenceCounts.get(modelUrl) === 2;

    // Remove one group, count should decrement
    group1.remove();
    await wait(10);
    const countIsOneAgain = ABindgroup.modelReferenceCounts.get(modelUrl) === 1;

    // Remove the second group, model should be purged from registry
    group2.remove();
    await wait(10);
    const registryIsClean = !ABindgroup.modelRegistry.has(modelUrl);
    const refCountIsClean = !ABindgroup.modelReferenceCounts.has(modelUrl);

    return countIsOne && countIsTwo && countIsOneAgain && registryIsClean && refCountIsClean;
  }, true);
});

runner.run();
