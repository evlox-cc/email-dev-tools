import { escapeHtml } from "../validator.js";
import { renderEmailLayout } from "./base.js";

/**
 * Render password reset message in HTML and text.
 * @param {object} params
 * @param {string} params.appName
 * @param {string} params.resetUrl
 * @param {number} [params.expiresInSeconds=3600]
 * @param {string} [params.logo]
 * @param {string} [params.primaryColor='#2563eb']
 * @param {string} [params.footer]
 * @param {string} [params.supportEmail]
 * @returns {{ html: string, text: string, subject: string }}
 */
export function renderPasswordResetEmail({
  appName = "Application",
  resetUrl,
  expiresInSeconds = 3600,
  logo,
  primaryColor = "#2563eb",
  footer,
  supportEmail
}) {
  const safeUrl = escapeHtml(resetUrl);
  const safeAppName = escapeHtml(appName);
  const minutes = Math.max(1, Math.round(expiresInSeconds / 60));
  const timeDesc = minutes === 60 ? "1 hour" : `${minutes} minutes`;

  const subject = `Reset your ${appName} password`;

  const bodyHtml = `
    <h2 style="margin: 0 0 12px; font-size: 20px; font-weight: 600; color: #111827;">Reset your password</h2>
    <p style="margin: 0 0 24px; color: #4b5563; font-size: 15px; line-height: 24px;">
      We received a request to reset your password for your <strong>${safeAppName}</strong> account. Click the button below to choose a new password.
    </p>

    <div style="text-align: center; margin: 32px 0;">
      <a href="${safeUrl}" target="_blank" style="background-color: ${escapeHtml(
        primaryColor
      )}; color: #ffffff; padding: 14px 28px; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 8px; display: inline-block;">
        Reset Password
      </a>
    </div>

    <p style="margin: 0 0 12px; color: #6b7280; font-size: 13px; line-height: 20px;">
      This password reset link will expire in <strong>${timeDesc}</strong> and can only be used once.
    </p>

    <p style="margin: 0 0 16px; color: #9ca3af; font-size: 12px; line-height: 18px; word-break: break-all;">
      Or copy and paste this link into your browser:<br>
      <a href="${safeUrl}" style="color: ${escapeHtml(primaryColor)};">${safeUrl}</a>
    </p>

    <div style="border-top: 1px solid #f3f4f6; padding-top: 16px; margin-top: 24px;">
      <p style="margin: 0; color: #9ca3af; font-size: 12px; line-height: 18px;">
        If you did not request a password reset, no further action is required. Your password will remain unchanged.
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

  const text = `Reset your password for ${appName}

We received a request to reset your password. Use the link below to choose a new password:
${resetUrl}

This link will expire in ${timeDesc}.

If you did not request a password reset, you can safely ignore this email.
`;

  return { html, text, subject };
}

