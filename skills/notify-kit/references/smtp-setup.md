# SMTP Configuration Reference for notify-kit

This guide details configuring SMTP for transactional email notifications.

---

## 1. Gmail SMTP Setup (App Passwords)

To send notifications through a Gmail account:

### Step 1: Enable 2-Step Verification
1. Open Google Account Security: [https://myaccount.google.com/security](https://myaccount.google.com/security)
2. Ensure **2-Step Verification** is active.

### Step 2: Generate an App Password
1. Navigate to: [https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
2. Enter an app name (e.g. `NotificationMailer`) and click **Create**.
3. Copy the generated 16-character code (format: `xxxx xxxx xxxx xxxx`).

> [!WARNING]
> Never use your primary Google Account password as SMTP_PASS. Standard password logins are blocked by Google for SMTP.

### Step 3: Add to Local `.env`
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your16charpassword
EMAIL_FROM="Store Notifications <your-email@gmail.com>"
```

---

## 2. Production Transactional Providers

For high-volume transactional notifications, configure dedicated providers:

### Resend
```env
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=resend
SMTP_PASS=re_your_api_key
EMAIL_FROM="Acme <orders@yourdomain.com>"
```

### SendGrid
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=SG.your_sendgrid_key
EMAIL_FROM="Acme <notifications@yourdomain.com>"
```

### Postmark
```env
SMTP_HOST=smtp.postmarkapp.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_server_token
SMTP_PASS=your_server_token
EMAIL_FROM="Acme <support@yourdomain.com>"
```

---

## 3. Mock Testing Without Real SMTP

For automated tests and local CI:
```javascript
import { Notify } from "notify-kit";

export const notify = new Notify({
  jsonTransport: true,
  from: '"Test Sender" <test@example.com>'
});
```
`jsonTransport: true` captures sent emails in memory without network calls.

