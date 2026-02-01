# a-bind.js

**Data-binding and templating for Custom Elements and ESM Modules.**

a-bind is a lightweight, zero-dependency Web Component library that adds two-way data binding to any HTML application. It bridges the gap between your DOM and your data models (ES Modules, global objects, Custom Elements or other DOM elements).

## Features

*   **Zero Build Step:** Works directly in the browser via native ES Modules.
*   **Modes:** Two-way (default), One-way (push/pull), and One-time (once).
*   **Targets:** Binds to properties, attributes, CSS styles, or event handlers.
*   **Loading:** Can resolve models via ESM imports (`mod:`), global variables, or DOM IDs (`dom:`).
*   **Performance:** Uses `requestAnimationFrame` batching via a Scheduler to prevent layout thrashing.
*   **Lists:** `<a-repeat>` provides efficient template rendering for arrays.
*   **Scoping:** `<a-bindgroup>` allows for clean, nested model scoping.
*   **Debugging:** Built-in logger for tracking state changes.

## Installation

Import the library into your project.

```html
<script type="module" src="./path/to/index.js"></script>
```
## Quick Start

1. Using a DOM Element as the model

```Html
<custom-element id="my-ce">
  ...
</custom-element>

<!-- Binds the input value to the 'name' property of #my-ce -->
<a-bind model="dom:#my-ce" prop="name">
  <input type="text">
</a-bind>
```

2. Using an ES Module as the model

**Using an importmap**

```html
<head>
  <script type="importmap">
    {
      "imports": {
          "myModel": "/path/to/MyModel.js"
      }
    }
  </script>
</head>
<body>
  <a-bind model="mod:myModel" prop="someProperty">
    <input>
  </a-bind>
</body>
```

**Load a file path**

```html
<a-bind model="mod:./path/to/model.js" prop="theme">
  <select>
    <option value="light">Light</option>
    <option value="dark">Dark</option>
  </select>
</a-bin
```

## Usage Guide

### The a-bind Element

The core element that creates a link between a data source (Model) and a DOM element. It expects a single child element, or it can target a specific element via the target attribute.

#### Attributes

| Attribute | Default | Description |
| :-------- | :------ | :---------- |
| model     | null    | The key to resolve the data. Can be a Global var name, a CSS selector (dom:#id), or a Module URL (mod:./file.js). |
| prop      | null    | The path to the data inside the model (e.g., user.address.city).  |
| elem-prop | value   | The property on the bound DOM element to update (e.g., value, textContent, checked, style.color). |
| attr      | null    | Alternate to prop. Used if the model is an HTML Element and you want to bind to its attribute instead of a property.|
| event     | input   | The DOM event that triggers a model update. |
| target    | null    | A CSS selector to find the element to bind to. If omitted, binds to the first child.  |
| throttle  | 0       | Time in ms to debounce input/output updates.  |
| pull      | false   | If present, only reads FROM the DOM (One-way: DOM -> Model).  |
| push      | false   | If present, only writes TO the DOM (One-way: Model -> DOM). |
| once      | false   | Update the DOM once on load, then stop listening. |
| debug     | false   | Enables verbose console logging for this binding. |


#### Specific Binding Scenarios

1. Boolean Values & Text Output

When binding to boolean values or non-input elements, you must specify the correct 'elem-prop'.

**Output Text:** Use elem-prop="textContent" (or innerHTML) to display values in spans, divs, etc.

**Checkboxes/Radios:** Use elem-prop="checked" to bind to the boolean state.

```Html
<!-- Display a boolean as text -->
<a-bind prop="isActive" elem-prop="textContent">
  <span></span>
</a-bind>

<!-- Bind a checkbox to the same boolean -->
<a-bind prop="isActive" elem-prop="checked">
  <input type="checkbox">
</a-bind>
```

2. CSS Styles

You can bind directly to CSS variables or style properties.

```Html
<a-bind model="appState" prop="headerColor" elem-prop="style.backgroundColor">
  <header>...</header>
</a-bind>
```

3. Executing Functions

Instead of binding data, you can bind an event to a function within your model using 'func'.

```Html
<a-bind model="authController" func="login" event="click">
  <button>Log In</button>
</a-bind>
```

### The a-repeat Element

A DOM-based template engine for rendering lists.

#### Attributes

| Attribute | Description |
| :-------- | :---------- |
| model     | The data source object (or module). |
| prop      | The property on the model containing the array to iterate over. |
| target    | CSS selector for the container element where items will be rendered.  |
| key       | Optional. A unique property name (e.g., id) to enable efficient DOM reordering. |

#### Populating Selects and Datalists

When the bound property is a simple array of primitives (e.g., ['foo', 'bar']), use {{item}} in the template.

```javascript
Model (myModel.js):
code
JavaScript
export default {
    selected: 'foo',
    options: ['foo', 'bar']
}
````

```Html
<!-- 1. Bind the Select element's value -->
<a-bind model="mod:./myModel.js" prop="selected">
  <select id="my-select"></select>
</a-bind>

<!-- 2. Populate the options -->
<a-repeat target="#my-select" prop="options">
  <template>
    <option>{{item}}</option>
  </template>
</a-repeat>
```

### The <a-bindgroup> Element

To avoid repeating the model attribute on every field, wrap them in a group. Nested groups respect scoping.

```Html
<a-bindgroup model="userSettings">
  <h3>User Settings</h3>

  <!-- Inherits model="userSettings" -->
  <label>Username</label>
  <a-bind prop="username">
    <input type="text">
  </a-bind>

  <!-- Inherits model="userSettings" -->
  <label>Notifications</label>
  <a-bind prop="preferences.notifications" elem-prop="checked">
    <input type="checkbox">
  </a-bind>
</a-bindgroup>
```

## Architecture & Notes

### Shadow DOM

If you are binding elements inside a Custom Element's Shadow DOM, use "this" as the model to refer to the Custom Element host instance.

```Html
<a-bind model="this" prop="someProperty">...</a-bind>
```

### Manual Updates via Bus

a-bind uses a PubSub system (Bus). If you update your model via JavaScript (not via an a-bind input), the DOM won't know it changed. You must announce the update:

```JavaScript
import ABind from './a-bind.js';

// If you change the model manually:
myModel.myProperty = "New Data";

// Tell a-bind to update the views:
ABind.update(myModel, 'myProperty', myModel.myProperty);
```

## Change Log

v3.0.0

- Refactor: Split codebase into ES modules (ABind, ABindgroup, ARepeat, Loader, Bus, PathResolver, Schedule).
- Attributes: Standardized attribute names. Changed elem-attr to elem-prop to better reflect behavior.
- a-repeat: Added full support for template rendering and keyed updates.
- a-bindgroup: added support for 'prop' attribute in addition to 'model' so things like radio groups can share the same model and property.
- Loader: Enhanced resolution for mod: and dom: prefixes.
- Security: PathResolver now blocks prototype pollution attempts.

v2.5.1

- made logger more helpful
- fixed issues with css bindings

v2.5.0

- Simplified logic ... somewhat
- Made binding strictly boolean checkboxes more intuitive.
- Added more security by allowing only local paths for dynamic module imports ('/', './', '../')

- v2.0.0

- Added `<a-bindgroup model="...">` to group several `<a-bind>` elements without having to set `model="..."` on every `<a-bind>` element.
- Added UpdateManager to use requestAnimationFrame() to batch rapid updates once per frame.
- Added Pub/Sub to handle updates in large apps.

- v1.0.0 : Woohoo!
