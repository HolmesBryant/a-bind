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

### Binding to properties having null values
    If binding an element to an object property whose value is null does not result in the desired effect, try setting the value of the element to `"null"`. ie. `<input type="checkbox" value="null">`


