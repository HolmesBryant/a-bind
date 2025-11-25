import ATestRunner from './ATestRunner.min.js';
import ABind, { ABindgroup } from '../src/a-bind.js';

// --- Setup ---

const runner = new ATestRunner(import.meta.url);
runner.output="#test-results"
const { group, test, when, wait, spyOn, info, equal } = runner;
const counterModelUrl = "../tests/models/CounterModel.mjs";
const simpleModelUrl = "../tests/models/SimpleModel.js";

const setup = () => {
  const container = document.createElement('div');
  document.body.appendChild(container);

  const cleanup = () => {
    document.body.removeChild(container);
  };

  return { container, cleanup };
};

// --- Tests ---

group("ABind Static Methods", () => {
  test("ABind.update() should update the bound element",
    async () => {
      const { container, cleanup } = setup();
      try {
        const model = { greeting: "Hello" };
        container.innerHTML = `
          <a-bind property="greeting">
              <input type="text">
          </a-bind>
        `;
        const aBind = container.querySelector('a-bind');
        aBind.model = model;
        const input = container.querySelector('input');

        // Allow a-bind's async initialization to complete
        await wait(10);

        ABind.update(model, 'greeting', 'World');
        return await when(() => input.value === 'World');
      } finally {
        // This guarantees the DOM is cleaned up after this test is done.
        cleanup();
      }
    },
    true
  );

  test("ABind.updateDefer() should update the element after a delay",
    async () => {
      const { container, cleanup } = setup();
      try {
        const model = {
          value: 1,
          setVal: function(arg) {
            return new Promise(resolve => {
              setTimeout(() => {
                resolve(arg)
              }, 30);
            });
          }
        };

        container.innerHTML = `
          <a-bind property="value" elem-attr="textContent">
            <span id="test-span">...</span>
          </a-bind>
        `;
        const aBind = container.querySelector('a-bind');
        aBind.model = model;
        const span = container.querySelector('#test-span');
        model.value = await model.setVal(100);
        ABind.updateDefer(model, 'value');

        // Wait for the deferred update to complete
        await wait(40);
        return span.textContent;
      } finally {
        cleanup();
      }
    },
    '100'
  );
});

group("ABind Core Functionality", () => {
  test("Two-way binding works", async () => {
    const { container, cleanup } = setup();
    try {
      const model = { text: "A" };
      container.innerHTML = `<a-bind property="text"><input></a-bind>`;
      const abind = container.querySelector('a-bind');
      const input = container.querySelector('input');
      abind.model = model;

      await wait(10);

      // Model -> Element
      model.text = "B";
      ABind.update(model, 'text', 'B');
      await when(() => input.value === 'B');

      // Element -> Model
      input.value = "C";
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await when(() => model.text === 'C');

      return input.value === 'C' && model.text === 'C';
    } finally {
      cleanup();
    }
  }, true);

  test("Model => element (push) works", async () => {
    const { container, cleanup } = setup();
      try {
      const model = { text: "A" };
      container.innerHTML = `<a-bind push property="text"><input></a-bind>`;
      const aBind = container.querySelector('a-bind');
      const input = container.querySelector('input');
      aBind.model = model;

      await wait(10);

      // Model -> Element
      model.text = "B";
      ABind.update(model, 'text', 'B');
      await wait(10);
      // await when(() => input.value === 'B');

      // Element -> Model
      input.value = "C";
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await when(() => model.text === 'C');

      return input.value;
    } finally {
      cleanup();
    }
  }, 'C');

  test("Element => model (pull) works", async () => {
    const { container, cleanup } = setup();
    try {
      const model = { text: "A" };
      container.innerHTML = `<a-bind pull property="text"><input></a-bind>`;
      const abind = container.querySelector('a-bind');
      const input = container.querySelector('input');
      abind.model = model;
      await wait(10);

      // Element -> Model (push)
      input.value = "C";
      input.dispatchEvent(new Event('input', { bubbles: true }));
      // await when(() => model.text === 'C');


      // Model -> Element (pull)
      model.text = "B";
      ABind.update(model, 'text', 'B');
      await when(() => input.value === 'B');
      return input.value;
    } finally {
      cleanup();
    }
  }, 'B');
});

