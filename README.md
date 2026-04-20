# a-bind.js

**Data-binding and templating for Custom Elements and ESM Modules.**

a-bind is a lightweight, zero-dependency Web Component library that adds data binding to any HTML application. It bridges the gap between your DOM and your data models (ES Modules, global objects, Custom Elements or other DOM elements).

Demo: [https://holmesbryant.github.io/a-bind/](https://holmesbryant.github.io/a-bind/)

## Features

*   **Zero Build Step:** Works directly in the browser via native ES Modules.
*   **Modes:** Two-way (default), One-way (push/pull), and One-time (once).
*   **Targets:** Binds to properties, attributes, CSS styles, or event handlers.
*   **Loading:** Can resolve models via ESM imports (`mod:`), DOM IDs (`dom:`), or by (string) key defined with loader.define('key', model).
*   **Performance:** Uses `requestAnimationFrame` batching via a Scheduler to prevent layout thrashing.
*   **Lists:** `<a-repeat>` provides efficient template rendering for arrays.
*   **Scoping:** `<a-bindgroup>` allows for clean, nested model scoping.
*   **Debugging:** Built-in logger for tracking state changes.

## Installation

Import the library into your project.

```html
<script type="module" src="path/to/a-bind.min.js"></script>
```
## Quick Start


### Using a DOM Element as the model

```Html
<custom-element id="my-ce">
  foo = 'foo';
  ...
</custom-element>

<!-- Binds the input value to the 'foo' property of #my-ce -->
<a-bind model="dom:#my-ce" prop="foo">
  <input>
</a-bind>
```

If you are binding data inside the shadow DOM of a custom element, use "this" as the model.

```javascript
export class CustomElement extends HTMLElement {
  foo = 'foo';

  static template = `
    <a-bind model="this" prop="foo">
      <input>
    </a-bind>
  `;

  ....
}
```


### Using an ES Module as the model

#### Using an importmap

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
  <a-bind model="mod:myModel" prop="foo">
    <input>
  </a-bind>
</body>
```

#### Load a file path

```html
<a-bind model="mod:./path/to/model.js" prop="foo">...</a-bin
```

#### Using loader.define()

```javascript
// inside App.js or <script type="module">

import { loader } from './a-bind.min.js';

function App() {
  this.foo = 'foo';
}

loader.define('app', new App());
```

```html
<!-- page.html -->

<a-bind model="app" prop="foo">...</a-bind>
```

## The a-bind Element

The core element that creates a link between a data source (Model) and a DOM element. It expects a single child element, or it can target a specific element via the target attribute.

### Attributes

| Attribute | Default | Description |
| :-------- | :------ | :---------- |
| model     | null    | The key to resolve the data. Can be a CSS selector (dom:#id), a Module URL (mod:./file.js) or a (string) key defined via loader.define('key', model). |
| prop      | null    | The property inside the model (e.g., name or user.address.city).  |
| attr      | null    | Alternate to prop. Used if the model is an HTML Element and you want to bind to an attribute instead of a property.|
| elem-prop | value   | The property on the bound DOM element to update (e.g., value, textContent, checked, style.color). |
| event     | input   | The DOM event that triggers a model update. |
| func      | null    | The name of a function in the model. ABind will invoke this function and pass an Event object as the sole argument.
| target    | null    | A CSS selector to find the element to bind to. If omitted, binds to the first child.  |
| throttle  | 0       | Time in ms to debounce model updates.  |
| pull      | false   | If present, only reads FROM the MODEL (One-way: MODEL -> DOM).  |
| push      | false   | If present, only writes TO the MODEL (One-way: DOM -> MODEL). |
| once      | false   | Update the DOM once on load, then stop listening but continue to update the model (unless pull is present)  |
| debug     | false   | Enables verbose console logging for this binding. |

### Reactivity (Important)

Because a-bind uses a "non-intrusive" approach (it doesn't use Proxies to wrap your original objects), standard JavaScript assignments (e.g., myModel.message = 'New') will not automatically trigger the UI to update.

**Note:** UI interactions like typing in an input, automatically handle this internally (unless you transform the data type).

You must notify the view of changes made via JavaScript using the update helper. There are a few ways to do this:

#### Direct Import (Standard)

Best for applications where you control the bundling and dependencies.

```javascript
import ABind from 'path/to/a-bind.min.js';

const myModel = { count: 0 };

myModel.count = 5;

// Notify the view

ABind.update(myModel, 'count', 5);
```

#### Decoupled Access (For Independent Components/Libraries)

If you are building standalone custom elements or classes and don't want to hard-code an `import` dependency, use the globally exposed Symbol. This executes instantly if a-bind is loaded, and safely does nothing if it isn't.

```javascript
// Look up the symbol once per file
const abindUpdate = Symbol.for('abind.update');

const myModel = { count: 0 };

myModel.count = 5;

// Notify the view (no imports required)
globalThis[abindUpdate]?.(myModel, 'count', 5);
```

#### Define Global Variable

You can also define a global variable for ABind.update ( not recommended ).

```html
<script type="module">
  import ABind from './path/to/abind.min.js';
  window.update = ABind.update;
</script>
```

Then announce updates when the model's property changes: `window.update(this, 'propertyName', value)`

### Basic Two-Way Binding

By default, a-bind provides two-way binding. Changes in the input update the model, and changes in the model update the input.

```html
  <!-- binds the 'foo' property on the model
  to the "value" (default) property on the input -->

  <a-bind model="mod:myModel" prop="foo">
    <input>
  </a-bind>
```

### Binding to different Element Attributes/Properties

You can bind to specific attributes or properties of the target element (like style, class, or custom attributes) using elem-prop.

```html
<!-- Binds myModel.color to the element's style.color -->

<a-bind model="mod:myModel" prop="color" elem-prop="style.color">
  <div>This text is colored</div>
</a-bind>
```

### Element to Element Binding

You can use a DOM element as the model to bind one element to another

```html
<!-- the bound element -->

<a-bind
  pull
  model="dom:#range-input"
  prop="value"
  elem-prop="textContent">

  <span></span>
</a-bind>

<!-- the model -->

<input id="range-input" type="range" max="100" value="50">
```

### One Way (pull) Binding

The "pull" attribute tells a-bind to pull updates from the model to the view, but don't update the model. This is good to reduce memory usage when you don't need two-way binding.

```html
<a-bind pull model="mod:myModel" prop="name">
  <output></output>
</a-bind>
```

### One Way (push) Binding

The "push" attribute tells a-bind to push updates from the view to the model, but don't update the view.

```html
<!-- if the push attribute were not present, a-bind would set the button's value to the value of myModel.foo -->

<a-bind push model="mod:myModel" prop="foo" event="click">
  <button value="Button Value">
    Change myModel.name to "New Name"
  </button>
</a-bind>
```

### Event Handling

By default a-bind listens for the 'input' event from bound elements, but you can change that to any valid event name used by addEventListener(). In order to change the observed event, use the "event" attribute. In the previous example, the binding which wraps the button has event="click". This tells a-bind to listen for the "click" event on the button.

### Executing Functions

You can execute a function on the model instead of setting a property by using the "func" attribute. A-bind will execute the defined function on your model, passing the Event object as the only argument.

```javascript
export class myModel {
  doSomething(event) { console.log(event.target.value) }
}
```

```html
<a-bind push model="mod:myModel" event="click" func="doSomething">
  <button value="foo">Do Something</button>
</a-bind>
```

### Boolean Values & Text Output

When binding to boolean values or non-input elements, you must specify the correct 'elem-prop'.

**Output Text:** Use elem-prop="textContent" (or innerHTML) to display values in spans, divs, etc.

**Checkboxes/Radios:** Use elem-prop="checked" to bind to the boolean state.

```Html
<!-- Display a boolean as text -->

<a-bind pull model="mod:myModel" prop="isActive" elem-prop="textContent">
  <span></span>
</a-bind>

<!-- Bind a checkbox to the same boolean -->

<a-bind model="mod:myModel" prop="isActive" elem-prop="checked">
  <input type="checkbox">
</a-bind>
```

### CSS Styles

You can bind directly to CSS variables or style properties.

```Html
<!-- bind an element's background color to a model property -->

<a-bind model="mod:myModel" prop="headerColor" elem-prop="style.backgroundColor">
  <header>This header's background is colored.</header>
</a-bind>

<!-- bind to a css variable on a custom element -->

<a-bind model="dom:#my-custom-element" prop="--header-color">
  <input type="color">
</a-bind>
```

## Using the throttle attribute

The 'throttle' attribute delays the View-to-Model update (or function execution) by a specified number of milliseconds. Technically, it behaves as a debounce. The update or function will only execute after the user stops interacting with the input for the specified duration.

**Why use it?**
It prevents performance bottlenecks and excessive network requests when a user is rapidly typing in text fields (e.g., search bars, auto-save forms).

### Examples ###

1. Delaying Model Updates (Auto-save)

The model's bio property will only update 1000ms (1 second) after the user stops typing.

```html
<!-- Updates 'user.bio' 1 second after typing stops -->
<a-bind model="user" prop="bio" throttle="1000">
  <textarea placeholder="Tell us about yourself..."></textarea>
</a-bind>
```

2. Delaying Function Execution (Search)

The fetchResults function will only run 500ms after the user pauses, preventing a flood of API calls on every single keystroke.

```html
<!-- Calls 'api.fetchResults(event)' 500ms after typing stops -->
<a-bind model="api" func="fetchResults" throttle="500">
  <input type="text" placeholder="Search...">
</a-bind>
```

## The a-bindgroup Element

To avoid adding the "model" attribute to several a-bind's which share the same model, wrap them all in a-bindgroup. You can also set a "prop" attribute here for html collections that reference the same model property. Nested groups respect scoping.

```Html
<a-bindgroup model="mod:myModel">

  <!-- Inherits the model -->
  <a-bind prop="name">
    <input>
  </a-bind>

  <a-bind prop="surname">
    <input>
  </a-bind>
</a-bindgroup>

<!-- using the "prop" attribute -->

<a-bindgroup model="mod:myModel" prop="favColor">
  <a-bind>
    <input type="radio" name="fav-color" value="red">
  </a-bind>

  <a-bind>
    <input type="radio" name="fav-color" value="blue">
  </a-bind>

  <a-bind>
    <input type="radio" name="fav-color" value="green">
  </a-bind>
</a-bindgroup>
```

**Note on Nesting:** a-bindgroup uses smart scoping. A binder will only attach to its closest group, meaning you can nest groups without data leaking between them.

## The a-repeat Element

A DOM-based template engine for rendering lists.

### Attributes

| Attribute | Description |
| :-------- | :---------- |
| model     | The data source object (or module). |
| prop      | The property on the model containing an Array to iterate over.  |
| target    | Optional. CSS selector for the container element where items will be rendered. If no target, items are rendered inside the a-repeat element. |
| key       | Optional. A property name in the model holding unique values (e.g. id) to enable efficient DOM reordering. |

### Populating Selects and Datalists

When the bound property is a simple array of primitives (e.g., ['foo', 'bar']), use {{item}} in the template.

```javascript
// myModel.js

export default {
    selected: 'foo',
    options: ['foo', 'bar']
}
````

```Html
<!-- page.html -->

<a-bindgroup model="mod:./myModel.js">
  <!-- 1. Bind the Select element's value -->
  <a-bind prop="selected">
    <select id="my-select"></select>
  </a-bind>

  <!-- 2. Populate the options -->
  <a-repeat target="dom:#my-select" prop="options">
    <template>
      <option>{{item}}</option>
    </template>
  </a-repeat>
</a-bindgroup>
```

However, if you need both a value and a label for your options, you can do that too.

```javascript
// myModel.js

export default {
  selected = 'bar';

  options = [
    {value: 'foo', label: 'Foo!'},
    {value: 'bar', label: 'Bar!'}
  ];
}
```

```html
<!-- page.html -->

<a-bindgroup model="mod:./myModel.js">
  <a-bind prop="selected">
    <select id="my-select"></select>
  </a-bind>

  <a-repeat target="dom:#my-select" prop="options">
    <template>
      <option value="{{value}}">{{label}}</option>
    </template>
  </a-repeat>
</a-bindgroup>
```

## Strategies for Loading Models

There may be times when your model resides at a remote API endpoint, or it may even live on a CDN. Here are some strategies for loading various types of models.

### Loading ES Modules from a CDN

You can pass a full URL to import an ES Module directly from a CDN (like unpkg or jsdelivr).

Requirement: The file at the URL must be an ES Module (it must export default a class or object).

```html
<!-- Load a specific class from a CDN -->

<a-bind
  model="mod:https://esm.sh/uuid"
  prop="v4"
  elem-prop="textContent">

  <span></span>
</a-bind>

<!-- Using a bindgroup to share the remote model -->

<a-bindgroup model="mod:https://cdn.jsdelivr.net/npm/some-library/dist/model.mjs">
  <a-bind prop="userName"><output></output></a-bind>
  <a-bind prop="email"><output></output></a-bind>
</a-bindgroup>
```

### Loading JSON Data from an API

The Loader does not have a built-in fetch. Therefore, you cannot simply put an API endpoint in the model attribute. However, you can use Top-Level Await within a "Wrapper Module" to bridge the gap.

```JavaScript
// api-bridge.js

const response = await fetch('https://jsonplaceholder.typicode.com/users');
const data = await response.json();

// Export the JSON data as the default model

export default data;
```

Now use the mod: prefix to point to your local bridge file.

```html
<!-- ARepeat example iterating over API results -->

<a-repeat model="mod:./api-bridge.js" prop="users">
  <template>
    <div class="user-card">
      <h3>{{name}}</h3>
      <span>{{email}}</span>
    </div>
  </template>
</a-repeat>
```

### Using loader.define() (pre-fetching)

If you prefer to handle the fetching in your main application script rather than creating wrapper modules, you can fetch the data and "define" it with a key. ABind will wait for this key to exist.

```javascript
import { loader } from './a-bind.min.js';

fetch('https://api.example.com/products')
  .then(res => res.json())
  .then(data => {
    loader.define('my-api-data', data);
  });
```

You can now use that key string directly. The elements will remain empty/idle until loader.define is called.

```html
<!-- The component waits for 'my-api-data' to be defined -->

<a-repeat model="my-api-data" prop="products">
  <div>{{productName}} - {{price}}</div>
</a-repeat>
```

## Debugging

Struggling to see why a value isn't updating? Add the "debug" attribute to any a-bind or a-repeat instance.

```html
<a-bind debug ...>
  <input>
</a-bind>
```

Open your browser console. You will see logs grouping the lifecycle events.

## Change Log

v3.1.2 Tweaked throttle (debounce) functionality to account for certain edge cases.

v3.1.1 Exposed modelValue and boundValue in the logger.

v3.1

- Added globalThis[Symbol.for('abind.update')] to allow independent custom elements to trigger updates without direct imports or the overhead of customElements.get(). Usage in your project:

  - const abindUpdate = Symbol.for('abind.update');
  - ...
  - globalThis[abindUpdate]?.(this, 'propertyName', value);

v3.0.0

- Refactor: Split codebase into ES modules (ABind, ABindgroup, ARepeat, Loader, Bus, PathResolver, Schedule).
- Attributes: Standardized attribute names. Changed elem-attr to elem-prop to better reflect behavior.
- a-repeat: Added full support for template rendering and keyed updates.
- a-bindgroup: added support for 'prop' attribute in addition to 'model' so things like radio groups can share the same model and property.
- Loader: Enhanced resolution for mod: and dom: prefixes.
- Security: PathResolver now blocks prototype pollution attempts.

v2.0.1

- made logger more helpful
- fixed issues with css bindings

- v2.0.0

- Added `<a-bindgroup model="...">` to group several `<a-bind>` elements without having to set `model="..."` on every `<a-bind>` element.
- Added Schedule to use requestAnimationFrame() to batch rapid updates once per frame.
- Added Pub/Sub (Bus) to handle updates in large apps.

- v1.0.0 : Woohoo!
