# email-auth-kit Framework Integration Guide

This guide provides concrete, copy-paste-ready patterns for integrating `email-auth-kit` into various Node.js backend architectures and frontend frameworks.

---

## 1. Express Integration

### Architecture Pattern:
Initialize `auth` once in a shared utility or service module, then mount API route handlers.

```javascript
// lib/auth.js
import { EmailAuth } from "email-auth-kit";

export const emailAuth = new EmailAuth({
  smtp: {
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  },
  from: process.env.EMAIL_FROM || '"My App" <auth@example.com>',
  otp: { length: 6, expiresIn: 300, maxAttempts: 5 },
  branding: { appName: "My App", primaryColor: "#2563eb" }
});
```

```javascript
// routes/auth.js
import express from "express";
import { emailAuth } from "../lib/auth.js";
import {
  OTPExpiredError,
  InvalidOTPError,
  MaxAttemptsExceededError
} from "email-auth-kit/errors";

const router = express.Router();

// 1. Request OTP
router.post("/api/auth/otp/send", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required." });

  try {
    const result = await emailAuth.sendOTP(email);
    // Generic response to prevent account enumeration
    return res.json({
      success: true,
      message: "If this email is valid, an OTP has been dispatched.",
      expiresIn: result.expiresIn
    });
  } catch (err) {
    console.error("Failed to send OTP:", err);
    return res.status(500).json({ error: "Failed to send verification code." });
  }
});

// 2. Verify OTP & Issue Session
router.post("/api/auth/otp/verify", async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) {
    return res.status(400).json({ error: "Email and code are required." });
  }

  try {
    const verification = await emailAuth.verifyOTP(email, code);

    // Find or create user in your database
    // const user = await db.users.findOrCreate({ where: { email: verification.email } });

    // Establish session or sign JWT
    // req.session.userId = user.id;

    return res.json({
      success: true,
      email: verification.email,
      message: "Authenticated successfully."
    });
  } catch (err) {
    if (err instanceof OTPExpiredError) {
      return res.status(400).json({ error: err.message, code: "OTP_EXPIRED" });
    }
    if (err instanceof MaxAttemptsExceededError) {
      return res.status(429).json({ error: err.message, code: "MAX_ATTEMPTS_EXCEEDED" });
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

export default router;
```

---

## 2. Next.js App Router Integration

### Route 1: `app/api/auth/otp/send/route.js`
```javascript
import { NextResponse } from "next/server";
import { EmailAuth } from "email-auth-kit";

// Use singleton instance in server context
const auth = new EmailAuth({
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  },
  from: process.env.EMAIL_FROM
});

export async function POST(request) {
  try {
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const res = await auth.sendOTP(email);
    return NextResponse.json({ success: true, expiresIn: res.expiresIn });
  } catch (err) {
    return NextResponse.json({ error: "Failed to dispatch OTP" }, { status: 500 });
  }
}
```

### Route 2: `app/api/auth/otp/verify/route.js`
```javascript
import { NextResponse } from "next/server";
import { EmailAuth } from "email-auth-kit";
import { OTPExpiredError, InvalidOTPError, MaxAttemptsExceededError } from "email-auth-kit/errors";

const auth = new EmailAuth({
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  },
  from: process.env.EMAIL_FROM
});

export async function POST(request) {
  try {
    const { email, code } = await request.json();
    const result = await auth.verifyOTP(email, code);

    // Set HTTP-only session cookie or return token
    const response = NextResponse.json({ success: true, user: result.email });
    // response.cookies.set("session_token", token, { httpOnly: true, secure: true });

    return response;
  } catch (err) {
    if (err instanceof OTPExpiredError) {
      return NextResponse.json({ error: err.message, code: "OTP_EXPIRED" }, { status: 400 });
    }
    if (err instanceof MaxAttemptsExceededError) {
      return NextResponse.json({ error: err.message, code: "MAX_ATTEMPTS" }, { status: 429 });
    }
    if (err instanceof InvalidOTPError) {
      return NextResponse.json({
        error: err.message,
        remainingAttempts: err.details?.remainingAttempts
      }, { status: 400 });
    }
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
```

---

## 3. Fastify Integration

```javascript
import Fastify from "fastify";
import { EmailAuth } from "email-auth-kit";

const app = Fastify();
const auth = new EmailAuth({
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  },
  from: process.env.EMAIL_FROM
});

app.post("/api/auth/otp/send", async (request, reply) => {
  const { email } = request.body || {};
  if (!email) return reply.status(400).send({ error: "Email is required." });
  const result = await auth.sendOTP(email);
  return { success: true, expiresIn: result.expiresIn };
});

app.post("/api/auth/otp/verify", async (request, reply) => {
  const { email, code } = request.body || {};
  try {
    const result = await auth.verifyOTP(email, code);
    return { success: true, email: result.email };
  } catch (err) {
    return reply.status(400).send({ error: err.message, code: err.code });
  }
});
```

---

## 4. Frontend Integration Example (React / Next.js Client)

```jsx
import { useState } from "react";

export function EmailLoginForm() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState("email"); // "email" | "otp"
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  async function handleSendOTP(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send code.");
      setStep("otp");
      setStatus("Code sent! Check your inbox.");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOTP(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification failed.");
      window.location.href = "/dashboard";
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (step === "email") {
    return (
      <form onSubmit={handleSendOTP} className="space-y-4">
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <input
          type="email"
          required
          placeholder="name@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border p-2 rounded w-full"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded w-full"
        >
          {loading ? "Sending..." : "Send Verification Code"}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleVerifyOTP} className="space-y-4">
      {status && <div className="text-green-600 text-sm">{status}</div>}
      {error && <div className="text-red-600 text-sm">{error}</div>}
      <input
        type="text"
        required
        maxLength={6}
        placeholder="Enter 6-digit code"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        className="border p-2 rounded w-full text-center tracking-widest text-lg font-mono"
      />
      <button
        type="submit"
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded w-full"
      >
        {loading ? "Verifying..." : "Verify & Sign In"}
      </button>
      <button
        type="button"
        onClick={() => setStep("email")}
        className="text-sm text-gray-500 underline w-full"
      >
        Use a different email
      </button>
    </form>
  );
}
```

