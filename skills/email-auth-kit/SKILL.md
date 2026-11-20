---
name: email-auth-kit
description: Use when a developer asks to implement email OTP authentication, email verification, or password reset using email-auth-kit, configure Gmail/SMTP, or add secure email-based auth to Node.js applications (Express, Fastify, Next.js, NestJS).
---

# email-auth-kit Agent Skill

This skill guides AI coding agents in implementing complete email OTP authentication, email address verification, and password reset flows using `email-auth-kit`.

---

## 1. Purpose & Triggers

Activate this skill when:
- The user requests email OTP authentication, magic code login, or passwordless email login.
- The user requests adding email verification or password reset flows using `email-auth-kit`.
- The user asks to configure Gmail SMTP or custom SMTP for authentication in a Node.js project.

---

## 2. Package Installation

Install the package via npm:
```bash
npm install email-auth-kit
```

---

## 3. Step-by-Step Implementation Workflow

Follow these eight steps systematically:

### Step 1: Inspect the Existing Application & Discover Product Branding
Before modifying any files:
1. Check `package.json` to detect:
   - Application/product name (`"name"` field, title in `index.html`, or metadata in layout/app files).
   - Node.js version and module type (`"type": "module"` for ESM or CommonJS).
   - Backend framework (`express`, `fastify`, `next`, `@nestjs/core`, etc.).
   - Database / ORM (`prisma`, `drizzle-orm`, `mongoose`, `pg`, `typeorm`, etc.).
   - Existing authentication or session library (`iron-session`, `express-session`, `jsonwebtoken`, `lucia`, etc.).
2. **Inspect styling & brand design tokens**:
   - Inspect CSS, Tailwind configs (`tailwind.config.js`, `globals.css`), theme files, or UI configs to find the **product's primary brand color** (e.g. `primary: '#6366f1'` or `#059669`).
   - Check public assets for the product logo (`public/logo.png`, `public/favicon.svg`, etc.).
3. Locate existing environment variable files (`.env`, `.env.example`, `.env.local`).
4. Locate existing API routes or controllers directory.

### Step 2: Proactive SMTP Verification, Product Branding & Setup
Right after inspecting the project:

1. **Brand & Product Customization**:
   - Confirm or ask for the product details:
     > *"I found your product name **[Product Name]** and brand color **[#color]**. I will configure your email OTP templates with your exact product name, logo, and brand color so the emails match your app's visual identity."*
   - If not discoverable, ask: *"What is your product/app name, primary brand color (hex), and support email for the OTP emails?"*

2. **If SMTP credentials are missing or placeholders**, prompt the developer immediately:
   > *"I noticed your project doesn't have SMTP credentials configured yet. To send real verification emails, we'll need your SMTP settings (like Gmail, Resend, or SendGrid).*
   > 
   > *Do you already know how to get your SMTP credentials (like a Gmail App Password), or would you like me to walk you through the step-by-step setup?"*

3. **When the developer says "Yes, walk me through" or "How do I set it up?"**:
   Provide the exact, crystal-clear 3-step setup guide:
   - **Step A**: Go to Google Account Security (`https://myaccount.google.com/security`) and verify **2-Step Verification** is turned ON.
   - **Step B**: Visit `https://myaccount.google.com/apppasswords`, type an App name (e.g. `MyApp`), and generate the **16-character App Password**.
   - **Step C**: Instruct them:
     > *"Please paste that 16-character password into your local `.env` file under `SMTP_PASS` (without spaces). **Never paste your password into this chat!**"*

4. **Local Development Without SMTP Credentials (Mock Transport)**:
   If SMTP credentials are not yet configured, initialize `EmailAuth` in mock mode using `jsonTransport: true`.
   > [!IMPORTANT]
   > Neither `email-auth-kit` nor `notify-kit` reads `USE_MOCK_SMTP`. Do **not** tell developers that setting an environment variable like `USE_MOCK_SMTP=true` automatically activates mock mode. Mock mode is activated strictly in code by passing `jsonTransport: true`.
   
   Tell the developer:
   > *"Since SMTP credentials aren't set yet, I'll initialize `EmailAuth` in mock transport mode (`jsonTransport: true`). This tests email and OTP generation safely in memory with your product branding without sending real emails. Once you add your SMTP credentials to `.env`, we'll replace mock mode with your live SMTP configuration."*

   > [!WARNING]
   > Keep mock mode restricted strictly to local development and automated tests. Never enable it silently in production. When real SMTP credentials become available, replace mock mode with the actual SMTP configuration.

