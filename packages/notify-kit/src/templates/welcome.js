import { escapeHtml } from "../validator.js";
import { wrapNotificationLayout } from "./base.js";

/**
 * Render Welcome Email
 * @param {object} branding
 * @param {object} data
 * @param {string} [data.name]
 * @param {string} [data.actionUrl]
 * @param {string} [data.actionText='Get Started']
 * @param {string} [data.intro]
 * @returns {{ html: string, text: string, subject: string }}
 */
export function renderWelcome(branding, data = {}) {
  const name = data.name ? escapeHtml(data.name) : "there";
  const appName = branding.appName || "Application";
  const actionUrl = data.actionUrl ? escapeHtml(data.actionUrl) : null;
  const actionText = data.actionText ? escapeHtml(data.actionText) : "Get Started";
  const intro = data.intro
    ? escapeHtml(data.intro)
    : `We are thrilled to have you join <strong>${escapeHtml(appName)}</strong>. Your account is ready.`;

  const subject = `Welcome to ${appName}!`;

  const buttonMarkup = actionUrl
    ? `<div style="text-align: center; margin: 30px 0;">
         <a href="${actionUrl}" target="_blank" style="background-color: ${escapeHtml(
           branding.primaryColor || "#2563eb"
         )}; color: #ffffff; padding: 13px 26px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; display: inline-block;">
           ${actionText}
         </a>
       </div>`
    : "";

  const contentHtml = `
    <h2 style="margin: 0 0 12px; font-size: 20px; font-weight: 700; color: #111827;">Welcome, ${name}!</h2>
    <p style="margin: 0 0 16px; color: #4b5563; font-size: 15px; line-height: 24px;">
      ${intro}
    </p>
    ${buttonMarkup}
    <p style="margin: 20px 0 0; color: #6b7280; font-size: 14px; line-height: 22px;">
      If you have any questions or feedback, feel free to reply directly to this email.
    </p>
  `;

  const html = wrapNotificationLayout({
    ...branding,
    subject,
    contentHtml
  });

  const text = `Welcome to ${appName}, ${data.name || "friend"}!

${data.intro || `We're thrilled to have you join ${appName}.`}

${data.actionUrl ? `${actionText}: ${data.actionUrl}` : ""}

If you have questions, reply to this email.
`;

  return { html, text, subject };
}

/**
 * Render Order Confirmation Email
 * @param {object} branding
 * @param {object} data
 * @param {string} data.orderId
 * @param {string|number} data.amount
 * @param {string} [data.currency='$']
 * @param {string} [data.customerName]
 * @param {Array<{ name: string, quantity?: number, price?: string|number }>} [data.items]
 * @param {string} [data.viewOrderUrl]
 * @returns {{ html: string, text: string, subject: string }}
 */
export function renderOrderConfirmation(branding, data = {}) {
  const appName = branding.appName || "Store";
  const orderId = escapeHtml(data.orderId || "N/A");
  const currency = escapeHtml(data.currency || "$");
  const amount = escapeHtml(String(data.amount || "0.00"));
  const customerName = data.customerName ? escapeHtml(data.customerName) : "valued customer";

  const subject = `Order Confirmation #${data.orderId || ""}`;

  let itemsHtml = "";
  if (Array.isArray(data.items) && data.items.length > 0) {
    const rows = data.items
      .map(
        (it) => `
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #374151; font-size: 14px;">
            ${escapeHtml(it.name)}${it.quantity ? ` &times; ${escapeHtml(String(it.quantity))}` : ""}
          </td>
          <td align="right" style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #111827; font-weight: 600; font-size: 14px;">
            ${it.price ? `${currency}${escapeHtml(String(it.price))}` : ""}
          </td>
        </tr>`
      )
      .join("");

    itemsHtml = `
      <table width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 20px 0; border-collapse: collapse;">
        <thead>
          <tr style="border-bottom: 2px solid #e5e7eb; color: #6b7280; font-size: 12px; text-transform: uppercase;">
            <th align="left" style="padding-bottom: 8px;">Item</th>
            <th align="right" style="padding-bottom: 8px;">Price</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  const viewButton = data.viewOrderUrl
    ? `<div style="text-align: center; margin: 28px 0 10px;">
         <a href="${escapeHtml(data.viewOrderUrl)}" target="_blank" style="background-color: ${escapeHtml(
           branding.primaryColor || "#2563eb"
         )}; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px; display: inline-block;">
           View Order Details
         </a>
       </div>`
    : "";

  const contentHtml = `
    <h2 style="margin: 0 0 8px; font-size: 20px; font-weight: 700; color: #111827;">Thank you for your order!</h2>
    <p style="margin: 0 0 18px; color: #4b5563; font-size: 14px; line-height: 22px;">
      Hi ${customerName}, your order has been received and is being processed.
    </p>

    <div style="background-color: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
      <div style="display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 6px;">
        <span style="color: #6b7280;">Order Number:</span>
        <strong style="color: #111827;">${orderId}</strong>
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 14px;">
        <span style="color: #6b7280;">Total Paid:</span>
        <strong style="color: #111827; font-size: 16px;">${currency}${amount}</strong>
      </div>
    </div>

    ${itemsHtml}
    ${viewButton}
  `;

  const html = wrapNotificationLayout({
    ...branding,
    subject,
    contentHtml
  });

  const text = `Order Confirmation #${data.orderId} - ${appName}

