import ABind from '../src/index.js';

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
	listInput:"",
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
	files: undefined,
	name: "My Name",
	editable: "<p>Eiusmod magna eiusmod anim ut nostrud anim ullamco quis in consequat eu exercitation laboris culpa laboris.</p>",

	_editableFormatted: "",
	_editableRegex: /(<[^>]+>)(?=[^\r\n])/g,

	optionsA: [
		{value: 'foo', label: 'Foo!'},
		{value: 'bar', label: 'Bar!'},
		{value: 'baz', label: 'Baz!'}
	],

	_options: ['foo', 'bar', 'baz'],

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
			prop: 'options',
			inputId: 'o-input-with-list',
			model: 'mod:testObject',
			newval: 'bing, bang, boom',
			template: 'tmpl-section',
			control: [{
				template: 'tmpl-datalist',
				label: 'dynamic datalist',
				inputId: 'o-input-with-list',
				prop: 'options',
			}],
			outputCode: `
				<a-bind
					pull
					model="testObject"
					prop="options">

					<output></output>
				</a-bind>
				`,
			inputCode: `
				<a-bind
          push
          prop="text"
          throttle="300">
          <input list="o-datalist">
        </a-bind>

        <datalist
        	id="o-datalist">
        </datalist>

        <a-repeat
          target="#o-datalist"
          prop="options"
          scope="mod:testObject">

          <template>
            <option value="{{item}}"></option>
          </template>
        </a-repeat>
			`,
			modelCode: `
				import ABind from '...';
				const testModel = {
					text: 'Initial Text',
					_options: ['foo', 'bar', 'baz'],
					get options() { return this._options },
					set options(value) {
						if (typeof value === 'string') value = value.split(',');
						this._options = value;
						ABind.update(this, 'options', value);
					},
				}
			`
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
				</a-bind>

        <a-bind
        	push
        	prop="selectMulti"
        	event="click">

          <button
          	value="bar, baz">
            Set to "bar, baz"
          </button>
        </a-bind>
			`,
			inputCode: `
        <a-bind prop="selectMulti">
          <select
          	multiple
          	id="o-select-multi">
          </select>
        </a-bind>

        <a-repeat
        	target="#o-select-multi"
        	prop="optionsA"
        	scope="mod:testObject">

          <template>
            <option value="{{value}}">{{label}}</option>
          </template>
        </a-repeat>
			`,
			modelCode: `
				const testObject = {
					selectMulti: 'foo, baz',
					optionsA: [
						{value: 'foo', label: 'Foo!'},
						{value: 'bar', label: 'Bar!'},
						{value: 'baz', label: 'Baz!'}
					],
				}
			`
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
        	prop="checkbox">

          <output></output>
        </a-bind>

        <a-bind
        	push
        	prop="checkbox"
        	event="click">

          <button
          	value="bar">
            Set to "bar"
          </button>
        </a-bind>
			`,
			inputCode: `
				<a-bind
					model="testObject"
					prop="checkbox">

					<input
						type="checkbox"
						value="foo">
				</a-bind>`,
			modelCode: `
				const testObject = {
					checkbox: 'foo',
				}
			`
		},
		{
			prop: 'checkboxBool',
			inputId: 'o-checkbox-bool',
			newval: true,
			model: 'mod:testObject',
			template: 'tmpl-section',
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
			modelCode: `
				const testObject = {
					checkboxBool: false,
				}
			`
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

        <a-bind
        	push
        	prop="checkboxArr"
        	event="click">

          <button
          	value="bar">
            Set to "bar"
          </button>
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
			modelCode: `
				const testObject = {
					_checkboxArr: ['foo', 'baz'],
					get checkboxArr() {
						return this._checkboxArr;
					},
					set checkboxArr(value) {
						if (typeof value === 'string') value = value.split(',');
						this._checkboxArr = value;
					},
				}
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
			modelCode: `
				const testObject = {
					radioGroup: 'foo',
				}
			`,
		},
		{
			prop: 'button',
			inputId: 'input-button-1',
			model: 'mod:testObject',
			newval: 'New Value',
			template: 'tmpl-section',
			control: [{
				template: 'tmpl-button',
				label: "button text mirrors property value, but button value doesn't",
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
				<a-bind
					push
					prop="button"
					event="click">

          <button
          	value="New Value">
            Set to "New Value"
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
			modelCode: `
				const testObject = {
					button: 'Initial Property Value',
					notify(event) {
						const newValue = event.target.value;
						console.log(newValue);
					}
				}
			`
		},
		{
			prop: 'button',
			inputId: 'input-button-2',
			model: 'mod:testObject',
			newval: 'Another New Property Value',
			template: 'tmpl-section',
			control: [{
				template: 'tmpl-button',
				label: "button text doesn't mirror property value, but button value does",
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
				event="click"
				func="notify">

        <button>
          Click Me!
        </button>
      </a-bind>
			`,
			modelCode: `
				const testObject = {
					button: 'Initial Property Value',
					notify(event) {
						const newValue = event.target.value;
						console.log(newValue);
					}
				}
			`
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

          <button value="80">
            Set to "80"
          </button>
        </a-bind>
			`,
			inputCode: `
				<a-bind
					prop="range">

          <input
          	type="range">
        </a-bind>
			`,
			modelCode: `
				const testObject = {
					range: 50,
				}
			`,
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
			outputCode: `
        <a-bind
        	pull
        	prop="progress">

          <output></output>
        </a-bind>

        <a-bind
        	push
        	prop="progress"
        	event="click">

          <button
          	value="80">
            Set to "80"
          </button>
        </a-bind>
			`,
			inputCode: `
        <a-bind
        	prop="progress">

          <progress
          	max="100">
          </progress>
        </a-bind>
			`,
			modelCode: `
				const testObject = {
					progress: 50,
				}
			`
		},
		{
			template: 'tmpl-section-file',
			inputId: 'o-inputfile',
			label: 'input type="file"',
			model: 'mod:testObject',
			inputCode: `
			<a-bind
				push
				event="change"
				func="fileInfo">

				<input
					multiple
					type="file">
			</a-bind>
			`,
			modelCode: `
			const testObject = {

				fileInfo(event) {
				 console.log(event.target.files)[]
				},
			}
			`
		},
	],

	fileInfo(event) {
    const fileList = event.target.files;
    this.files = fileList;
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
		if (typeof value === 'string') value = value.split(',');
		this._checkboxArr = value;
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
	},

	get options() { return this._options },
	set options(value) {
		if (typeof value === 'string') value = value.split(',');
		this._options = value;
		ABind.update(this, 'options', value);
	},


} // object

export default testObject;
