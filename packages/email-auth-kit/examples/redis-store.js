/**
 * Production Redis Storage Adapter for email-auth-kit
 *
 * Requirements:
 * npm install ioredis
 *
 * Usage:
 * import Redis from "ioredis";
 * import { EmailAuth } from "@evlox/email-auth-kit";
 * import { RedisOTPStore } from "./redis-store.js";
 *
 * const redis = new Redis(process.env.REDIS_URL);
 * const auth = new EmailAuth({
 *   store: new RedisOTPStore(redis),
 *   // ... other options
 * });
 */
import { OTPStore } from "@evlox/email-auth-kit";

export class RedisOTPStore extends OTPStore {
  /**
   * @param {import("ioredis").Redis} redisClient
   * @param {string} [prefix="auth:otp:"]
   */
  constructor(redisClient, prefix = "auth:otp:") {
    super();
    this.redis = redisClient;
    this.prefix = prefix;
  }

  _k(key) {
    return `${this.prefix}${key}`;
  }

  /**
   * Store data as serialized JSON with TTL in seconds.
   */
  async set(key, data, ttlSeconds) {
    const raw = JSON.stringify(data);
    await this.redis.set(this._k(key), raw, "EX", Math.max(1, ttlSeconds));
  }

  /**
   * Retrieve parsed data. Returns null if missing or expired.
   */
  async get(key) {
    const raw = await this.redis.get(this._k(key));
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  /**
   * Atomically increment attempts.
   */
  async incrementAttempts(key) {
    const record = await this.get(key);
    if (!record) return 0;

    const attempts = (record.attempts || 0) + 1;
    record.attempts = attempts;

    // Preserve remaining TTL
    const ttl = await this.redis.ttl(this._k(key));
    if (ttl > 0) {
      await this.redis.set(this._k(key), JSON.stringify(record), "EX", ttl);
    }
    return attempts;
  }

  /**
   * Atomically delete key (consumed or invalidated).
   */
  async delete(key) {
    const res = await this.redis.del(this._k(key));
    return res > 0;
  }

  /**
   * Clear all keys with this prefix.
   */
  async clear() {
    const keys = await this.redis.keys(`${this.prefix}*`);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  async close() {
    await this.redis.quit();
  }
}

