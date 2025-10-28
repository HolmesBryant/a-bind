import Testrunner from "./ATestRunner.js";

const domReady = new Promise(resolve => {
  if (document.readyState === 'interactive' || document.readyState === 'complete') {
    resolve();
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      resolve();
    });
  }
});

await domReady;
await customElements.whenDefined('a-bind');
await customElements.whenDefined('custom-element');

const file = "../src/a-bind.js";
const a = new Testrunner();
const info = a.info.bind(a);
const test = a.test.bind(a);
const wait = a.wait.bind(a);
const when = a.when.bind(a);
const spyOn = a.spyOn.bind(a);
const halt = () => { throw new Error('Execution Halted') }

const mod = document.querySelector('custom-element');
let input = document.querySelector('#my-input');

info('two-way data binding');
info("testing text input");

test(
  'Component property "myInput" should be set to "foo"',
  mod.myInput, "foo");

test(
  'There should be an html input bound to "myInput"',
  input instanceof HTMLElement, true)

test(
  'Input value should be initialized from model property',
  await when(() => input.value), "foo");

test(
  'Input value should be initialized from model property',
  input.value, "foo");

test(
  'Model property should be initialized correctly',
  mod.myInput, "foo"
);

input.value = 'bar';
input.dispatchEvent(new window.Event('input'));

test(
  'Model property should update when input changes',
  mod.myInput, 'bar'
);

abind.update(mod, 'myInput', 'baz');

test(
  'Input value should update when model changes',
  input.value, 'baz'
);

const select = document.querySelector('#my-select');
info("testing select input")

test(
  'should bind single-select value to model property',
  select.value, 'foo'
  );

select.value = 'baz';
select.dispatchEvent(new Event('input'));

test(
  'Model should update on select change',
  mod.mySelect, 'baz'
  );

abind.update(mod, 'mySelect', 'bar');

test(
  'Select value should update on model change',
  select.value, 'bar'
  );

const selectMulti = document.querySelector('#my-select-multi');
const initialValues = Array.from(selectMulti.selectedOptions).map(opt => opt.value);

info("testing select multiple input")

test(
  'Multiple select should initialize with ["foo", "bar"]',
  initialValues, ['foo', 'bar']
  )

selectMulti.options[2].selected = true; // Select 'baz'
selectMulti.dispatchEvent(new Event('input'));

test(
  'Model should update with all selected options',
  mod.mySelectMulti, ['foo', 'bar', 'baz']
  );

window.abind.update(mod, 'mySelectmulti', ['baz']);
const updatedValues = Array.from(selectMulti.selectedOptions).map(opt => opt.value);

test(
  'Multiple select should update to only have "baz" selected',
  updatedValues, ['baz']
  );


info('testing checkbox');
const checkbox = document.querySelector('#my-checkbox');

test(
  'Checkbox should be checked initially',
  checkbox.checked, true
  );

test(
  'Model property should be "foo" initially',
  mod.myCheckbox, 'foo'
  );

checkbox.checked = false;
checkbox.dispatchEvent(new Event('input'));

test(
  'Model property should be empty when unchecked',
  mod.myCheckbox, ''
  )

abind.update(mod, 'myCheckbox', 'foo');

test(
  'Checkbox should become checked on model update',
  checkbox.checked, true
  )

const radioFoo = document.querySelector('#rad-foo');
const radioBar = document.querySelector('#rad-bar');

info('testing radio inputs')

test(
  'Radio "foo" should be checked initially',
  radioFoo.checked, true
  );

test(
  'Radio "bar" should be unchecked initially',
  radioBar.checked, false
  );

radioBar.checked = true;
radioBar.dispatchEvent(new window.Event('input'));

test(
  'Model property should update to "bar"',
  mod.myRadioGroup, 'bar'
  );

window.abind.update(mod, 'myRadiogroup', 'foo');

test(
  'Radio "foo" should become checked on model update',
  radioFoo.checked, true
  );

test(
  'Radio "bar" should become unchecked',
  radioBar.checked, false
  )

info('One-Way Data Binding');

let output = document.querySelector('a-bind#pull-test output');

test(
  'Initial value of attribute "some-attr" should be "attr value"',
  mod.getAttribute('some-attr'), "attr value"
  );

test(
  'Initial output text should be "attr value"',
  output.value, "attr value");

info('push should only bind from element event to model attribute');

const buttonAttr = document.querySelector('#button2');
buttonAttr.dispatchEvent(new MouseEvent('click'));

test(
  'Model attribute should be updated on button click',
  mod.getAttribute('some-attr'), "updated by button");

test(
  'Output bound to the same attribute should be updated',
  output.value, "updated by button");

info('Function Execution');
const buttonClick = document.querySelector('#button4');
let spy = spyOn(mod, 'handleClick');
buttonClick.dispatchEvent(new MouseEvent('click'));