Thank you for your order, ${data.customerName || "customer"}!
Order Number: ${data.orderId}
Total: ${currency}${amount}

${data.viewOrderUrl ? `View order details: ${data.viewOrderUrl}` : ""}
`;

  return { html, text, subject };
}

/**
 * Render Account Alert / Activity Notification
 * @param {object} branding
 * @param {object} data
 * @param {string} data.title
 * @param {string} data.message
 * @param {string} [data.actionUrl]
 * @param {string} [data.actionText='Review Activity']
 * @returns {{ html: string, text: string, subject: string }}
 */
export function renderAccountNotification(branding, data = {}) {
  const appName = branding.appName || "Application";
  const title = escapeHtml(data.title || "Account Notification");
  const message = escapeHtml(data.message || "An event occurred on your account.");
  const subject = data.title ? `${appName}: ${data.title}` : `Account Notification - ${appName}`;

  const buttonMarkup = data.actionUrl
    ? `<div style="text-align: center; margin: 24px 0 8px;">
         <a href="${escapeHtml(data.actionUrl)}" target="_blank" style="background-color: ${escapeHtml(
           branding.primaryColor || "#2563eb"
         )}; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px; display: inline-block;">
           ${escapeHtml(data.actionText || "Review Activity")}
         </a>
       </div>`
    : "";

  const contentHtml = `
    <h2 style="margin: 0 0 12px; font-size: 20px; font-weight: 700; color: #111827;">${title}</h2>
    <p style="margin: 0 0 16px; color: #4b5563; font-size: 15px; line-height: 24px;">
      ${message}
    </p>
    ${buttonMarkup}
    <div style="border-top: 1px solid #f3f4f6; margin-top: 24px; padding-top: 14px;">
      <p style="margin: 0; color: #9ca3af; font-size: 12px;">
        If you did not authorize this change or recognize this activity, please contact support immediately.
      </p>
    </div>
  `;

  const html = wrapNotificationLayout({
    ...branding,
    subject,
    contentHtml
  });

  const text = `${title} - ${appName}

${data.message || ""}

${data.actionUrl ? `Action: ${data.actionUrl}` : ""}
`;

  return { html, text, subject };
}

/**
 * Render Password Reset Security Notification (alerts user that their password was changed)
 * @param {object} branding
 * @param {object} data
 * @param {string} [data.timestamp]
 * @param {string} [data.ipAddress]
 * @param {string} [data.device]
 * @returns {{ html: string, text: string, subject: string }}
 */
export function renderPasswordResetNotification(branding, data = {}) {
  const appName = branding.appName || "Application";
  const subject = `Security Alert: Password changed for ${appName}`;
  const timestamp = data.timestamp ? escapeHtml(data.timestamp) : new Date().toUTCString();
  const ipAddress = data.ipAddress ? escapeHtml(data.ipAddress) : null;
  const device = data.device ? escapeHtml(data.device) : null;

  const metaItems = [
    `<div><strong>Time:</strong> ${timestamp}</div>`,
    ipAddress ? `<div><strong>IP Address:</strong> ${ipAddress}</div>` : "",
    device ? `<div><strong>Device:</strong> ${device}</div>` : ""
  ]
    .filter(Boolean)
    .join("");

  const contentHtml = `
    <h2 style="margin: 0 0 12px; font-size: 20px; font-weight: 700; color: #dc2626;">Security Alert: Password Changed</h2>
    <p style="margin: 0 0 16px; color: #4b5563; font-size: 15px; line-height: 24px;">
      The password for your <strong>${escapeHtml(appName)}</strong> account was recently changed.
    </p>

    <div style="background-color: #fef2f2; border: 1px solid #fee2e2; border-radius: 8px; padding: 14px; margin-bottom: 20px; font-size: 13px; color: #991b1b; line-height: 20px;">
      ${metaItems}
    </div>

    <p style="margin: 0 0 12px; color: #4b5563; font-size: 14px; line-height: 22px;">
      If you made this change, you can safely ignore this notification.
    </p>
    <p style="margin: 0; color: #dc2626; font-size: 14px; font-weight: 600; line-height: 22px;">
      If you did NOT make this change, please reset your password immediately and contact support.
    </p>
  `;

  const html = wrapNotificationLayout({
    ...branding,
    primaryColor: "#dc2626",
    subject,
    contentHtml
  });

  const text = `Security Alert: Password changed for ${appName}

The password for your account was changed at ${timestamp}.
${ipAddress ? `IP: ${data.ipAddress}` : ""}
${device ? `Device: ${data.device}` : ""}

If you did NOT make this change, contact support immediately.
`;

  return { html, text, subject };
}

/**
 * Render Custom Email wrapped in standard responsive layout
 * @param {object} branding
 * @param {object} data
 * @param {string} data.subject
 * @param {string} data.html
 * @param {string} [data.text]
 * @returns {{ html: string, text: string, subject: string }}
 */
export function renderCustom(branding, data = {}) {
  const subject = data.subject || "Notification";
  const html = wrapNotificationLayout({
    ...branding,
    subject,
    contentHtml: data.html || ""
  });
  const text = data.text || subject;
  return { html, text, subject };
}