> [!CAUTION]
> **Secret Handling Rule**: NEVER ask the developer to paste SMTP passwords into the AI chat. Instruct them to place secrets directly into their `.env` file. Never print secrets to terminal logs.

### Step 3: Configure Environment Variables
Create or update `.env.example` with safe placeholder keys:
```env
# SMTP Configuration for email-auth-kit
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-account@gmail.com
SMTP_PASS=your-16-char-app-password
EMAIL_FROM="Application Name <your-account@gmail.com>"
```
Provide the developer with setup instructions from [SMTP Setup Reference](references/smtp-setup.md).
Ensure `.env` is listed in `.gitignore`.

### Step 4: Initialize `EmailAuth`
Create a centralized auth client module (e.g. `lib/email-auth.js` or `src/lib/email-auth.js`).

**When SMTP credentials are unavailable (Local Development / Mock Mode):**
Initialize using `jsonTransport: true` to test email generation without sending real emails:
```javascript
import { EmailAuth } from "email-auth-kit";

export const auth = new EmailAuth({
  from: process.env.EMAIL_FROM || "Test App <test@example.com>",
  jsonTransport: true,
  otp: {
    length: 6,
    expiresIn: 300,
    maxAttempts: 5
  },
  branding: {
    appName: process.env.APP_NAME || "My Application",
    primaryColor: "#2563eb"
  }
});
```

**When real SMTP credentials become available (Live Delivery Mode):**
Replace the mock initialization with the actual SMTP configuration:
```javascript
import { EmailAuth } from "email-auth-kit";

export const auth = new EmailAuth({
  smtp: {
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  },
  from: process.env.EMAIL_FROM,
  otp: {
    length: 6,
    expiresIn: 300,   // 5 minutes
    maxAttempts: 5
  },
  branding: {
    appName: process.env.APP_NAME || "My Application",
    primaryColor: "#2563eb"
  }
});
```

### Step 5: Implement Authentication Endpoints
Implement two dedicated endpoints:
1. **Send OTP (`POST /api/auth/otp/send`)**:
   - Accepts `{ email }`.
   - Normalizes email and calls `await auth.sendOTP(email)`.
   - Returns generic success message to prevent account enumeration.
2. **Verify OTP (`POST /api/auth/otp/verify`)**:
   - Accepts `{ email, code }`.
   - Calls `await auth.verifyOTP(email, code)`.
   - On success: looks up or registers user in the application database, sets session cookie or signs JWT.
   - Catches `OTPExpiredError`, `InvalidOTPError`, `MaxAttemptsExceededError` and returns structured JSON errors.

Refer to [Integration Guide](references/integration-guide.md) for framework-specific implementations (Express, Next.js, Fastify, NestJS).

### Step 6: Frontend Integration (If Requested)
When the developer asks for frontend integration:
- Build a two-step email + OTP code submission component.
- Match existing styling (Tailwind CSS, CSS Modules, or UI library).
- Include resend button, countdown timer, loading states, and error alerts.

### Step 7: Testing the Implementation
- Test with mock transport (`jsonTransport: true`) in automated tests to prevent sending real emails.
- Verify OTP expiry, invalid code rejection, attempt lockout, and single-use consumption.
- Only claim real email delivery works after the developer verifies their actual SMTP credentials locally.

### Step 8: Completion Report
Provide the developer with a clear summary:
- Files created and modified.
- Added API endpoints.
- Environment variables requiring real credentials.
- Instructions on how to run and test locally.

---

## 4. Security Rules Summary

1. **One-Time Consumption**: Once verified, the OTP is permanently consumed.
2. **Resend Invalidation**: Sending a new OTP immediately invalidates any prior active OTP for that email.
3. **No Plaintext Codes**: OTPs and tokens are stored only as salted hashes.
4. **Timing Safety**: Comparison is constant-time via `timingSafeCompare`.
5. **Production Storage**: Remind the user that `InMemoryOTPStore` is for development only; advise using a Redis or PostgreSQL adapter for multi-instance deployments.

See [Security Architecture](references/security.md) for full security specs.

