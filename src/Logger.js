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
	constructor(host, props) {
		this.host = host;
		this.props = props;
	}

	/**
   * Outputs a collapsed group of debug information to the console.
   * Includes current model value, bound element state, and configuration attributes.
   *
   * @param {string} label - The label for the console group.
   * @param {object} [object] - Optional extra data/arguments to log.
   */
	log(label, object) {
		console.groupCollapsed(label);
			console.log('Debugging: ', this.host);
			if (object) console.log('other', object);
			for (const prop of this.props) {
				console.log(`${prop} : `, this.host[prop]);
			}
		console.groupEnd();
	}
}
