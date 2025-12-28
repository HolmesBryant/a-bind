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
        const parts = this.getParts(path);
        if (this.isUnsafe(parts)) return undefined;
        return parts.reduce((acc, part) => acc && acc[part], obj);
    }

    static setValue(target, path, value) {
        const parts = this.getParts(path);
        if (this.isUnsafe(parts)) {
            console.warn(`PathResolver: Blocked attempt to modify unsafe path "${path}"`);
            return false;
        }

        const lastProp = parts.pop();
        let current = target;

        for (const part of parts) {
            if (current[part] === undefined || current[part] === null) {
                return false; // Path does not exist
            }
            current = current[part];
        }

        try {
            current[lastProp] = value;
            return true;
        } catch (error) {
            return false;
        }
    }

    static isUnsafe(parts) {
        return parts.some(p => p === '__proto__' || p === 'constructor' || p === 'prototype');
    }
}
