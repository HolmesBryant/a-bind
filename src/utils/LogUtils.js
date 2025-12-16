/**
 * Utilities for formatted console logging.
 * @file index.js
 * @author Holmes Bryant <https://github.com/HolmesBryant>
 * @license GPL-3.0
 * @version 2.5.2
 */
export const LogUtils = {
  getSignature(target) {
    // Handle null/undefined
    if (!target) return 'null';

    // Handle Global Objects
    if (target === window) return 'Window';
    if (target === document) return 'Document';

    // Handle DOM Nodes
    if (target.nodeType) {
      if (target.nodeType === 3) return '#text';

      // Safe tag name retrieval
      let name = (target.localName || target.nodeName || 'element').toLowerCase();

      // Add ID
      if (target.id) name += `#${target.id}`;

      // Add Classes
      if (target.classList && target.classList.length) {
        name += `.${[...target.classList].join('.')}`;
      }
      return name;
    }

    // Handle Objects
    if (typeof target === 'object') {
      const constructorName = target.constructor?.name;
      if (constructorName && constructorName !== 'Object') {
        return constructorName;
      }
      return 'Object';
    }

    return String(target);
  },

  log(context, action, data = {}) {
    if (!context.debug) return;

    // calculate signatures from trace data
    const t = context.trace || {};
    const modelSig = t.modelInstance ? this.getSignature(t.modelInstance) : 'Model';
    const domSig = t.boundElement ? this.getSignature(t.boundElement) : 'DOM';

    // determine direction & colors
    const isModelUpdate = action === 'Update Model';
    const isDomUpdate = action === 'Update DOM';

    let dirIcon = '•';
    let badgeColor = '#777';
    let lhs = 'Unknown';
    let rhs = 'Unknown';

    if (isDomUpdate) {
      dirIcon = '➔'; // Model -> DOM
      badgeColor = '#00796b'; // Teal
      lhs = `${modelSig} [${t.modelProp}: ${this.formatVal(data.value)}]`;
      rhs = `${domSig} [${t.elemProp}]`;
    } else if (isModelUpdate) {
      dirIcon = '➔'; // DOM -> Model
      badgeColor = '#673ab7';
      lhs = `${domSig} [${t.elemProp}: ${this.formatVal(data.value)}]`;
      rhs = `${modelSig} [${t.modelProp}]`;
    } else {
      // Initialization / Events
      lhs = context.tagName || 'a-bind';
      rhs = context.signature || 'Signature';
      badgeColor = '#c2185b';
    }

    // header output
    const summaryVal = data.actual !== undefined ? data.actual : data.value;

    console.groupCollapsed(
      `%c a-bind %c ${action.toUpperCase()} %c ${lhs} %c${dirIcon}%c ${rhs} %c➔ ${this.formatVal(summaryVal)}`,
      // Tag Badge
      `background: #555; color: #fff; border-radius: 3px 0 0 3px; padding: 2px 5px; font-weight: bold;`,
      // Action Badge
      `background: ${badgeColor}; color: #fff; padding: 2px 5px; font-weight: bold;`,
      // LHS
      `color: inherit; padding-left: 5px;`,
      // Arrow
      `color: inherit; font-weight: bold; padding: 0 5px;`,
      // RHS
      `color: inherit;`,
      // Value
      `color: inherit; font-weight: bold; padding-left: 5px;`
    );

    // details
    if (data.reason) {
      console.log(`%cReason: ${data.reason}`, 'color: #d81b60; font-weight: bold;');
    }

    if (data.previous !== undefined) {
      console.log(
        `%cTarget Prev:%c ${this.formatVal(data.previous)}`,
        'font-weight: bold; color: inherit;',
        'color: #888;'
      );
    }

    console.log(
      `%cAttempting :%c ${this.formatVal(data.value)} %c(${typeof data.value})`,
      'font-weight: bold; color: inherit;',
      'color: inherit;',
      'color: #888; font-style: italic;'
    );

    if (data.actual !== undefined) {
      // Loose equality check handles "25" == 25
      const success = data.actual == data.value;
      const color = success ? '#43a047' : '#e53935';

      console.log(
        `%cPost Update:%c ${this.formatVal(data.actual)} %c${success ? '✓' : '⚠ (Clamped/Rejected)'}`,
        'font-weight: bold; color: inherit;',
        `color: ${color}; font-weight: bold;`,
        `color: ${color};`
      );
    }

    if (context.trace) {
      console.group('Trace Context');
      console.dir({
        Model: {
          ref: t.modelInstance,
          key: t.modelProp,
          currentVal: t.modelValue
        },
        DOM: {
          ref: t.boundElement,
          key: t.elemProp,
          currentVal: t.elemValue
        }
      });
      console.groupEnd();
    }

    console.groupEnd();
  },

  formatVal(v) {
    if (typeof v === 'string') return `"${v}"`;
    if (typeof v === 'object' && v !== null) {
        return Array.isArray(v) ? `[Array(${v.length})]` : `{Object}`;
    }
    return String(v);
  }
};
