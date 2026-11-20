/**
 * Production PostgreSQL Storage Adapter for email-auth-kit
 *
 * Requirements:
 * npm install pg
 *
 * SQL Schema:
 * CREATE TABLE IF NOT EXISTS otp_tokens (
 *   key VARCHAR(255) PRIMARY KEY,
 *   data JSONB NOT NULL,
 *   expires_at TIMESTAMPTZ NOT NULL,
 *   attempts INT NOT NULL DEFAULT 0
 * );
 * CREATE INDEX IF NOT EXISTS idx_otp_expires_at ON otp_tokens(expires_at);
 *
 * Usage:
 * import pg from "pg";
 * import { EmailAuth } from "@evlox/email-auth-kit";
 * import { PostgresOTPStore } from "./postgres-store.js";
 *
 * const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
 * const auth = new EmailAuth({
 *   store: new PostgresOTPStore(pool),
 *   // ... other options
 * });
 */
import { OTPStore } from "@evlox/email-auth-kit";

export class PostgresOTPStore extends OTPStore {
  /**
   * @param {import("pg").Pool} pool
   * @param {string} [tableName="otp_tokens"]
   */
  constructor(pool, tableName = "otp_tokens") {
    super();
    this.pool = pool;
    this.tableName = tableName;
  }

  async set(key, data, ttlSeconds) {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    const query = `
      INSERT INTO ${this.tableName} (key, data, expires_at, attempts)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (key) DO UPDATE
      SET data = EXCLUDED.data,
          expires_at = EXCLUDED.expires_at,
          attempts = EXCLUDED.attempts;
    `;
    await this.pool.query(query, [
      key,
      JSON.stringify(data),
      expiresAt,
      data.attempts || 0
    ]);
  }

  async get(key) {
    const query = `
      SELECT data, attempts, expires_at
      FROM ${this.tableName}
      WHERE key = $1 AND expires_at > NOW();
    `;
    const res = await this.pool.query(query, [key]);
    if (res.rows.length === 0) return null;

    const row = res.rows[0];
    const data = typeof row.data === "string" ? JSON.parse(row.data) : row.data;
    return {
      ...data,
      attempts: row.attempts,
      expiresAt: new Date(row.expires_at).getTime()
    };
  }

  async incrementAttempts(key) {
    const query = `
      UPDATE ${this.tableName}
      SET attempts = attempts + 1
      WHERE key = $1 AND expires_at > NOW()
      RETURNING attempts;
    `;
    const res = await this.pool.query(query, [key]);
    if (res.rows.length === 0) return 0;
    return res.rows[0].attempts;
  }

  async delete(key) {
    const query = `DELETE FROM ${this.tableName} WHERE key = $1;`;
    const res = await this.pool.query(query, [key]);
    return res.rowCount > 0;
  }

  async clear() {
    await this.pool.query(`TRUNCATE TABLE ${this.tableName};`);
  }

  /**
   * Cleanup expired tokens (can be scheduled in cron or pg_cron).
   */
  async cleanExpired() {
    await this.pool.query(`DELETE FROM ${this.tableName} WHERE expires_at <= NOW();`);
  }

  async close() {
    await this.pool.end();
  }
}

