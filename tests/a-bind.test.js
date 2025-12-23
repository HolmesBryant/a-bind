import ATestRunner from './ATestRunner.min.js';
import ABind from '../src/a-bind.js';

const runner = new ATestRunner(import.meta.url);
// runner.output = '#test-results';
const {
	benchmark,
	equal,
	genCombos,
	group,
	info,
	skip,
	spyOn,
	test,
	throws,
	wait,
	when
} = runner;

function setup(model, argObj = {}) {
	const instance = document.createElement('a-bind');
	instance.id = 'testsubject';
	const input = document.createElement('input');
	input.value = 'input value';
	instance.append(input);
	if (typeof model === 'string') {
		instance.setAttribute('model', model);
	}	else {
		instance.model = model;
	}

	for (const arg in argObj) {
		instance.setAttribute(arg, argObj[arg]);
	}

	const reset = () => { instance.remove() }
	document.body.append(instance);
	return {instance, reset}
}

group("Loads Model", async () => {
	test("Loads js module from path", async () => {
		const {instance, reset} = setup('/tests/models/SimpleModel.js');
		await when(() => instance.model?.constructor);
		const name = instance.model.constructor.name;
		reset();
		return name;
	}, 'SimpleModel');

	test("Loads mjs module from path", async () => {
		const {instance, reset} = setup('/tests/models/CounterModel.mjs');
		await when(() => instance.model?.constructor);
		const name = instance.model.constructor.name;
		reset();
		return name;
	}, 'CounterModel');

	test("loads model via css id", async () => {
		const input = document.createElement('input');
		input.id = 'foo';
		document.body.append(input);
		wait();
		const {instance, reset} = setup('#foo');
		await when(() => instance.model?.type);
		const type = instance.model.type;
		reset();
		input.remove();
		return type;
	}, 'text');

	test("loads model via html tag name", async () => {
		const elem = document.createElement('foobar');
		elem.dataset.foo = 'foo';
		document.body.append(elem);
		wait();
		const {instance, reset} = setup('<foobar>');
		await when(() => instance.model?.dataset.foo);
		const type = instance.model.localName;
		reset();
		elem.remove();
		return type;
	}, 'foobar');

	test("loads model via html tag name and id", async () => {
		const elem = document.createElement('baz');
		elem.id = 'boom';
		document.body.append(elem);
		wait();
		const {instance, reset} = setup('baz#boom');
		await when(() => instance.model?.id);
		const type = instance.model.id;
		reset();
		elem.remove();
		return type;
	}, 'boom');

	test("loads model by setting obj programatically", async () => {
		const model = { foo: 'bar' };
		const {instance, reset } = setup(model);
		const value = instance.model.foo;
		reset();
		return value;
	}, 'bar')
});

group("ABind Init", () => {
	test("stores model property", async () => {
		const model = { foo: 'bar' };
		const {instance, reset} = setup(model, {property:'foo'});
		await wait(() => instance.property)
		const value = instance.property;
		reset();
		return value;
	}, 'foo');

	test("stores model attribute", async () => {
		const model = document.createElement('div');
		model.dataset.foo = 'foo';
		const {instance, reset} = setup(model, {'model-attr': 'data-foo'});
		await wait(() => instance.modelAttr);
		const value = instance.modelAttr;
		reset();
		return value;
	}, 'data-foo');

	test("finds bound element", async () => {
		const model = { foo: 'bar' };
		const {instance, reset} = setup(model);
		const elem = instance.bound;
		reset();
		return elem instanceof HTMLElement;
	}, true);

	test("initial sync: Model => Elem", () => {
		const model = {foo: 'model value'};
		const {instance, reset} = setup(model, {property:'foo'});
		const value = instance.bound.value;
		reset();
		return value;
	}, 'model value');

	test("initial sync: elem should not sync when 'push' is present", () => {
		const model = {foo: 'model value'};
		const {instance, reset} = setup(model, {property:'foo', push:true, debug:true});
		const value = instance.bound.value;
		reset();
		return value;
	}, 'input value');
});

group("PubSub", () => {
	test('Subscribes Model to pubsub', () => {
		const model = {foo: 'model value'};
		const {instance, reset} = setup(model, {property:'foo'});
		wait(10);
		const busKey = instance.busKey;
		return instance.bus.has(busKey);
	}, true);

});

group("Data Binding", () => {
	test("Two-Way binding", async () => {
		const model = {foo: 'model value'};
		const {instance, reset} = setup(model, {property:'foo'});
		wait(10);
		const modelToBound = instance.bound.value === 'model value';
		instance.bound.value = 'new value';
		instance.bound.dispatchEvent(new Event('input'));
		const boundToModel = instance.model.foo === 'new value';
		reset();
		return modelToBound === true && boundToModel === true;
	}, true);

	test("One-Way: Element => Model (push)", () => {
		const model = {foo: 'model value'};
		const {instance, reset} = setup(model, {property:'foo', push:true});
		wait(10);
		const elemValue = instance.bound.value;
		instance.bound.dispatchEvent(new Event('input'));
		const modelValue = instance.model.foo;
		reset();
		return {input: elemValue, model: modelValue};
	}, {input: 'input value', model: 'input value'});

	test("One-Way: Model => Element (pull)", () => {
		const model = {foo: 'model value'};
		const {instance, reset} = setup(model, {property:'foo', pull:true});
		wait(10);
		const elemMatchesModel = instance.bound.value === 'model value';
		instance.bound.value = 'new input value';
		instance.bound.dispatchEvent(new Event('input'));
		const modelRetainsValue = instance.model.foo === 'model value';
		instance.model.foo = 'new model value';
		ABind.update(instance.model, 'foo', instance.model.foo);
		const elemMatchesNewModelValue = instance.bound.value === 'new model value';
		reset();
		return elemMatchesModel && modelRetainsValue && elemMatchesNewModelValue;
	}, true);

	/*test("Bound element only updates once (once)", () => {
		const model = {foo: 'old model value'};
		const {instance, reset} = setup(model, {property:'foo', once:true});
		wait(10);
		const initialElemValue = instance.bound.value; // old model value
		instance.bound.dispatchEvent(new Event('input'));
		const modelValue = instance.model.foo; // old model value
		instance.model.foo = 'new model value';
		ABind.update(instance.bound, 'value', instance.model.foo);
		const newElemValue = instance.bound.value;
		reset();
		return newElemValue;
	}, 'old model value')*/
});

runner.run();
