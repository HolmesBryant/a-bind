export default class Logger {
	host;

	constructor(host) {
		this.host = host;
	}

	log(label, object) {
		console.groupCollapsed(label);
			if (object) console.log('args', object);
			// console.log(this.host);
			console.log('model', this.host.model);
			console.log(`model[${this.host.prop}]`, this.host.model?.[this.host.prop]);
			console.log('bound', this.host.bound);
			console.log(`bound[${this.host.elemAttr}]`, this.host.bound?.[this.host.elemAttr]);
			console.groupCollapsed('Other Properties');
				console.log('elemAttr', this.host.elemAttr);
				console.log('property', this.host.property);
				console.log('modelAttr', this.host.modelAttr);
				console.log('prop', this.host.prop);
				console.log('event', this.host.event);
				console.log('func', this.host.func);
				console.log('busKey', this.host.busKey);
				console.log('modelKey', this.host.modelKey);
				console.log('once', this.host.once);
				console.log('pull', this.host.pull);
				console.log('push', this.host.push);
				console.log('throttle', this.host.throttle);
			console.groupEnd();
		console.groupEnd();
	}
}
