/**
 * @file PathResolver.js
 * @description Utility for safe object path resolution and modification.
 */
export default class PathResolver {
  static #pathCache = new Map();
  static #maxPathCacheSize = 500;

  /**
   * Retrieves path parts from cache or generates them.
   * Uses LRU logic.
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

  static isUnsafe(parts) {
    return parts.some(p => p === '__proto__' || p === 'constructor' || p === 'prototype');
  }
}
