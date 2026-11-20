/**
 * Standard RFC-like email regex check.
 */
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

/**
 * Validate and normalize an email address.
 * @param {unknown} email
 * @returns {string} Trimmed, lowercase email
 * @throws {TypeError} If email is not a string
 * @throws {Error} If email format is invalid
 */
export function normalizeEmail(email) {
  if (typeof email !== "string") {
    throw new TypeError("Email must be a string.");
  }
  const trimmed = email.trim().toLowerCase();
  if (!trimmed || trimmed.length > 254 || !EMAIL_REGEX.test(trimmed)) {
    throw new Error(`Invalid email address: "${email}"`);
  }
  return trimmed;
}

/**
 * Validate that an OTP code matches the expected format (digits only, exact length).
 * @param {unknown} code
 * @param {number} [expectedLength]
 * @returns {string} Cleaned code string
 */
export function validateOTPCode(code, expectedLength) {
  if (typeof code !== "string" && typeof code !== "number") {
    throw new TypeError("OTP code must be a string or number.");
  }
  const clean = String(code).trim();
  if (!/^\d+$/.test(clean)) {
    throw new Error("OTP code must contain digits only.");
  }
  if (typeof expectedLength === "number" && clean.length !== expectedLength) {
    throw new Error(`OTP code must be exactly ${expectedLength} digits.`);
  }
  return clean;
}

/**
 * Safely escape HTML characters in strings for email template interpolation.
 * @param {unknown} value
 * @returns {string}
 */
export function escapeHtml(value) {
  if (value === null || value === undefined) {
    return "";
  }
  const str = String(value);
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

