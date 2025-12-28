/**
 * @file /tests/a-bind.test.js
 */

import ATestRunner from './ATestRunner.min.js';
import ABind from '../src/a-bind.js';
import ABindgroup from '../src/a-bindgroup.js';
import testObject from '../extra/testObject.js';
import CustomElement from '../extra/custom-element.js';

window.abind = ABind;

const runner = new ATestRunner(import.meta.url);
runner.output = "#test-results";

const {
	benchmark,
	equal,
	genCombos,
	group,
	info,
	log,
	skip,
	spyOn,
	test,
	throws,
	wait,
	when
} = runner;

// Helper to ensure component is initialized
async function setup(model, argObj = {}) {
	const instance = document.createElement('a-bind');
	const input = document.createElement('input');
	input.value = 'input value';
	instance.append(input);

	if (typeof model === 'string') {
		instance.setAttribute('model', model);
	} else {
		instance.model = model;
	}

	for (const arg in argObj) {
		instance.setAttribute(arg, argObj[arg]);
	}

	document.body.append(instance);
	await when(() => instance.bound && !instance.isInitializing);
	const reset = () => {
		try {
			if (instance.isConnected) instance.remove();
		} catch (e) {
			console.error('Cleanup failed', e);
		}
	}
	return { instance, reset }
}

// Expose wait as baseWait if needed for non-polling waits
const baseWait = wait;

group("Loads Model", async () => {
	test("Loads js module from path", async () => {
		const { instance, reset } = await setup('/tests/models/SimpleModel.js');
		await when(() => instance.model?.constructor);
		const name = instance.model.constructor.name;
		reset();
		return name;
	}, 'SimpleModel');

	test("Loads mjs module from path", async () => {
		const { instance, reset } = await setup('/tests/models/CounterModel.mjs');
		await when(() => instance.model?.constructor);
		const name = instance.model.constructor.name;
		reset();
		return name;
	}, 'CounterModel');

	test("loads model via css id", async () => {
		const input = document.createElement('input');
		input.id = 'foo';
		document.body.append(input);
		const { instance, reset } = await setup('#foo');
		await when(() => instance.model?.type);
		const type = instance.model.type;
		reset();
		input.remove();
		return type;
	}, 'text');

	test("loads model via html tag name", async () => {
		const model = document.createElement('foobar');
		model.dataset.foo = 'foo';
		document.body.append(model);
		const { instance, reset } = await setup('<foobar>');
		await when(() => instance.model?.dataset.foo);
		const type = instance.model.localName;
		reset();
		model.remove();
		return type;
	}, 'foobar');

	test("loads model via html tag name and id", async () => {
		const elem = document.createElement('baz');
		elem.id = 'boom';
		document.body.append(elem);
		const { instance, reset } = await setup('baz#boom');
		await when(() => instance.model?.id);
		const type = instance.model.id;
		reset();
		elem.remove();
		return type;
	}, 'boom');

	test("loads model by setting obj programatically", async () => {
		const model = { foo: 'bar' };
		const { instance, reset } = await setup(model);
		const value = instance.model.foo;
		reset();
		return value;
	}, 'bar')
});

group("ABind Init", () => {
	test("stores model property", async () => {
		const model = { foo: 'bar' };
		const { instance, reset } = await setup(model, { property: 'foo' });
		await when(instance.property)
		const value = instance.property;
		reset();
		return value;
	}, 'foo');

	test("stores model attribute", async () => {
		const model = document.createElement('div');
		model.dataset.foo = 'foo';
		const { instance, reset } = await setup(model, { 'model-attr': 'data-foo' });
		await when(instance.modelAttr);
		const value = instance.modelAttr;
		reset();
		return value;
	}, 'data-foo');

	test("finds bound element", async () => {
		const model = { foo: 'bar' };
		const { instance, reset } = await setup(model);
		const elem = instance.bound;
		reset();
		return elem instanceof HTMLElement;
	}, true);

	test("initial sync: Model => Elem", async () => {
		const model = { foo: 'model value' };
		const { instance, reset } = await setup(model, { property: 'foo' });
		const value = instance.bound.value;
		reset();
		return value;
	}, 'model value');

	test("initial sync: elem should not sync when 'push' is present", async () => {
		const model = { foo: 'model value' };
		const { instance, reset } = await setup(model, { property: 'foo', push: true });
		const value = instance.bound.value;
		reset();
		return value;
	}, 'input value');
});

