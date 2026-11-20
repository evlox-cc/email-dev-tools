# Next.js App Router OTP Authentication Example

This example demonstrates how to integrate `email-auth-kit` into a Next.js 14/15 application using App Router Route Handlers and a React Client Component.

## Architecture

- **`app/api/auth/otp/send/route.js`**: Route Handler to dispatch OTP codes.
- **`app/api/auth/otp/verify/route.js`**: Route Handler to verify codes timing-safely and consume them.
- **`app/page.js`**: Client component managing login state and input transitions.

## Running Locally

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
2. Run development server:
   ```bash
   npm run dev
   ```
3. Open [http://localhost:3000](http://localhost:3000).

