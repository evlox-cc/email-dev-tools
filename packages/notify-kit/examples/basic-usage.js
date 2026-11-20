import { Notify } from "notify-kit";

const notify = new Notify({
  smtp: {
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  },
  from: process.env.EMAIL_FROM || '"My App" <notifications@example.com>',
  branding: {
    appName: "SaaS Platform",
    primaryColor: "#059669",
    supportEmail: "support@example.com"
  }
});

async function main() {
  console.log("Sending welcome email...");
  const welcomeRes = await notify.sendWelcome({
    to: "newuser@example.com",
    name: "Alex",
    actionUrl: "https://example.com/dashboard",
    actionText: "Open Dashboard"
  });
  console.log("Welcome email sent:", welcomeRes);

  console.log("Sending order confirmation...");
  const orderRes = await notify.sendOrderConfirmation({
    to: "customer@example.com",
    orderId: "ORD-5544",
    amount: "149.00",
    customerName: "Alex",
    items: [
      { name: "Pro Plan (Annual)", quantity: 1, price: "149.00" }
    ],
    viewOrderUrl: "https://example.com/billing"
  });
  console.log("Order confirmation sent:", orderRes);
}

main().catch(console.error);

