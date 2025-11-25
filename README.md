# a-bind

**Lightweight, high-performance data binding for Vanilla Web Components and ES modules.**

`a-bind` is a dependency-free library that provides two-way data binding between JavaScript models and DOM elements using Custom Elements (`<a-bind>`). It is built for modern ES Modules, supports Batched DOM updates via `requestAnimationFrame`, and features intelligent throttling for high-frequency data.

## Features

* **Zero Dependencies:** Built with vanilla Web Components for vanilla scripts. No framework required.

* **Two-Way Binding:** Syncs UI inputs with data models and vice-versa.

* **One-Way Binding:**

  - **View => Model:** Only update the model (model doesn't influence view) using the 'push' attribute.

  - **Model => View:** Only update the view (view doesn't influence model) using the 'pull' attribute.

* **ES Module Support:** Load JS classes dynamically using `<a-bindgroup>`.

* **High Performance:**

  - **Batched Updates:** Uses `requestAnimationFrame` to prevent layout thrashing.

  - **Smart Throttling:** Automatically handles **Debouncing** (for user input) and **Rate Limiting** (for high-frequency real-time feeds).

*   **Memory Safe:** Uses `WeakMap` for observers, ensuring models can be garbage collected when elements are removed.

---

## Setup

Simply import the script as a module in your HTML file.

```html
    <script type="module" src="./a-bind.js"></script>
```

## Usage

1. Basic Binding (Global Objects)

You can bind to any object attached to the global window scope.

```javascript
    window.appState = {
        message: "Hello World",
        theme: "dark"
    };
```

```html
    <!-- Input Binding (Two-way) -->
    <a-bind model="appState" property="message">
      <input type="text">
    </a-bind>

    <!-- Display Binding (One-way) -->
    <a-bind model="appState" property="message" elem-attr="textContent">
      <h1>Preview: <span></span></h1>
    </a-bind>

    <!-- Attribute Binding -->
    <a-bind model="appState" property="theme" elem-attr="class">
      <div class="container">Content</div>
    </a-bind>
```

2. Component Binding (ES Modules)

Use `<a-bindgroup>` to load a JavaScript class file. The group creates a singleton instance of the class and shares it with all child binders.

```javascript
    // store.js

    export default class UserStore {
      constructor() {
        this.username = "Guest";
        this.isAdmin = false;
      }

      login() {
        alert(`Logging in as ${this.username}...`);
      }
    }
```

```html
    <!-- index.html -->

    <a-bindgroup model="./store.js">

      <!-- Binds to instance.username -->
      <label>Username:
        <a-bind property="username">
          <input type="text">
        </a-bind>
      </label>

      <!-- Execute function on event -->
      <a-bind func="login" event="click">
        <button>Log In</button>
      </a-bind>

    </a-bindgroup>
```

3. DOM-to-DOM Binding

You can bind one element directly to another without a JavaScript model by using an ID selector.

```html
    <input id="source" type="range" min="0" max="100">

    <!-- Mirror the range input value -->
    <a-bind model="#source" model-attr="value" elem-attr="textContent">
      <span>0</span>
    </a-bind>
```

## Throttling & Performance

a-bind includes a powerful throttle attribute that adapts its behavior based on the data flow direction.

### Input Debouncing (UI ➔ Model)

When applied to user inputs, it waits until the user stops typing for X milliseconds before updating the model.

```html
    <!-- Updates model 150ms (Default) after user stops typing -->
    <a-bind model="search" property="query" throttle>
      <input type="text" placeholder="Search...">
    </a-bind>

    <!-- Updates model 10ms after user stops typing -->
    <a-bind model="search" property="query" throttle="10">
      <input type="text" placeholder="Search...">
    </a-bind>
```

### Output Rate Limiting (Model ➔ UI)

When applied to display elements, it limits how often the DOM updates. Perfect for high-frequency data like stock tickers or sensor feeds.

```html
    <!-- Updates UI max once every 500ms, regardless of data speed -->
    <a-bind model="stockTicker" property="price" throttle="500" elem-attr="textContent">
      <span>$0.00</span>
    </a-bind>
```

## API Reference: Attributes
| Attribute | Default | Description                                                                                      |
| :-------- | :------ | :----------------------------------------------------------------------------------------------- |
| model     | null    | The data source. Can be a Global Object name, a DOM ID (start with #), or passed via JS property.|
| property  | null    | The property key on the model to observe (dot notation supported: user.address.city).            |
| elem-attr | value   | The attribute/property on the child element to update (e.g., value, textContent, style.color).   |
| event     | input   | The DOM event that triggers a model update.                                                      |
| throttle  | 150     | Time in ms. Input = Debounce; Output = Rate Limit. If attribute is present with no value.        |
| func      | null    | A method name to execute on the model when event fires. The method always recives an Event object|
| pull      | false   | If set, data flows only from UI ➔ Model.                                                        |
| push      | false   | If set, data flows only from Model ➔ UI.                                                        |
| once      | false   | Update the UI once on load, then disconnect listeners.                                           |
| model-attr| null    | If binding to a DOM element, the attribute on that element to watch.                             |

## Static Methods

Because a-bind uses a Pub/Sub system (not Proxies), you must use the static helper to update data if you want the UI to react.

### ABind.update(model, property, value)

Updates the model and notifies all listeners.

```javascript
    window.app = { message: 'initial data' };
    app.message = 'New Data';
    if (window.abind) abind.update(app, 'message', 'New Data');

    class Foo {
        bar;
        setBar(value) {
            this.bar = value;
            if (window.abind) abind.update(this, 'bar', value);
        }
    }
```

### ABind.updateDefer(model, property, waitMs)

Waits waitMs milliseconds, then reads the current value from the model and updates.

## License

GPL-3.0
