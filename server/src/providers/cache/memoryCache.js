/**
 * memoryCache.js
 * In-memory TTL (Time-To-Live) cache utility.
 * Used inside the provider layer to minimize external API hits, bypass rate limits,
 * and accelerate development cycles by returning cached files for identical queries.
 */

const config = require('../../config/env');

class MemoryCache {
  /**
   * @param {Object} [options]
   * @param {number} [options.defaultTtlMs] - Global default TTL override
   * @param {number} [options.pruneIntervalMs] - Interval to auto-delete stale keys (default: 5 minutes)
   */
  constructor(options = {}) {
    this.store = new Map();
    this.defaultTtlMs = options.defaultTtlMs || config.cacheTtlMs || 3600000;
    
    // Auto-prune stale entries periodically to prevent memory leaks
    const pruneIntervalMs = options.pruneIntervalMs || 300000;
    this.pruneTimer = setInterval(() => this.prune(), pruneIntervalMs);
    // Unref timer so Node process can exit cleanly in tests
    if (this.pruneTimer.unref) {
      this.pruneTimer.unref();
    }
  }

  /**
   * Generates a unique string key from complex arguments (e.g., query objects).
   * 
   * @param {string} prefix - Namespace prefix (e.g., "financials")
   * @param {string|Object} keyArgs - Dynamic arguments
   * @returns {string} Standardized string key.
   */
  generateKey(prefix, keyArgs) {
    const suffix = typeof keyArgs === 'string' 
      ? keyArgs.trim().toUpperCase() 
      : JSON.stringify(keyArgs);
    return `${prefix}:${suffix}`;
  }

  /**
   * Gets a value from the cache. Returns null if expired or missing.
   * 
   * @param {string} key 
   * @returns {*} Cached payload or null.
   */
  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;

    const isExpired = Date.now() > entry.expiry;
    if (isExpired) {
      console.log(`[Cache]: Key expired: ${key}`);
      this.store.delete(key);
      return null;
    }

    console.log(`[Cache]: Hit for key: ${key}`);
    return entry.value;
  }

  /**
   * Sets a value in the cache with a specified or default TTL.
   * 
   * @param {string} key 
   * @param {*} value - Data to cache
   * @param {number} [ttlMs] - Custom TTL in milliseconds
   */
  set(key, value, ttlMs = null) {
    const duration = ttlMs !== null ? ttlMs : this.defaultTtlMs;
    const expiry = Date.now() + duration;
    
    this.store.set(key, {
      value,
      expiry
    });
    console.log(`[Cache]: Saved key: ${key} (TTL: ${duration}ms)`);
  }

  /**
   * Deletes a specific key.
   * 
   * @param {string} key 
   */
  delete(key) {
    this.store.delete(key);
  }

  /**
   * Clears all cache entries.
   */
  clear() {
    this.store.clear();
    console.log(`[Cache]: Cache cleared completely.`);
  }

  /**
   * Removes all expired cache keys from memory.
   */
  prune() {
    const now = Date.now();
    let prunedCount = 0;
    
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiry) {
        this.store.delete(key);
        prunedCount++;
      }
    }
    
    if (prunedCount > 0) {
      console.log(`[Cache]: Pruned ${prunedCount} expired keys.`);
    }
  }

  /**
   * Disables and clears the automatic pruning cycle (useful in testing suites).
   */
  destroy() {
    clearInterval(this.pruneTimer);
    this.clear();
  }
}

// Export single singleton instance for global caching consistency
module.exports = new MemoryCache();
