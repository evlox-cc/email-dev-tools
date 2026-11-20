# Security Architecture & Best Practices for email-auth-kit

This document details the security model, cryptographic primitives, and production hardening checklist for `email-auth-kit`.

---

## 1. Cryptographic Safeguards

### Secure Randomness
All OTPs and tokens are generated using Node.js's native `crypto.randomInt` and `crypto.randomBytes`. Standard pseudo-random engines like `Math.random()` are strictly forbidden.

### One-Way Hashing with Salt
- Stored records contain **only salted hashes** of OTPs and verification tokens.
- Raw OTPs and raw tokens are **never written to disk or storage**.
- Even if an attacker gains read access to the database or Redis store, they cannot extract usable verification codes.

### Timing-Safe Equality Checks
Comparing user-submitted input with stored hashes uses `crypto.timingSafeEqual`.
Standard JavaScript equality (`===`) short-circuits on the first mismatched character, creating measurable latency differences that allow timing side-channel attacks. `timingSafeCompare` guarantees constant execution time.

---

## 2. Attack Mitigations

### Brute Force Protection
- Each OTP has a strict `maxAttempts` threshold (default: 5).
- Every incorrect verification attempt increments the attempt counter.
- When `maxAttempts` is reached, the OTP is deleted immediately from storage, and `MaxAttemptsExceededError` is thrown.
- Subsequent attempts fail with `OTPExpiredError`.

### Single-Use / Atomic Consumption
Once verified successfully, the OTP or token is **atomically deleted** from storage. It cannot be replayed or reused.

### Resend Invalidation
If a user requests a new OTP before the previous one has expired, the previous OTP is immediately invalidated and deleted from storage. Only the most recent code is valid.

### Account Enumeration Prevention
In public authentication endpoints, always return generic status messages:
```json
{
  "success": true,
  "message": "If the provided email is registered, a code has been dispatched."
}
```
Never reveal whether an email address exists in your user database during the OTP request phase.

---

## 3. Storage Security (In-Memory vs. Distributed)

### Development vs Production Store
- `InMemoryOTPStore` is intended strictly for local development and single-process prototypes.
- In distributed environments (e.g. AWS ECS, Kubernetes pods, Vercel/Netlify Serverless functions), an in-memory store will fail because requests may hit different instances.
- **Production requirement**: Use a distributed store such as Redis (`ioredis`) or a database table (`PostgreSQL`, `MySQL`). See `packages/email-auth-kit/examples/redis-store.js`.

---

## 4. Rate Limiting Integration

Always protect the `/api/auth/otp/send` endpoint with rate limiting to prevent email bombing and SMS/email cost inflation.

Recommended limits:
- Per IP: Max 5 requests per 15 minutes.
- Per Email: Max 3 requests per 10 minutes.

Example with `express-rate-limit`:
```javascript
import rateLimit from "express-rate-limit";

export const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: "Too many authentication requests. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false
});
```

