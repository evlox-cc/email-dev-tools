import { escapeHtml } from "../validator.js";

/**
 * Responsive email layout wrapper for notifications.
 * @param {object} params
 * @param {string} params.appName
 * @param {string} [params.logo]
 * @param {string} [params.primaryColor='#2563eb']
 * @param {string} [params.supportEmail]
 * @param {string} [params.footer]
 * @param {string} params.subject
 * @param {string} params.contentHtml
 * @returns {string}
 */
export function wrapNotificationLayout({
  appName = "Notification Service",
  logo,
  primaryColor = "#2563eb",
  supportEmail,
  footer,
  subject,
  contentHtml
}) {
  const safeAppName = escapeHtml(appName);
  const safeSubject = escapeHtml(subject);
  const safeColor = escapeHtml(primaryColor);
  const safeSupport = supportEmail ? escapeHtml(supportEmail) : null;
  const safeFooter = footer ? escapeHtml(footer) : null;
  const year = new Date().getFullYear();

  const headerLogo = logo
    ? `<img src="${escapeHtml(logo)}" alt="${safeAppName}" style="max-height: 38px; max-width: 150px; display: block;" />`
    : `<h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #111827;">${safeAppName}</h1>`;

  const supportText = safeSupport
    ? `<p style="margin: 6px 0 0; color: #9ca3af; font-size: 12px;">Questions? Contact <a href="mailto:${safeSupport}" style="color: ${safeColor}; text-decoration: underline;">${safeSupport}</a></p>`
    : "";

  const footerText = safeFooter
    ? `<p style="margin: 6px 0 0; color: #9ca3af; font-size: 12px;">${safeFooter}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeSubject}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; padding: 12px !important; }
      .card { padding: 24px 18px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; color: #1f2937;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f3f4f6; padding: 32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" class="container" width="560" cellspacing="0" cellpadding="0" border="0" style="width: 560px; max-width: 560px;">
          <tr>
            <td style="padding-bottom: 16px;">
              ${headerLogo}
            </td>
          </tr>
          <tr>
            <td class="card" style="background-color: #ffffff; border-radius: 10px; padding: 32px 28px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); border: 1px solid #e5e7eb;">
              ${contentHtml}
            </td>
          </tr>
          <tr>
            <td style="padding-top: 20px; text-align: center; color: #9ca3af; font-size: 12px; line-height: 18px;">
              <p style="margin: 0;">&copy; ${year} ${safeAppName}. All rights reserved.</p>
              ${supportText}
              ${footerText}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