group("PubSub", () => {
	test('Subscribes to pubsub', async () => {
		const model = { foo: 'model value' };
		const { instance, reset } = await setup(model, { property: 'foo' });
		const busKey = instance.busKey;
		const isSubscribed = instance.bus.has(busKey);
		reset();
		return isSubscribed;
	}, true);
});

group("Data Binding", () => {
	test("Two-Way binding", async () => {
		const model = { foo: 'model value' };
		const { instance, reset } = await setup(model, { property: 'foo' });
		const evt = instance.event;
		const modelProp = instance.property || instance.modelAttr;
		const boundProp = instance.elemAttr;
		const initialBind = instance.bound[boundProp] === 'model value';
		instance.bound[boundProp] = 'new value';
		instance.bound.dispatchEvent(new Event(evt, { bubbles: true }));
		await when(() => instance.model[modelProp] === 'new value');
		const boundToModel = instance.model[modelProp] === 'new value';
		instance.model[modelProp] = 'new model value';
		ABind.update(model, modelProp, model[modelProp]);
		await when(() => instance.bound[boundProp] === instance.model[modelProp]);
		const modelToBound = instance.bound[boundProp] === instance.model[modelProp];
		reset();
		return initialBind === true && modelToBound === true && boundToModel === true;
	}, true);

	test("One-Way: Element => Model (push)", async () => {
		const model = { foo: 'model value' };
		const { instance, reset } = await setup(model, { property: 'foo', push: true });
		const modelProp = instance.prop;
		const boundProp = instance.elemAttr;
		const evt = instance.event;
		const elemValue = instance.bound[boundProp];
		instance.bound.dispatchEvent(new Event(evt, { bubbles: true }));
		await when(() => instance.model[modelProp] === instance.bound[boundProp])
		const modelValue = instance.model[modelProp];
		reset();
		return { input: elemValue, model: modelValue };
	}, { input: 'input value', model: 'input value' });

	test("One-Way: Model => Element (pull)", async () => {
		const model = { foo: 'model value' };
		const { instance, reset } = await setup(model, { property: 'foo', pull: true });
		const boundProp = instance.elemAttr;
		const modelProp = instance.prop;
		const initialSync = instance.bound[boundProp] === instance.model[modelProp];
		instance.bound[boundProp] = 'new input value';
		instance.bound.dispatchEvent(new Event('input', { bubbles: true }));
		wait(10);
		const modelRetainsValue = instance.model[modelProp] === 'model value';
		instance.model[modelProp] = 'new model value';
		ABind.update(instance.model, modelProp, instance.model[modelProp]);
		await when(() => instance.bound[boundProp] === instance.model[modelProp])
		const elemMatchesNewModelValue = instance.bound[boundProp] === 'new model value';
		reset();
		return initialSync && modelRetainsValue && elemMatchesNewModelValue;
	}, true);

	test("Bound element only updates once (once)", async () => {
		const model = { foo: 'old model value' };
		const { instance, reset } = await setup(model, { property: 'foo', once: true });
		const modelProp = instance.prop;
		const boundProp = instance.elemAttr;
		const initialSync = instance.bound[boundProp] === instance.model[modelProp];
		instance.model[modelProp] = 'new model value';
		ABind.update(instance.model, modelProp, instance.model[modelProp]);
		wait(10);
		const elemValue = instance.bound.value;
		reset();
		return elemValue;
	}, 'old model value');

	test("Bound element executes function on model", async () => {
		const model = { foo: 'foo', do(event) { this.foo = event.target.value } };
		const { instance, reset } = await setup(model, { property: 'foo', func: 'do' })
		const modelProp = instance.prop;
		const boundProp = instance.elemAttr;
		const beforeUpdate = instance.model[modelProp]; // foo
		// log('before update', beforeUpdate);
		const initialModel = beforeUpdate === 'foo';
		instance.bound[boundProp] = 'bar';
		instance.bound.dispatchEvent(new Event(instance.event, { bubbles: true }));
		await when(instance.model[modelProp] === 'bar');
		const afterUpdate = instance.model[modelProp];
		// log('after update', afterUpdate);
		const updatedModel = afterUpdate === 'bar';
		reset();
		return initialModel && updatedModel;
	}, true);
});

