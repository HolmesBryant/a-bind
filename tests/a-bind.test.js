/**
 * @file /tests/a-bind.test.js
 * @description Comprehensive test suite for the ABind library v3.0.0
 */

import ATestRunner from './ATestRunner.min.js';
import ABind from '../src/a-bind.js';
import ABindgroup from '../src/a-bindgroup.js';
import ARepeat from '../src/a-repeat.js';
import PathResolver from '../src/PathResolver.js';
import { scheduler } from '../src/Schedule.js';
import { crosstownBus } from '../src/Bus.js';
import { loader } from '../src/Loader.js';

// Initialize Runner
const runner = new ATestRunner(import.meta.url);
runner.output = "#test-results";

const {
	group,
	test,
	equal,
	when,
	wait,
	info,
	log
} = runner;

// --- Utilities ---

group("PathResolver", () => {
	const obj = {
		user: {
			name: 'Alice',
			settings: {
				notifications: true
			}
		},
		items: ['a', 'b', 'c']
	};

	test("getValue: Retrieves deep properties", () => {
		return PathResolver.getValue(obj, 'user.settings.notifications');
	}, true);

	test("getValue: Retrieves array indices", () => {
		return PathResolver.getValue(obj, 'items.1');
	}, 'b');

	test("setValue: Sets deep properties", () => {
		const target = { a: { b: 1 } };
		PathResolver.setValue(target, 'a.b', 2);
		return target.a.b;
	}, 2);

	test("Security: Blocks prototype pollution", () => {
		PathResolver.setValue({}, '__proto__.polluted', true);
		return ({}).polluted;
	}, undefined);

	test("CSS: Gets computed style", () => {
		const div = document.createElement('div');
		div.style.color = 'red';
		document.body.append(div);
		const val = PathResolver.getValue(div, 'style.color');
		div.remove();
		return val;
	}, 'red');

	test("CSS: Sets style property", () => {
		const div = document.createElement('div');
		PathResolver.setValue(div, 'style.backgroundColor', 'blue');
		return div.style.backgroundColor;
	}, 'blue');
});

group("Bus (PubSub)", () => {
	test("getKey: Generates unique keys for objects", () => {
		const obj = {};
		const key1 = crosstownBus.constructor.getKey(obj, 'prop');
		const key2 = crosstownBus.constructor.getKey(obj, 'prop');
		return key1 === key2 && key1.includes('ref:');
	}, true);

	test("getKey: Generates value keys for primitives", () => {
		const key = crosstownBus.constructor.getKey('my-string', 'prop');
		return key.includes('val:my-string');
	}, true);

	test("hopOn/announce: Subscribes and triggers", async () => {
		let count = 0;
		const event = 'test-event';
		const off = crosstownBus.hopOn(event, (val) => count += val);

		crosstownBus.announce(event, 2);
		crosstownBus.announce(event, 3);

		off(); // Unsubscribe
		crosstownBus.announce(event, 5); // Should not add

		return count;
	}, 5);
});

group("Schedule (RAF)", () => {
	test("defer: Batches updates (Last write wins)", async () => {
		let callCount = 0;
		let finalState = null;

		// Schedule same key multiple times
		scheduler.defer('test-task', 1, (s) => { callCount++; finalState = s; });
		scheduler.defer('test-task', 2, (s) => { callCount++; finalState = s; });
		scheduler.defer('test-task', 3, (s) => { callCount++; finalState = s; });

		// Wait for RAF
		await wait(50);

		return { callCount, finalState };
	}, { callCount: 1, finalState: 3 });

	test("cancel: Stops execution", async () => {
		let executed = false;
		scheduler.defer('cancel-task', null, () => executed = true);
		scheduler.cancel('cancel-task');
		await wait(50);
		return executed;
	}, false);
});

group("Loader", () => {
	test("define: Registers global values", async () => {
		loader.define('myGlobal', { foo: 'bar' });
		const val = await loader.load('myGlobal');
		return val.foo;
	}, 'bar');

	test("load: Resolves DOM selectors (dom:)", async () => {
		const el = document.createElement('div');
		el.id = 'loader-test';
		document.body.append(el);

		const loaded = await loader.load('dom:#loader-test');
		el.remove();
		return loaded === el;
	}, true);
});

// --- Components ---

// Helper for component tests
async function setupBind(model, attrs = {}) {
	const el = document.createElement('a-bind');

	// Set model directly if object, or attribute if string
	if (typeof model === 'string') el.setAttribute('model', model);
	else el.model = model;

	for (const [k, v] of Object.entries(attrs)) {
		if (typeof v === 'boolean') {
			if (v) el.setAttribute(k, '');
		} else {
			el.setAttribute(k, v);
		}
	}

	const input = document.createElement('input');
	el.append(input);
	document.body.append(el);

	// Wait for async init
	await when(() => el.bound);

	return {
		el,
		input,
		teardown: () => el.remove()
	};
}

