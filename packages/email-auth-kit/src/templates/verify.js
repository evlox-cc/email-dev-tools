import { escapeHtml } from "../validator.js";
import { renderEmailLayout } from "./base.js";

/**
 * Render email verification message in HTML and text.
 * @param {object} params
 * @param {string} params.appName
 * @param {string} params.url
 * @param {number} [params.expiresInSeconds=86400]
 * @param {string} [params.logo]
 * @param {string} [params.primaryColor='#2563eb']
 * @param {string} [params.footer]
 * @param {string} [params.supportEmail]
 * @returns {{ html: string, text: string, subject: string }}
 */
export function renderVerificationEmail({
  appName = "Application",
  url,
  expiresInSeconds = 86400,
  logo,
  primaryColor = "#2563eb",
  footer,
  supportEmail
}) {
  const safeUrl = escapeHtml(url);
  const safeAppName = escapeHtml(appName);
  const hours = Math.max(1, Math.round(expiresInSeconds / 3600));
  const timeDesc = hours === 1 ? "1 hour" : `${hours} hours`;

  const subject = `Verify your email for ${appName}`;

  const bodyHtml = `
    <h2 style="margin: 0 0 12px; font-size: 20px; font-weight: 600; color: #111827;">Confirm your email address</h2>
    <p style="margin: 0 0 24px; color: #4b5563; font-size: 15px; line-height: 24px;">
      Thank you for registering with <strong>${safeAppName}</strong>. Please click the button below to verify your email address.
    </p>

    <div style="text-align: center; margin: 32px 0;">
      <a href="${safeUrl}" target="_blank" style="background-color: ${escapeHtml(
        primaryColor
      )}; color: #ffffff; padding: 14px 28px; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 8px; display: inline-block;">
        Verify Email Address
      </a>
    </div>

    <p style="margin: 0 0 12px; color: #6b7280; font-size: 13px; line-height: 20px;">
      This link will expire in <strong>${timeDesc}</strong>.
    </p>

    <p style="margin: 0 0 16px; color: #9ca3af; font-size: 12px; line-height: 18px; word-break: break-all;">
      Or copy and paste this link into your browser:<br>
      <a href="${safeUrl}" style="color: ${escapeHtml(primaryColor)};">${safeUrl}</a>
    </p>

    <div style="border-top: 1px solid #f3f4f6; padding-top: 16px; margin-top: 24px;">
      <p style="margin: 0; color: #9ca3af; font-size: 12px; line-height: 18px;">
        If you did not create an account with ${safeAppName}, please ignore this email.
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

  const text = `Verify your email for ${appName}

Please verify your email address by visiting the following link:
${url}

This link will expire in ${timeDesc}.

If you did not request this, you can safely ignore this email.
`;

  return { html, text, subject };
}

