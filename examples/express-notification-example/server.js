import express from "express";
import { Notify } from "notify-kit";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

const isMock = process.env.USE_MOCK_SMTP !== "false";

// Initialize Notify client
const notify = new Notify({
  jsonTransport: isMock,
  smtp: isMock
    ? undefined
    : {
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      },
  from: process.env.EMAIL_FROM || '"E-Commerce Demo" <orders@example.com>',
  branding: {
    appName: "Modern E-Commerce Store",
    primaryColor: "#059669",
    supportEmail: "support@example.com"
  }
});

// Mock database tables
const usersDb = [];
const ordersDb = [];

/**
 * Route: User Registration with Welcome Email
 */
app.post("/api/users/register", async (req, res) => {
  const { email, name } = req.body;
  if (!email || !name) {
    return res.status(400).json({ error: "Email and name are required." });
  }

  // 1. Persist user in database
  const user = { id: usersDb.length + 1, email, name, createdAt: new Date() };
  usersDb.push(user);
  console.log(`[DB] Registered user #${user.id} (${email})`);

  // 2. Dispatch welcome email asynchronously without blocking HTTP response
  notify
    .sendWelcome({
      to: email,
      name,
      actionUrl: "https://example.com/onboarding",
      actionText: "Complete Your Profile"
    })
    .then((result) => {
      console.log(`[Email] Welcome notification sent: ${result.messageId}`);
    })
    .catch((err) => {
      console.error(`[Email Warning] Failed to send welcome email to ${email}:`, err.message);
    });

  // 3. Respond immediately to user
  return res.status(201).json({
    success: true,
    user: { id: user.id, email: user.email, name: user.name },
    message: "Registration complete. Welcome email is on its way."
  });
});

/**
 * Route: Order Checkout with Order Confirmation Email
 */
app.post("/api/checkout", async (req, res) => {
  const { customerEmail, customerName, items, amount } = req.body;
  if (!customerEmail || !items || !amount) {
    return res.status(400).json({ error: "customerEmail, items, and amount are required." });
  }

  // 1. Persist order
  const orderId = `ORD-${Date.now().toString().slice(-6)}`;
  const order = {
    orderId,
    customerEmail,
    customerName: customerName || "Customer",
    items,
    amount,
    createdAt: new Date()
  };
  ordersDb.push(order);
  console.log(`[DB] Created order #${orderId} for $${amount}`);

  // 2. Dispatch order confirmation email (non-blocking)
  notify
    .sendOrderConfirmation({
      to: customerEmail,
      orderId,
      amount,
      currency: "$",
      customerName: order.customerName,
      items,
      viewOrderUrl: `https://example.com/orders/${orderId}`
    })
    .then((result) => {
      console.log(`[Email] Order confirmation sent: ${result.messageId}`);
    })
    .catch((err) => {
      // Order is already saved. Log failure for retry queue without failing user HTTP response.
      console.error(`[Email Warning] Order confirmation failed for ${orderId}:`, err.message);
    });

  return res.status(201).json({
    success: true,
    orderId,
    message: "Order placed successfully. Confirmation email dispatched."
  });
});

/**
 * Route: Custom Activity Notification
 */
app.post("/api/notify/alert", async (req, res) => {
  const { to, title, message } = req.body;
  if (!to || !title || !message) {
    return res.status(400).json({ error: "to, title, and message are required." });
  }

  try {
    const result = await notify.sendAccountNotification({
      to,
      title,
      message,
      actionUrl: "https://example.com/security"
    });
    return res.json({ success: true, messageId: result.messageId });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`\n🚀 Express Notification Example running on http://localhost:${PORT}`);
    console.log(`   Mock SMTP mode: ${isMock ? "ENABLED (no live emails sent)" : "DISABLED (live SMTP)"}\n`);
  });
}

export default app;

