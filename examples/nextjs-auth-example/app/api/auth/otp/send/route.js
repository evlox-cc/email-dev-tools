import { NextResponse } from "next/server";
import { EmailAuth } from "email-auth-kit";

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
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const res = await auth.sendOTP(email);
    return NextResponse.json({
      success: true,
      message: "If this email is registered, a code has been sent.",
      expiresIn: res.expiresIn
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to send code" },
      { status: 500 }
    );
  }
}

