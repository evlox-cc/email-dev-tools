# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.x     | Yes       |

## Reporting a Vulnerability

Please **do not** report security vulnerabilities through public GitHub issues.

Send a detailed report to: **security@YOUR_DOMAIN** (replace with your actual contact).

Include in your report:
- Affected package and version
- Description of the vulnerability
- Steps to reproduce
- Potential impact

You will receive an acknowledgement within 48 hours and a full response within 7 days.

## Security Design

Both packages in this monorepo follow these security principles:

**email-auth-kit**
- OTPs are generated using `crypto.randomInt` (CSPRNG)
- Stored records contain only salted HMAC-SHA256 hashes — raw codes are never persisted
- Verification uses `crypto.timingSafeEqual` to prevent timing side-channel attacks
- OTPs are single-use and atomically consumed on successful verification
- Resend requests immediately invalidate any prior active code

**notify-kit**
- All template variables are HTML-escaped before rendering
- No credentials are logged or exposed in error messages
- SMTP transport errors are wrapped in typed error classes — raw transport errors are not leaked to callers

## Credential Handling

Neither package stores, logs, or transmits SMTP credentials beyond the configured transport.
Never commit `.env` files containing real credentials. Use `.env.example` with placeholder values.

