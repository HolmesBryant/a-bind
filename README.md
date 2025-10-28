# A-Bind Web Component

[![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

A custom HTML element (`<a-bind>`) designed to create a declarative data-binding bridge between a data source and a UI element in the DOM. It is a self-contained component that brings reactive capabilities to a vanilla JavaScript environment.

The `<a-bind>` element is a wrapper. It does not render anything itself. Instead, it binds to its **first direct child element**, traversing through nested `<a-bind>` elements to find the actual UI element to control.

Demo: [https://holmesbryant.github.io/a-bind/](https://holmesbryant.github.io/a-bind/)

## Features

- Provides a lightweight yet powerful solution for adding reactivity to web pages without the overhead of a large framework.

- Two-Way Data Binding: Synchronizes data between a model and a UI element. Changes in one are automatically reflected in the other.

- One-Way Data Binding: Data can be configured to flow in only one direction: either from the model to the UI element or from the UI element to the model.

- Decoupled Data Binding: Provides a simple and decoupled way for any other part of the application to programmatically trigger a data update.

- Event-Driven Function Execution: It can execute JavaScript functions in response to DOM events on the child element, similar to event handlers like `click`.

- Declarative API: All configuration is done through HTML attributes on the `<a-bind>` element, making the code clean and easy to understand.

- Bound UI elements can be anywhere in the page.

- You can bind to multiple attributes/properties of the same HTML element at once.

- You can nest `<a-bind>` instances for complex binding scenerios on a single HTML element, such as pulling data from one property and pushing data to a different property.

- The `once` flag will update the bound HTML element attribute/property only once, preventing feedback loops.

## Usage

Include the script tag in your HTML page. Remember to add `type = "module"`

    <script type="module" src="a-bind.min.js"></script>

Include the tag in the body with a single HTML element as its child.

    <!-- index.html -->
    <!-- input -->
    <a-bind
        model = "myObj"
        property = "myProperty">
        <input id = "text-input">
    </a-bind>
    ...
    <!-- output -->
    <a-bind
        model = "myObj"
        property = "myProperty">
        <output for="text-input"></output>
    </a-bind>


    // myObj.js
    // The model (or instance) must be in the global scope.
    var myObj = {
        _myProperty: 'foo',
        get myProperty() { return this._myProperty },
        set myProperty(value) {
            this._myProperty = value;
        }
    }

## Attributes

| Attribute             | Description                                                                               | Default   |
| :---                  | :---                                                                                      |      :--- |
| **model** (Required)  | The name of the model (a **window** object or another element's selector).                |           |
| **property**          | The dot-notation path to a property on the model object (e.g., `user.name`).              |           |
| **model-attr**        | The name of an HTML attribute on the model element (used when the model is a DOM element).|           |
| **elem-attr**         | The property or attribute of the child element to bind to. Can be a comma-separated list. | `value`   |
| **event**             | The DOM event on the child element that triggers an update to the model.                  | `input`   |
| **func**              | The function to execute when the **event** fires.                                         |           |
| **pull**              | If present, enables one-way binding (**model** -> **element**).                           | `false`   |
| **push**              | If present, enables one-way binding (**element** -> **model**).                           | `false`   |
| **once**              | If present, the element only receives the model's value once and never again.             | `false`   |
| **debug**             | If present, enables verbose console logging for the instance.                             | `false`   |


## Description

### Data Flow and Binding Types

The direction of data flow is controlled by the `pull` and `push` boolean attributes.

#### Two-Way Binding (Default Behavior)

If neither `pull` nor `push` is present, the binding is two-way.

- **Model to Element:** When the model's data changes, ABind.update() is called. The `<a-bind>` element listens for a global `abind:update` event, and if the change is relevant to its model and property, it updates the child element's value or attributes.

- **Element to Model:** When the user interacts with the child element (e.g., types in an `<input>`), the `<a-bind>` element listens for a DOM event (defaulting to "input"). It triggers a method reads the new value from the element, updates the JavaScript object, and then calls `ABind.update()` to broadcast the change to any other elements that might be bound to the same data.

#### One-Way Binding (Model to Element)

This is achieved by adding the `pull` attribute.

The element will pull data from the model and update itself when the model changes. It will not push changes back to the model.

Use Case: Displaying data that should not be editable by this specific element (e.g., showing a user's name in a `<span>`).

#### One-Way Binding (Element to Model)

This is achieved by adding the `push` attribute.

The element will push its changes to the model. It will not pull data from the model to update itself.

Use Case: An input field used only to set or change a value, without needing to reflect the current state (e.g., a "reset password" field).

#### One-Time Binding

This is achieved with the `once` attribute. The element will pull the initial value from the model **once** and will not listen for any subsequent updates.

Use Case: A contentEditable element, which would reset the caret to the beginning of the element every time the user types something if `once` were not set.

#### Decoupled Binding

`static update(model, property, value)`: This public static method provides a simple and decoupled way for any other part of the application to programmatically trigger a data update. By dispatching a global event, it allows the ABind components to react without being directly referenced.

##### Use Case:

    // javascript
    var someObject = {
        doAction(value) {
            const model = otherObject; // the target object
            const property = 'foo'; // the target property
            ...
            // update the property, which will cascade to all elements bound to it
            if (window.abind) abind.update(model, property, value);
        }
    }
    var otherObject = {
        foo: 'bar'
    }

    <!-- HTML -->
    <a-bind model="otherObject" property="foo">
        <output></output>
    </a-bind>

## Examples

    <!-- index.html -->
    <custom-element></custom-element>

### Text-ish inputs

    <a-bind
        model = "custom-element"
        property = "myInput"
    >
        <input>
    </a-bind>

### Select inputs

    <a-bind
        model = "custom-element"
        property = "mySelect"
    >
        <select>
            <option>foo</option>
            <option>bar</option>
            <option>baz</option>
        </select>
    </a-bind>

    <a-bind
        model = "custom-element"
        property = "mySelectMulti"
        elem-attr = "selectedOptions"
    >
        <select multiple>
            <option>foo</option>
            <option>bar</option>
            <option>baz</option>
        </select>
    </a-bind>

### Checkbox inputs

    <a-bind
        model = "custom-element"
        property = "myCheckbox"
    >
        <input
            type = "checkbox"
            value = "foo"
        >
    </a-bind>

### Radio Group

    <a-bind
        model = "custom-element"
        property = "myRadiogroup"
    >
        <!-- checked -->
        <input
            type = "radio"
            name = "rad-group"
            value = "foo"
        >
    </a-bind>
    ...
    <a-bind
        model = "custom-element"
        property = "myRadiogroup"
    >
        <!-- not checked -->
        <input
            type = "radio"
            name = "rad-group"
            value = "bar"
        >
    </a-bind>

### Buttons

    <!--
    Button text mirrors property value.
    Invokes handleClick(event) on click.
    myButton === "foo"
    -->
    <a-bind
        model = "custom-element"
        property = "myButton"
        elem-attr = "textContent"
        event = "click"
        func = "handleClick"
    >
        <button> <!-- text is 'foo' --> </button>
    </a-bind>

    <!--
    Button text mirrors property value.
    Button value also mirrors property value.
    Invokes handleClick(event) on click.
    myButton === "foo"
    -->
    <a-bind
        model = "custom-element"
        property = "myButton"
        elem-attr = "textContent, value"
        event = "click"
        func = "handleClick"
    >
        <button>
            <!-- button text is 'foo' -->
            <!-- button value is also 'foo' -->
        </button>
      </a-bind>

    <!--
    Button text does NOT mirror property value.
    Button value DOES mirror property value.
    Invokes handleClick(event) on click.
    -->
    <a-bind
        model = "custom-element"
        property = "myButton"
        event = "click"
        func = "handleClick"
    >
        <button> Click Me! </button>
    </a-bind>

    <!--
    Button text does NOT mirror property value.
    Button value does NOT mirror property value.
    Invokes handleClick(event) on click.
    -->
    <a-bind
        model = "custom-element"
        event = "click"
        func = "handleClick"
    >
        <button
            value = "button.value"
            data-other = "other value">
            Click Me!
        </button>
    </a-bind>

### File input

    <a-bind
        model="custom-element"
        property="myFileInput"
        event="change"
        elem-attr="files">
        <input type="file" multiple>
      </a-bind>


### Binding two different attributes to two different properties

If you want to bind two different element attributes to two different model properties, you must use nested a-bind tags.

For example, if you have an input element that is bound to the model property `myInput` and you want to disable the input based on the value of the property `isDisabled` you would write this:

    <a-bind
        pull
        model="custom-element"
        property="isDisabled"
        elem-attr="disabled"
    >
        <a-bind
            model="custom-element"
            property="myInput"
        >
            <input id="my-input">
        </a-bind>
    </a-bind>

## Notes

### Func

For `func` to work, the binding must have an event defined (the default is 'input'). The binding will pass the Event object to the function.

    //example.js
    var example = {
        handleClick(event) {
            const elem = event.target // button
            const value = elem.value // foo
            const other = elem.dataset.other // bar
        }
    }

    <!-- index.html -->
    <a-bind
        model = "example"
        event = "click"
        func = "handleClick"
    >
        <button value = "foo" data-other = "bar">
            click me
        </button>
    </a-bind>


