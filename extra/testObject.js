export const testObject = {
	_text: null,
	_datalist: null,
	_search: null,
	_password: null,
	_tel: null,
	_url: null,
	_email: null,
	_number: null,
	_textarea: null,
	_date: null,
	_time: null,
	_dateTime: null,
	_week: null,
	_month: null,
	_select: null,
	_selectMulti: null,
	_checkboxFoo: null,
	_checkboxBar: null,
	_radioGroup: null,
	_button: null,
	_color: null,
	_range: null,
	_progress: null,
	_meter: null,
	_file: null,
	_name: null,
	_editable: null,
	_editableFormatted: "",
	_editableRegex: /(<[^>]+>)(?=[^\r\n])/g,

	defaults: {
		text: "Initial Text",
		datalist: 'One, Two, Three',
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
		color: "#cd5c5c",
		range: '50',
		progress: '50',
		meter: '50',
		file: null,
		name: 'My Name',
		editable: "<p>Eiusmod magna eiusmod anim ut nostrud anim ullamco quis in consequat eu exercitation laboris culpa laboris.</p>"
	},

	*datalistGenerator(arr) {
	  if (!arr) return;

	  for (const option of arr) {
	    if (option) yield `<option value="${option}"></option>`;
	  }
	},

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
	},

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
	},

	reset(event) {
		const props = Object.keys(this.defaults);

		for (const prop of props) {
			this[prop] = this.defaults[prop];
		}
	},

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
	},

	get text() { return this._text },

	set text(value) {
		this._text = value;
		window.abind?.update?.(this, 'text', value);
	},

	get datalist() {
		return this._datalist;
	},

	set datalist(value) {
		this._datalist = value.split(',')
		.map(item => `<option>${item}</option>`)
		.join("\n");

		window.abind?.update?.Defer(this, 'datalist');
	},

	get search() { return this._search },

	set search(value) {
		this._search = value;
		window.abind?.update?.(this, 'search', value);
	},

	get password() { return this._password},

	set password(value) {
		this._password = value;
		window.abind?.update?.(this, 'password', value);
	},

	get tel() { return this._tel },

	set tel(value) {
		this._tel = value;
		window.abind?.update?.(this, 'tel', value);
	},

	get url() { return this._url },

	set url(value) {
		this._url = value;
		window.abind?.update?.(this, 'url', value);
	},

	get email() { return this._email },

	set email(value) {
		this._email = value;
		window.abind?.update?.(this, 'email', value);
	},

	get number() { return this._number },

	set number(value) {
		this._number = value;
		window.abind?.update?.(this, 'number', value);
	},

	get textarea() { return this._textarea },

	set textarea(value) {
		this._textarea = value;
		window.abind?.update?.(this, 'textarea', value);
	},

	get date() { return this._date },

	set date(value) {
		this._date = value;
		window.abind?.update?.(this, 'date', value);
	},

	get time() { return this._time },

	set time(value) {
		this._time = value;
		window.abind?.update?.(this, 'time', value);
	},

	get dateTime() { return this._dateTime },

	set dateTime(value) {
		this._dateTime = value;
		window.abind?.update?.(this, 'dateTime', value);
	},

	get week() { return this._week },

	set week(value) {
		this._week = value;
		window.abind?.update?.(this, 'week', value);
	},

	get month() { return this._month },

	set month(value) {
		this._month = value;
		window.abind?.update?.(this, 'month', value);
	},

	get select() { return this._select },

	set select(value) {
		this._select = value;
		window.abind?.update?.(this, 'select', value);
	},

	get selectMulti() { return this._selectMulti },

	set selectMulti(value) {
		if (value === null) return;
		value = Array.isArray(value) ? value : value.split(/[,\s]+/);
		this._selectMulti = value;
		window.abind?.update?.(this, 'selectMulti', value);
	},

	get checkboxFoo() { return this._checkboxFoo },

	set checkboxFoo(value) {
		this._checkboxFoo = value;
		window.abind?.update?.(this, 'checkboxFoo', value);
	},

	get checkboxBar() { return this._checkboxBar },

	set checkboxBar(value) {
		this._checkboxBar = value;
		window.abind?.update?.(this, 'checkboxBar', value);
	},

	get radioGroup() { return this._radioGroup },

	set radioGroup(value) {
		this._radioGroup = value;
		window.abind?.update?.(this, 'radioGroup', value);
	},

	get button() { return this._button },

	set button(value) {
		this._button = value;
		window.abind?.update?.(this, 'button', value);
	},

	get color() { return this._color },

	set color(value) {
		this._color = value;
		window.abind?.update?.(this, 'color', value);
	},

	get range() { return this._range },

	set range(value) {
		this._range = value;
		window.abind?.update?.(this, 'range', value);
	},

	get progress() { return this._progress },

	set progress(value) {
		value = parseFloat(value);
		this._progress = value;
		window.abind?.update?.(this, 'progress', value);
	},

	get meter() { return this._meter },

	set meter(value) {
		this._meter = parseFloat(value);
		window.abind?.update?.(this, 'meter', value);
	},

	get file() { return this._file; },

	set file(fileList) {
		this._file = fileList;
		window.abind?.update?.(this, 'file', this._file);
	},

	get name() { return this._name },

	set name(value) {
		this._name = value;
		window.abind?.update?.(this, 'name', value);
	},

	get editable() {
		if (!this._editable) return "";

		if (this._editableFormatted) {
			return this._editableFormatted;
		} else {
			this._editableFormatted = this._editable
			.replace(this._editableRegex, "\n$1\n")
			.replace(/div/g, 'p')
			.trim();
			return this._editableFormatted;
		}
	},

	set editable(value) {
		if (value === this._editable) return;
		this._editable = value;
		setTimeout(() => { this._editableFormatted = null; });
		window.abind?.update?.(this, 'editable', this.editable);
	}
}
