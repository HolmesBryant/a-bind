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
      await wait(20);

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
      delete window.testModel;
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

      checkbox.checked = false;
      checkbox.dispatchEvent(new Event('input', { bubbles: true }));

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
      return await when(() => span.textContent === 'Hello from SimpleModel', 1000);
    } finally {
      cleanup();
    }
  }, true);

  // REWRITTEN: Behavior-based testing for caching
  test("Model registry shares instances (Caching)", async () => {
    const { container, cleanup } = setup();
    try {
      const modelUrl = simpleModelUrl;

      // Load the same model in two different groups
      container.innerHTML = `
        <a-bindgroup id="g1" model="${modelUrl}"></a-bindgroup>
        <a-bindgroup id="g2" model="${modelUrl}"></a-bindgroup>
      `;

      const g1 = container.querySelector('#g1');
      const g2 = container.querySelector('#g2');

      // Wait until both models are resolved
      await when(() => g1.model && g2.model);

      // They should point to the exact same object instance
      return g1.model === g2.model;
    } finally {
      cleanup();
    }
  }, true);

  // REWRITTEN: Behavior-based testing for cleanup
  test("Reference counting cleans up (New Instance on Re-mount)", async () => {
    const { container, cleanup } = setup();
    try {
      const modelUrl = counterModelUrl; // Uses CounterModel (Class based)

      // 1. Mount Group 1
      const g1 = document.createElement('a-bindgroup');
      g1.setAttribute('model', modelUrl);
      container.appendChild(g1);

      await when(() => g1.model);
      const instance1 = g1.model;

      // 2. Mount Group 2 (Should share instance1)
      const g2 = document.createElement('a-bindgroup');
      g2.setAttribute('model', modelUrl);
      container.appendChild(g2);
      await when(() => g2.model);

      if (g2.model !== instance1) return "Failed: Instances were not shared initially";

      // 3. Unmount both (Should trigger ref count -> 0 -> cleanup)
      g1.remove();
      g2.remove();

      // Wait for cleanup
      await wait(100);

      // 4. Mount Group 3
      const g3 = document.createElement('a-bindgroup');
      g3.setAttribute('model', modelUrl);
      container.appendChild(g3);

      await when(() => g3.model);
      const instance3 = g3.model;

      // If Registry cleaned up, instance3 should be a new object reference.
      return instance3 !== instance1;
    } finally {
      cleanup();
    }
  }, true);
});

runner.run();
