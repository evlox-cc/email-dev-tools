import nodemailer from "nodemailer";
import { ConfigurationError, SMTPError } from "./errors.js";

/**
 * Build a Nodemailer transporter from configuration options.
 * @param {object} options
 * @param {object} [options.smtp]
 * @param {string} [options.smtp.host]
 * @param {number} [options.smtp.port]
 * @param {boolean} [options.smtp.secure]
 * @param {object} [options.smtp.auth]
 * @param {string} [options.smtp.auth.user]
 * @param {string} [options.smtp.auth.pass]
 * @param {string} [options.smtp.service]
 * @param {object} [options.transporter] - Pre-instantiated nodemailer transporter
 * @param {boolean} [options.jsonTransport] - For mock / testing
 * @returns {nodemailer.Transporter}
 */
export function createTransporter(options = {}) {
  if (options.transporter) {
    return options.transporter;
  }

  if (options.jsonTransport) {
    return nodemailer.createTransport({ jsonTransport: true });
  }

  const { smtp } = options;
  if (!smtp) {
    throw new ConfigurationError(
      "Missing SMTP configuration. Provide 'smtp' options or a pre-configured 'transporter'."
    );
  }

  // Handle Gmail shortcut
  if (smtp.service === "gmail" || smtp.host === "smtp.gmail.com") {
    if (!smtp.auth || !smtp.auth.user || !smtp.auth.pass) {
      throw new ConfigurationError(
        "Gmail SMTP requires 'smtp.auth.user' and 'smtp.auth.pass' (App Password). " +
        "Generate a 16-character App Password at https://myaccount.google.com/apppasswords"
      );
    }
    return nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: smtp.port || (smtp.secure ? 465 : 587),
      secure: smtp.secure ?? false,
      auth: {
        user: smtp.auth.user,
        pass: smtp.auth.pass
      },
      ...smtp
    });
  }

  // Generic custom SMTP
  if (!smtp.host) {
    throw new ConfigurationError("Missing 'smtp.host' in SMTP configuration.");
  }

  const port = Number(smtp.port) || (smtp.secure ? 465 : 587);
  const secure = typeof smtp.secure === "boolean" ? smtp.secure : port === 465;

  return nodemailer.createTransport({
    host: smtp.host,
    port,
    secure,
    auth: smtp.auth,
    tls: smtp.tls,
    ...smtp
  });
}

/**
 * Send an email message safely, converting Nodemailer errors to SMTPError.
 * @param {nodemailer.Transporter} transporter
 * @param {object} mailOptions
 * @param {string} mailOptions.from
 * @param {string} mailOptions.to
 * @param {string} mailOptions.subject
 * @param {string} mailOptions.html
 * @param {string} [mailOptions.text]
 * @param {object} [mailOptions.headers]
 * @returns {Promise<{ messageId: string, response: string, raw?: unknown }>}
 */
export async function sendEmailMessage(transporter, mailOptions) {
  try {
    const info = await transporter.sendMail(mailOptions);
    return {
      messageId: info.messageId,
      response: info.response || "OK",
      raw: info
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new SMTPError(`Failed to send email to ${mailOptions.to}: ${message}`, {
      originalError: err,
      code: err && typeof err === "object" && "code" in err ? err.code : undefined
    });
  }
}

/**
 * Verify transporter connectivity.
 * @param {nodemailer.Transporter} transporter
 * @returns {Promise<boolean>}
 */
export async function verifyTransporter(transporter) {
  try {
    if (typeof transporter.verify !== "function") {
      return true; // Mock transport might not have verify
    }
    await transporter.verify();
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new SMTPError(`SMTP connection verification failed: ${message}`, {
      originalError: err
    });
  }
}

