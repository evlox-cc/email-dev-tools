/**
 * Base error class for all email-auth-kit errors.
 */
export class EmailAuthError extends Error {
  /**
   * @param {string} message
   * @param {string} code
   * @param {Record<string, unknown>} [details]
   */
  constructor(message, code, details = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.details = details;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Thrown when required configuration options are missing or invalid.
 */
export class ConfigurationError extends EmailAuthError {
  /**
   * @param {string} message
   * @param {Record<string, unknown>} [details]
   */
  constructor(message, details = {}) {
    super(message, "CONFIGURATION_ERROR", details);
  }
}

/**
 * Thrown when an OTP has expired.
 */
export class OTPExpiredError extends EmailAuthError {
  /**
   * @param {string} [message]
   * @param {Record<string, unknown>} [details]
   */
  constructor(message = "OTP has expired. Please request a new one.", details = {}) {
    super(message, "OTP_EXPIRED", details);
  }
}

/**
 * Thrown when an OTP is incorrect.
 */
export class InvalidOTPError extends EmailAuthError {
  /**
   * @param {string} [message]
   * @param {Record<string, unknown>} [details]
   */
  constructor(message = "Invalid OTP code provided.", details = {}) {
    super(message, "INVALID_OTP", details);
  }
}

/**
 * Thrown when the maximum verification attempts for an OTP are exceeded.
 */
export class MaxAttemptsExceededError extends EmailAuthError {
  /**
   * @param {string} [message]
   * @param {Record<string, unknown>} [details]
   */
  constructor(
    message = "Maximum verification attempts exceeded. Please request a new OTP.",
    details = {}
  ) {
    super(message, "MAX_ATTEMPTS_EXCEEDED", details);
  }
}

/**
 * Thrown when an email verification or password reset token has expired or is invalid.
 */
export class TokenExpiredError extends EmailAuthError {
  /**
   * @param {string} [message]
   * @param {Record<string, unknown>} [details]
   */
  constructor(message = "Token has expired or is invalid.", details = {}) {
    super(message, "TOKEN_EXPIRED", details);
  }
}

/**
 * Thrown when an SMTP communication or transport error occurs.
 */
export class SMTPError extends EmailAuthError {
  /**
   * @param {string} message
   * @param {Record<string, unknown>} [details]
   */
  constructor(message, details = {}) {
    super(message, "SMTP_ERROR", details);
  }
}

/**
 * Thrown when a storage adapter operation fails.
 */
export class StorageError extends EmailAuthError {
  /**
   * @param {string} message
   * @param {Record<string, unknown>} [details]
   */
  constructor(message, details = {}) {
    super(message, "STORAGE_ERROR", details);
  }
}

