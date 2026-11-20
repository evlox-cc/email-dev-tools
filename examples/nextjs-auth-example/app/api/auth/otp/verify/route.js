import { NextResponse } from "next/server";
import { EmailAuth } from "@evlox/email-auth-kit";
import {
  OTPExpiredError,
  InvalidOTPError,
  MaxAttemptsExceededError
} from "@evlox/@evlox/email-auth-kit/errors";

const isMock = process.env.USE_MOCK_SMTP !== "false";

const auth = new EmailAuth({
  jsonTransport: isMock,
  smtp: isMock
    ? undefined
    : {
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: Number(process.env.SMTP_PORT || 587),
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      },
  from: process.env.EMAIL_FROM || '"Next Auth" <auth@example.com>'
});

export async function POST(request) {
  try {
    const { email, code } = await request.json();
    if (!email || !code) {
      return NextResponse.json({ error: "Email and code are required" }, { status: 400 });
    }

    const result = await auth.verifyOTP(email, code);

    // In a real app, generate session token and set httpOnly cookie:
    const response = NextResponse.json({
      success: true,
      email: result.email,
      message: "Authenticated successfully"
    });

    return response;
  } catch (err) {
    if (err instanceof OTPExpiredError) {
      return NextResponse.json({ error: err.message, code: "OTP_EXPIRED" }, { status: 400 });
    }
    if (err instanceof MaxAttemptsExceededError) {
      return NextResponse.json({ error: err.message, code: "MAX_ATTEMPTS" }, { status: 429 });
    }
    if (err instanceof InvalidOTPError) {
      return NextResponse.json(
        {
          error: err.message,
          code: "INVALID_OTP",
          remainingAttempts: err.details?.remainingAttempts
        },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}

