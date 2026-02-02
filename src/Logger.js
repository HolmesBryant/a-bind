/**
 * @file Logger.js
 * @description A dedicated debugging utility for a-bind instances.
 * Provides formatted console output for inspecting binding state, model values, and attributes.
 * @author Holmes Bryant <https://github.com/HolmesBryant>
 * @license GPL-3.0
 */
export default class Logger {
	/**
	 * The host a-bind element instance being debugged.
	 * @type {HTMLElement}
	 */
	host;

	/**
   * Creates an instance of Logger.
   * @param {HTMLElement} host - The a-bind instance to inspect.
   */
	constructor(host) {
		this.host = host;
	}

	/**
   * Outputs a collapsed group of debug information to the console.
   * Includes current model value, bound element state, and configuration attributes.
   *
   * @param {string} label - The label for the console group.
   * @param {object} [object] - Optional extra data/arguments to log.
   */
	log(label, object) {
		const value = this.host.model?.[this.host.prop] || this.host.model?.getAttribute?.(this.host.prop);
		console.groupCollapsed(label);
			if (object) console.log('args', object);
			console.groupCollapsed('host');
				console.log(this.host);
			console.groupEnd();
			console.groupCollapsed('model');
				console.log(this.host.model);
			console.groupEnd();
			console.log(`model[${this.host.prop}]`, value);
			console.log('bound', this.host.bound);
			console.log(`bound[${this.host.elemProp}]`, this.host.bound?.[this.host.elemProp]);
			console.groupCollapsed('Other Properties');
				console.log('elemProp', this.host.elemProp);
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
