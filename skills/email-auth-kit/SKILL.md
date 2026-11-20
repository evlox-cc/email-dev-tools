---
name: email-auth-kit
description: Production-grade AI agent skill to implement secure, branded email OTP authentication, email verification, and password reset using email-auth-kit. Configures SMTP, custom brand identity (product name, brand colors, logo, sender email), rate limiting, and framework routes (Express, Fastify, Next.js, NestJS).
---

# email-auth-kit Agent Skill (v1.0 Production Edition)

This skill guides AI coding agents in delivering an enterprise-ready, beautifully branded email OTP authentication flow using `email-auth-kit`.

---

## 1. Purpose & Triggers

Activate this skill when:
- The developer asks to implement email OTP authentication, magic code login, or passwordless email login.
- The developer asks to add email verification links or password reset flows with `email-auth-kit`.
- The developer asks to set up Gmail or custom SMTP authentication in a Node.js project.

---

## 2. Package Installation

Install the package via npm:
```bash
npm install email-auth-kit
```

---

## 3. Production Implementation Workflow

Follow these eight steps with rigorous attention to detail:

### Step 1: Discover Existing Architecture & Product Brand Identity
Before writing any code, thoroughly inspect the project:
1. **Application & Product Name**:
   - Check `package.json` (`name`), `index.html` (`<title>`), or root layout metadata.
2. **Design Tokens & Brand Colors**:
   - Check `tailwind.config.js`, `tailwind.config.ts`, `globals.css`, or style variables.
   - Identify the product's primary hex color (e.g., `#6366f1`, `#2563eb`, `#059669`).
   - Check `public/` for logos (`logo.png`, `logo.svg`, `icon.png`, `favicon.ico`).
3. **Backend & Architecture**:
   - Framework: Express, Fastify, Next.js App/Pages Router, or NestJS.
   - Module format: ESM (`"type": "module"`) or CommonJS.
   - Database / ORM: Prisma, Drizzle, Mongoose, PostgreSQL, etc.
   - Existing session/auth state: JWT, iron-session, express-session, cookies.
4. **Environment Configuration**:
   - Locate `.env`, `.env.example`, or `.env.local`.

### Step 2: Interactive Product Branding & SMTP Onboarding
Engage the developer professionally to align the product identity and SMTP transport:

1. **Brand Customization Confirmation**:
   - Present discovered branding or ask for confirmation:
     > *"I've detected your product name **[Product Name]** and brand color **[#color]**. I will configure your OTP email templates with your exact product name, logo, and brand color so the emails look completely native to your product.*
     > 
     > *What sender address would you like to use for outgoing auth emails? (e.g. `auth@yourdomain.com` or your Gmail address)?"*

2. **Proactive SMTP Verification**:
   - Check `.env` for valid `SMTP_HOST`, `SMTP_USER`, and `SMTP_PASS`.
   - If missing:
     > *"To deliver real verification emails to users' inboxes, we need an SMTP provider.*
     > 
     > *Do you already have SMTP credentials (such as a Gmail App Password, Resend, or SendGrid API key), or would you like me to walk you through generating a free Gmail App Password in 2 minutes?"*

3. **When the Developer Requests Setup Guidance**:
   Provide the 3-step Gmail App Password instructions:
   - **Step A**: Go to [https://myaccount.google.com/security](https://myaccount.google.com/security) and ensure **2-Step Verification** is turned ON.
   - **Step B**: Go directly to [https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords), enter an App Name (e.g. `MyApp`), and generate the **16-character App Password**.
   - **Step C**: Instruct them:
     > *"Please paste that 16-character password into your local `.env` file under `SMTP_PASS` (without spaces). **Never paste your credentials into this chat!**"*

4. **Local Development Without SMTP Credentials (Mock Transport)**:
   If credentials are not yet available, initialize `EmailAuth` with `jsonTransport: true`:
   > *"Since SMTP credentials aren't set yet, I'll initialize `EmailAuth` in mock transport mode (`jsonTransport: true`). This tests email and OTP generation safely in memory with your product branding without sending real emails. Once you add your SMTP credentials to `.env`, we'll replace mock mode with your live SMTP configuration."*

   > [!WARNING]
   > Neither `email-auth-kit` nor `notify-kit` reads `USE_MOCK_SMTP`. Mock mode is activated strictly in code via `jsonTransport: true`. Keep mock mode restricted to local development; never enable it silently in production.

### Step 3: Configure Environment Variables
Create or update `.env.example` with safe placeholders:
```env
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-char-app-password
EMAIL_FROM="Your App Name <your-email@gmail.com>"
```
Ensure `.env` is listed in `.gitignore`.

### Step 4: Initialize `EmailAuth` with Product Branding
Create a centralized auth client (e.g. `lib/email-auth.js`):

**Production / Live SMTP Mode:**
```javascript
import { EmailAuth } from "email-auth-kit";

export const auth = new EmailAuth({
  smtp: {
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS?.replace(/\s+/g, "")
    }
  },
  from: process.env.EMAIL_FROM || '"My Product" <auth@myproduct.com>',
  otp: {
    length: 6,
    expiresIn: 300, // 5 minutes
    maxAttempts: 5  // Lockout after 5 wrong attempts
  },
  branding: {
    appName: process.env.APP_NAME || "My Product",
    primaryColor: process.env.PRIMARY_COLOR || "#6366f1",
    logo: process.env.LOGO_URL || "https://myproduct.com/logo.png",
    supportEmail: process.env.SUPPORT_EMAIL || "support@myproduct.com",
    footer: "© 2026 My Product Inc. All rights reserved."
  }
});
```

**Development Mock Mode (When SMTP is not yet configured):**
```javascript
import { EmailAuth } from "email-auth-kit";

export const auth = new EmailAuth({
  from: process.env.EMAIL_FROM || '"My Product" <auth@myproduct.com>',
  jsonTransport: true,
  otp: {
    length: 6,
    expiresIn: 300,
    maxAttempts: 5
  },
  branding: {
    appName: "My Product",
    primaryColor: "#6366f1"
  }
});
```

### Step 5: Implement Authentication Routes
Implement secure API endpoints tailored to the backend framework:

1. **Send OTP (`POST /api/auth/otp/send`)**:
   - Accept `{ email }`.
   - Validate and normalize email.
   - Dispatch OTP: `await auth.sendOTP(email)`.
   - Return a generic response (`"If this email is registered, a code has been sent."`) to prevent account enumeration.

2. **Verify OTP (`POST /api/auth/otp/verify`)**:
   - Accept `{ email, code }`.
   - Verify code: `const result = await auth.verifyOTP(email, code)`.
   - Catch `InvalidOTPError`, `OTPExpiredError`, and `MaxAttemptsExceededError`.
   - On success: Find or create the user in the database, issue a session cookie or JWT, and return `{ success: true, email: result.email }`.

### Step 6: Frontend Integration (If Requested)
When the developer asks for frontend integration:
- Build a responsive 2-step authentication UI (email input -> 6 individual digit input boxes with auto-advance and paste support).
- Apply the product's primary brand color to buttons, focus rings, and active badges.
- Include a countdown timer, resend button, and clear status messages.

### Step 7: Automated Verification
- Verify OTP generation, invalid code rejection, attempt lockout, and single-use consumption.
- Test endpoint health with mocked SMTP before claiming live delivery.

### Step 8: Completion Report
Provide the developer with a clear handover:
- Created and modified files.
- Active API endpoints.
- Configured branding (product name, brand color, support email).
- Instructions to test locally and switch to live SMTP.
