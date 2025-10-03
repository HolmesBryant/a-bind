# Title

A web component that ...

Demo: [https://holmesbryant.github.io/a-bind/](https://holmesbryant.github.io/a-bind/)

## Features
- feature

## Usage

Include the script tag in your HTTML page.

    <script type="module" src="a-bind.js"></script>

Include the tag in the body, and include your content.

    <!-- html -->
    <a-bind>
        <input>
    </a-bind>

## Attributes
- **attr** REQUIRED|OPTIONAL
    - Description
    - Acceptable values: []

## CSS Custom Properties

This component exposes several custom css properties which affect the appearance of the icon. You must set these properties on the (HTML) element.

    /* Example */


- **--property:**
    - Description
    - Acceptable Values: []

## Examples

### Example One


## Special Notes

If you are binding to custom element attributes (`oa=` or `object-attribute=`) and you have not included a property (`p=` or `property=`) to which the attribute is associated, ABind will convert kebab-case attribute names to camelCase and set the property value to the camelCase version.

If you do have kebab-case attributes, your `attributeChangedCallback` function might look like:

    attributeChangedCallback(attr, oldval, newval) {
        // Convert kebab-case attribute name to camelCase property name
        const propertyName = attr.replace(/-(.)/g, (match, letter) => letter.toUpperCase());
        this[propertyName] = newval;
    }


