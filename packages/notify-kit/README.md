# notify-kit

Simple transactional email and notification library for Node.js with responsive HTML templates.

```bash
npm install @evlox/notify-kit
```

---

## Features

- Send welcome, order confirmation, account alert, and password security notifications
- Responsive HTML email templates with branding support
- Multiple recipients, CC, BCC, reply-to, attachments, custom headers
- Custom template registry — register your own render functions
- Structured delivery results (accepted/rejected per recipient)
- Typed error classes for reliable error handling
- Safe HTML escaping on all template variables
- Gmail SMTP and any generic SMTP provider support
- Zero dependency on `@evlox/email-auth-kit` — fully independent package

---

## Quick Start

```js
import { Notify } from "@evlox/notify-kit";

const notify = new Notify({
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
  branding: {
    appName: "My Application",
    primaryColor: "#2563eb",
    supportEmail: "support@example.com"
  }
});

await notify.sendWelcome({
  to: "user@example.com",
  name: "Alex",
  actionUrl: "https://app.example.com/dashboard"
});
```

---

## API Reference

### `notify.send(options)`
Core send method. Supports templates, raw HTML, multiple recipients, CC, BCC, attachments.

```js
const result = await notify.send({
  to: "user@example.com",
  subject: "Hello",
  template: "welcome",
  data: { name: "Alex" }
});
// result = { messageId, accepted: [...], rejected: [...], status: "accepted", response }
```

### `notify.sendWelcome({ to, name?, actionUrl?, actionText?, intro? })`
Sends a welcome email to a newly registered user.

### `notify.sendOrderConfirmation({ to, orderId, amount, currency?, customerName?, items?, viewOrderUrl? })`
Sends an order confirmation with optional line item table.

### `notify.sendAccountNotification({ to, title, message, actionUrl?, actionText? })`
Sends an account activity or security event notification.

### `notify.sendPasswordResetNotification({ to, timestamp?, ipAddress?, device? })`
Sends a security warning that the account password was changed.

### `notify.sendCustom({ to, subject, html, text? })`
Sends arbitrary HTML wrapped in the standard responsive layout.

### `notify.registerTemplate(name, fn)`
Registers a custom template function `(branding, data) => { html, text, subject }`.

### `notify.verifyConnection()`
Tests SMTP connectivity. Throws `SMTPError` on failure.

---

## Built-in Templates

| Name | Method |
|---|---|
| `welcome` | `sendWelcome()` |
| `order_confirmation` | `sendOrderConfirmation()` |
| `account_notification` | `sendAccountNotification()` |
| `password_reset_notification` | `sendPasswordResetNotification()` |
| `custom` | `sendCustom()` |

---

## Custom Templates

```js
notify.registerTemplate("invoice_ready", (branding, data) => ({
  subject: `Invoice #${data.id} is ready`,
  html: `<h2>Invoice for $${data.amount}</h2>`,
  text: `Invoice #${data.id}: $${data.amount}`
}));

await notify.send({
  to: "client@example.com",
  template: "invoice_ready",
  data: { id: "INV-001", amount: "499.00" }
});
```

---

## Delivery Results

```js
{
  messageId: "<unique-id@smtp.example.com>",
  accepted: ["user@example.com"],
  rejected: [],
  status: "accepted",   // "accepted" | "rejected" | "partial"
  response: "250 OK"
}
```

> SMTP acceptance confirms the server received the message for relay. It does not guarantee inbox delivery, which depends on recipient spam filters, DNS records (SPF/DKIM/DMARC), and provider policies.

---

## Error Classes

| Class | Code | When thrown |
|---|---|---|
| `ConfigurationError` | `CONFIGURATION_ERROR` | Missing or invalid config |
| `SMTPError` | `SMTP_ERROR` | Transport failure |
| `InvalidRecipientError` | `INVALID_RECIPIENT` | Malformed email address |
| `TemplateError` | `TEMPLATE_ERROR` | Unknown or failing template |
| `DeliveryError` | `DELIVERY_ERROR` | All recipients rejected |

---

## Non-blocking Usage Pattern

Always persist your business records first, then dispatch emails asynchronously to prevent email failures from rolling back successful transactions:

```js
const order = await db.orders.create({ ... });

notify.sendOrderConfirmation({ to: order.email, orderId: order.id, amount: order.total })
  .catch(err => console.error("Email dispatch failed:", err.message));

return res.json({ success: true, orderId: order.id });
```

---

## Environment Variables

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-account@gmail.com
SMTP_PASS=your-16-char-app-password
EMAIL_FROM="My App <notifications@example.com>"
```

---

## AI Agent Skill

```bash
npx skills add evlox-cc/email-dev-tools --skill notify-kit
```

---

## License

MIT

