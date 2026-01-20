import ABind, { loader } from '../src/index.js';

const DEFAULTS = {
	text: "Initial Text",
	datalist: 'One, Two, Three',
	search: "Search Term",
	password: "password",
	tel: "123-456-7890",
	url: "https://url.com",
	email: "name@email.com",
	number: 12345,
	textarea: "Initial content.",
	date: "1914-12-25",
	time: "00:00",
	dateTime: "1914-12-24T10:00",
	week: "1970-W01",
	month: "1970-01",
	select: "",
	selectMulti: 'foo, baz',
	checkboxFoo: 'foo',
	checkboxBool: undefined,
	radioGroup: 'foo',
	button: "Click Me!",
	color: "#cd5c5c",
	range: '50',
	progress: '50',
	meter: '50',
	file: null,
	name: 'My Name',
	editable: "<p>Eiusmod magna eiusmod anim ut nostrud anim ullamco quis in consequat eu exercitation laboris culpa laboris.</p>"
};

const testObject = {
	_text: "Initial Text",
	_datalist: 'One, Two, Three',
	_datalistHtml: '<option>One</option><option>Two</option><option>Three</option>',
	_search: "Search Term",
	_password: "password",
	_tel: "123-456-7890",
	_url: "https://url.com",
	_email: "name@email.com",
	_number: 12345,
	_textarea: "Initial content.",
	_date: "1914-12-25",
	_time: "00:00",
	_dateTime: "1914-12-24T10:00",
	_week: "1970-W01",
	_month: "1970-01",
	_selected: "bar",
	_selectMulti: 'foo, baz',
	_checkboxFoo: 'foo',
	_checkboxBool: undefined,
	_radioGroup: 'foo',
	_button: "Click Me!",
	_color: "#cd5c5c",
	_range: 50,
	_progress: 50,
	_meter: 50,
	_file: null,
	_name: "My Name",
	_editable: "<p>Eiusmod magna eiusmod anim ut nostrud anim ullamco quis in consequat eu exercitation laboris culpa laboris.</p>",
	_editableFormatted: "",
	_editableRegex: /(<[^>]+>)(?=[^\r\n])/g,

	optionsA: [
		{value: 'foo', label: 'Foo!'},
		{value: 'bar', label: 'Bar!'},
		{value: 'baz', label: 'Baz!'}
	],

	optionsB: 'foo, bar, baz',

	sections: [
		{
			inputType: 'text',
			inputId: 'o-inputtext',
			label: 'input type="text"',
			model: 'testObject',
			prop: 'text',
			template: 'tmpl-section',
			newval: 'New Value',
			control: [{
				template: 'tmpl-basic',
				inputType: 'text',
				inputId: 'o-inputtext',
				prop: 'text'
			}]
		},
		{
			inputType: 'date',
			inputId: 'o-inputdate',
			label: 'input type="date"',
			model: 'testObject',
			prop: 'date',
			template: 'tmpl-section',
			newval: '1215-06-15',
			control: [{
				template: 'tmpl-basic',
				inputType: 'date',
				inputId: 'o-inputdate',
				prop: 'date'
			}]
		},
		{
			inputId: 'o-select',
			label: 'select',
			model: 'testObject',
			prop: 'selected',
			newval: 'baz',
			template: 'tmpl-section',
			control: [{
				template: 'tmpl-select',
				inputId: 'o-select',
				prop: 'selected',
				options: 'optionsA'
			}]
		},
		{
			inputId: 'o-select-multi',
			label: 'select multiple',
			model: 'testObject',
			prop: 'selectMulti',
			template: 'tmpl-section',
			newval: 'bar, baz',
			control: [{
				template: 'tmpl-select-multi',
				inputId: 'o-select-multi',
				prop: 'selectMulti',
				options: 'optionsA'
			}]
		}
	],

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

	grabCode(event) {
		const elem = event.target.closest('details');
    const outputCodeContainer = elem.querySelector('.output-code');
    const inputCodeContainer = elem.querySelector('.input-code');
    if (outputCodeContainer.textContent.length > 1) return;

    const output = elem.parentElement.querySelector('.output');
    const input = elem.parentElement.querySelector('.input');

    if (output) {
      const outputElem = output.querySelector('output');
      outputElem.removeAttribute('class');
      outputElem.removeAttribute('id');
      outputElem.removeAttribute('for');
      output.setAttribute('model', 'testObject');
      outputElem.textContent = '';
      outputCodeContainer.textContent = this.formatCode(output);
    }

    if (input) {
      input.removeAttribute('class');
      for ( const child of input.children) child.removeAttribute('value');
      if (input.localName === 'a-bind') {
        input.setAttribute('model', 'testObject');
      } else {
        const repeater = input.querySelector('a-repeat');
        if (repeater) {
          repeater.removeAttribute('scope');
          repeater.setAttribute('model', this.localName);
        }
      }
      const datalist = input.querySelector('datalist');
      if (datalist) datalist.textContent = '';
      inputCodeContainer.textContent = this.formatCode(input);
    }
  },

  formatCode(node, level = 0) {
    const indent = "  ".repeat(level);
    const attrIndent = "  ".repeat(level + 1);
    const voidElements = ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'];

    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent.trim();
      return text ? `${indent}${text}\n` : "";
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const tagName = node.tagName.toLowerCase();
      const attrs = Array.from(node.attributes);
      const isVoid = voidElements.includes(tagName);

      let result = `${indent}<${tagName}`;

      // Handle Attributes
      if (attrs.length > 0) {
        result += "\n"; // Start attributes on new line
        attrs.forEach((attr, index) => {
          const isLast = index === attrs.length - 1;
          result += `${attrIndent}${attr.name}="${attr.value}"`;

          if (isLast) {
            result += isVoid ? " />\n" : ">\n";
          } else {
            result += "\n";
          }
        });
      } else {
        // No attributes: Close the tag on the same line
        result += isVoid ? " />\n" : ">\n";
      }

      // Handle Children/Content
      if (!isVoid) {
        const children = (tagName === 'template')
          ? node.content.childNodes
          : node.childNodes;

        for (const child of children) {
          result += this.formatCode(child, level + 1);
        }

        result += `${indent}</${tagName}>\n`;
      }

      return result;
    }

    if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
      let result = "";
      for (const child of node.childNodes) {
        result += this.formatCode(child, level);
      }
      return result;
    }

    return "";
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
		const props = DEFAULTS;

		for (const prop in props) {
			this[prop] = DEFAULTS[prop];
		}
	},

	resetForm(event) {
		ABind?.update?.(this, 'name', DEFAULTS['name']);
		ABind?.update?.(this, 'email', DEFAULTS['email']);
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
		// ABind.update(this, 'text', value);
	},

	get search() { return this._search },
	set search(value) {
		this._search = value;
		// ABind?.update?.(this, 'search', value);
	},

	get password() { return this._password},
	set password(value) {
		this._password = value;
		// ABind?.update?.(this, 'password', value);
	},

	get tel() { return this._tel },
	set tel(value) {
		this._tel = value;
		// ABind?.update?.(this, 'tel', value);
	},

	get url() { return this._url },
	set url(value) {
		this._url = value;
		// ABind?.update?.(this, 'url', value);
	},

	get email() { return this._email },
	set email(value) {
		this._email = value;
		// ABind?.update?.(this, 'email', value);
	},

	get number() { return this._number },
	set number(value) {
		this._number = value;
		// ABind?.update?.(this, 'number', value);
	},

	get textarea() { return this._textarea },
	set textarea(value) {
		this._textarea = value;
		// ABind?.update?.(this, 'textarea', value);
	},

	get date() { return this._date },
	set date(value) {
		this._date = value;
		// ABind?.update?.(this, 'date', value);
	},

	get time() { return this._time },
	set time(value) {
		this._time = value;
		// ABind?.update?.(this, 'time', value);
	},

	get dateTime() { return this._dateTime },
	set dateTime(value) {
		this._dateTime = value;
		// ABind?.update?.(this, 'dateTime', value);
	},

	get week() { return this._week },
	set week(value) {
		this._week = value;
		// ABind?.update?.(this, 'week', value);
	},

	get month() { return this._month },
	set month(value) {
		this._month = value;
		// ABind?.update?.(this, 'month', value);
	},

	get selected() { return this._selected },
	set selected(value) {
		this._selected = value;
		// ABind?.update?.(this, 'selected', value);
	},

	get selectMulti() { return this._selectMulti },
	set selectMulti(value) {
		this._selectMulti = value;
		// ABind?.update?.(this, 'selectMulti', value);
	},

	get checkboxFoo() { return this._checkboxFoo },
	set checkboxFoo(value) {
		this._checkboxFoo = value;
		// ABind?.update?.(this, 'checkboxFoo', value);
	},

	get checkboxBool() { return this._checkboxBool },
	set checkboxBool(value) {
		this._checkboxBool = value !== false;
		// ABind?.update?.(this, 'checkboxBool', value);
	},

	get radioGroup() { return this._radioGroup },
	set radioGroup(value) {
		this._radioGroup = value;
		// ABind?.update?.(this, 'radioGroup', value);
	},

	get button() { return this._button },
	set button(value) {
		this._button = value;
		// ABind?.update?.(this, 'button', value);
	},

	get color() { return this._color },
	set color(value) {
		this._color = value;
		// ABind?.update?.(this, 'color', value);
	},

	get range() { return this._range },
	set range(value) {
		this._range = value;
		// ABind?.update?.(this, 'range', value);
	},

	get progress() { return this._progress },
	set progress(value) {
		this._progress = value;
		// ABind?.update?.(this, 'progress', value);
	},

	get meter() { return this._meter },
	set meter(value) {
		this._meter = value;
		// ABind?.update?.(this, 'meter', value);
	},

	get file() { return this._file; },
	set file(value) {
		this._file = value;
		// if (ABind) abind.update(this, 'file', value);
	},

	get name() { return this._name },
	set name(value) {
		this._name = value;
		// ABind?.update?.(this, 'name', value);
	},

	get editable() {
		if (!this._editable) return "";
		if (this._editableFormatted) {
			return this._editableFormatted;
		} else {
			this._editableFormatted = this._editable.replace(this._editableRegex, "\n$1\n").trim();
			return this._editableFormatted;
		}
	},
	set editable(value) {
		this._editable = value;
	}
} // object

loader.define('testObject', testObject);
export default testObject;
