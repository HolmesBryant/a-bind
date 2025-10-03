function testObject() {
	return {
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
			color: "#cd5c5c",
			range: '50',
			progress: '50',
			meter: '50',
			file: '" "',
			name: 'My Name',
			editable: "<p>Eiusmod magna eiusmod anim ut nostrud anim ullamco quis in consequat eu exercitation laboris culpa laboris.</p>"
		},

		buildDatalist: function(options) {
			if (!options) return null;
			let html = "";
			for (const option of options) {
				html += `<option value="${option}"></option>`;
			}
			return html;
		},

		reset: function() {
			const props = Object.keys(this.defaults);

			for (const prop of props) {
				this[prop] = this.defaults[prop];
			}
		},

		getFiles: function(fileList) {
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
		},

		notify: function(value) {
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
		},

		sendForm: function(form) {
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
		},

		get text() { return this._text },

		set text(value) {
			this._text = value;
			if (window.abind) abind.update(this, 'text', value);
		},

		get datalist() {
			return this.buildDatalist(this._datalist);
		},

		set datalist(value) {
			if (value === this._datalist) return;
			value = Array.isArray(value) ? value : value.split(/[,\s]+/);
			this._datalist = value;
			if (window.abind) abind.update(this, 'datalist', value);
		},

		get search() { return this._search },

		set search(value) {
			this._search = value;
			if (window.abind) abind.update(this, 'search', value);
		},

		get password() { return this._password},

		set password(value) {
			this._password = value;
			if (window.abind) abind.update(this, 'password', value);
		},

		get tel() { return this._tel },

		set tel(value) {
			this._tel = value;
			if (window.abind) abind.update(this, 'tel', value);
		},

		get url() { return this._url },

		set url(value) {
			this._url = value;
			if (window.abind) abind.update(this, 'url', value);
		},

		get email() { return this._email },

		set email(value) {
			this._email = value;
			if (window.abind) abind.update(this, 'email', value);
		},

		get number() { return this._number },

		set number(value) {
			this._number = value;
			if (window.abind) abind.update(this, 'number', value);
		},

		get textarea() { return this._textarea },

		set textarea(value) {
			this._textarea = value;
			if (window.abind) abind.update(this, 'textarea', value);
		},

		get date() { return this._date },

		set date(value) {
			this._date = value;
			if (window.abind) abind.update(this, 'date', value);
		},

		get time() { return this._time },

		set time(value) {
			this._time = value;
			if (window.abind) abind.update(this, 'time', value);
		},

		get dateTime() { return this._dateTime },

		set dateTime(value) {
			this._dateTime = value;
			if (window.abind) abind.update(this, 'dateTime', value);
		},

		get week() { return this._week },

		set week(value) {
			this._week = value;
			if (window.abind) abind.update(this, 'week', value);
		},

		get month() { return this._month },

		set month(value) {
			this._month = value;
			if (window.abind) abind.update(this, 'month', value);
		},

		get select() { return this._select },

		set select(value) {
			this._select = value;
			if (window.abind) abind.update(this, 'select', value);
		},

		get selectMulti() { return this._selectMulti },

		set selectMulti(value) {
			if (value === null) return;
			value = Array.isArray(value) ? value : value.split(/[,\s]+/);
			this._selectMulti = value;
			if (window.abind) abind.update(this, 'selectMulti', value);
		},

		get checkboxFoo() { return this._checkboxFoo },

		set checkboxFoo(value) {
			this._checkboxFoo = value;
			if (window.abind) abind.update(this, 'checkboxFoo', value);
		},

		get checkboxBar() { return this._checkboxBar },

		set checkboxBar(value) {
			this._checkboxBar = value;
			if (window.abind) abind.update(this, 'checkboxBar', value);
		},

		get radioGroup() { return this._radioGroup },

		set radioGroup(value) {
			this._radioGroup = value;
			if (window.abind) abind.update(this, 'radioGroup', value);
		},

		get button() { return this._button },

		set button(value) {
			this._button = value;
			if (window.abind) abind.update(this, 'button', value);
		},

		get color() { return this._color },

		set color(value) {
			this._color = value;
			if (window.abind) abind.update(this, 'color', value);
		},

		get range() { return this._range },

		set range(value) {
			this._range = value;
			if (window.abind) abind.update(this, 'range', value);
		},

		get progress() { return this._progress },

		set progress(value) {
			value = parseFloat(value);
			this._progress = value;
			if (window.abind) abind.update(this, 'progress', value);
		},

		get meter() { return this._meter },

		set meter(value) {
			this._meter = parseFloat(value);
			if (window.abind) abind.update(this, 'meter', value);
		},

		get file() {
			const filesArray = Array.from(this._file);
	  	const fileDetails = filesArray.map((file) => ({
	    	name: file.name,
	    	type: file.type,
	    	size: file.size,
	  	}));
			return JSON.stringify(fileDetails, null, 2);
		},

		set file(fileList) {
			this._file = fileList;
			if (window.abind) abind.update(this, 'file', this._file);
		},

		get name() { return this._name },

		set name(value) {
			this._name = value;
			if (window.abind) abind.update(this, 'name', value);
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
			if (window.abind) abind.update(this, 'editable', this.editable);
		}
	} // return
} // function

var testObj = testObject();
testObj.reset();