group("ABind", () => {
	test("Two-way Binding: Input -> Model", async () => {
		const model = { name: 'Start' };
		const { input, teardown } = await setupBind(model, { prop: 'name' });

		input.value = 'End';
		input.dispatchEvent(new Event('input'));

		await when(() => model.name === 'End');
		teardown();
		return model.name;
	}, 'End');

	test("Two-way Binding: Model -> Input", async () => {
		const model = { name: 'Start' };
		const { input, teardown } = await setupBind(model, { prop: 'name' });

		// Simulate external update
		ABind.update(model, 'name', 'Updated');

		await when(() => input.value === 'Updated');
		teardown();
		return input.value;
	}, 'Updated');

	test("Boolean Binding (Checkbox)", async () => {
		const model = { active: false };
		// Note: elem-prop must be checked for boolean logic
		const { input, teardown } = await setupBind(model, {
			prop: 'active',
			'elem-prop': 'checked',
			event: 'change'
		});

		input.type = 'checkbox';
		input.checked = true;
		input.dispatchEvent(new Event('change'));

		await when(() => model.active === true);
		teardown();
		return model.active;
	}, true);

	test("Throttle: Debounces Input", async () => {
		const model = { txt: '' };
		const { input, teardown } = await setupBind(model, {
			prop: 'txt',
			throttle: '50'
		});

		input.value = 'Fast';
		input.dispatchEvent(new Event('input'));

		// Should not be updated immediately
		const immediate = model.txt;

		// Should be updated after wait
		await wait(70);
		const delayed = model.txt;

		teardown();
		return { immediate, delayed };
	}, { immediate: '', delayed: 'Fast' });

	test("Nested Property Path", async () => {
		const model = { data: { value: 10 } };
		const { input, teardown } = await setupBind(model, { prop: 'data.value' });

		input.value = '20';
		input.dispatchEvent(new Event('input'));

		await when(() => model.data.value == 20); // loose equality for string input
		teardown();
		return model.data.value;
	}, '20');
});

group("ABindgroup", () => {
	test("Context: Passes model to children", async () => {
		const model = { a: 1, b: 2 };
		const group = document.createElement('a-bindgroup');
		group.model = model;

		const child = document.createElement('a-bind');
		child.setAttribute('prop', 'a');
		const input = document.createElement('input');
		child.append(input);

		group.append(child);
		document.body.append(group);

		await when(() => child.bound && input.value == '1');

		const val = input.value;
		group.remove();
		return val;
	}, '1');

	test("Scope: Isolation", async () => {
		const model1 = { x: 1 };
		const model2 = { x: 2 };

		const group1 = document.createElement('a-bindgroup');
		group1.model = model1;

		const group2 = document.createElement('a-bindgroup');
		group2.model = model2;

		const child1 = document.createElement('a-bind');
		child1.setAttribute('prop', 'x');
		child1.appendChild(document.createElement('input'));

		const child2 = document.createElement('a-bind');
		child2.setAttribute('prop', 'x');
		child2.appendChild(document.createElement('input'));

		group1.append(child1);
		group1.append(group2); // Nest group2 inside
		group2.append(child2);

		document.body.append(group1);

		await when(() => child1.bound && child2.bound);

		// child2 should use model2, not model1
		const val2 = child2.querySelector('input').value;

		group1.remove();
		return val2;
	}, '2');
});

group("ARepeat", () => {
	async function setupRepeat(items, templateStr) {
		const model = { list: items };
		const container = document.createElement('div');
		container.id = 'list-container';
		document.body.append(container);

		const repeat = document.createElement('a-repeat');
		repeat.model = model;
		repeat.setAttribute('prop', 'list');
		repeat.setAttribute('target', '#list-container');

		if (templateStr) {
			const t = document.createElement('template');
			t.innerHTML = templateStr;
			repeat.appendChild(t);
		}

		document.body.append(repeat);

		// Wait for render
		await when(() => container.children.length > 0 || items.length === 0);

		return { model, container, repeat, teardown: () => { repeat.remove(); container.remove(); } };
	}

	test("Rendering: Basic Array", async () => {
		const { container, teardown } = await setupRepeat(
			['A', 'B', 'C'],
			'<span>{{item}}</span>'
		);
		const html = container.innerHTML;
		teardown();
		return html.includes('A') && html.includes('B') && html.includes('C');
	}, true);

	test("Rendering: Object Array with index", async () => {
		const { container, teardown } = await setupRepeat(
			[{ id: 1, name: 'Bob' }],
			'<div>{{index}}: {{item.name}}</div>'
		);
		const text = container.textContent;
		teardown();
		return text;
	}, '0: Bob');

	test("Reactivity: Updates on push", async () => {
		const { model, container, teardown } = await setupRepeat(
			['A'],
			'<span>{{item}}</span>'
		);

		const newList = ['A', 'B'];
		model.list = newList;

		// Manually announce because we aren't using a proxy wrapper
		crosstownBus.announce(crosstownBus.constructor.getKey(model, 'list'), newList);

		await when(() => container.children.length === 2);
		const count = container.children.length;
		teardown();
		return count;
	}, 2);

	test("Keyed Rendering: Reuses elements", async () => {
		const items = [{id: 1, val: 'a'}, {id: 2, val: 'b'}];
		const model = { items };

		const container = document.createElement('div');
		document.body.append(container);

		const repeat = document.createElement('a-repeat');
		repeat.model = model;
		repeat.setAttribute('prop', 'items');
		repeat.setAttribute('key', 'id'); // Use ID as key
		repeat.target = container; // direct element assignment

		const tmpl = document.createElement('template');
		tmpl.innerHTML = '<div>{{item.val}}</div>';
		repeat.appendChild(tmpl);
		document.body.append(repeat);

		await when(() => container.children.length === 2);

		const firstChild = container.children[0];

		// Swap order in new array
		const newItems = [items[1], items[0]];
		model.items = newItems;
		crosstownBus.announce(crosstownBus.constructor.getKey(model, 'items'), newItems);

		await wait(50); // Wait for RAF render

		// The element should be moved, not recreated.
		// If keyed correctly, the instance reference should be the same.
		const isSameElement = container.children[1] === firstChild;

		repeat.remove();
		container.remove();
		return isSameElement;
	}, true);
});

runner.run();
