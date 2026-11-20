/**
 * Base error class for notify-kit.
 */
export class NotifyKitError extends Error {
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

export class ConfigurationError extends NotifyKitError {
  constructor(message, details = {}) {
    super(message, "CONFIGURATION_ERROR", details);
  }
}

export class SMTPError extends NotifyKitError {
  constructor(message, details = {}) {
    super(message, "SMTP_ERROR", details);
  }
}

export class InvalidRecipientError extends NotifyKitError {
  constructor(message, details = {}) {
    super(message, "INVALID_RECIPIENT", details);
  }
}

export class TemplateError extends NotifyKitError {
  constructor(message, details = {}) {
    super(message, "TEMPLATE_ERROR", details);
  }
}

export class DeliveryError extends NotifyKitError {
  constructor(message, details = {}) {
    super(message, "DELIVERY_ERROR", details);
  }
}