group("Nested Property Paths", async () => {
	test("Model -> Element (Nested)", async () => {
		const model = { user: { profile: { name: 'Alice' } } };
		const { instance, reset } = await setup(model, { property: 'user.profile.name' });

		instance.model.user.profile.name = 'Bob';
		ABind.update(model, 'user.profile.name', 'Bob');

		await when(() => instance.bound.value === 'Bob');
		const value = instance.bound.value;
		reset();
		return value;
	}, 'Bob');

	test("Element -> Model (Nested)", async () => {
		const model = { config: { theme: 'dark' } };
		const { instance, reset } = await setup(model, { property: 'config.theme' });

		instance.bound.value = 'light';
		instance.bound.dispatchEvent(new Event('input', { bubbles: true }));

		await when(() => model.config.theme === 'light');
		const value = model.config.theme;
		reset();
		return value;
	}, 'light');
});

group("Special Element Attributes", async () => {
	test("CSS Variable binding", async () => {
		const model = { color: 'red' };
		// We need a div to test style properties easily
		const instance = document.createElement('a-bind');
		instance.setAttribute('elem-attr', '--main-bg');
		instance.setAttribute('property', 'color');
		instance.model = model;
		const div = document.createElement('div');
		instance.append(div);
		document.body.append(instance);

		await when(() => instance.bound);

		instance.model.color = 'blue';
		ABind.update(model, 'color', 'blue');

		await when(() => div.style.getPropertyValue('--main-bg') === 'blue');
		const result = div.style.getPropertyValue('--main-bg');
		instance.remove();
		return result;
	}, 'blue');

	test("Select/Datalist array population", async () => {
		const model = { options: ['Apple', 'Banana', 'Cherry'] };
		const instance = document.createElement('a-bind');
		instance.setAttribute('property', 'options');
		instance.model = model;
		const select = document.createElement('select');
		instance.append(select);
		document.body.append(instance);

		await when(() => select.options.length === 3);
		const count = select.options.length;
		const secondVal = select.options[1].text;
		instance.remove();
		return { count, secondVal };
	}, { count: 3, secondVal: 'Banana' });
});

group("Throttling", async () => {
	test("Input is debounced via throttle attribute", async () => {
		const model = { val: '' };
		const { instance, reset } = await setup(model, { property: 'val', throttle: '100' });

		instance.bound.value = 'high speed typing';
		instance.bound.dispatchEvent(new Event('input', { bubbles: true }));

		// Immediate check: should still be empty
		const immediate = model.val;

		// Wait for throttle using deterministic check instead of fixed wait
		await when(() => model.val === 'high speed typing');
		const delayed = model.val;

		reset();
		return { immediate, delayed };
	}, { immediate: '', delayed: 'high speed typing' });
});

group("Edge Cases & Lifecycle", async () => {
	test("Handles invalid model gracefully (null)", async () => {
		const instance = document.createElement('a-bind');
		instance.model = null;
		instance.setAttribute('property', 'foo');
		document.body.append(instance);

		// Should not crash
		await baseWait(50); // Small wait to ensure no async crash
		const isConnected = instance.isConnected;
		instance.remove();
		return isConnected;
	}, true);

	test("Attribute Removal unbinds", async () => {
		const model = { foo: 'bar' };
		const { instance, reset } = await setup(model, { property: 'foo' });

		instance.removeAttribute('property');
		await wait(20);

		// Changing bound element should not affect model anymore
		instance.bound.value = 'baz';
		instance.bound.dispatchEvent(new Event('input', { bubbles: true }));
		await wait(20);

		const modelValue = model.foo;
		reset();
		return modelValue;
	}, 'bar');

	test("Lifecycle: Detach and Re-attach", async () => {
		const model = { foo: 'bar' };
		const { instance, reset } = await setup(model, { property: 'foo' });

		// Detach
		instance.remove();
		await wait(20);

		// Update model while detached (should not affect element potentially, but element is effectively gone from DOM)
		// Re-attach
		document.body.append(instance);
		await when(() => instance.bound);

		const isReflected = instance.bound.value === 'bar';
		instance.remove(); // Manual cleanup as 'reset' might fail if already removed
		return isReflected;
	}, true);
});

group("Dynamic Attribute Changes", async () => {
	test("Re-initializes when 'property' attribute changes", async () => {
		const model = { a: 'Apple', b: 'Banana' };
		const { instance, reset } = await setup(model, { property: 'a', debug: null });

		const firstVal = instance.bound.value; // Apple
		instance.setAttribute('property', 'b');

		// MutationObserver and re-init are async
		await when(() => instance.bound.value === 'Banana');

		const secondVal = instance.bound.value;
		reset();
		return { firstVal, secondVal };
	}, { firstVal: 'Apple', secondVal: 'Banana' });
});

