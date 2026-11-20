import { EmailAuth } from "@evlox/email-auth-kit";

// Initialize with environment variables or mock transport
const auth = new EmailAuth({
  smtp: {
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  },
  from: process.env.EMAIL_FROM || '"My App" <auth@example.com>',
  otp: {
    length: 6,
    expiresIn: 300,
    maxAttempts: 5
  },
  branding: {
    appName: "Acme Corp",
    primaryColor: "#4f46e5"
  }
});

async function main() {
  const email = "user@example.com";

  console.log(`Sending OTP to ${email}...`);
  const sendRes = await auth.sendOTP(email);
  console.log("OTP Sent:", sendRes);

  // In real life, user enters the OTP in the frontend:
  const userEnteredOTP = "123456";

  try {
    const verifyRes = await auth.verifyOTP(email, userEnteredOTP);
    console.log("Verification succeeded:", verifyRes);
  } catch (err) {
    console.error("Verification failed:", err.message, err.code);
  }
}

main().catch(console.error);

