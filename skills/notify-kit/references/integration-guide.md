# notify-kit Integration Patterns

This guide explains how to integrate transactional notifications safely into application business flows without compromising transaction reliability or response latency.

---

## 1. Core Architectural Principle: Non-Blocking Notifications

> [!IMPORTANT]
> Never let an email transmission failure cancel a successfully completed business transaction. Always persist records first, then dispatch notifications asynchronously.

### Bad Pattern (Anti-pattern):
```javascript
// AVOID THIS: If SMTP fails or times out, the user receives a 500 error even if payment went through!
await db.orders.create({ ... });
await notify.sendOrderConfirmation({ ... }); // <-- Can throw and fail the request
return res.json({ success: true });
```

### Recommended Pattern (Safe Async):
```javascript
// CORRECT: Complete the primary database write first, then dispatch in background
const order = await db.orders.create({ ... });

// Fire and catch errors gracefully without blocking response
notify
  .sendOrderConfirmation({
    to: order.customerEmail,
    orderId: order.id,
    amount: order.total,
    customerName: order.customerName,
    items: order.items
  })
  .catch((err) => {
    // Log failure or enqueue retry, but DO NOT fail user's HTTP request
    console.error(`[Notification Failure] Order ${order.id}:`, err.message);
  });

return res.json({ success: true, orderId: order.id });
```

---

## 2. Express Order Checkout Integration

```javascript
import express from "express";
import { Notify } from "@evlox/notify-kit";

const router = express.Router();

const notify = new Notify({
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  },
  from: process.env.EMAIL_FROM,
  branding: { appName: "QuickShop", primaryColor: "#10b981" }
});

router.post("/api/checkout", async (req, res) => {
  const { customerEmail, customerName, items, total } = req.body;

  // 1. Persist order in database
  const orderId = `ORD-${Date.now()}`;
  // await db.orders.insert({ id: orderId, customerEmail, total });

  // 2. Dispatch email asynchronously
  notify.sendOrderConfirmation({
    to: customerEmail,
    orderId,
    amount: total,
    customerName,
    items,
    viewOrderUrl: `https://myquickshop.com/orders/${orderId}`
  }).catch((err) => {
    console.error(`Failed to send order email for ${orderId}:`, err);
  });

  // 3. Return immediate response
  return res.status(201).json({
    success: true,
    orderId,
    message: "Order placed successfully. Confirmation email will arrive shortly."
  });
});

export default router;
```

---

## 3. User Registration / Welcome Flow (Next.js / Fastify)

```javascript
// Next.js App Router: app/api/register/route.js
import { NextResponse } from "next/server";
import { Notify } from "@evlox/notify-kit";

const notify = new Notify({
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  },
  from: process.env.EMAIL_FROM
});

export async function POST(request) {
  const { email, name, password } = await request.json();

  // 1. Create user in database
  // const user = await createUser({ email, name, passwordHash });

  // 2. Dispatch welcome email
  notify.sendWelcome({
    to: email,
    name,
    actionUrl: "https://myapp.com/dashboard",
    actionText: "Get Started"
  }).catch((err) => {
    console.error("Welcome email failed:", err);
  });

  return NextResponse.json({ success: true, message: "User registered." });
}
```

---

## 4. Background Job / Worker Integration (BullMQ / Queue)

In high-throughput environments, push notification events to a job queue:

```javascript
// Producer:
await emailQueue.add("send-order-confirmation", {
  to: order.customerEmail,
  orderId: order.id,
  amount: order.total
});

// Worker Processor:
import { Worker } from "bullmq";
import { Notify } from "@evlox/notify-kit";

const notify = new Notify({ ... });

new Worker("email-queue", async (job) => {
  if (job.name === "send-order-confirmation") {
    await notify.sendOrderConfirmation(job.data);
  }
});
```

