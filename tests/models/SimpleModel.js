/**
 * A simple model for testing a-bindgroup.
 */
export default class SimpleModel {
  constructor() {
    this.message = 'Hello from SimpleModel';
    this.isChecked = true;
    this.selectedValue = 'b';
  }

  updateMessage() {
    this.message = 'Message Updated!';
  }
}
