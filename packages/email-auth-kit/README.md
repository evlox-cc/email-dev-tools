# email-auth-kit

Simple, secure email OTP authentication, email verification, and password reset for Node.js.

```bash
npm install email-auth-kit
```

---

## Features

- Cryptographically secure OTP generation (`crypto.randomInt`)
- Salted HMAC-SHA256 hashing — raw codes are never stored
- Timing-safe verification via `crypto.timingSafeEqual`
- Single-use token consumption (OTPs are deleted after use)
- Resend invalidation (prior OTP cleared on new request)
- Configurable OTP length, expiry, and attempt limits
- Email address verification with single-use tokens
- Password reset with single-use secure tokens
- Pluggable storage: `InMemoryOTPStore` (dev) or custom Redis/PostgreSQL adapter
- Responsive HTML email templates with branding customization
- Gmail SMTP and any generic SMTP provider support
- Typed error classes for structured error handling

---

## Quick Start

```js
import { EmailAuth } from "email-auth-kit";

const auth = new EmailAuth({
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  },
  from: process.env.EMAIL_FROM,
  otp: { length: 6, expiresIn: 300, maxAttempts: 5 }
});

// Send a 6-digit code
await auth.sendOTP("user@example.com");

// Verify — throws on invalid/expired/exceeded attempts
const result = await auth.verifyOTP("user@example.com", "123456");
// result = { valid: true, email: "user@example.com" }
```

---

## Configuration

```js
new EmailAuth({
  smtp: { host, port, secure, auth: { user, pass } },
  from: '"App Name" <no-reply@example.com>',
  otp: {
    length: 6,       // digits (4–12)
    expiresIn: 300,  // seconds (default 5 min)
    maxAttempts: 5   // attempts before lockout
  },
  token: {
    expiresIn: 3600  // seconds for verification/reset tokens
  },
  branding: {
    appName: "My Application",
    primaryColor: "#2563eb",
    logo: "https://example.com/logo.png",
    supportEmail: "support@example.com",
    footer: "123 Main St, City"
  },
  store: customStoreAdapter  // optional — defaults to InMemoryOTPStore
})
```

---

## API Reference

### `auth.sendOTP(email, options?)`
Generates a secure OTP, stores a salted hash, and emails the code. Any previously active OTP for that address is invalidated.

Returns `{ success: true, messageId, expiresIn }`.

### `auth.verifyOTP(email, code, options?)`
Verifies the code timing-safely. Increments attempt counter. Consumes (deletes) the OTP on success.

Returns `{ valid: true, email }`.

Throws: `OTPExpiredError`, `InvalidOTPError`, `MaxAttemptsExceededError`.

### `auth.sendVerificationEmail(email, { url, expiresIn? })`
Sends an email verification link containing a single-use secure token.

Returns `{ success: true, messageId, expiresIn }`.

### `auth.verifyToken(email, token)`
Validates and consumes an email verification token.

Returns `{ valid: true, email }`. Throws `TokenExpiredError`.

### `auth.sendPasswordReset(email, { resetUrl, expiresIn? })`
Sends a password reset email with a single-use token embedded in the URL.

Returns `{ success: true, messageId, expiresIn }`.

### `auth.verifyPasswordResetToken(email, token)`
Validates and consumes a password reset token.

Returns `{ valid: true, email }`. Throws `TokenExpiredError`.

### `auth.verifyConnection()`
Tests SMTP connectivity. Throws `SMTPError` on failure.

### `auth.close()`
Releases background store resources (cleanup timers, connections).

---

## Storage Adapters

The default `InMemoryOTPStore` is suitable for development and single-process deployments only.

For distributed or production systems, implement a custom adapter extending `OTPStore`:

```js
import { OTPStore } from "email-auth-kit";

class MyRedisStore extends OTPStore {
  async set(key, data, ttlSeconds) { /* ... */ }
  async get(key) { /* ... */ }
  async incrementAttempts(key) { /* ... */ }
  async delete(key) { /* ... */ }
  async clear() { /* ... */ }
}
```

See [`examples/redis-store.js`](examples/redis-store.js) and [`examples/postgres-store.js`](examples/postgres-store.js) for complete reference implementations.

---

## Error Classes

| Class | Code | When thrown |
|---|---|---|
| `ConfigurationError` | `CONFIGURATION_ERROR` | Missing or invalid config |
| `OTPExpiredError` | `OTP_EXPIRED` | OTP not found or expired |
| `InvalidOTPError` | `INVALID_OTP` | Code does not match |
| `MaxAttemptsExceededError` | `MAX_ATTEMPTS_EXCEEDED` | Attempt limit reached |
| `TokenExpiredError` | `TOKEN_EXPIRED` | Verification/reset token invalid |
| `SMTPError` | `SMTP_ERROR` | Transport failure |
| `StorageError` | `STORAGE_ERROR` | Store adapter failure |

---

## Environment Variables

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-account@gmail.com
SMTP_PASS=your-16-char-app-password
EMAIL_FROM="My App <auth@example.com>"
```

For Gmail: generate a 16-character App Password at [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords). Never use your primary Google account password.

---

## AI Agent Skill

Install the companion skill to let AI coding agents implement this package automatically:

```bash
npx skills add evlox-cc/email-dev-tools --skill email-auth-kit
```

---

## License

MIT

