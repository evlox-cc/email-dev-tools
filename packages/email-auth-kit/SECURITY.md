# Security Policy — email-auth-kit

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.x     | Yes       |

## Reporting Vulnerabilities

Do **not** open public issues for security vulnerabilities.

Contact: **security@YOUR_DOMAIN**

Include affected version, description, reproduction steps, and potential impact.
Response within 48 hours acknowledgement and 7 days resolution target.

## Security Architecture

- OTPs generated via `crypto.randomInt` (Node.js CSPRNG)
- Storage contains only salted HMAC-SHA256 hashes — raw codes are never written
- Verification uses `crypto.timingSafeEqual` — constant-time comparison
- Single-use tokens: atomically deleted on successful verification
- Resend invalidates any prior active OTP immediately
- `maxAttempts` lockout deletes the token to prevent further brute-force

## Production Deployment Notes

- Use a distributed storage adapter (Redis, PostgreSQL) for multi-instance deployments
- Apply rate limiting to `/api/auth/otp/send` endpoints (per IP and per email)
- Serve all endpoints over HTTPS only
- Never expose SMTP credentials in frontend bundles or public logs

