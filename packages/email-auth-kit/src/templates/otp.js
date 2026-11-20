import { escapeHtml } from "../validator.js";
import { renderEmailLayout } from "./base.js";

/**
 * Render OTP email in HTML and plain text formats.
 * @param {object} params
 * @param {string} params.appName
 * @param {string} params.code
 * @param {number} params.expiresInSeconds
 * @param {string} [params.logo]
 * @param {string} [params.primaryColor='#2563eb']
 * @param {string} [params.footer]
 * @param {string} [params.supportEmail]
 * @returns {{ html: string, text: string, subject: string }}
 */
export function renderOTPEmail({
  appName = "Application",
  code,
  expiresInSeconds = 300,
  logo,
  primaryColor = "#2563eb",
  footer,
  supportEmail
}) {
  const safeCode = escapeHtml(code);
  const safeAppName = escapeHtml(appName);
  const minutes = Math.max(1, Math.round(expiresInSeconds / 60));
  const timeDesc = minutes === 1 ? "1 minute" : `${minutes} minutes`;

  const subject = `Your verification code: ${code}`;

  const bodyHtml = `
    <h2 style="margin: 0 0 12px; font-size: 20px; font-weight: 600; color: #111827;">Verification Code</h2>
    <p style="margin: 0 0 24px; color: #4b5563; font-size: 15px; line-height: 24px;">
      Use the one-time code below to authenticate with <strong>${safeAppName}</strong>.
    </p>

    <div style="background-color: #f9fafb; border: 1px dashed #d1d5db; border-radius: 8px; padding: 20px; text-align: center; margin: 0 0 24px;">
      <span style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: ${escapeHtml(
        primaryColor
      )}; display: inline-block;">
        ${safeCode}
      </span>
    </div>

    <p style="margin: 0 0 16px; color: #6b7280; font-size: 14px; line-height: 20px;">
      This code is valid for <strong>${timeDesc}</strong> and can only be used once.
    </p>

    <div style="border-top: 1px solid #f3f4f6; padding-top: 16px; margin-top: 24px;">
      <p style="margin: 0; color: #9ca3af; font-size: 12px; line-height: 18px;">
        If you did not request this verification code, please ignore this email or contact support if you suspect unauthorized activity.
      </p>
    </div>
  `;

  const html = renderEmailLayout({
    appName,
    logo,
    primaryColor,
    footer,
    supportEmail,
    title: subject,
    bodyHtml
  });

  const text = `${appName} Verification Code

Your one-time verification code is: ${code}

This code will expire in ${timeDesc}.

If you did not request this code, you can safely ignore this email.
`;

  return { html, text, subject };
}

