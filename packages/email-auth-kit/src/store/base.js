/**
 * Abstract base class for OTP and token storage adapters.
 * Custom adapters (e.g., Redis, PostgreSQL, DynamoDB) should extend this class
 * or implement this interface.
 */
export class OTPStore {
  /**
   * Store data associated with a key with a time-to-live.
   * @param {string} _key
   * @param {Record<string, unknown>} _data
   * @param {number} _ttlSeconds
   * @returns {Promise<void>}
   */
  async set(_key, _data, _ttlSeconds) {
    throw new Error("Method 'set' must be implemented by storage adapter.");
  }

  /**
   * Retrieve data for a key. Returns null if not found or expired.
   * @param {string} _key
   * @returns {Promise<Record<string, unknown> | null>}
   */
  async get(_key) {
    throw new Error("Method 'get' must be implemented by storage adapter.");
  }

  /**
   * Atomically increment the attempts counter for a key.
   * @param {string} _key
   * @returns {Promise<number>} Updated attempt count
   */
  async incrementAttempts(_key) {
    throw new Error("Method 'incrementAttempts' must be implemented by storage adapter.");
  }

  /**
   * Delete data for a key (used for invalidation and consumption).
   * @param {string} _key
   * @returns {Promise<boolean>} True if deleted, false if not found
   */
  async delete(_key) {
    throw new Error("Method 'delete' must be implemented by storage adapter.");
  }

  /**
   * Clear all stored records (useful for testing).
   * @returns {Promise<void>}
   */
  async clear() {
    throw new Error("Method 'clear' must be implemented by storage adapter.");
  }

  /**
   * Optional cleanup/shutdown hook.
   * @returns {Promise<void>}
   */
  async close() {
    // Default no-op
  }
}

