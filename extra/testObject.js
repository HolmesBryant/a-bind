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
	checkboxBool: false,
	_checkboxArr: ['foo', 'baz'],
	radioGroup: 'foo',
	button: "initial property value",
	color: "#cd5c5c",
	range: 50,
	progress: 50,
	file: undefined,
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
			prop: 'text',
			inputId: 'o-inputtext',
			model: 'mod:testObject',
			newval: 'New Value',
			template: 'tmpl-section',
			control: [{
				template: 'tmpl-basic',
				label: 'input type="text"',
				inputType: 'text',
				inputId: 'o-inputtext',
				prop: 'text',
				elemProp: 'value'
			}],
			outputCode: `
				<a-bind
					pull
					model="testObject"
					prop="text">

					<output></output>
				</a-bind>`,
			inputCode: `
				<a-bind
					model="testObject"
					prop="text">

					<input type="text">
				</a-bind>`,
		},
		{
			prop: 'date',
			inputId: 'o-inputdate',
			model: 'mod:testObject',
			newval: '1215-06-15',
			template: 'tmpl-section',
			control: [{
				template: 'tmpl-basic',
				label: 'input type="date"',
				inputType: 'date',
				inputId: 'o-inputdate',
				prop: 'date',
				elemProp: 'value'
			}],
			outputCode: `
				<a-bind
					pull
					model="testObject"
					prop="date">

					<output></output>
				</a-bind>`,
			inputCode: `
				<a-bind
					model="testObject"
					prop="date">

					<input type="date">
				</a-bind>`,
		},
		{
			prop: 'color',
			inputId: 'o-inputcolor',
			model: 'mod:testObject',
			newval: '#049f9d',
			template: 'tmpl-section',
			control: [{
				template: 'tmpl-color',
				label: 'input type="color"',
				inputType: 'color',
				inputId: 'o-inputcolor',
				prop: 'color',
				elemProp: 'value'
			}],
			outputCode: `
				<a-bind
					pull
					model="testObject"
					prop="color">

					<output></output>
				</a-bind>`,
			inputCode: `
				<a-bind
					model="testObject"
					prop="color">

					<input type="color">
				</a-bind>`,
		},
		{
			prop: 'selected',
			inputId: 'o-select',
			model: 'mod:testObject',
			newval: 'baz',
			template: 'tmpl-section',
			control: [{
				template: 'tmpl-select',
				label: 'select',
				inputId: 'o-select',
				prop: 'selected',
				options: 'optionsA'
			}],
			outputCode: `
				<a-bind
					pull
					model="testObject"
					prop="selected">

					<output></output>
				</a-bind>`,
			inputCode: `
				<a-bind
					model="testObject"
					prop="text">

					<select>
						<option
							value="foo">
								Foo!
							</option>
						<option
							value="bar">
							Bar!
						</option>
						<option
							value="baz">
							Baz
						</option>
					</select>
				</a-bind>`,
		},
		{
			prop: 'selectMulti',
			inputId: 'o-select-multi',
			model: 'mod:testObject',
			template: 'tmpl-section',
			newval: 'bar, baz',
			control: [{
				template: 'tmpl-select-multi',
				label: 'select multiple',
				inputId: 'o-select-multi',
				prop: 'selectMulti',
				options: 'optionsA'
			}],
			outputCode: `
				<a-bind
					pull
					model="testObject"
					prop="selectMulti">

					<output></output>
				</a-bind>`,
			inputCode: `
				<a-bind
					model="testObject"
					prop="selectMulti">

					<select multiple>
						<option
							value="foo">
							Foo!
						</option>
						<option
							value="bar">
							Bar!
						</option>
						<option
							value="baz">
							Baz
						</option>
					</select>
				</a-bind>`,
		},
		{
			prop: 'checkbox',
			inputId: 'o-checkbox',
			model: 'mod:testObject',
			newval: 'bar',
			template: 'tmpl-section',
			control: [{
				template: 'tmpl-basic',
				label: 'checkbox value = "foo"',
				inputType: 'checkbox',
				inputId: 'o-checkbox',
				inputValue: 'foo',
				elemProp: 'value',
				prop: 'checkbox',
			}],
			outputCode: `
				<a-bind
					pull
					model="testObject"
					prop="checkbox">

					<output></output>
				</a-bind>`,
			inputCode: `
				<a-bind
					model="testObject"
					prop="checkbox">

					<input
						type="checkbox"
						value="foo">
				</a-bind>`,
		},
		{
			model: 'mod:testObject',
			prop: 'checkboxBool',
			newval: true,
			template: 'tmpl-section',
			inputId: 'o-checkbox-bool',
			control: [{
				template: 'tmpl-checkbox',
				label: 'checkbox (no value)',
				inputType: 'checkbox',
				inputId: 'o-checkbox-bool',
				inputValue: 'false',
				prop: 'checkboxBool',
				elemProp: 'checked'
			}],
			outputCode: `
			<a-bind
				pull
				model="testObject"
				prop="checkboxBool">

				<output></output>
			</a-bind>`,
			inputCode: `
			<a-bind
				prop="checkboxBool"
				elem-prop="checked">

				<input
					type="checkbox">
			</a-bind>`,
		},
		{
			prop: 'checkboxArr',
			idx: '1',
			inputId: 'input-arr',
			model: 'mod:testObject',
			newval: 'bar',
			template: 'tmpl-section',
			control: [{
				template: 'tmpl-input-arr',
				label: 'checkboxes bound to array',
				inputType: 'checkbox',
				prop: 'checkboxArr',
			}],
			outputCode: `
			<a-bind
				pull
				prop="checkboxArr">

				<output></output>
			</a-bind>
				`,
			inputCode: `
      <a-bind
      	prop="checkboxArr">

        <input
        	type="checkbox"
        	name="check-foo"
        	value="foo">
      </a-bind>

      <a-bind
      	prop="checkboxArr">

        <input
        	type="checkbox"
        	name="check-bar"
        	value="bar">
      </a-bind>

      <a-bind
      	prop="checkboxArr">

        <input
        	type="checkbox"
        	name="check-baz"
        	value="baz">
      </a-bind>
			`,
		},
		{
			prop: 'radioGroup',
			idx: '2',
			inputId: 'input-radiogroup',
			model: 'mod:testObject',
			newval: 'bar',
			template: 'tmpl-section',
			control: [{
				template: 'tmpl-input-arr',
				label: 'radio group',
				inputType: 'radio',
				prop: 'radioGroup',
			}],
			outputCode: `
			<a-bind
				pull
				prop="radioGroup">

				<output></output>
			</a-bind>
				`,
			inputCode: `
			<a-bind
				prop="radioGroup">

				<input
					type="radio"
					name="radio-group"
					value="foo">
			</a-bind>

			<a-bind
				prop="radioGroup">

				<input
					name="radio-group"
					type="radio"
					value="bar">
			</a-bind>

			<a-bind prop="radioGroup">
				<input
					name="radio-group"
					type="radio"
					value="baz">
			</a-bind>
				`,
		},
		{
			prop: 'button',
			inputId: 'input-button-1',
			model: 'mod:testObject',
			newval: 'New Property Value',
			template: 'tmpl-section',
			control: [{
				template: 'tmpl-button',
				label: 'button text mirrors property value',
				inputId: 'input-button-1',
				prop: 'button',
				inputValue: 'button value',
				elemProp: 'textContent'
			}],
			outputCode: `
			<a-bind
				pull
				prop="button">

				<output></output>
			</a-bind>

			<a-bind
				push
				prop="button"
				event="click">

				<button value="Another New Property Value">
					Set to "Another New Property Value"
				</button>
			</a-bind>
			`,
			inputCode: `
			<a-bind
				prop="button"
				elem-prop="textContent"
				event="click"
				func="notify">

				<button
					value="button value"></button>
			</a-bind>
			`,
		},
		{
			prop: 'button',
			inputId: 'input-button-2',
			model: 'mod:testObject',
			newval: 'Another New Property Value',
			template: 'tmpl-section',
			control: [{
				template: 'tmpl-button',
				label: "button text doesn't mirror property value",
				inputId: 'input-button-2',
				prop: 'button',
				inputValue: 'button value',
				elemProp: 'value'
			}],
			outputCode: `
			<a-bind
				pull
				prop="button">

				<output></output>
			</a-bind>

			<a-bind
				push
				prop="button"
				event="click">

				<button
					value="Another New Property Value">
					Set to "Another New Property Value"
				</button>
			</a-bind>
			`,
			inputCode: `
			<a-bind
				prop="button"
				elem-prop="textContent"
				event="click"
				func="notify">

				<button
					value="button value">
				</button>
			</a-bind>
			`,
		},
		{
			prop: 'range',
			model: 'mod:testObject',
			newval: '80',
			inputId: 'o-inputrange',
			template: 'tmpl-section',
			control: [{
				template: 'tmpl-basic',
				label: 'input type="range"',
				inputType: 'range',
				inputId: 'o-inputrange',
				prop: 'range',
				elemProp: 'value'
			}],
			outputCode: `
			<a-bind
				pull
				prop="range">

				<output></output>
			</a-bind>

			<a-bind
				push
				prop="range"
				event="click">

				<button
					value="80">
					Set to "80"
				</button>
			</a-bind>
			`,
			inputCode: ``,
		},
		{
			prop: 'progress',
			inputId: 'o-inputprogress',
			model: 'mod:testObject',
			newval: '80',
			template: 'tmpl-section',
			control: [{
				template: 'tmpl-progress',
				label: 'progress',
				inputId: 'o-inputprogress',
				prop: 'progress',
			}],
			outputCode: ``,
			inputCode: ``,
		},
		{
			prop: 'none',
			inputId: 'o-inputfile',
			model: 'mod:testObject',
			newval: '',
			template: 'tmpl-section',
			control: [{
				template: 'tmpl-file',
				label: 'input type="file"',
				inputType: 'file',
				inputId: 'o-inputfile',
				elemProp: 'files'
			}],
			outputCode: `
			N/A
			`,
			inputCode: `
			<a-bind
				push
				event="change"
				func="fileInfo">

				<input
					type="file"
					multiple>
			</a-bind>
			`,
		},
	],

	fileInfo(event) {
    const fileList = event.target.files;
    this.file = fileList;
    const list = [];
    const elem = document.createElement('input');
    elem.type="hidden";

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

	/*grabCode(event) {
		const elem = event.target.closest('details');
    const outputCodeContainer = elem.querySelector('.output-code');
    const inputCodeContainer = elem.querySelector('.input-code');
    if (outputCodeContainer.textContent.length > 1) return;

    const output = elem.parentElement.querySelector('.output');
    const input = elem.parentElement.querySelector('.input');

    if (output) {
    	const outputClone = output.cloneNode(true);
    	const bind = outputClone.querySelector('a-bind');
      const outputElem = outputClone.querySelector('output');
    	outputClone.removeAttribute('class');
      outputElem.removeAttribute('for');
      bind.setAttribute('model', 'testObject');
      outputElem.textContent = '';
      outputCodeContainer.textContent = this.formatCode(outputClone);
    }

    if (input) {
    	const inputClone = input.cloneNode(true);
      inputClone.removeAttribute('class');
      for ( const child of inputClone.children) {
      	if (child.value !== 'foo') child.removeAttribute('value');
      	child.removeAttribute('class');
      }
      if (inputClone.localName === 'a-bind') {
        inputClone.setAttribute('model', 'testObject');
      } else {
        const repeater = inputClone.querySelector('a-repeat');
        if (repeater) {
          repeater.removeAttribute('scope');
          repeater.setAttribute('model', this.localName);
        }
      }
      const datalist = inputClone.querySelector('datalist');
      if (datalist) datalist.textContent = '';
      inputCodeContainer.textContent = this.formatCode(inputClone);
    }
  },*/

  /*formatCode(node, level = 0) {
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
  },*/

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
