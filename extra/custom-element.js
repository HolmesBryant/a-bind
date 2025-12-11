export default class CustomElement extends HTMLElement {

	// Attributes

	#text;
	#datalist;
	#datalistInput;
	#search;
	#password;
	#tel;
	#url;
	#email;
	#number;
	#textarea;
	#date;
	#time;
	#dateTime;
	#week;
	#month;
	#select;
	#selectMulti;
	#checkbox;
	#radioGroup;
	#button;
	#color;
	#range;
	#progress;
	#meter;
	#file;
	#name;
	#editable;

	// Private

	#connected = false;

	/**
	 * For the contenteditable demo
	 */
	#editableFormatted;
	#editableRegex = /(<[^>]+>)(?=[^\r\n])/g;

	// Public

	datalistHTML;

	/**
	 * Default values for all properties so I can reset the UI back to the original values.
	 * @type {Object}
	 */
	defaults = {
		text: "Initial Text",
		datalist: ['One', 'Two', 'Three'],
		datalistInput: '',
		search: "Search Term",
		password: "password",
		tel: "123-456-7890",
		url: "https://url.com",
		email: "name@email.com",
		number: 12345,
		textarea: "Initial content.",
		date: "1970-01-01",
		time: "00:00",
		dateTime: "1970-01-01T12:00",
		week: "1970-W01",
		month: "1970-01",
		select: "baz",
		selectMulti: 'foo, baz',
		checkbox: 'foo',
		radioGroup: 'foo',
		button: "value of button property",
		color: "#cd5c5c",
		range: '50',
		progress: '50',
		meter: '50',
		name: 'My Name',
		editable: "<p>Eiusmod magna eiusmod anim ut nostrud anim ullamco quis in consequat eu exercitation laboris culpa laboris.</p>"
	}

	static observedAttributes = [
		'text',
		'datalist',
		'datalist-input',
		'search',
		'password',
		'tel',
		'url',
		'email',
		'number',
		'textarea',
		'date',
		'time',
		'date-time',
		'week',
		'month',
		'select',
		'select-multi',
		'checkbox',
		'checkbox-bar',
		'radio-group',
		'button',
		'color',
		'range',
		'progress',
		'meter',
		'name',
		'editable'
	];

	constructor() {
		super();
	}

	/**
   * Called when an attribute is changed, added, or removed.
   *
   * @param {string} attr - The name of the attribute.
   * @param {any} oldval - The old value of the attribute.
   * @param {any} newval - The new value of the attribute.
   */
	attributeChangedCallback(attr, oldval, newval) {
    if (this.#connected && newval === oldval) return;

    switch (attr) {
			case 'datalist':
				let options = "";
				for (const option of this.optionGenerator(newval)) options += option;
				this.datalistHtml = options;
				this.#datalist = newval;
				window.abind?.update?.(this, 'datalist', options);
				window.abind?.update?.(this, 'datalistHtml', options);
				break;
			case 'datalist-input':
				this.#datalistInput = newval;
				window.abind?.update?.(this, 'datalistInput', newval);
				window.abind?.update?.(this, 'datalist-input', newval);
				break;
			case 'date-time':
				this.#dateTime = newval;
				window.abind?.update?.(this, 'dateTime', newval);
				window.abind?.update?.(this, 'date-time', newval);
				break;
			case 'select-multi':
				this.#selectMulti = newval;
				window.abind?.update?.(this, 'selectMulti', newval);
				window.abind?.update?.(this, 'select-multi', newval);
				break;
			case 'checkbox':
				this.#checkbox = newval;
				window.abind?.update?.(this, 'checkbox', newval);
				break;
			case 'radio-group':
				this.#radioGroup = newval;
				window.abind?.update?.(this, 'radioGroup', newval);
				window.abind?.update?.(this, 'radio-group', newval);
				break;
	    case 'text':
	    	this.#text = newval;
				window.abind?.update?.(this, 'text', newval);
	    	break;
			case 'search':
				this.#search = newval;
				window.abind?.update?.(this, 'search', newval);
				break;
			case 'password':
				this.#password = newval;
				window.abind?.update?.(this, 'password', newval);
				break;
			case 'tel':
				this.#tel = newval;
				window.abind?.update?.(this, 'tel', newval);
				break;
			case 'url':
				this.#url = newval;
				window.abind?.update?.(this, 'url', newval);
				break;
			case 'email':
				this.#email = newval;
				window.abind?.update?.(this, 'email', newval);
				break;
			case 'number':
				this.#number = newval;
				window.abind?.update?.(this, 'number', newval);
				break;
			case 'textarea':
				this.#textarea = newval;
				window.abind?.update?.(this, 'textarea', newval);
				break;
			case 'date':
				this.#date = newval;
				window.abind?.update?.(this, 'date', newval);
				break;
			case 'time':
				this.#time = newval;
				window.abind?.update?.(this, 'time', newval);
				break;
			case 'week':
				this.#week = newval;
				window.abind?.update?.(this, 'week', newval);
				break;
			case 'month':
				this.#month = newval;
				window.abind?.update?.(this, 'month', newval);
				break;
			case 'select':
				this.#select = newval;
				window.abind?.update?.(this, 'select', newval);
				break;
			case 'button':
				this.#button = newval;
				window.abind?.update?.(this, 'button', newval);
				break;
			case 'color':
				window.abind?.update?.(this, 'color', newval);
				this.#color = newval;
				break;
			case 'range':
				this.#range = newval;
				window.abind?.update?.(this, 'range', newval);
				break;
			case 'progress':
				this.#progress = newval;
				window.abind?.update?.(this, 'progress', newval);
				break;
			case 'meter':
				this.#meter = newval;
				window.abind?.update?.(this, 'meter', newval);
				break;
			case 'name':
				this.#name = newval;
				window.abind?.update?.(this, 'name', newval);
				break;
			case 'editable':
				this.#editable = newval;
				break;
    }
	}

	connectedCallback() {
		this.reset();
		this.#connected = true;
	}

	*optionGenerator(str) {
	  if (!str) return;
	  str = str.trim();

	  for (const option of str.split(/[,\s]+/)) {
	    if (option) yield `<option value="${option}"></option>`;
	  }
	}

	getFiles(event) {
    const fileList = event.target.files;
    this.file = fileList;
    const list = [];
    const elem = document.createElement('output');

    for (const item of fileList) {
      const obj = {
        name: item.name,
        modified: item.lastModifiedDate,
        size: item.size,
        type: item.type
      };

      list.push(obj);
    }

    const str = JSON.stringify(list, null, 2);
    elem.value = str;

    const fakeEvent = {
      type: 'change',
      target: elem
    };

    this.notify(fakeEvent);
}

	notify(event) {
		const html = `
			<form method="dialog">
				<button>X</button>
			</form>
			<p><b>Argument passed:</b> Event</p>
			<p><b>Event type:</b> ${event.type}</p>
			<p><b>Event target:</b> ${event.target.localName}</p>
			<p><b>Event target value:</b> <pre>${event.target.value}</pre></p>
		`;
		const dialog = document.createElement('dialog');
		const cleanup = function(evt) {
			dialog.removeEventListener('close', cleanup);
			dialog.remove();
		}

		dialog.id = 'btn-dialog';
		dialog.innerHTML = html;
		dialog.addEventListener('close', cleanup);
		document.body.append(dialog);
		dialog.showModal();
	}

	reset(event) {
		const attrs = CustomElement.observedAttributes;

		for (const attr of attrs) {
			// Convert kebab-case attribute name to camelCase property name
    	const prop = attr.replace(/-(.)/g, (match, letter) => letter.toUpperCase());
			// this.removeAttribute(prop);
			this[prop] = this.defaults[prop];
		}
	}

	resetForm(event) {
		window.abind?.update?.(this, 'name', this.defaults['name']);
		window.abind?.update?.(this, 'email', this.defaults['email']);
	}

	sendForm(event) {
		const form = event.target.localName === 'form' ? event.target : event.target.form;
		const formdata = new FormData(form);
		const data = [];
		const elem = document.createElement('form');

		for (const input of formdata) {
			data.push({ [input.shift()]: input.shift() });
		}

		const str = JSON.stringify(data, null, 2);
    elem.value = str;

    const fakeEvent = {
      type: 'submit',
      target: elem
    };

    this.notify(fakeEvent);
	}

	get text() { return this.#text }
	set text(value) {
		this.setAttribute("text", value);
	}

	get datalist() { return this.#datalist }
	set datalist(value) { this.setAttribute("datalist", value) }

	get datalistInput() { return this.#datalistInput }
	set datalistInput(value) { this.setAttribute('datalist-input', value); }

	get search() { return this.#search }
	set search(value) { this.setAttribute("search", value); }

	get password() { return this.#password}
	set password(value) { this.setAttribute("password", value); }

	get tel() { return this.#tel }
	set tel(value) { this.setAttribute("tel", value); }

	get url() { return this.#url }
	set url(value) { this.setAttribute("url", value); }

	get email() { return this.#email }
	set email(value) { this.setAttribute("email", value); }

	get number() { return this.#number }
	set number(value) { this.setAttribute("number", value); }

	get textarea() { return this.#textarea }
	set textarea(value) { this.setAttribute("textarea", value); }

	get date() { return this.#date }
	set date(value) { this.setAttribute("date", value); }

	get time() { return this.#time }
	set time(value) { this.setAttribute("time", value); }

	get dateTime() { return this.#dateTime }
	set dateTime(value) { this.setAttribute("date-time", value); }

	get week() { return this.#week }
	set week(value) { this.setAttribute("week", value); }

	get month() { return this.#month }
	set month(value) { this.setAttribute("month", value); }

	get select() { return this.#select }
	set select(value) { this.setAttribute("select", value); }

	get selectMulti() { return this.#selectMulti }
	set selectMulti(value) { this.setAttribute("select-multi", value); }

	get checkbox() { return this.#checkbox }
	set checkbox(value) { this.setAttribute('checkbox', value); }

	get radioGroup() { return this.#radioGroup }
	set radioGroup(value) { this.setAttribute('radio-group', value); }

	get button() { return this.#button }
	set button(value) { this.setAttribute('button', value); }

	get color() { return this.#color }
	set color(value) { this.setAttribute('color', value); }

	get range() { return this.#range }
	set range(value) { this.setAttribute('range', value); }

	get progress() { return this.#progress }
	set progress(value) { this.setAttribute('progress', value); }

	get meter() { return this.#meter }
	set meter(value) { this.setAttribute('meter', value); }

	get file() { return this.#file; }
	set file(value) {
		this.#file = value;
		if (window.abind) abind.update(this, 'file', value);
	}

	get name() { return this.#name }
	set name(value) { this.setAttribute('name', value); }

	get editable() {
		if (!this.#editable) return "";
		if (this.#editableFormatted) {
			return this.#editableFormatted;
		} else {
			this.#editableFormatted = this.#editable.replace(this.#editableRegex, "\n$1\n").trim();
			return this.#editableFormatted;
		}
	}

	set editable(value) {
		this.setAttribute('editable', value);
		// setTimeout(() => { this.#editableFormatted = null; });
	}
} // class

document.addEventListener('DOMContentLoaded', () => {
	if (!customElements.get('custom-element')) customElements.define('custom-element', CustomElement);
});
