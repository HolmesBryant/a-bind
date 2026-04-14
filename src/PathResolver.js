/**
 * @file PathResolver.js
 * @description Utility for safe object path resolution and modification.
 * @author Holmes Bryant <https://github.com/HolmesBryant>
 * @license MIT
 */

/**
 * Static utility class for resolving dot-notation paths on objects and DOM elements.
 * Includes caching, security checks against prototype pollution, and special handling
 * for CSS variables and style properties.
 */
export default class PathResolver {
  /**
   * Internal LRU cache for parsed path arrays.
   * @private
   * @static
   * @type {Map<string, string[]>}
   */
  static #pathCache = new Map();

  /**
   * Maximum size of the path cache before older entries are evicted.
   * @private
   * @static
   * @type {number}
   */
  static #maxPathCacheSize = 500;

  /**
   * Retrieves path parts from cache or generates them.
   * Implements a simple Least Recently Used (LRU) eviction policy.
   *
   * @static
   * @param {string} path - The dot-notation path string.
   * @returns {string[]} An array of path segments.
   */
  static getParts(path) {
    // return cached parts if they exist
    if (this.#pathCache.has(path)) {
      const parts = this.#pathCache.get(path);
      this.#pathCache.delete(path);
      this.#pathCache.set(path, parts);
      return [...parts];
    }

    const parts = path.split('.');

    if (this.#pathCache.size >= this.#maxPathCacheSize) {
      const oldestKey = this.#pathCache.keys().next().value;
      this.#pathCache.delete(oldestKey);
    }

    this.#pathCache.set(path, parts);
    return [...parts];
  }

  /**
   * Safely retrieves a value from an object or DOM element using a path.
   * Features:
   * - CSS Variables: Returns computed value if path starts with `--`.
   * - DOM Styles: Handles `style.propertyName`, falling back to `getComputedStyle`.
   * - Nested Objects: Traverses dot notation.
   * - Security: Blocks unsafe paths (prototype pollution).
   *
   * @static
   * @param {object|HTMLElement} obj - The source object or element.
   * @param {string} path - The path to resolve.
   * @returns {any} The resolved value, or undefined.
   */
  static getValue(obj, path) {
    if (!path) return obj;

    // handle css variables (--my-var)
    if (path.startsWith('--') && obj instanceof HTMLElement) {
      return getComputedStyle(obj).getPropertyValue(path).trim();
    }

    const parts = this.getParts(path);
    if (this.isUnsafe(parts)) return undefined;

    // handle css style paths (style.backgroundColor)
    if (obj instanceof HTMLElement && parts[0] === 'style' && parts.length > 1) {
      const styleProp = parts[1];
      // look for inline style first, then try computed style
      return obj.style[styleProp] || getComputedStyle(obj)[styleProp];
    }

    // standard object path
    return parts.reduce((acc, part) => acc?.[part], obj);
  }

  /**
   * Safely sets a value on an object or DOM element using a path.
   * Features:
   * - CSS Variables: Uses `style.setProperty` if path starts with `--`.
   * - DOM Styles: Uses `style.setProperty` for kebab-case properties.
   * - Nested Objects: Traverses dot notation.
   * - Security: Blocks unsafe paths (prototype pollution).
   *
   * @static
   * @param {object|HTMLElement} target - The target object or element.
   * @param {string} path - The path to set.
   * @param {any} value - The value to assign.
   * @returns {boolean} True if assignment was successful, False otherwise.
   */
  static setValue(target, path, value) {
    if (!target || !path) return false;

    // handle css variables (--my-var)
    if (path.startsWith('--') && target instanceof HTMLElement) {
      target.style.setProperty(path, value);
      return true;
    }

    const parts = this.getParts(path);
    if (this.isUnsafe(parts)) {
      console.warn(`PathResolver: Blocked attempt to modify unsafe path "${path}"`);
      return false;
    }

    const lastProp = parts.pop();
    let current = target;

    for (const part of parts) {
      if (current[part] === undefined || current[part] === null) {
        return false; // Path does not exist on target
      }
      current = current[part];
    }

    try {
      // handle style object using setProperty (supports kebab-case)
      if (current instanceof CSSStyleDeclaration && lastProp.includes('-')) {
        current.setProperty(lastProp, value);
      } else {
        current[lastProp] = value;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Checks if a path array contains restricted keywords.
   * Blocks: `__proto__`, `constructor`, `prototype`.
   *
   * @static
   * @param {string[]} parts - The path segments.
   * @returns {boolean} True if the path is unsafe.
   */
  static isUnsafe(parts) {
    return parts.some(p => p === '__proto__' || p === 'constructor' || p === 'prototype');
  }
}
