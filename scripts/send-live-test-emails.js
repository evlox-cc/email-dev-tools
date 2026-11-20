/**
 * Interactive / CLI live email sender script.
 * Usage:
 *   GMAIL_USER="your-email@gmail.com" GMAIL_APP_PASS="xxxx xxxx xxxx xxxx" TO_EMAIL="recipient@example.com" node scripts/send-live-test-emails.js
 */

import { EmailAuth } from "../packages/email-auth-kit/src/index.js";
import { Notify } from "../packages/notify-kit/src/index.js";

const user = process.env.GMAIL_USER || process.env.SMTP_USER;
const pass = (process.env.GMAIL_APP_PASS || process.env.SMTP_PASS || "").replace(/\s+/g, "");
const to = process.env.TO_EMAIL || user;

if (!user || !pass) {
  console.error("\n❌ Missing Gmail Credentials!");
  console.error("Please supply environment variables:");
  console.error('  GMAIL_USER="your-address@gmail.com"');
  console.error('  GMAIL_APP_PASS="16-character-app-password"');
  console.error('  TO_EMAIL="destination@example.com" (defaults to GMAIL_USER)\n');
  process.exit(1);
}

console.log(`\n🚀 Starting live delivery test via Gmail SMTP (smtp.gmail.com:587)`);
console.log(`   From: ${user}`);
console.log(`   To:   ${to}\n`);

async function runLiveTests() {
  // 1. Initialise email-auth-kit
  console.log("1️⃣ Initializing email-auth-kit...");
  const auth = new EmailAuth({
    smtp: {
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: { user, pass }
    },
    from: `"Live Auth Test" <${user}>`,
    branding: {
      appName: "Live Test App",
      primaryColor: "#4f46e5",
      supportEmail: user
    }
  });

  console.log("   Verifying SMTP connection...");
  await auth.verifyConnection();
  console.log("   ✅ Connection verified successfully!");

  console.log(`   Sending OTP email to ${to}...`);
  const otpRes = await auth.sendOTP(to);
  console.log(`   ✅ OTP email dispatched! MessageId: ${otpRes.messageId}`);
  await auth.close();

  // 2. Initialise notify-kit
  console.log("\n2️⃣ Initializing notify-kit...");
  const notify = new Notify({
    smtp: {
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: { user, pass }
    },
    from: `"Live Store Notifications" <${user}>`,
    branding: {
      appName: "Modern E-Commerce Store",
      primaryColor: "#10b981",
      supportEmail: user
    }
  });

  console.log(`   Sending Welcome notification to ${to}...`);
  const welcomeRes = await notify.sendWelcome({
    to,
    name: "Alex",
    actionUrl: "https://github.com",
    actionText: "Visit Dashboard",
    intro: "Welcome to the live verification test of notify-kit!"
  });
  console.log(`   ✅ Welcome email dispatched! MessageId: ${welcomeRes.messageId}`);

  console.log(`   Sending Order Confirmation notification to ${to}...`);
  const orderRes = await notify.sendOrderConfirmation({
    to,
    orderId: "ORD-998811",
    amount: "149.00",
    currency: "$",
    customerName: "Alex",
    items: [
      { name: "Pro Developer License (Annual)", quantity: 1, price: "120.00" },
      { name: "Priority Support Pack", quantity: 1, price: "29.00" }
    ],
    viewOrderUrl: "https://github.com"
  });
  console.log(`   ✅ Order confirmation dispatched! MessageId: ${orderRes.messageId}`);

  console.log("\n🎉 ALL 3 LIVE EMAILS SENT SUCCESSFULLY!");
  console.log(`   Check inbox/spam of: ${to}`);
}

runLiveTests().catch((err) => {
  console.error("\n❌ Live email delivery failed:", err.message);
  if (err.details) console.error("Details:", err.details);
  process.exit(1);
});

