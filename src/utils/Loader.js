/**
 * Handles loading and caching of modules and global objects.
 * @file Loader.js
 * @author Holmes Bryant <https://github.com/HolmesBryant>
 * @license GPL-3.0
 * @version 2.5.2
 */
export const Loader = {
  registry: new Map(),
  refCounts: new Map(),
  pending: new Map(),

  // Allows ./, ../, or / (but the char after / cannot be /)
  isModulePath: (str) => /^(\.\/|\.\.\/|\/(?!\/)).*\.m?js$/.test(str),

  async resolve(key) {
    if (!key) return null;
    if (typeof key === 'object') return key; // Already an object

    if (this.registry.has(key)) return this.registry.get(key);
    if (this.pending.has(key)) return this.pending.get(key);

    const loadTask = this.performLoad(key);
    this.pending.set(key, loadTask);

    try {
      const instance = await loadTask;
      if (instance) {
        this.registry.set(key, instance);
        if (!this.refCounts.has(key)) this.refCounts.set(key, 0);
      }
      return instance;
    } catch (error) {
      console.error(`a-bind Loader: Failed to resolve ${key}`, error);
      return null;
    } finally {
      this.pending.delete(key);
    }
  },

  async performLoad(key) {
    let instance = null;

    if (this.isModulePath(key)) {
      try {
        const mod = await import(key);
        const raw = mod.default || mod[Object.keys(mod)[0]];
        instance = this.instantiate(raw);
      } catch (e) {
        console.error(`a-bind: Import failed for ${key}`, e);
        return null;
      }
    } else {
      // DOM Element or Global Window Object
      if (typeof document !== 'undefined') {
        instance = document.getElementById(key) || document.querySelector(key);

        // If element not found and DOM is parsing, wait for it.
        if (!instance && document.readyState === 'loading') {
          await new Promise(resolve => {
            window.addEventListener('DOMContentLoaded', resolve, { once: true });
          });
          instance = document.getElementById(key) || document.querySelector(key);
        }
      }

      if (!instance && typeof window !== 'undefined' && key in window) {
        instance = this.instantiate(window[key]);
      }
    }

    if (instance?.localName?.includes('-')) {
      await customElements.whenDefined(instance.localName);
    }

    return instance;
  },

  incrementRef(key) {
    if (key && typeof key === 'string') {
      const current = this.refCounts.get(key) || 0;
      this.refCounts.set(key, current + 1);
    }
  },

  decrementRef(key) {
    if (key && typeof key === 'string') {
      const current = this.refCounts.get(key);
      if (current !== undefined) {
        if (current <= 1) {
          this.refCounts.delete(key);
          this.registry.delete(key);
        } else {
          this.refCounts.set(key, current - 1);
        }
      }
    }
  },

  instantiate(obj) {
    // only instantiate instantiable objects
    try {
      if (typeof obj === 'function' && obj.prototype && obj.prototype.constructor.name) {
        return new obj();
      }

      return obj;
    } catch {
      return obj;
    }
  },

  // Public Getter for inspection
  getCacheKeys() {
    return Array.from(this.registry.keys());
  }
};
