import { InvalidRecipientError } from "./errors.js";

const EMAIL_PATTERN = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

/**
 * Validate and clean a single email address string.
 * @param {unknown} email
 * @returns {string}
 */
export function cleanEmail(email) {
  if (typeof email !== "string") {
    throw new InvalidRecipientError(`Recipient must be a string, got ${typeof email}.`);
  }
  const trimmed = email.trim();
  // Support "Name <email@domain.com>" format or direct "email@domain.com"
  const bracketMatch = trimmed.match(/<([^>]+)>/);
  const candidate = bracketMatch ? bracketMatch[1].trim() : trimmed;

  if (!candidate || !EMAIL_PATTERN.test(candidate)) {
    throw new InvalidRecipientError(`Invalid email recipient format: "${email}"`);
  }
  return trimmed;
}

/**
 * Normalize input recipient parameter (string or array of strings) into an array of cleaned emails.
 * @param {unknown} recipients
 * @returns {string[]}
 */
export function normalizeRecipients(recipients) {
  if (!recipients) {
    return [];
  }
  const list = Array.isArray(recipients) ? recipients : [recipients];
  if (list.length === 0) {
    throw new InvalidRecipientError("Recipient list cannot be empty.");
  }
  return list.map((item) => cleanEmail(item));
}

/**
 * HTML escape utility.
 * @param {unknown} val
 * @returns {string}
 */
export function escapeHtml(val) {
  if (val === null || val === undefined) {
    return "";
  }
  return String(val)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

