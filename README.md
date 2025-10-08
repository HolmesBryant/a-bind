# A-Bind Web Component

 A custom element that performs one-way and two-way data binding for custom elements and javascript objects.

Demo: [https://holmesbryant.github.io/a-bind/](https://holmesbryant.github.io/a-bind/)

## Features
- Can perfrom one-way and two-way data binding
- Can work with existing code.
- View-to-Model binding doesn't require  refactoring your code.
- Model-to-View binding requires only a single additional line of in your code wherever a property value is set.
- Bound UI elements can be anywhere as long as the model instance is accessable. They don't have to be clumped together in a block.
- You can bind either to a model property or a method/function.
- You can bind to a getter/setter.
- You can bind to any HTML attribute.
- You can bind to multiple attributes of the same HTML element at once.
- The bound HTML element can listen for any event usable by `addEventListener`.
- The `once` flag will update the bound HTML attribute only once, preventing feedback loops.

## Usage

Include the script tag in your HTTML page.

    <script type="module" src="a-bind.js"></script>

Include the tag in the body along with an HTML element.

For model-to-view binding, also include the line `if (window.abind) abind.update(this, 'property_name', value)` wherever a bound property value is set.

    <!-- html -->
    <a-bind
        model="myObj"
        property="foo">
        <input>
    </a-bind>

    /**
     * Example object.
     * The model (or instance) must be accessable in the global scope.
     */
    var myObj = {
        _foo: 'bar',
        get foo() { return this._foo },
        set foo(value) {
            this._foo = value;
            if (window.abind) abind.update(this, 'foo', value);
        }
    }

## Attributes

- **model** REQUIRED
    - The name of an object/instance in the global scope, OR a CSS selector pointing to a unique instance of a custom element in the HTML page.
    - Examples:
        - `<a-bind model="myObj">`
        - `<a-bind model="custom-element#foo">`

- **property** OPTIONAL
    - The name of a model property which will be bound to this element. If `func` is omitted, this attribute is **required**.
    - Example: `<a-bind property="someProperty">`

- **event** OPTIONAL
    - Default: 'input'
    - The event which the bound HTML element listens for in order to determine when to update the model.
    - Example: `<a-bind event="click">`
    - Any event name usable by `addEventListener` which is supported by the HTMLelement.

- **elem-attr** OPTIONAL
    - Default: 'value'
    - A comma separated list of attribute(s) or property(s) of the bound HTML element to update. Can also be things like `textContent` or `innerHTML`.
    - Acceptable values: Any attribute or property which is valid for the bound HTML element.
    - Example: `<a-bind elem-attr="value, style.background">`

- **func** OPTIONAL
    - The name of a function or method of the bound model with optional value(s). Requires specific formatting. See below under Notes > Func.
    - Examples:
        - `<a-bind func="someFunc">`
        - `<a-bind func="someFunc; arg"`
        - `<a-bind func="someFunc; arg1; arg2"`

- **oneway** OPTIONAL
    - Tells the binder to only perform model -> view binding ( not view -> model binding ). The effect is that an event listener (for example, to watch for user input) will not be set on the HTML element.
    - Acceptable values: 'false', null, any
        - This is a boolean attribute. It's presence alone is sufficient.
    - Example: `<a-bind oneway>`

- **once** OPTIONAL
    - Tells the binder to update the bound HTML element with the model's property value only once. This prevents the model from continuously updating the HTML element as the user interacts with the element. Particularly useful for things like `contentEditable` elements.
    - Acceptable values: 'false', null, any
        - This is a boolean attribute. It does not require a value. It's presence alone is sufficient.
    - Example: `<a-bind once>`

- **model-attr** OPTIONAL
    - The name of an observed attribute in a custom element. This is only applicable if your model is a custom element and you want to bind directly to an observed attribute instead of a property.
    - Example: `<a-bind model-attr="observed-attr">`

## Examples

    // CustomElement.js
    class CustomElement extends HTMLElement {
        // Attributes
        #myInput = 'foo';
        #mySelect = 'foo';
        #mySelectMulti = ['foo', 'bar'];
        #myCheckbox = 'foo';
        #myRadiogroup = 'foo';
        #myButton = 'foo';
        ...
        // Not Attributes
        #myFileInput;
        #mySelectOptions = ['foo', 'bar', 'baz'];
        someProperty;
        ...
        static observedAttributes = [
            'my-input',
            'my-select',
            'my-selectmulti',
            'my-checkbox',
            'my-radiogroup',
            'my-button'
        ];
        constructor() { super(); }
        attributeChangedCallback(attr, oldval, newval) {
            switch (attr) {
                case "my-input": this.#myInput = newval; break;
                case "my-select": this.#mySelect = newval; break;
                case "my-selectmulti":
                    newval = newval.split(/[,\s]+/g);
                    this.#mySelectMulti = newval;
                    break;
                case "my-checkbox": this.#myCheckbox = newval; break
                case "my-radiogroup": this.#myRadiogroup = newval; break;
                case "my-button": this.#myButton = newval; break;
            }
            if (window.abind) abind.update(this, attr, newval);
        }
        *buildOptionList(arr) {
            for (const value of arr) {
                yield `<option value="${value}">${value}</option`;
            }
        }
        handleClick(arg1, arg2) {
            alert(`Arg 1: ${arg1}\nArg 2: ${arg2}`);
        }
        getFileList() {
            return JSON.stringify(this.#myFileInput);
        }
        ...
        get myInput() { return this.#myInput }
        set myInput(value) { this.setAttribute('my-input', value) }
        get mySelect() { return this.#mySelect }
        set mySelect(value) { this.setAttribute('my-select', value) }
        get mySelectMulti() { return this.#mySelectMulti) }
        set mySelectMulti(value) {
            value = value.join(',');
            this.setAttribute('my-selectmulti', value)
        }
        get myCheckbox() { return this.#myCheckbox }
        set myCheckbox(value) { this.setAttribute('my-checkbox', value) }
        get Radiogroup() { return this.#Radiogroup }
        set Radiogroup(value) { this.setAttribute('my-radiogroup', value) }
        get myButton() { return this.#myButton }
        set myButton(value) { this.setAttribute('my-button', value) }
        // Not observed attributes
        get myFileInput() { return this.#myFileInput }
        set myFileInput(fileList) {
            this.#myFileInput = fileList;
            if (window.abind) abind.update(this, 'myFileInput', this.getFileList());
        }
    }

    <!-- index.html -->
    <custom-element></custom-element>

### Text-ish inputs

    <a-bind
        model="custom-element"
        property="myInput">
        // input value is 'foo'
        <input>
    </a-bind>

### Select inputs

    <a-bind
        model="custom-element"
        property="mySelect">
        // selected option is 'foo'
        <select>
            <option>foo</option>
            <option>bar</option>
            <option>baz</option>
        </select>
    </a-bind>

    <a-bind
        model="custom-element"
        property="mySelectMulti"
        elem-attr="selectedOptions">
        // selected options are 'foo' and 'bar'
        <select multiple>
            <option>foo</option>
            <option>bar</option>
            <option>baz</option>
        </select>
    </a-bind>

### Checkbox inputs

    <a-bind
        model="custom-element"
        property="myCheckbox">
        <!-- checkbox is checked -->
        <input
            type="checkbox"
            value="foo">
    </a-bind>

### Radio Group

    <a-bind
        model="custom-element"
        property="myRadiogroup">
        // this input is checked
        <input type="radio" name="rad-group" value="foo">
    </a-bind>
    <a-bind
        model="custom-element"
        property="myRadiogroup">
        <input type="radio" name="rad-group" value="bar">
    </a-bind>

### Buttons

    <!--
        Button text mirrors property value.
        Invokes handleClick(property, propertyValue) on click.
    -->
    <a-bind
        model="custom-element"
        property="button"
        elem-attr="textContent"
        event="click"
        func="handleClick">
        <button>
            // text is 'foo'
        </button>
      </a-bind>

      <!--
        Button text does NOT mirror property value.
        Invokes handleClick(property, propertyValue) on click.
      -->
      <a-bind
        model="custom-element"
        property="button"
        event="click"
        func="handleClick">
        <button value="">
          Click Me!
        </button>
      </a-bind>

      <!--
        Button text does not mirror property value.
        Invokes handleClick(propery, 'something else') on click.
      -->
      <a-bind
        model="custom-element"
        property="button"
        event="click"
        func="handleClick; something else">
        <button value="">
          Click Me!
        </button>
      </a-bind>

### File input

    <!--
    -->
    <a-bind
        model="custom-element"
        property="myFileInput"
        event="change"
        elem-attr="files">
        <input type="file" multiple>
      </a-bind>

## Notes

### Func

when you set `<a-bind func="...">`, the value of `func` must be either a single value OR a semi-colon (;) separated list.

The first item must be the name of a function in your model.

The second item will be passed to the function as the (string) **first** argument. If the second item is omitted, or the second item is NOT followed by a semi-colon, the **name** of the bound property is passed.

The third item will be passed to the model's function as the remaining argument(s). If the third item is omitted, the **value** of the bound property is passed, so the arguments passed to the function would be, for example, (propertyName, propertyValue).

If the third item is a comma separated list (ie. foo, bar) the arguments passed to the function will be, for example, (propertyName, 'foo', 'bar')

If the third item is the keyword "this", a reference to the bound (live) HTML element will be passed, ie. (propertyName:string, boundElement:HTMLElement)

if `func="handleClick"` a-bind will invoke yourModel.handleClick(boundPropertyName, boundPropertyValue)

if `func="handleClick; something else"` a-bind will invoke yourModel(boundPropertyName, 'something else')

if `func="handleClick; value one, value two"` a-bind will invoke yourModel.handleClick(boundPropertyName, 'value one', 'value two')

if `func="handleClick; otherProperty; other value"` a-bind will invoke yourModel.handleClick('otherProperty', 'other value')

if `func="handleClick; otherProperty; value one, value two"` a-bind will invoke yourModel.handleClick('otherProperty', 'value one', 'value two')

if `func="handleClick; this"` a-bind will invoke yourModel.handleClick(propertyName, boundElement)

### Binding to properties having null values
    If binding an element to an object property whose value is null does not result in the desired effect, try setting the value of the element to "null". ie. `<input type="checkbox" value="null">`


