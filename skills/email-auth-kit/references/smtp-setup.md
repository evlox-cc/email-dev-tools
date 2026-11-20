# SMTP Configuration Reference for email-auth-kit

This guide explains how to configure SMTP credentials securely for `@evlox/email-auth-kit`.

## 1. Gmail SMTP Setup (App Passwords)

When using a standard personal or Google Workspace account with 2-Step Verification:

### Step A: Verify 2-Step Verification is Enabled
1. Go to your Google Account: [https://myaccount.google.com/security](https://myaccount.google.com/security)
2. Ensure **2-Step Verification** is turned ON.

### Step B: Generate an App Password
1. Navigate directly to App Passwords: [https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
2. Enter an app name (e.g. `MyNodeApp`) and click **Create**.
3. Google displays a 16-character passcode (e.g., `abcd efgh ijkl mnop`).
4. Copy this passcode. Remove spaces when storing in `.env`.

> [!WARNING]
> Never use your primary Google Account password. Google blocks standard account password logins on SMTP for security.

### Step C: Environment Variables Setup
Add to your local `.env`:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=abcdefghijklmnop
EMAIL_FROM="Your App Name <your-email@gmail.com>"
```

### Gmail Port & TLS Options:
- **Port 587** with `SMTP_SECURE=false` (STARTTLS, recommended)
- **Port 465** with `SMTP_SECURE=true` (Implicit TLS)

---

## 2. Custom SMTP Providers

For production SaaS applications, specialized transactional SMTP providers are recommended:

### Resend
```env
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=resend
SMTP_PASS=re_123456789
EMAIL_FROM="Acme <onboarding@yourdomain.com>"
```

### SendGrid
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=SG.your_api_key_here
EMAIL_FROM="Acme <auth@yourdomain.com>"
```

### Postmark
```env
SMTP_HOST=smtp.postmarkapp.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-server-api-token
SMTP_PASS=your-server-api-token
EMAIL_FROM="Acme <auth@yourdomain.com>"
```

### Amazon SES
```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-username
SMTP_PASS=your-smtp-password
EMAIL_FROM="Acme <auth@yourdomain.com>"
```

---

## 3. Local Development & Mock Transport

When developing locally or running automated tests without real SMTP credentials, initialize `EmailAuth` with mock transport using `jsonTransport: true`:

```javascript
import { EmailAuth } from "@evlox/email-auth-kit";

// Mock transport: tests email and OTP generation in memory without sending real emails
export const auth = new EmailAuth({
  from: process.env.EMAIL_FROM || "Test App <test@example.com>",
  jsonTransport: true
});
```

### Important Rules for Mock Mode:
1. **No Automatic Environment Variable**: Neither `@evlox/email-auth-kit` nor `@evlox/notify-kit` reads `USE_MOCK_SMTP`. Mock mode is enabled strictly in code via `jsonTransport: true`.
2. **Local and Test Use Only**: Keep mock mode restricted to local development and automated CI tests. Never enable it silently in production environments.
3. **Transition to Production**: When real SMTP credentials become available, replace `jsonTransport: true` with the actual `smtp: { host, port, secure, auth }` configuration.

