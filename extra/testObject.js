/**
 * @file extra/testObject.js
 */
const DEFAULTS = {
	text: "Initial Text",
	email: "name@email.com",
	number: 12345,
	textarea: "Initial content.",
	date: "1914-12-25",
	selected: "bar",
	selectMulti: 'foo, baz',
	checkbox: 'foo',
	checkboxBool: undefined,
	radioGroup: 'foo',
	button: "Click Me!",
	color: "#cd5c5c",
	range: 50,
	progress: 50,
	// meter: 50,
	file: null,
	name: "My Name",
	editable: "<p>Eiusmod magna eiusmod anim ut nostrud anim ullamco quis in consequat eu exercitation laboris culpa laboris.</p>",
};

const testObject = {
	text: "Initial Text",
	email: "name@email.com",
	number: 12345,
	textarea: "Initial content.",
	date: "1914-12-25",
	selected: "bar",
	selectMulti: 'foo, baz',
	checkbox: 'foo',
	checkboxBool: undefined,
	_checkboxArr: ['foo', 'baz'],
	radioGroup: 'foo',
	button: "Click Me!",
	color: "#cd5c5c",
	range: 50,
	progress: 50,
	file: null,
	name: "My Name",
	editable: "<p>Eiusmod magna eiusmod anim ut nostrud anim ullamco quis in consequat eu exercitation laboris culpa laboris.</p>",

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
			model: 'mod:testObject',
			prop: 'text',
			template: 'tmpl-section',
			newval: 'New Value',
			control: [{
				template: 'tmpl-basic',
				inputType: 'text',
				inputId: 'o-inputtext',
				prop: 'text',
				elemProp: 'value'
			}]
		},
		{
			inputType: 'date',
			inputId: 'o-inputdate',
			label: 'input type="date"',
			model: 'mod:testObject',
			prop: 'date',
			template: 'tmpl-section',
			newval: '1215-06-15',
			control: [{
				template: 'tmpl-basic',
				inputType: 'date',
				inputId: 'o-inputdate',
				prop: 'date',
				elemProp: 'value'
			}]
		},
		{
			inputId: 'o-select',
			label: 'select',
			model: 'mod:testObject',
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
			model: 'mod:testObject',
			prop: 'selectMulti',
			template: 'tmpl-section',
			newval: 'bar, baz',
			control: [{
				template: 'tmpl-select-multi',
				inputId: 'o-select-multi',
				prop: 'selectMulti',
				options: 'optionsA'
			}]
		},
		{
			inputId: 'o-checkbox',
			label: 'checkbox value = "foo"',
			model: 'mod:testObject',
			prop: 'checkbox',
			newval: 'bar',
			template: 'tmpl-section',
			control: [{
				template: 'tmpl-basic',
				inputType: 'checkbox',
				inputId: 'o-checkbox',
				inputValue: 'foo',
				elemProp: 'value',
				prop: 'checkbox',
			}]
		},
		{
			inputId: 'o-checkbox-bool',
			label: 'checkbox (no value)',
			model: 'mod:testObject',
			prop: 'checkboxBool',
			newval: true,
			template: 'tmpl-section',
			control: [{
				template: 'tmpl-checkbox',
				inputType: 'checkbox',
				inputId: 'o-checkbox-bool',
				inputValue: 'false',
				prop: 'checkboxBool',
				elemProp: 'checked'
			}]
		},
		{
			inputId: 'o-checkbox-arr',
			label: 'checkboxes bound to array',
			model: 'mod:testObject',
			prop: 'checkboxArr',
			newval: 'bar',
			template: 'tmpl-section',
			control: [{
				template: 'tmpl-checkbox-arr',
				inputType: 'checkbox',
				prop: 'checkboxArr',
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

	get checkboxArr() { return this._checkboxArr },

	set checkboxArr(value) {
		if (Array.isArray(value)) {
			this._checkboxArr = value;
		} else {
			this._checkboxArr = value.split(',')
		}
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

export default testObject;
