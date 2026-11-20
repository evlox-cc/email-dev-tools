export { EmailAuth } from "./email-auth.js";
export { OTPStore, InMemoryOTPStore } from "./store/index.js";
export {
  EmailAuthError,
  ConfigurationError,
  OTPExpiredError,
  InvalidOTPError,
  MaxAttemptsExceededError,
  TokenExpiredError,
  SMTPError,
  StorageError
} from "./errors.js";
export {
  generateOTP,
  generateSecureToken,
  generateSalt,
  hashOTP,
  hashToken,
  timingSafeCompare
} from "./crypto.js";
export {
  normalizeEmail,
  validateOTPCode,
  escapeHtml
} from "./validator.js";
export {
  renderEmailLayout,
  renderOTPEmail,
  renderVerificationEmail,
  renderPasswordResetEmail
} from "./templates/index.js";

