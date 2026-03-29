const crypto = require("crypto");

class AICache {
  constructor(maxSize = 100, ttlMs = 10 * 60 * 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttlMs = ttlMs; // 10 min default
  }

  _hash(code, prompt) {
    return crypto
      .createHash("md5")
      .update(`${prompt}::${code}`)
      .digest("hex");
  }

  get(code, prompt) {
    const key = this._hash(code, prompt);
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.data;
  }

  set(code, prompt, data) {
    const key = this._hash(code, prompt);

    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldest = this.cache.keys().next().value;
      this.cache.delete(oldest);
    }

    this.cache.set(key, { data, timestamp: Date.now() });
  }

  clear() {
    this.cache.clear();
  }
}

module.exports = new AICache();
