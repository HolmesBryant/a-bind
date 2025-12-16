/**
 * @file DOMBinder.js
 * applying values to DOM elements.
 * @author Holmes Bryant <https://github.com/HolmesBryant>
 * @license GPL-3.0
 * @version 2.5.2
 */
export const DomBinder = {
  update(element, attribute, value) {
    // Styles
    if (attribute.startsWith('style.')) {
      this.updateStyle(element, attribute, value);
      return;
    }

    const tagName = element.localName;
    const type = element.type;

    // Select Multiple
    if (tagName === 'select' && element.multiple && (attribute === 'value' || attribute === 'selected')) {
      this.updateSelectMultiple(element, value);
      return;
    }

    // Boolean Inputs (Radio/Checkbox)
    if (tagName === 'input' && (type === 'checkbox' || type === 'radio')) {
      this.updateBooleanInput(element, type, value);
      return;
    }

    // Standard Attributes/Properties
    this.updateStandard(element, attribute, value);
  },

  updateStyle(element, attribute, value) {
    const cssProp = attribute.substring(6);
    const styleValue = (value === undefined || value === null) ? '' : value;

    // if values are the same, don't update
    if (element.style[cssProp] === styleValue) return;

    if (cssProp.startsWith('--')) {
      element.style.setProperty(cssProp, styleValue);
    } else {
      element.style[cssProp] = styleValue;
    }
  },

  updateSelectMultiple(element, value) {
    const rawVal = (value === undefined || value === null) ? [] : value;
    const valArr = Array.isArray(rawVal) ? rawVal : (String(rawVal).includes(',') ? String(rawVal).split(',') : [rawVal]);
    const cleanArr = valArr.map(item => String(item).trim());

    for (let option of element.options) {
      const shouldSelect = cleanArr.includes(option.value);
      if (option.selected !== shouldSelect) {
        option.selected = shouldSelect;
      }
    }
  },

  updateBooleanInput(element, type, value) {
    let shouldCheck;

    if (type === 'radio') {
      const strVal = (value === undefined || value === null) ? '' : String(value);
      shouldCheck = (String(element.value) === strVal);
      if (element.checked !== shouldCheck) element.checked = shouldCheck;
    } else {
      // Checkbox
      if (Array.isArray(value)) {
        shouldCheck = value.map(String).includes(String(element.value));
      } else if (typeof value === 'boolean') {
        shouldCheck = value;
      } else {
        shouldCheck = value === true || value === 'true';
      }

      if (element.checked !== shouldCheck) element.checked = shouldCheck;
    }
  },

  updateStandard(element, prop, value) {
    const hasProp = prop in element;
    const forceAttr = ['list', 'form', 'type', 'width', 'height'].includes(prop);

    // dirty check prevents cursor jumping
    if (hasProp && !forceAttr && element[prop] === value) return;

    if (hasProp && !forceAttr) {
      try {
        if ('boolean' === typeof element[prop]) {
          const isTrue = value !== null && value !== undefined && value !== false && value !== 'false';
          element[prop] = isTrue;
          if (!isTrue) element.removeAttribute(prop); // CSS selector compatibility
        } else {
          // Text Properties
          element[prop] = (value === undefined || value === null) ? '' : value;
        }
      } catch (e) {
        this.setAttributeSafe(element, prop, value);
      }
    } else {
      this.setAttributeSafe(element, prop, value);
    }
  },

  setAttributeSafe(element, attr, value) {
    if (value === false || value === null || value === undefined) {
      element.removeAttribute(attr);
    } else {
      const strVal = String(value);
      if (element.getAttribute(attr) !== strVal) {
        element.setAttribute(attr, strVal);
      }
    }
  }
};
