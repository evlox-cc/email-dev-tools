import { OTPStore } from "./base.js";

/**
 * In-memory storage adapter for development, prototyping, and single-instance testing.
 *
 * NOTE: Never use InMemoryOTPStore in distributed production environments (e.g. Kubernetes,
 * serverless lambdas, multiple cluster workers). In-memory state is not shared between processes
 * or instances and does not persist across restarts. Use a distributed adapter (such as Redis)
 * in production.
 */
export class InMemoryOTPStore extends OTPStore {
  /**
   * @param {object} [options]
   * @param {number} [options.cleanupIntervalMs=60000] - Interval in ms to sweep expired keys
   * @param {boolean} [options.suppressWarning=false] - Suppress production warning in logs
   */
  constructor(options = {}) {
    super();
    /** @type {Map<string, { data: Record<string, unknown>, expiresAt: number, attempts: number }>} */
    this._store = new Map();
    this._cleanupIntervalMs = options.cleanupIntervalMs || 60000;

    if (
      process.env.NODE_ENV === "production" &&
      !options.suppressWarning
    ) {
      console.warn(
        "[@evlox/email-auth-kit] WARNING: Using InMemoryOTPStore in production. " +
        "This store is NOT distributed and will fail across multiple server instances. " +
        "Use a Redis or database-backed store for production deployments."
      );
    }

    this._cleanupTimer = setInterval(() => {
      this._sweepExpired();
    }, this._cleanupIntervalMs);

    if (this._cleanupTimer.unref) {
      this._cleanupTimer.unref();
    }
  }

  /**
   * Store data with TTL in seconds.
   * @param {string} key
   * @param {Record<string, unknown>} data
   * @param {number} ttlSeconds
   */
  async set(key, data, ttlSeconds) {
    const expiresAt = Date.now() + Math.max(0.001, ttlSeconds) * 1000;
    this._store.set(key, {
      data: { ...data },
      expiresAt,
      attempts: typeof data.attempts === "number" ? data.attempts : 0
    });
  }

  /**
   * Get data for a key. Returns null if expired or missing.
   * @param {string} key
   * @returns {Promise<Record<string, unknown> | null>}
   */
  async get(key) {
    const record = this._store.get(key);
    if (!record) {
      return null;
    }

    if (Date.now() > record.expiresAt) {
      this._store.delete(key);
      return null;
    }

    return {
      ...record.data,
      attempts: record.attempts,
      expiresAt: record.expiresAt
    };
  }

  /**
   * Atomically increment the attempts counter.
   * @param {string} key
   * @returns {Promise<number>}
   */
  async incrementAttempts(key) {
    const record = this._store.get(key);
    if (!record || Date.now() > record.expiresAt) {
      this._store.delete(key);
      return 0;
    }

    record.attempts += 1;
    if (record.data) {
      record.data.attempts = record.attempts;
    }
    return record.attempts;
  }

  /**
   * Delete an entry by key.
   * @param {string} key
   * @returns {Promise<boolean>}
   */
  async delete(key) {
    return this._store.delete(key);
  }

  /**
   * Remove all entries.
   */
  async clear() {
    this._store.clear();
  }

  /**
   * Clear interval timer.
   */
  async close() {
    if (this._cleanupTimer) {
      clearInterval(this._cleanupTimer);
    }
    this._store.clear();
  }

  /**
   * Internal sweep of expired keys.
   * @private
   */
  _sweepExpired() {
    const now = Date.now();
    for (const [key, record] of this._store.entries()) {
      if (now > record.expiresAt) {
        this._store.delete(key);
      }
    }
  }

  /**
   * Get current number of stored keys (including pending expiration).
   * @returns {number}
   */
  get size() {
    return this._store.size;
  }
}
