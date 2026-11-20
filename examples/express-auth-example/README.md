# Express Email OTP Authentication Example

A complete, production-style Express application showcasing email OTP authentication with `email-auth-kit`.

## Features
- Two-step email login with one-time codes
- Built-in brute force lockout and timing-safe verification
- One-time code consumption (cannot be reused)
- Resend invalidation
- Mock SMTP option for immediate local testing without real credentials

## Setup & Running

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. By default `USE_MOCK_SMTP=true` is enabled, allowing you to test the API and UI immediately without sending external emails.
3. To test with real Gmail SMTP:
   - Set `USE_MOCK_SMTP=false`
   - Set `SMTP_USER` and `SMTP_PASS` (16-character App Password).
4. Run the server:
   ```bash
   npm start
   ```
5. Open [http://localhost:3000](http://localhost:3000) in your browser.

