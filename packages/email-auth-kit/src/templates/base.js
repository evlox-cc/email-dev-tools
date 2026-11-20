import { escapeHtml } from "../validator.js";

/**
 * Render standard responsive HTML email shell.
 * @param {object} params
 * @param {string} params.appName
 * @param {string} [params.logo]
 * @param {string} [params.primaryColor='#2563eb']
 * @param {string} [params.footer]
 * @param {string} [params.supportEmail]
 * @param {string} params.title
 * @param {string} params.bodyHtml
 * @returns {string} Complete HTML string
 */
export function renderEmailLayout({
  appName,
  logo,
  primaryColor = "#2563eb",
  footer,
  supportEmail,
  title,
  bodyHtml
}) {
  const safeAppName = escapeHtml(appName || "Application");
  const safeTitle = escapeHtml(title);
  const safeColor = escapeHtml(primaryColor);
  const safeFooter = footer ? escapeHtml(footer) : null;
  const safeSupport = supportEmail ? escapeHtml(supportEmail) : null;
  const currentYear = new Date().getFullYear();

  const logoMarkup = logo
    ? `<img src="${escapeHtml(logo)}" alt="${safeAppName}" style="max-height: 40px; max-width: 160px; margin-bottom: 12px; display: block;" />`
    : `<h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #111827; letter-spacing: -0.5px;">${safeAppName}</h1>`;

  const footerExtra = safeFooter
    ? `<p style="margin: 6px 0 0; color: #9ca3af; font-size: 12px;">${safeFooter}</p>`
    : "";

  const supportMarkup = safeSupport
    ? `<p style="margin: 6px 0 0; color: #9ca3af; font-size: 12px;">Need help? Contact <a href="mailto:${safeSupport}" style="color: ${safeColor}; text-decoration: underline;">${safeSupport}</a></p>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    body { margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; }
    table { border-collapse: collapse; }
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; padding: 16px !important; }
      .email-card { padding: 24px 20px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; color: #1f2937;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f3f4f6; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" class="email-container" width="540" cellspacing="0" cellpadding="0" border="0" style="width: 540px; max-width: 540px;">
          <!-- Header -->
          <tr>
            <td style="padding-bottom: 20px; text-align: left;">
              ${logoMarkup}
            </td>
          </tr>
          <!-- Main Card -->
          <tr>
            <td class="email-card" style="background-color: #ffffff; border-radius: 12px; padding: 36px 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); border: 1px solid #e5e7eb;">
              ${bodyHtml}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding-top: 24px; text-align: center; color: #9ca3af; font-size: 12px; line-height: 18px;">
              <p style="margin: 0;">&copy; ${currentYear} ${safeAppName}. All rights reserved.</p>
              ${supportMarkup}
              ${footerExtra}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

