/**
 * A simple model for testing a-bindgroup.
 */
export default class SimpleModel {
  message;
  isChecked;
  selectedValue;

  defaults = {
    message: 'Hello from SimpleModel',
    isChecked: true,
    selectedValue: 'b'
  }

  constructor() {
    this.init();
  }

  init() {
    for (const prop in this.defaults) {
      this[prop] = this.defaults[prop];
    }
  }

  updateMessage() {
    this.message = 'Message Updated!';
  }
}
