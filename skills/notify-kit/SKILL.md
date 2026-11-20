---
name: notify-kit
description: Production-grade AI agent skill to implement transactional email notifications with notify-kit. Asks developers for their notification requirements (welcome emails, order receipts, security alerts, custom emails), configures product branding (app name, brand colors, logo), sets up SMTP, and integrates non-blocking notification workflows across Node.js backends.
---

# notify-kit Agent Skill (v1.0 Production Edition)

This skill guides AI coding agents in designing, configuring, and implementing professional transactional email notifications using `notify-kit`.

---

## 1. Purpose & Triggers

Activate this skill when:
- The developer asks to add transactional email notifications to an application.
- The developer asks to send welcome emails upon user registration.
- The developer asks to send itemized order confirmations or payment receipts.
- The developer requests security alerts, password change notifications, or custom branded email templates.

---

## 2. Package Installation

Install the package via npm:
```bash
npm install notify-kit
```

---

## 3. Production Implementation Workflow

Follow these eight steps systematically:

### Step 1: Discover Existing Architecture & Brand Identity
1. **Identify Product & Brand Design Tokens**:
   - Product name from `package.json` (`name`), HTML `<title>`, or layout metadata.
   - Primary brand color from Tailwind config, CSS variables (`--primary`), or style sheets.
   - Product logo and favicon from `public/`.
2. **Inspect Backend Architecture**:
   - Framework: Express, Fastify, Next.js, or NestJS.
   - Module format: ESM or CommonJS.
   - Identify where key business events occur (e.g. user signup handler, checkout controller, stripe webhook).

### Step 2: Interactive Requirements Interview & Brand Customization
Engage the developer collaboratively to discover exactly what notifications their app requires:

1. **Ask for Required Notification Types**:
   > *"I'm ready to set up your transactional notifications with `notify-kit`! To tailor this to your app, which notifications do you need right now?*
   > - *1. **Welcome Emails** (sent immediately after user registration)*
   > - *2. **Order Receipts / Purchase Confirmations** (itemized breakdown with pricing)*
   > - *3. **Account / Security Alerts** (password changes, new logins, profile updates)*
   > - *4. **Custom Branded Notifications** (custom layout and dynamic data)*
   > 
   > *Please let me know which of these you'd like me to implement!"*

2. **Confirm Brand Styling**:
   > *"I detected your product name **[Product Name]** and brand color **[#color]**. I will apply these to your email templates so all outgoing emails feature your logo, brand colors, and support links."*

3. **Proactive SMTP Verification**:
   - Check `.env` for valid `SMTP_HOST`, `SMTP_USER`, and `SMTP_PASS`.
   - If missing:
     > *"To deliver real emails to customers, we need an SMTP provider.*
     > 
     > *Do you already have SMTP credentials (such as a Gmail App Password, Resend, or SendGrid API key), or would you like me to guide you through creating a free Gmail App Password?"*

4. **When Setup Instructions Are Requested**:
   Provide the 3-step Gmail App Password guide:
   - **Step A**: Enable **2-Step Verification** at [https://myaccount.google.com/security](https://myaccount.google.com/security).
   - **Step B**: Generate an App Password at [https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords).
   - **Step C**: Add it to `.env` under `SMTP_PASS`. Remind them: **never paste secrets into the chat**.

5. **Local Development Without Credentials (Mock Mode)**:
   If credentials are not yet set, initialize with `jsonTransport: true`:
   > *"I'll initialize `Notify` in mock transport mode (`jsonTransport: true`) so we can test the email templates and workflows safely in memory. Once you plug your credentials into `.env`, we'll connect live delivery."*

   > [!WARNING]
   > Neither `notify-kit` nor `email-auth-kit` reads `USE_MOCK_SMTP`. Mock mode is activated strictly in code via `jsonTransport: true`. Keep mock mode restricted to local development; never enable it silently in production.

### Step 3: Configure Environment Variables
Add safe placeholders to `.env.example`:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-char-app-password
EMAIL_FROM="My Application <notifications@example.com>"
```
Ensure `.env` is listed in `.gitignore`.

### Step 4: Initialize the `Notify` Client
Create a centralized notification client (e.g. `lib/notifications.js`):

**Production / Live SMTP Mode:**
```javascript
import { Notify } from "notify-kit";

export const notify = new Notify({
  smtp: {
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS?.replace(/\s+/g, "")
    }
  },
  from: process.env.EMAIL_FROM || '"My Product" <notifications@myproduct.com>',
  branding: {
    appName: process.env.APP_NAME || "My Product",
    primaryColor: process.env.PRIMARY_COLOR || "#6366f1",
    logo: process.env.LOGO_URL || "https://myproduct.com/logo.png",
    supportEmail: process.env.SUPPORT_EMAIL || "support@myproduct.com",
    footer: "© 2026 My Product Inc. All rights reserved."
  }
});
```

**Development Mock Mode:**
```javascript
import { Notify } from "notify-kit";

export const notify = new Notify({
  from: process.env.EMAIL_FROM || '"My Product" <notifications@myproduct.com>',
  jsonTransport: true,
  branding: {
    appName: "My Product",
    primaryColor: "#6366f1"
  }
});
```

### Step 5: Integrate Non-Blocking Notifications into Business Logic
Connect notifications strictly following non-blocking resilience:
- **Registration**: Dispatch `sendWelcome()` **after** the user is committed to the database.
- **Checkout**: Dispatch `sendOrderConfirmation()` **after** order persistence and payment capture.
- **Resilience Guarantee**: Attach `.catch((err) => console.error("Notification failed:", err.message))` so that email transport downtime never fails a customer's primary transaction.

```javascript
// Example: Non-blocking checkout integration
const order = await db.orders.create({ ... });

notify.sendOrderConfirmation({
  to: order.customerEmail,
  orderId: order.id,
  amount: order.total,
  customerName: order.customerName,
  items: order.items,
  viewOrderUrl: `https://myproduct.com/orders/${order.id}`
}).catch((err) => {
  console.error(`[Notification Warning] Failed to send order email for ${order.id}:`, err.message);
});

return res.json({ success: true, orderId: order.id });
```

### Step 6: Custom Templates (When Requested)
If the developer needs specialized notifications (e.g. renewal notices, invite emails), register reusable templates:
```javascript
notify.registerTemplate("team_invite", (branding, data) => ({
  subject: `${data.inviterName} invited you to join ${branding.appName}`,
  html: `
    <h2>You've been invited!</h2>
    <p>${data.inviterName} invited you to collaborate on ${branding.appName}.</p>
    <a href="${data.inviteUrl}">Accept Invitation</a>
  `,
  text: `${data.inviterName} invited you to join ${branding.appName}: ${data.inviteUrl}`
}));
```

### Step 7: Testing & Verification
- Test all notification dispatches using mock transport in automated test suites.
- Verify that recipient lists, attachments, and dynamic data variables render accurately.

### Step 8: Completion Report
Provide a clean summary:
- Integrated notification workflows.
- Configured brand tokens (name, primary color, logo).
- Instructions to test locally and switch to live SMTP.
