/**
 * @file extra/test-model.js
 */

import ABind from '../src/a-bind.js';
import styles from './styles.css' assert { type: 'css' };

export default class TestModel extends HTMLElement {
	selectOptions;
	defaults = {};
	sections = document.createDocumentFragment();

	static observedAttributes = [
		'button-value',
		'color-input',
		'content-editable',
		'date-input',
		'file-input',
		'number-input',
		'progress',
		'range-input',
		'select-input',
		'select-multi',
		'select-options',
		'text-area',
		'text-input',
		'text2-input'
	];

	static template = document.createElement('template');
	static {
		this.template.innerHTML = `
			<slot></slot>
		`;
	}

	constructor() {
		super();
		this.attachShadow({mode:'open', delegatesFocus:true});
		this.shadowRoot.adoptedStyleSheets = [styles];
	}

	attributeChangedCallback(attr, oldval, newval) {
		if (oldval === newval) return;

		if ( attr === 'select-options') {
			newval = JSON.parse(newval);
			this.selectOptions = newval;
		}

		ABind.update(this, attr, newval);
	}

	connectedCallback() {
		this.shadowRoot.append(TestModel.template.content.cloneNode(true));
		this.container = this.shadowRoot.querySelector('a-bindgroup');
		this.setDefaults();
	}

	/*addTextInput() {
		const title = 'Text Input';
		const attr = 'text-input';
		const id = 'textinput';
		const type = 'text';
		const code = `
			<a-bind
				attr = "${attr}">

				<input
					id = "${id}"
					type = "${type}">
			</a-bind>
		`;

		const binding = document.createRange().createContextualFragment(code);
		const section = this.createSection(title, attr, code);
		const div = document.createElement('div');
		const label = document.createElement('label');
		const container = section.querySelector('.binding');
		div.className = 'flex column';
		label.for = id;
		label.textContent = `input type="${type}"`;
		div.append(label);
		div.append(binding);
		container.append(div);
		this.sections.append(section);
	}*/

	/*addTextwDatalist() {
		const title = 'Input with Datalist';
		const attr = 'text-input';
		const id = 'inputwdatalist';
		const listId = 'list';
		const type = 'text';
		const code = `
			<a-bind
				attr = "${attr}">

				<input
					id = "${id}"
					type = "${type}">
			</a-bind>
		`;

		const binding = document.createRange().createContextualFragment(code);
		const section = this.createSection(title, attr, code);
		const div = document.createElement('div');
		const label = document.createElement('label');
		const container = section.querySelector('.binding');
		div.className = 'flex column';
		label.for = id;
		label.textContent = `input type="${type}" list="${listId}"`;
		div.append(label);
		div.append(binding);
		container.append(div);
		this.sections.append(section);
	}*/

	/*addDatalist() {
		const title = 'Datalist';
		const attr = 'select-options';
		const prop = 'selectOptions';
		const id = 'list';
		const code = `
			<datalist id="${id}" part="${id}"></datalist>

			<a-repeat
				prop = "selectOptions"
				target = "test-model::part(${id})">

  			<template>
    			<option value="{{ value }}">
    				{{ label }}
    			</option>
  			</template>
			</a-repeat>
		`;

		const binding = document.createRange().createContextualFragment(code);
		const section = this.createSection(title, attr, code);
		const container = section.querySelector('.binding');
		container.append(binding);
		this.sections.append(section);
	}*/

	/*createSection(title, attr, code) {
		const html = `
			<section>
			 	<h3>${title}</h3>

		    <div class="card flex stretch">
		      <div class="flex column flex1">
		        <span>
		          	<strong>Attribute</strong> : ${attr}
		        </span>
		        <a-bind
		        	attr="${attr}">

		          <output>...</output>
		        </a-bind>
		      </div>

		      <div class="binding flex column flex1">
						<!-- binding -->
		      </div>
		    </div>

				<details>
					<summary>code</summary>

		      <div class="code flex stretch">
						<a-code highlight class="flex1">
			      	<textarea>
								<a-bind
									attr="${attr}">

									<output>...</output>
								</a-bind>
			        </textarea>
			      </a-code>

						<a-code highlight class="flex1">
							<textarea>${code}</textarea>
						</a-code>
        	</div>
				</details>
			</section>
		`;

		return document.createRange().createContextualFragment(html);
	}*/

	notify(event) {
		const html = `
			<form method="dialog">
				<button>OK</button>
			</form>
			<b>Value:</b>
			<pre></pre>
		`;
		const dialog = document.createElement('dialog');
		dialog.innerHTML = html;
		const pre = dialog.querySelector('pre');
		pre.textContent = event.target.value;
		dialog.openModal();
	}

	/*render() {
		const container = this.shadowRoot.querySelector('a-bindgroup');
		container.append(this.sections);
	}*/

	reset(event) {
		for (const attr of TestModel.observedAttributes) {
			this.setAttribute(attr, this.defaults[attr]);
		}
	}

	setDefaults() {
		for (const attr of TestModel.observedAttributes) {
			this.defaults[attr] = this.getAttribute(attr);
		}
	}
}

if (!customElements.get('test-model')) customElements.define('test-model', TestModel);
