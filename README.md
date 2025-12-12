# a-bind.js

Data-binding for Custom Elements and ESM Modules.

a-bind is a lightweight, zero-dependency Web Component library that adds two-way data binding to any HTML application. It bridges the gap between your DOM and your data models (ES Modules, global objects, or other DOM elements) with built-in performance optimization and security features.

## Features

* Zero Build Step: Works directly in the browser via native ES Modules.

* Secure by Design: Strict origin policies prevent unauthorized module loading.

* High Performance: Batched DOM updates via requestAnimationFrame and MutationObserver support.

* Intelligent Throttling: Built-in input debouncing and output rate limiting.

* Scope Management: `<a-bindgroup>` allows for clean, nested model scoping.

* Developer Experience: logger for debugging state changes.

## Change Log

- v2.5.0

  - Simplified logic ... somewhat

  - Made it easier for strictly boolean checkboxes (ommit the value attribute on the input)

  - Added some security by allowing only local paths for dynamic module imports ('/', './', '../')

- v2.0.0

    - Added `<a-bindgroup model="./SomeClass.js">` to group several `<a-bind>` elements without having to set `model="..."` on every `<a-bind>` element.

    - Added UpdateManager to use requestAnimationFrame() to batch rapid updates once per frame.

    - Added Pub/Sub to handle updates in large apps.

- v1.0.0

    - Initial commit.

## Installation

Simply import the file into your project.

```html
<script type="module" src="./path/to/a-bind.js"></script>
```

Or import it inside your main JavaScript file:

```javaScript
import ABind from './path/to/a-bind.js';
```

## Quick Start

### Binding to a Global Object

Define a model globally (or attach it to window), then bind an input to it.

```html
<script>
  window.user = {
    name: 'Alice',
    email: 'alice@example.com'
  };
</script>

<!-- The input updates window.user.name, and vice versa -->
<a-bind model="user" property="name">
  <input type="text">
</a-bind>
```

### Binding to an ES Module

You can load a model directly from a file.

```html
<!-- Loads ./models/store.js and binds to the 'theme' property -->
<a-bind model="./models/store.js" property="theme">
  <select>
    <option value="light">Light</option>
    <option value="dark">Dark</option>
  </select>
</a-bind>
```

## Usage Guide

### The `<a-bind>` Element

The core element that creates a link between a data source (Model) and a DOM element. It expects a single child element.

### Attributes

| Attribute | Default | Description |
| :-------- | :------ | :---------- |
| model     | null    | The key to resolve the data. Can be a Global var name, a CSS selector, or a Module URL. |
| property  | mull    | The path to the data inside the model (e.g., user.address.city).|
| elem-attr | value   | The attribute on the child element to update (e.g., value, textContent, style.color). |
| event     | input   | The DOM event that triggers a model update. |
| throttle  | 0       | Time in ms to debounce input/output updates.  |
| pull      | false   | If present, only reads FROM the DOM (One-way: DOM -> Model).  |
| push      | false   | If present, only writes TO the DOM (One-way: Model -> DOM). |
| once      | false   | Update the DOM once on load, then stop listening. |
| debug     | false   | Enables verbose console logging for this binding. |

## Advanced Examples

### Binding CSS Styles:

```html
<a-bind model="appState" property="headerColor" elem-attr="style.backgroundColor">
  <header>...</header>
</a-bind>
```

### Executing Functions:

Instead of binding data, you can bind an event to a function within your model.

```html
<a-bind model="authController" func="login" event="click">
  <button>Log In</button>
</a-bind>
```

### The `<a-bindgroup>` Element

To avoid repeating the "model" attribute on every field, wrap them in a group.

```html
<a-bindgroup model="userSettings">

  <h3>User Settings</h3>

  <!-- Inherits model="userSettings" -->
  <label>Username</label>
  <a-bind property="username">
    <input type="text">
  </a-bind>

  <!-- Inherits model="userSettings" -->
  <label>Notifications</label>
  <a-bind property="preferences.notifications">
    <input type="checkbox">
  </a-bind>

</a-bindgroup>
```

**Note on Nesting:** a-bindgroup uses smart scoping. A binder will only attach to its closest group, meaning you can nest groups without data leaking between them.

## Security Configuration

When using the "model" attribute to load ES Modules (e.g., model="./store.js"), a-bind implements strict security checks to prevent arbitrary module injection.

### Default Behavior
✅ Allowed: Relative paths (./store.js, ../utils/data.js).
✅ Allowed: Absolute paths on the same origin (/assets/js/model.js).
❌ Blocked: Third-party domains (https://evil.com/script.js).

### Whitelisting CDNs or APIs

If you need to load models from a CDN (like unpkg or jsdelivr) or a specific API domain, you must explicitly whitelist them in your JavaScript entry point.

```javaScript
import ABind from './a-bind.js';

// Allow specific external origins
ABind.config.allowedOrigins.push('https://cdn.jsdelivr.net');
ABind.config.allowedOrigins.push('https://api.my-backend.com');
```

### Emergency Override (Dev Only)

For local development where ports might change, you can disable security checks. Do not use this in production.

```javaScript
// DANGER: Disables all origin checks
ABind.config.allowAny = true;
```

## Architecture & Performance

1. Update Batching

a-bind uses an UpdateManager that queues DOM updates and flushes them in a single requestAnimationFrame cycle. This prevents layout thrashing when processing rapid updates or updating multiple bindings simultaneously.

2. Memory Management

The library uses a WeakMap to store model observers. If your data model is garbage collected by the browser, the listeners associated with it are automatically cleaned up, preventing memory leaks in Single Page Applications (SPAs).

3. Smart Throttling

The throttle attribute works both ways:

* Input: Debounces rapid events (like keyup or mousemove) to prevent flooding the model.
* Output: Rate-limits updates coming from the model to prevent the DOM from flickering or freezing during high-frequency data changes.

## Debugging

Struggling to see why a value isn't updating? Add the "debug" attribute to any a-bind or a-bindgroup instance.

```html
<a-bind model="user" property="name" debug>
  <input>
</a-bind>
```

Open your browser console. You will see logs grouping the lifecycle events:
