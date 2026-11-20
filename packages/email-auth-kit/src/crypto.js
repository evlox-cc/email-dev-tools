import crypto from "node:crypto";

/**
 * Generate a cryptographically secure random numeric OTP string.
 * @param {number} [length=6] - Desired number of digits (4 to 12)
 * @returns {string} Zero-padded numeric string
 */
export function generateOTP(length = 6) {
  if (typeof length !== "number" || length < 4 || length > 12) {
    throw new RangeError("OTP length must be an integer between 4 and 12.");
  }
  const max = 10 ** length;
  const num = crypto.randomInt(0, max);
  return num.toString().padStart(length, "0");
}

/**
 * Generate a cryptographically secure random hex token.
 * @param {number} [bytes=32]
 * @returns {string} Hex-encoded random string
 */
export function generateSecureToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("hex");
}

/**
 * Generate a cryptographically secure salt string.
 * @param {number} [bytes=16]
 * @returns {string}
 */
export function generateSalt(bytes = 16) {
  return crypto.randomBytes(bytes).toString("hex");
}

/**
 * Hash an OTP with a given salt using HMAC-SHA256.
 * @param {string} otp
 * @param {string} salt
 * @returns {string} Hex-encoded hash
 */
export function hashOTP(otp, salt) {
  return crypto
    .createHmac("sha256", salt)
    .update(String(otp))
    .digest("hex");
}

/**
 * Hash a verification or reset token using SHA-256.
 * @param {string} token
 * @returns {string} Hex-encoded hash
 */
export function hashToken(token) {
  return crypto
    .createHash("sha256")
    .update(String(token))
    .digest("hex");
}

/**
 * Timing-safe comparison of two strings.
 * Protects against timing side-channel attacks.
 * @param {string} a
 * @param {string} b
 * @returns {boolean} True if strings match
 */
export function timingSafeCompare(a, b) {
  if (typeof a !== "string" || typeof b !== "string") {
    return false;
  }
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");

  if (bufA.length !== bufB.length) {
    // Constant-time dummy comparison to prevent length timing leaks
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }

  return crypto.timingSafeEqual(bufA, bufB);
}

