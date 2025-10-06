export default class CustomElement extends HTMLElement {

	// Attributes

	_text;
	_datalist;
	_datalistInput;
	_search;
	_password;
	_tel;
	_url;
	_email;
	_number;
	_textarea;
	_date;
	_time;
	_dateTime;
	_week;
	_month;
	_select;
	_selectMulti;
	_checkboxFoo;
	_checkboxBar;
	_radioGroup;
	_button;
	_color;
	_range;
	_progress;
	_meter;
	_file;
	_name;
	_editable

	// Private

	#connected = false;

	/**
	 * For the contenteditable demo
	 */
	#editableFormatted;
	#editableRegex = /(<[^>]+>)(?=[^\r\n])/g;

	// Public

	/**
	 * Default values for all properties so I can reset the UI back to the original values.
	 * @type {Object}
	 */
	defaults = {
		text: "Initial Text",
		datalist: ['One', 'Two', 'Three'],
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
		select: "",
		selectMulti: 'foo, baz',
		checkboxFoo: 'foo',
		checkboxBar: 'foo',
		radioGroup: 'foo',
		button: "Click Me!",
		color: "_cd5c5c",
		range: '50',
		progress: '50',
		meter: '50',
		file: '" "',
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
		'checkbox-foo',
		'checkbox-bar',
		'radio-group',
		'button',
		'color',
		'range',
		'progress',
		'meter',
		'file',
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
    if (this._connected && newval === oldval) return;
    // if (newval === null) return;
    const prop = attr.replace(/-(\w)/g, (_, c) => c.toUpperCase());

    switch (attr) {
	    case 'text': this._text = newval; break;
			case 'datalist':
				let options = "";
				for (const option of this.datalistGenerator(newval)) options += option;
				newval = options;
				this._datalist = newval;
				break;
			case 'datalist-input': this._datalistInput = newval;
			case 'search': this._search = newval; break;
			case 'password': this._password = newval; break;
			case 'tel': this._tel = newval; break;
			case 'url': this._url = newval; break;
			case 'email': this._email = newval; break;
			case 'number': this._number = newval; break;
			case 'textarea': this._textarea = newval; break;
			case 'date': this._date = newval; break;
			case 'time': this._time = newval; break;
			case 'date-time': this._dateTime = newval; break;
			case 'week': this._week = newval; break;
			case 'month': this._month = newval; break;
			case 'select': this._select = newval; break;
			case 'select-multi': this._selectMulti = newval; break;
			case 'checkbox-foo': this._checkboxFoo = newval; break;
			case 'checkbox-bar': this._checkboxBar = newval; break;
			case 'radio-group': this._radioGroup = newval; break;
			case 'button': this._button = newval; break;
			case 'color': this._color = newval; break;
			case 'range': this._range = newval; break;
			case 'progress': this._progress = newval; break;
			case 'meter': this._meter = newval; break;
			case 'file': newval = JSON.parse(newval); this._file = newval; break;
			case 'name': this._name = newval; break;
			case 'editable': this._editable = newval; break;
    }

    if (window.abind) abind.update(this, prop, newval);
	}

	connectedCallback() {
		this.reset();
		this._connected = true;
	}

	*datalistGenerator(str) {
	  str = str.trim();
	  if (!str) return;

	  for (const option of str.split(/[,\s]+/)) {
	    if (option) yield `<option value="${option}"></option>`;
	  }
	}

	getFiles(fileList) {
		const list = [];
		for (const item of fileList) {
			const obj ={
				name: item.name,
				modified: item.lastModifiedDate,
				size: item.size,
				type: item.type
			};
			list.push(obj);
		}

		const str = '<pre>' + JSON.stringify(list, null, 2) + '</pre>';
		this.notify(str);
	}

	notify(value) {
		const html = `
			<form method="dialog">
				<button>X</button>
			</form>
			<p>The value is: ${value}</p>
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

	reset() {
		const attrs = CustomElement.observedAttributes;

		for (const attr of attrs) {
			// Convert kebab-case attribute name to camelCase property name
    	const prop = attr.replace(/-(.)/g, (match, letter) => letter.toUpperCase());
			this.removeAttribute(prop);
			this[prop] = this.defaults[prop];
		}
	}

	sendForm(form) {
		const ret = [];
		if (typeof form === 'string') {
			const formName = form;
			form = document.getElementById(form);
			if (!form) throw new Error(`${formName} is not a valid id for an existing form`);
		}

		const formdata = new FormData(form);
		for (const input of formdata) {
			ret.push({ [input.shift()]: input.shift()});
		}
		this.notify(JSON.stringify(ret, null, 2));
	}

	get text() { return this._text }
	set text(value) {
		this.setAttribute("text", value);
	}

	get datalist() { return this._datalist; }
	set datalist(value) {
		this.setAttribute("datalist", value);
	}

	get datalistInput() { return this._datalistInput }
	set datalistInput(value) {
		this.setAttribute('datalist-input', value);
	}

	get search() { return this._search }
	set search(value) {
		this.setAttribute("search", value);
	}

	get password() { return this._password}
	set password(value) {
		this.setAttribute("password", value);
	}

	get tel() { return this._tel }
	set tel(value) {
		this.setAttribute("tel", value);
	}

	get url() { return this._url }
	set url(value) {
		this.setAttribute("url", value);
	}

	get email() { return this._email }
	set email(value) {
		this.setAttribute("email", value);
	}

	get number() { return this._number }
	set number(value) {
		this.setAttribute("number", value);
	}

	get textarea() { return this._textarea }
	set textarea(value) {
		this.setAttribute("textarea", value);
	}

	get date() { return this._date }
	set date(value) {
		this.setAttribute("date", value);
	}

	get time() { return this._time }
	set time(value) {
		this.setAttribute("time", value);
	}

	get dateTime() { return this._dateTime }
	set dateTime(value) {
		this.setAttribute("date-time", value);
	}

	get week() { return this._week }
	set week(value) {
		this.setAttribute("week", value);
	}

	get month() { return this._month }
	set month(value) {
		this.setAttribute("month", value);
	}

	get select() { return this._select }
	set select(value) {
		this.setAttribute("select", value);
	}

	get selectMulti() { return this._selectMulti }
	set selectMulti(value) {
		this.setAttribute("select-multi", value);
	}

	get checkboxFoo() { return this._checkboxFoo }
	set checkboxFoo(value) {
		this.setAttribute('checkbox-foo', value);
	}

	get checkboxBar() { return this._checkboxBar }
	set checkboxBar(value) {
		this.setAttribute('checkbox-bar', value);
	}

	get radioGroup() { return this._radioGroup }
	set radioGroup(value) {
		this.setAttribute('radio-group', value);
	}

	get button() { return this._button }
	set button(value) {
		this.setAttribute('button', value);
	}

	get color() { return this._color }
	set color(value) {
		this.setAttribute('color', value);
	}

	get range() { return this._range }
	set range(value) {
		this.setAttribute('range', value);
	}

	get progress() { return this._progress }
	set progress(value) {
		this.setAttribute('progress', value);
	}

	get meter() { return this._meter }
	set meter(value) {
		this.setAttribute('meter', value);
	}

	get file() {
		// const filesArray = Array.from(this._file);
  	// const fileDetails = filesArray.map((file) => ({
    // 	name: file.name,
    // 	type: file.type,
    // 	size: file.size,
  	// }));
		return JSON.stringify(this._file);
		// return JSON.stringify(fileDetails, null, 2);
	}
	set file(fileList) {
		this.setAttribute('file', JSON.stringify(fileList));
	}

	get name() { return this._name }
	set name(value) {
		this.setAttribute('name', value);
	}

	get editable() {
		if (!this._editable) return "";
		if (this.#editableFormatted) {
			return this.#editableFormatted;
		} else {
			this.#editableFormatted = this._editable.replace(this.#editableRegex, "\n$1\n").trim();
			return this.#editableFormatted;
		}
	}

	set editable(value) {
		// if (value === this._editable) return;
		this.setAttribute('editable', value);
		setTimeout(() => { this.#editableFormatted = null; });
	}
} // class

document.addEventListener('DOMContentLoaded', () => {
	if (!customElements.get('custom-element')) customElements.define('custom-element', CustomElement);
});
