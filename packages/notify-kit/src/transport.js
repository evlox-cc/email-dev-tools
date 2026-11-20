import nodemailer from "nodemailer";
import { ConfigurationError, SMTPError, DeliveryError } from "./errors.js";

/**
 * Build Nodemailer transporter for notify-kit.
 * @param {object} options
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

  if (smtp.service === "gmail" || smtp.host === "smtp.gmail.com") {
    if (!smtp.auth || !smtp.auth.user || !smtp.auth.pass) {
      throw new ConfigurationError(
        "Gmail SMTP requires 'smtp.auth.user' and 'smtp.auth.pass' (App Password)."
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
 * Dispatch message and format structured delivery results.
 *
 * NOTE: Successful SMTP acceptance confirms the mail server received the message for relay.
 * It does NOT guarantee final inbox delivery (which depends on recipient spam filters,
 * MX records, DMARC/SPF/DKIM policies).
 *
 * @param {nodemailer.Transporter} transporter
 * @param {object} mailOptions
 * @returns {Promise<{
 *   messageId: string,
 *   accepted: string[],
 *   rejected: string[],
 *   status: "accepted" | "rejected" | "partial",
 *   response: string
 * }>}
 */
export async function dispatchMail(transporter, mailOptions) {
  try {
    const info = await transporter.sendMail(mailOptions);

    let accepted = Array.isArray(info.accepted) ? info.accepted.map(String) : [];
    if (accepted.length === 0 && info.envelope?.to) {
      accepted = Array.isArray(info.envelope.to)
        ? info.envelope.to.map(String)
        : [String(info.envelope.to)];
    }
    const rejected = Array.isArray(info.rejected) ? info.rejected.map(String) : [];

    let status = "accepted";
    if (rejected.length > 0 && accepted.length === 0) {
      status = "rejected";
      throw new DeliveryError(
        `All recipients rejected by SMTP server: ${rejected.join(", ")}`,
        { accepted, rejected, response: info.response }
      );
    } else if (rejected.length > 0) {
      status = "partial";
    }

    return {
      messageId: info.messageId || "mock-id",
      accepted,
      rejected,
      status,
      response: info.response || "OK"
    };
  } catch (err) {
    if (err instanceof DeliveryError) {
      throw err;
    }
    const message = err instanceof Error ? err.message : String(err);
    throw new SMTPError(`SMTP transmission failed: ${message}`, {
      originalError: err
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
      return true;
    }
    await transporter.verify();
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new SMTPError(`SMTP connection check failed: ${message}`, {
      originalError: err
    });
  }
}
