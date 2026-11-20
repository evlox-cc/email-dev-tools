# Changelog — email-auth-kit

All notable changes to this package are documented here.

## [1.0.0] - 2026-11-19

### Added
- `EmailAuth` class with full OTP send/verify lifecycle
- `sendOTP(email, options)` — cryptographically secure OTP delivery
- `verifyOTP(email, code, options)` — timing-safe, single-use verification
- `sendVerificationEmail(email, options)` — email address verification flow
- `verifyToken(email, token)` — secure single-use token verification
- `sendPasswordReset(email, options)` — password reset email dispatch
- `verifyPasswordResetToken(email, token)` — reset token verification
- `InMemoryOTPStore` — development storage adapter with TTL and attempt tracking
- `OTPStore` abstract base class for custom adapters (Redis, PostgreSQL)
- Pluggable storage adapter interface with documented Redis and PostgreSQL examples
- Responsive HTML email templates: OTP, email verification, password reset
- Full branding customization: app name, logo, primary color, footer, support email
- Typed error classes: `ConfigurationError`, `OTPExpiredError`, `InvalidOTPError`, `MaxAttemptsExceededError`, `TokenExpiredError`, `SMTPError`, `StorageError`
- Gmail SMTP and generic SMTP transport support via Nodemailer
- `verifyConnection()` for SMTP connectivity testing
- JSDoc documentation on all public API methods
- Full Vitest test suite (22 tests)

