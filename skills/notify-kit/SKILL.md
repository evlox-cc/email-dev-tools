---
name: notify-kit
description: Use when a developer asks to add transactional email notifications, welcome emails, order confirmations, account alerts, or SMTP notification workflows using notify-kit to Node.js applications (Express, Fastify, Next.js, NestJS).
---

# notify-kit Agent Skill

This skill guides AI coding agents in adding transactional email notifications, welcome messages, order confirmations, and activity alerts using `notify-kit`.

---

## 1. Purpose & Triggers

Activate this skill when:
- The developer asks to add transactional email notifications to an existing Node.js application.
- The developer asks to send welcome emails upon user registration.
- The developer requests order confirmation emails upon purchase completion.
- The developer asks to configure transactional SMTP mailing with pre-built HTML templates.

---

## 2. Package Installation

Install the package via npm:
```bash
npm install notify-kit
```

---

## 3. Step-by-Step Implementation Workflow

### Step 1: Inspect the Existing Application
1. Read `package.json` to identify:
   - Framework (`express`, `fastify`, `next`, `nest`, etc.).
   - Module format (ESM or CommonJS).
2. Locate where the target business event occurs (e.g. `registerUser()`, `createOrder()`, `processCheckout()`).
3. Locate existing environment variable configuration (`.env`, `.env.example`).

### Step 2: Proactive SMTP Verification & Interactive Setup Offer
Check if `.env` already has active SMTP credentials:

1. **If SMTP credentials are missing**, ask the developer immediately:
   > *"I see your application needs to send transactional emails, but SMTP credentials aren't configured yet.*
   > 
   > *Do you already have your SMTP details (like a Gmail App Password, Resend, or SendGrid API key), or would you like me to walk you through how to generate a free Gmail App Password step-by-step?"*

2. **If the developer responds "Yes" or asks for setup instructions**:
   Walk them through the Gmail App Password flow:
   - **Step A**: Ensure **2-Step Verification** is enabled on Google Account: `https://myaccount.google.com/security`.
   - **Step B**: Go to `https://myaccount.google.com/apppasswords` and generate an App Password.
   - **Step C**: Instruct them to add it to their local `.env` file under `SMTP_PASS` (remind them: **do NOT paste it into chat**).

3. **Local Development Without SMTP Credentials (Mock Transport)**:
   If SMTP credentials are not yet configured, initialize `Notify` in mock mode using `jsonTransport: true`.
   > [!IMPORTANT]
   > Neither `notify-kit` nor `email-auth-kit` reads `USE_MOCK_SMTP`. Do **not** tell developers that setting an environment variable like `USE_MOCK_SMTP=true` automatically activates mock mode. Mock mode is activated strictly in code by passing `jsonTransport: true`.

   Tell the developer:
   > *"Since SMTP credentials aren't set yet, I'll initialize `Notify` in mock transport mode (`jsonTransport: true`). This tests notification and template generation safely in memory without sending real emails. Once you add your SMTP credentials to `.env`, we'll replace mock mode with your live SMTP configuration."*

   > [!WARNING]
   > Keep mock mode restricted strictly to local development and automated tests. Never enable it silently in production. When real SMTP credentials become available, replace mock mode with the actual SMTP configuration.

> [!CAUTION]
> NEVER request the developer's normal Google Account password or ask them to type credentials into the conversation. Instruct them to add secrets directly to their local `.env`.

### Step 3: Configure Environment Variables
Add placeholders to `.env.example`:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-char-app-password
EMAIL_FROM="My Application <notifications@example.com>"
```
Direct developer to [SMTP Setup](references/smtp-setup.md) for generating credentials.

### Step 4: Initialize the `Notify` Client
Create a singleton notification client (e.g. `lib/notifications.js`).

**When SMTP credentials are unavailable (Local Development / Mock Mode):**
Initialize using `jsonTransport: true` to test email generation without sending real emails:
```javascript
import { Notify } from "notify-kit";

export const notify = new Notify({
  from: process.env.EMAIL_FROM || "Test App <test@example.com>",
  jsonTransport: true,
  branding: {
    appName: process.env.APP_NAME || "My Application",
    primaryColor: "#2563eb",
    supportEmail: process.env.SUPPORT_EMAIL || "support@example.com"
  }
});
```

**When real SMTP credentials become available (Live Delivery Mode):**
Replace the mock initialization with the actual SMTP configuration:
```javascript
import { Notify } from "notify-kit";

export const notify = new Notify({
  smtp: {
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  },
  from: process.env.EMAIL_FROM,
  branding: {
    appName: process.env.APP_NAME || "My Application",
    primaryColor: "#2563eb",
    supportEmail: process.env.SUPPORT_EMAIL || "support@example.com"
  }
});
```

### Step 5: Integrate Notifications into Target Business Workflows
Follow the non-blocking pattern described in [Integration Guide](references/integration-guide.md):
- **Welcome Emails**: Place inside the registration handler **after** successful user creation in the database.
- **Order Confirmations**: Place inside checkout/order creation **after** order persistence.
- **Safety**: Attach `.catch((err) => console.error(...))` so email transport failure never rolls back or crashes the user's primary transaction.

### Step 6: Use Built-in or Custom Templates
Use built-in methods:
- `notify.sendWelcome({ to, name, actionUrl })`
- `notify.sendOrderConfirmation({ to, orderId, amount, items })`
- `notify.sendAccountNotification({ to, title, message, actionUrl })`
- `notify.sendPasswordResetNotification({ to, ipAddress, device })`
- `notify.sendCustom({ to, subject, html })`

Or register custom templates as detailed in [Templates Reference](references/templates.md).

### Step 7: Testing
- In automated tests, pass `jsonTransport: true` to prevent sending real emails.
- Verify message rendering, recipient normalization, and error handling.
- Only mark delivery verified after the developer tests locally with valid credentials.

### Step 8: Completion Report
Provide:
- Summary of integration points.
- Required `.env` keys.
- Command to run and test.

---

## 4. Key Rules & Best Practices

1. **Non-Blocking Delivery**: Never block or abort critical database operations if an email fails.
2. **Acceptance vs Delivery**: Document that SMTP acceptance confirms server acceptance, not guaranteed inbox delivery.
3. **Template Escaping**: Escape all dynamic variables to prevent HTML injection.
4. **Independent Library**: `notify-kit` has zero dependencies on `email-auth-kit`.