group("ABindgroup Integration", async () => {
	test("a-bind children inherit model from group", async () => {
		const group = document.createElement('a-bindgroup');
		const model = { foo: 'bar' };

		const instance = document.createElement('a-bind');
		instance.setAttribute('property', 'foo');
		const input = document.createElement('input');

		instance.append(input);
		group.append(instance);
		document.body.append(group);

		// Manually inject model to group (bypassing loader for this test)
		group.model = model;
		const sharedModel = instance.model === group.model;
		group.remove();
		return sharedModel;
	}, true);

	test('Respects pre-existing a-bind instance model', () => {
		const modelOne = { foo: 'bar' };
		const group = document.createElement('a-bindgroup');
		const instance = document.createElement('a-bind');
		const input = document.createElement('input');
		function modelTwo() { this.bar = 'baz' }

		group.model = modelOne;

		instance.setAttribute('property', 'foo');
		instance.model = modelTwo;

		instance.append(input);
		group.append(instance);
		document.body.append(group);
		const areEqual = equal(instance.model, modelTwo);
		group.remove();
		return areEqual;
	}, true);
});

group("Security & Edge Cases", async () => {
	test("Blocks unsafe paths (__proto__)", async () => {
		const model = {};
		const { instance, reset } = await setup(model, { property: '__proto__.polluted' });

		instance.bound.value = 'attacker';
		instance.bound.dispatchEvent(new Event('input', { bubbles: true }));

		await wait(50);
		const isPolluted = ({}).polluted !== undefined;
		reset();
		return isPolluted;
	}, false);

	test("Wait for child element via MutationObserver", async () => {
		const model = { x: 'ready' };
		const instance = document.createElement('a-bind');
		instance.model = model;
		instance.setAttribute('property', 'x');
		document.body.append(instance); // Appended with no children

		// Component should be in warning/waiting state
		await wait(20);

		const input = document.createElement('input');
		instance.append(input); // Add child later

		await when(() => input.value === 'ready');
		const val = input.value;
		instance.remove();
		return val;
	}, 'ready');
});

runner.run();

group("Comprehensive: JS Object", async () => {
	// Setup helper specifically for testObject
	async function setupObj(prop, extraAttrs = {}) {
		const instance = document.createElement('a-bind');
		instance.model = testObject;
		instance.setAttribute('property', prop);
		for (const [k, v] of Object.entries(extraAttrs)) {
			instance.setAttribute(k, v);
		}
		
		const input = document.createElement('input');
		if (extraAttrs.type) input.type = extraAttrs.type;
		instance.append(input);
		
		document.body.append(instance);
		await when(() => instance.bound);
		
		return { instance, input, reset: () => instance.remove() };
	}

	test("Text Input", async () => {
		const { instance, input, reset } = await setupObj('text');
		testObject.text = "Hello World";
		await when(() => input.value === "Hello World");
		input.value = "Changed";
		input.dispatchEvent(new Event('input', { bubbles: true }));
		await when(() => testObject.text === "Changed");
		reset();
		return testObject.text;
	}, "Changed");

	test("Number Input", async () => {
		const { instance, input, reset } = await setupObj('number', { type: 'number' });
		testObject.number = 42;
		await when(() => input.value === '42');
		input.value = '100';
		input.dispatchEvent(new Event('input', { bubbles: true }));
		await when(() => testObject.number == 100); // Loose equality: input.value is string '100', model is string '100' (testObject doesn't cast)
		reset();
		return testObject.number; // Returns '100' string
	}, '100');

	test("Checkbox (Boolean)", async () => {
		// must bind to 'checked' property and listen to 'change' for checkboxes
		const { instance, input, reset } = await setupObj('checkboxBool', { 
			type: 'checkbox', 
			'elem-attr': 'checked', 
			event: 'change' 
		});
		testObject.checkboxBool = true;
		await when(() => input.checked === true);
		input.click(); // Uncheck
		await when(() => testObject.checkboxBool === false);
		reset();
		return testObject.checkboxBool;
	}, false);

	test("Select Single", async () => {
		const instance = document.createElement('a-bind');
		instance.model = testObject;
		instance.setAttribute('property', 'select');
		// Select elements usually fire 'change'
		instance.setAttribute('event', 'change');
		
		const select = document.createElement('select');
		select.innerHTML = '<option value="foo">foo</option><option value="bar">bar</option>';
		instance.append(select);
		document.body.append(instance);
		
		testObject.select = 'bar';
		await when(() => select.value === 'bar');
		
		select.value = 'foo';
		select.dispatchEvent(new Event('change', { bubbles: true }));
		await when(() => testObject.select === 'foo');
		
		instance.remove();
		return testObject.select;
	}, 'foo');
});