test(
  'handleClick method should fire when button is clicked',
  spy.calls.length > 0, true)


test(
  'handleClick method should be passed an Event object',
  spy.calls[0] instanceof Event, true);

spy.restore();
const buttonConsole = document.querySelector('#button1');
spy = spyOn(console, 'log');
buttonConsole.dispatchEvent(new MouseEvent('click'));

test(
  'when button is clicked, console.log should be invoked',
  spy.calls.length === 1, true);

spy.restore()

info('Advanced Attribute Binding');
info('should bind to multiple element attributes');

const newbuttonAttr = document.querySelector('a-bind[elem-attr="textContent, value"] button');

test(
  'Initial model property is "foo"',
  mod.myButton, 'foo'
  );

test(
  'Button textContent should be initialized',
  newbuttonAttr.textContent, 'foo'
  );

test(
  'Button value should be initialized',
  newbuttonAttr.value, 'foo'
  )

window.abind.update(mod, 'myButton', 'new text');

test(
  'Button textContent should update on model change',
  newbuttonAttr, 'new text');

test(
  'Button value should update on model change',
  newbuttonAttr.value, 'new text');

info('should bind a model property to a boolean attribute like "disabled"');

const nestedInput = document.querySelector('a-bind[property="isDisabled"] > a-bind > input');

test(
  'Model isDisabled property is initially true',
  mod.isDisabled, true);

// console.log(when(() => nestedInput.disabled).then(result => console.log(result)))

wait(1);

test(
  'the nested input element should be disabled',
    nestedInput.disabled, true);

info('once: should bind initial value but not update afterwards');

output = document.querySelector('#once-output');


test(
  'Output should have the initial value',
  output.value, 'foo'
  );

window.abind.update(mod, 'myInput', 'new value');

test(
  'Output value should not change after model update',
  output.value, 'foo');

info('elem-attr: should bind to a CSS style property');
const div = document.querySelector('#style-binding-div');

test(
  'Div initial color should be blue',
  div.style.color, 'blue');

mod.myColor = 'red';
abind.update(mod, 'myColor', 'red');

test(
  'Div color should update to red',
  div.style.color, 'red');

info('disconnectedCallback: should teardown listeners when removed from DOM');

// create a temporary container
const container = document.createElement('div');
container.innerHTML = `
    <a-bind model="custom-element" property="myButton">
        <output id="disconnect-test-output"></output>
    </a-bind>
`;

document.body.appendChild(container);
// throw new Error('execution halted')
const abindElement = container.querySelector('a-bind');
output = document.querySelector('#disconnect-test-output');


test(
  'Output is bound correctly initially',
  output.value, 'foo');

abindElement.remove();
window.abind.update(mod, 'myButton', 'updated value');

test(
  'Output value should not change after its a-bind parent is removed',
  output.value, 'foo');

info('attributeChangedCallback: should re-bind when "property" attribute changes');

const abindElement2 = document.querySelector('#rebind-test');
output = abindElement.querySelector('output');

// Check initial binding to 'propA'
test(
  'Initially bound to propA',
  output.value, 'Value A');

// Dynamically change the 'property' attribute to bind to 'propB'
abindElement.setAttribute('property', 'propB');

wait(1);

// Verify it now shows the value of the new property
test(
  'Output should now display value of propB',
  output.value, 'Value B');

// Update the OLD property and verify the element does NOT change
window.abind.update(mod, 'propA', 'New Value A');

test(
  'Output should no longer listen to propA',
  output.value, 'Value B');

// Update the NEW property and verify the element DOES change
window.abind.update(mod, 'propB', 'New Value B');

test(
  'Output should now listen to propB',
  output.value, 'New Value B');

info('Error Handling: should log error if the attribute "model" is missing');

spy = spyOn(console, 'error');

let el = document.createElement('a-bind');
el.innerHTML = `<input>`;

// connectedCallback triggers initialize
document.body.appendChild(el);

test(
  'console.error should have been called',
  spy.calls[0].includes('"model" attribute is required'),
  true)

spy.restore();
el.remove();

info('Error Handling: should log error if child element is missing');
spy = spyOn(console, 'error');
el = document.createElement('a-bind');
el.setAttribute('model', 'custom-element');
document.body.appendChild(el);

test(
  'console.error should fire',
  spy.calls.length === 1, true
  );

test(
  'The error message is correct',
  spy.calls[0].includes('Must have one child element'), true);

spy.restore();
el.remove;

info('Nested Properties: should perform two-way binding on nested object property');

input = document.querySelector('#nested-prop-input');

test(
'Input should be initialized with nested property value',
input.value, 'Alice' );

input.value = 'Bob';
input.dispatchEvent(new Event('input'));

test(
'Nested model property should update',
mod.user.name, 'Bob')

abind.update(mod, 'user.name', 'Charlie');

test(
  'Input should update when nested model property changes',
  input.value, 'Charlie');
