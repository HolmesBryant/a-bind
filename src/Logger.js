import ATestRunner from './ATestRunner.js';

const runner = new ATestRunner(import.meta.url);
const {equal, genCombos, group, info, log,skip, spyOn, test, wait, when} = runner;

export default class Logger {
	binder;

	constructor(binder) {
		this.binder = binder;
	}

	log(label, object) {
		group(label, () => {
			const modelValue = this.binder.getModelProperty();
			const elemValue = this.binder.boundElement.value;
			log('a-bind instance', this.binder);
			log('model', this.binder.resolvedModel);
			log('bound element', this.binder.boundElement);
			log('vars', object);
			group(`Model value: ${modelValue}`, () => {
				info(`old value: ${this.binder.oldValue}`);
				info(`new value: ${this.binder.newValue}`);
			});
			test("Bound element is HTML element", this.binder.boundElement instanceof HTMLElement, true);
			test("Model value matches Bound Element value", runner.equal(modelValue, elemValue), true)
		});
	}


	run() {
		console.clear();
		runner.run();
	}
}