group("Comprehensive: Custom Element", async () => {
	async function setupCE(prop, extraAttrs = {}) {
		if (!customElements.get('custom-element')) {
			customElements.define('custom-element', CustomElement);
		}
		const ce = document.createElement('custom-element');
		document.body.append(ce);
		
		const instance = document.createElement('a-bind');
		instance.model = ce;
		instance.setAttribute('property', prop);
		for (const [k, v] of Object.entries(extraAttrs)) {
			instance.setAttribute(k, v);
		}
		
		const input = document.createElement('input');
		if (extraAttrs.type) input.type = extraAttrs.type;
		instance.append(input);
		document.body.append(instance);
		
		await when(() => instance.bound);
		return { instance, input, ce, reset: () => { instance.remove(); ce.remove(); } };
	}

	test("CE: Text Property", async () => {
		const { input, ce, reset } = await setupCE('text');
		ce.text = "CE Hello";
		await when(() => input.value === "CE Hello");
		
		input.value = "CE Update";
		input.dispatchEvent(new Event('input', { bubbles: true }));
		await when(() => ce.text === "CE Update");
		
		reset();
		return ce.text;
	}, "CE Update");

	test("CE: Attribute reflection (Date)", async () => {
		const { input, ce, reset } = await setupCE('date', { type: 'date' });
		const testDate = '2023-12-25';
		ce.setAttribute('date', testDate); // Should trigger attrChanged -> prop update -> bind update
		
		await when(() => input.value === testDate);
		reset();
		return input.value;
	}, '2023-12-25');
});

group("DOM-to-DOM Binding", async () => {
	test("Input to Input Sync", async () => {
		const source = document.createElement('input');
		source.id = 'source-input';
		document.body.append(source);
		
		const instance = document.createElement('a-bind');
		instance.setAttribute('model', '#source-input');
		instance.setAttribute('property', 'value');
		
		const target = document.createElement('input');
		instance.append(target);
		document.body.append(instance);
		
		source.value = "Source Value";
		// Direct property set doesn't trigger MutationObserver/event usually, but a-bind might need event
		// But here we are binding to specific property 'value'. 
		// If model is an element, a-bind subscribes to change/input events on it if it can.
		// Let's trigger input.
		source.dispatchEvent(new Event('input', { bubbles: true }));
		
		// Wait for sync (it might be throttled or async)
		// NOTE: core a-bind logic for DOM-model usually requires explicit `abind.update` or events if not polling
		// Let's check how DOM models are handled. It seems they use the same proxy/pubsub if possible, 
		// or if we use `abind.update(this, ...)` in the source element.
		// The demo uses `oninput="abind.update(...)"`. We should probably simulate that or use the automatic event detection if it exists.
		// a-bind.js:246 (approx) handles valid events.
		
		// For this test, we mimic the demo pattern: manually calling update or ensuring events work if implemented.
		// Let's try explicit event first.
		
		ABind.update(source, 'value', 'Source Value');
		
		await when(() => target.value === 'Source Value');
		
		target.value = "Target Value";
		target.dispatchEvent(new Event('input', { bubbles: true }));
		
		await when(() => source.value === "Target Value");
		
		source.remove();
		instance.remove();
		return source.value;
	}, "Target Value");
});

group("Buttons & Actions", async () => {
	test("Button updates model value (Push)", async () => {
		const instance = document.createElement('a-bind');
		instance.model = testObject;
		instance.setAttribute('property', 'text');
		instance.setAttribute('push', '');
		instance.setAttribute('event', 'click');
		
		const btn = document.createElement('button');
		btn.value = "Button Clicked";
		instance.append(btn);
		document.body.append(instance);
		
		btn.click();
		await when(() => testObject.text === "Button Clicked");
		
		instance.remove();
		return testObject.text;
	}, "Button Clicked");
});
