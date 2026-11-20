import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { EmailAuth, InMemoryOTPStore } from "@evlox/email-auth-kit";
import {
  OTPExpiredError,
  InvalidOTPError,
  MaxAttemptsExceededError
} from "@evlox/@evlox/email-auth-kit/errors";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Initialize EmailAuth client
const isMock = process.env.USE_MOCK_SMTP !== "false";

const auth = new EmailAuth({
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
  from: process.env.EMAIL_FROM || '"Auth Demo" <demo@example.com>',
  otp: {
    length: 6,
    expiresIn: 300,
    maxAttempts: 5
  },
  branding: {
    appName: "Express OTP Demo",
    primaryColor: "#4f46e5"
  },
  store: new InMemoryOTPStore({ suppressWarning: true })
});

// In-memory mock sessions for demonstration
const activeSessions = new Map();

/**
 * Route: Request OTP
 */
app.post("/api/auth/otp/send", async (req, res) => {
  const { email } = req.body;
  if (!email || typeof email !== "string") {
    return res.status(400).json({ error: "A valid email address is required." });
  }

  try {
    const result = await auth.sendOTP(email);
    console.log(`[Demo] OTP dispatched to ${email}. (Mock mode: ${isMock})`);

    return res.json({
      success: true,
      message: "If this email is valid, a verification code has been sent.",
      expiresIn: result.expiresIn
    });
  } catch (err) {
    console.error("Failed to send OTP:", err);
    return res.status(500).json({ error: "Failed to send verification code." });
  }
});

/**
 * Route: Verify OTP
 */
app.post("/api/auth/otp/verify", async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) {
    return res.status(400).json({ error: "Email and code are required." });
  }

  try {
    const result = await auth.verifyOTP(email, code);

    // In a real application, create or query user record and issue JWT/cookie:
    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    activeSessions.set(sessionId, { email: result.email, loggedInAt: new Date() });

    return res.json({
      success: true,
      email: result.email,
      sessionId,
      message: "Authentication successful."
    });
  } catch (err) {
    if (err instanceof OTPExpiredError) {
      return res.status(400).json({ error: err.message, code: "OTP_EXPIRED" });
    }
    if (err instanceof MaxAttemptsExceededError) {
      return res.status(429).json({ error: err.message, code: "MAX_ATTEMPTS" });
    }
    if (err instanceof InvalidOTPError) {
      return res.status(400).json({
        error: err.message,
        code: "INVALID_OTP",
        remainingAttempts: err.details?.remainingAttempts
      });
    }
    return res.status(500).json({ error: "Verification failed." });
  }
});

/**
 * Route: Check Session
 */
app.get("/api/auth/me", (req, res) => {
  const authHeader = req.headers.authorization;
  const sessionId = authHeader?.replace("Bearer ", "");
  const session = activeSessions.get(sessionId);

  if (!session) {
    return res.status(401).json({ authenticated: false });
  }

  return res.json({ authenticated: true, user: session });
});

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`\n🚀 Express Auth Example running at http://localhost:${PORT}`);
    console.log(`   Mock SMTP mode: ${isMock ? "ENABLED (no real emails sent)" : "DISABLED (using live SMTP)"}\n`);
  });
}

export default app;

