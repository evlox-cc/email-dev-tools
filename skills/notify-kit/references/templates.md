# Template Customization Reference for notify-kit

`@evlox/notify-kit` comes with pre-built responsive HTML templates and a custom template registry.

---

## 1. Built-in Templates

### `welcome`
Sent when a new user registers or completes onboarding.
```javascript
await notify.sendWelcome({
  to: "user@example.com",
  name: "Sarah",
  actionUrl: "https://myapp.com/dashboard",
  actionText: "Open Dashboard",
  intro: "We are glad you are here!"
});
```

### `order_confirmation`
Sent after successful checkout or invoice creation.
```javascript
await notify.sendOrderConfirmation({
  to: "buyer@example.com",
  orderId: "ORD-8742",
  amount: "129.50",
  currency: "$",
  customerName: "Sarah",
  items: [
    { name: "Pro Plan Subscription", quantity: 1, price: "99.00" },
    { name: "Extra Storage Add-on", quantity: 1, price: "30.50" }
  ],
  viewOrderUrl: "https://myapp.com/orders/ORD-8742"
});
```

### `account_notification`
Sent for account security events, plan updates, or system alerts.
```javascript
await notify.sendAccountNotification({
  to: "user@example.com",
  title: "API Key Generated",
  message: "A new secret API key was generated for your team.",
  actionUrl: "https://myapp.com/settings/api-keys",
  actionText: "Manage API Keys"
});
```

### `password_reset_notification`
Sent after a password has been updated to warn the user if it was unauthorized.
```javascript
await notify.sendPasswordResetNotification({
  to: "user@example.com",
  timestamp: "2026-03-15 14:30 UTC",
  ipAddress: "203.0.113.195",
  device: "Chrome on macOS"
});
```

### `custom`
Wraps arbitrary custom HTML inside the standardized responsive email layout.
```javascript
await notify.sendCustom({
  to: "user@example.com",
  subject: "Quarterly Newsletter",
  html: `
    <h3>Hello Community!</h3>
    <p>Here are our latest updates for Q1...</p>
  `
});
```

---

## 2. Registering Custom Templates

You can register reusable template functions with `registerTemplate`:

```javascript
notify.registerTemplate("subscription_renewal", (branding, data) => {
  const subject = `Your ${branding.appName} subscription renews soon`;
  const html = `
    <h2>Subscription Renewal Notice</h2>
    <p>Hi ${data.userName},</p>
    <p>Your <strong>${data.planName}</strong> plan will renew on <strong>${data.renewalDate}</strong> for <strong>$${data.amount}</strong>.</p>
    <p><a href="${data.billingUrl}">Update Billing Info</a></p>
  `;
  const text = `Hi ${data.userName}, your subscription renews on ${data.renewalDate} for $${data.amount}. Manage at: ${data.billingUrl}`;
  return { subject, html, text };
});

// Usage:
await notify.send({
  to: "user@example.com",
  template: "subscription_renewal",
  data: {
    userName: "Alex",
    planName: "Pro Tier",
    renewalDate: "April 1, 2026",
    amount: "49.00",
    billingUrl: "https://app.com/billing"
  }
});
```

---

## 3. Safe HTML Escaping

Always escape dynamic user-generated content before rendering inside templates:
```javascript
import { escapeHtml } from "@evlox/notify-kit";

const safeComment = escapeHtml(userInputComment);
```
All built-in templates automatically sanitize user input fields to prevent HTML injection and email client rendering vulnerabilities.

