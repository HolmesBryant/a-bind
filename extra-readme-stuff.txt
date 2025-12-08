1. Setup
Import the script into your project. Since it relies on import.meta.url, it should be loaded as a module.
code
Html
<script type="module" src="./a-bind.js"></script>
2. The <a-bind> Element
This is the core component. It wraps a single child element (like an <input>, <div>, or another Custom Element) and binds it to a data source.
Basic Two-Way Binding
By default, <a-bind> provides two-way binding. Changes in the input update the model, and changes in the model update the input.
HTML:
code
Html
<!-- Assumes window.appData = { message: 'Hello World' } -->
<a-bind model="appData" property="message">
  <input type="text">
</a-bind>

<a-bind model="appData" property="message">
  <!-- Binds to textContent/innerHTML depending on element type -->
  <span></span>
</a-bind>
Binding Attributes
You can bind to specific attributes of the target element (like style, class, or custom attributes) using elem-attr.
code
Html
<!-- Binds model.color to the input's style.color -->
<a-bind model="appData" property="color" elem-attr="style.color">
  <div style="width: 100px; height: 100px; background: #ccc;">Text</div>
</a-bind>

<a-bind model="appData" property="color">
  <input type="color">
</a-bind>
Element-to-Element Binding
You can use a DOM Selector as the model to bind one HTML element to another.
code
Html
<!-- The Model -->
<input id="source-input" value="Type here...">

<!-- The Observer -->
<a-bind model="#source-input" model-attr="value" elem-attr="textContent">
  <h1></h1>
</a-bind>
One-Way Binding
push: Only push data from Model → DOM (ignore user input).
pull: Only pull data from DOM → Model (ignore model updates).
code
Html
<!-- Read-only view of data -->
<a-bind model="appData" property="score" push>
  <input readonly>
</a-bind>
Event Handling & Functions
You can execute a function on the model instead of setting a property.
code
Html
<a-bind model="appData" func="submitForm" event="click">
  <button>Submit</button>
</a-bind>
3. The <a-bindgroup> Element
This element is used to group multiple bindings that share a common State/Model class. It handles Dynamic Module Loading.
It expects the model attribute to be a file path. It will:
Import the file.
Instantiate the default export (must be a class).
Pass that instance to all child <a-bind> elements.
user-model.js:
code
JavaScript
export default class UserModel {
  constructor() {
    this.name = "John Doe";
    this.email = "john@example.com";
  }
}
HTML:
code
Html
<a-bindgroup model="./user-model.js">

  <label>Name:</label>
  <a-bind property="name">
    <input type="text">
  </a-bind>

  <label>Email:</label>
  <a-bind property="email">
    <input type="text">
  </a-bind>

</a-bindgroup>
4. Reactivity (Important)
Because a-bind uses a "non-intrusive" approach (it doesn't use Proxies to wrap your original objects), standard JavaScript assignments (e.g., appData.message = 'New') will not automatically trigger the UI to update.
You must use the static helper method ABind.update to notify the view of changes made via JavaScript.
code
JavaScript
import ABind from './a-bind.js';

const myModel = { count: 0 };

// ... later in your code ...

// 1. Update the data
myModel.count = 5;

// 2. Notify the view
ABind.update(myModel, 'count', 5);
Note: UI interactions (typing in an <input>) automatically handle this internally.
5. API Reference
<a-bind> Attributes
Attribute	Description	Default
model	The data source. Can be a Global Object name (string), a Selector ID (string), or a generic Object.	null
property	The property path on the model object (e.g., user.address.city).	null
model-attr	Use if the model is an HTML Element and you want to bind to an attribute (e.g., value, src) instead of a JS property.	null
elem-attr	The attribute on the child element to update. Supports style.* or standard attributes.	value
event	The DOM event that triggers a model update.	input
func	Name of a function on the model to execute when the event fires.	null
push	If present, data only flows Model → Element.	false
pull	If present, data only flows Element → Model.	false
once	If present, the element updates only the first time data is received.	false
debug	Logs verbose information to the console for this binding.	false
Static Methods
ABind.update(model, property, value)
Triggers an update for any <a-bind> element watching this model and property.
ABind.updateDefer(model, property, waitMs)
Same as above, but waits waitMs milliseconds before updating.
6. Examples
Checkbox Handling
code
Html
<a-bind model="settings" property="notificationsEnabled">
  <input type="checkbox">
</a-bind>
Select Dropdown
code
Html
<a-bind model="formData" property="favoriteColor">
  <select>
    <option value="red">Red</option>
    <option value="blue">Blue</option>
  </select>
</a-bind>
Dynamic Styling
code
Html
<!-- Binds user.score to the width of the div -->
<a-bind model="user" property="scoreProgress" elem-attr="style.width">
  <div style="height: 20px; background: green;"></div>
</a-bind>
