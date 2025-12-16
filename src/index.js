/**
 * @file index.js
 * @author Holmes Bryant <https://github.com/HolmesBryant>
 * @license GPL-3.0
 * @version 2.5.2
 */
import { ABind } from './a-bind.js';
import { ABindgroup } from './a-bindgroup.js';
import { ModelObserver } from './utils/observer.js';

// Register Components
if (!customElements.get('a-bind')) customElements.define('a-bind', ABind);
if (!customElements.get('a-bindgroup')) customElements.define('a-bindgroup', ABindgroup);

// Expose Static APIs globally or as module exports
ABind.update = (model, property, value) => {
  const observer = ModelObserver.get(model, true);
  if (observer) observer.publish(property, value);
};

ABind.updateDefer = (model, property, waitMs = 0) => {
  setTimeout(() => {
    // Safe-ish retrieval for updateDefer
    const parts = property.split('.');
    const val = parts.reduce((acc, part) => acc && acc[part], model);
    ABind.update(model, property, val);
  }, waitMs);
};

// Global fallback for non-module environments
if (typeof window !== 'undefined') {
  window.abind = ABind;
}

export { ABind, ABindgroup };