group("ABind Attribute Features", () => {
  test("'elem-attr' binds to different attributes like textContent", async () => {
    const { container, cleanup } = setup();
    try {
      const model = { content: "Dynamic Content" };
      container.innerHTML = `<a-bind property="content" elem-attr="textContent"><div></div></a-bind>`;
      container.querySelector('a-bind').model = model;
      const div = container.querySelector('div');

      return await when(() => div.textContent === "Dynamic Content");
    } finally {
      cleanup();
    }
  }, true);

  test("'once' attribute prevents subsequent updates", async () => {
    const { container, cleanup } = setup();
    try {
      const model = { value: 1 };
      container.innerHTML = `<a-bind property="value" once><input></a-bind>`;
      await wait(10);
      const abind = container.querySelector('a-bind');
      abind.model = model;
      const input = container.querySelector('input');

      await when(() => input.value === '1');

      ABind.update(model, 'value', 2);
      await wait(20); // wait to see if it updates

      // It should NOT have updated
      return input.value === '1';
    } finally {
      cleanup();
    }
  }, true);

  test("'push' attribute makes binding one-way (model to element)", async () => {
    const { container, cleanup } = setup();
    try {
      const model = { val: 'abc' };
      container.innerHTML = `
        <a-bind property="val" push><input></a-bind>`;
      container.querySelector('a-bind').model = model;
      const input = container.querySelector('input');
      await when(() => input.value === 'abc');
      return model.val === 'abc';
    } finally {
      cleanup();
    }
  }, true);

  test("'func' executes a function on event", async () => {
    const { container, cleanup } = setup();
    try {
      window.testModel = {
        counter: 0,
        increment: function() { this.counter++; }
      };

      const spy = spyOn(window.testModel, 'increment');
      container.innerHTML = `<a-bind model="testModel" func="increment" event="click"><button>Click Me</button></a-bind>`;

      await wait(10);
      container.querySelector('button').click();

      spy.restore();
      const called = spy.callCount;
      delete window.testModel; // cleanup
      return called;
    } finally {
      cleanup();
    }
  }, 1);
});

group("ABind With Different Element Types", () => {
  test("Works with <select>", async () => {
    const { container, cleanup } = setup();
    try {
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
    } finally {
      cleanup();
    }
  }, true);

  test("Works with <input type='checkbox'>", async () => {
    const { container, cleanup } = setup();
    try {
      const model = { isChecked: true };
      container.innerHTML = `<a-bind property="isChecked" elem-attr="checked"><input type="checkbox" value="any_value"></a-bind>`;
      container.querySelector('a-bind').model = model;
      const checkbox = container.querySelector('input');

      await when(() => checkbox.checked === true);
      // Test element to model
      checkbox.checked = false;
      checkbox.dispatchEvent(new Event('input', { bubbles: true }));
      // console.log(checkbox.checked, model.isChecked)

      return await when(() => !model.isChecked);
    } finally {
      cleanup();
    }
  }, true);
});

group("ABindgroup Functionality", () => {
  info("Note: ABindgroup tests require a server (or importmap) due to dynamic imports.");

  test("Loads a model and provides it to child a-bind elems", async () => {
    const { container, cleanup } = setup();
    try {
      container.innerHTML = `
        <a-bindgroup model="${simpleModelUrl}">
          <a-bind property="message" elem-attr="textContent">
            <span></span>
          </a-bind>
        </a-bindgroup>
      `;
      const span = container.querySelector('span');
      return await when(() => span.textContent === 'Hello from SimpleModel', 500);
    } finally {
      cleanup();
    }
  }, true);

  test("Model registry caches models to prevent re-importing", async () => {
    const { container, cleanup } = setup();
    try {
      container.innerHTML = `
        <a-bindgroup model="${simpleModelUrl}">
          <a-bind property="message" elem-attr="textContent">
            <span></span>
          </a-bind>
        </a-bindgroup>
      `;

      // allow time for import
      await wait(100);
      return ABindgroup.modelRegistry.has(new URL(simpleModelUrl, import.meta.url).href);
    } finally {
      cleanup();
    }
  }, true);

  test("Reference counting cleans up the model registry", async () => {
    const { container, cleanup } = setup();
    try {
      const modelUrl = new URL(counterModelUrl, import.meta.url).href;

      const group1 = document.createElement('a-bindgroup');
      group1.setAttribute('model', counterModelUrl);
      container.append(group1);
      await wait(50);
      const countIsOne = ABindgroup.modelReferenceCounts.get(modelUrl) === 1;

      const group2 = document.createElement('a-bindgroup');
      group2.setAttribute('model', counterModelUrl);
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
    } finally {
      cleanup();
    }
  }, true);
});

runner.run();
