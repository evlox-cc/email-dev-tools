import {
  ConfigurationError,
  InvalidRecipientError,
  TemplateError
} from "./errors.js";
import { normalizeRecipients, cleanEmail } from "./validator.js";
import { resolveTemplate } from "./templates/index.js";
import {
  createTransporter,
  dispatchMail,
  verifyTransporter
} from "./transport.js";

/**
 * Main transactional email notification client.
 */
export class Notify {
  /**
   * @param {object} options
   * @param {object} [options.smtp] - SMTP transport config
   * @param {string} options.from - Default sender address ("App <info@app.com>")
   * @param {object} [options.transporter] - Custom nodemailer transporter
   * @param {boolean} [options.jsonTransport] - For testing/mocking
   * @param {object} [options.branding]
   * @param {string} [options.branding.appName="Application"]
   * @param {string} [options.branding.logo]
   * @param {string} [options.branding.primaryColor="#2563eb"]
   * @param {string} [options.branding.supportEmail]
   * @param {string} [options.branding.footer]
   */
  constructor(options = {}) {
    if (!options.from) {
      throw new ConfigurationError("Missing required option 'from' (sender address).");
    }

    this.from = options.from;
    this.branding = {
      appName: options.branding?.appName || "Application",
      logo: options.branding?.logo,
      primaryColor: options.branding?.primaryColor || "#2563eb",
      supportEmail: options.branding?.supportEmail,
      footer: options.branding?.footer
    };

    /** @type {Record<string, Function>} */
    this._customTemplates = {};
    this.transporter = createTransporter(options);
  }

  /**
   * Register a custom template function.
   * @param {string} name
   * @param {Function} templateFn - (branding, data) => ({ html, text, subject })
   */
  registerTemplate(name, templateFn) {
    if (typeof name !== "string" || !name.trim()) {
      throw new ConfigurationError("Template name must be a non-empty string.");
    }
    if (typeof templateFn !== "function") {
      throw new ConfigurationError("Template must be a function: (branding, data) => ({ html, text, subject })");
    }
    this._customTemplates[name.trim()] = templateFn;
  }

  /**
   * Send a transactional email.
   *
   * @param {object} options
   * @param {string|string[]} options.to - Primary recipient(s)
   * @param {string|string[]} [options.cc] - CC recipient(s)
   * @param {string|string[]} [options.bcc] - BCC recipient(s)
   * @param {string} [options.replyTo] - Reply-to address
   * @param {string} [options.subject] - Email subject
   * @param {string|Function} [options.template] - Registered template name or function
   * @param {Record<string, unknown>} [options.data] - Template data
   * @param {string} [options.html] - Raw HTML body (if not using template)
   * @param {string} [options.text] - Plain text body
   * @param {Array<object>} [options.attachments] - Nodemailer attachments
   * @param {Record<string, string>} [options.headers] - Custom email headers
   * @param {string} [options.from] - Override default sender
   * @returns {Promise<{
   *   messageId: string,
   *   accepted: string[],
   *   rejected: string[],
   *   status: "accepted" | "rejected" | "partial",
   *   response: string
   * }>}
   */
  async send(options) {
    if (!options) {
      throw new ConfigurationError("Missing options object for send().");
    }

    const to = normalizeRecipients(options.to);
    if (to.length === 0) {
      throw new InvalidRecipientError("At least one 'to' recipient is required.");
    }

    const cc = options.cc ? normalizeRecipients(options.cc) : undefined;
    const bcc = options.bcc ? normalizeRecipients(options.bcc) : undefined;
    const replyTo = options.replyTo ? cleanEmail(options.replyTo) : undefined;

    let html = options.html;
    let text = options.text;
    let subject = options.subject;

    if (options.template) {
      const templateFn = resolveTemplate(options.template, this._customTemplates);
      try {
        const rendered = templateFn(this.branding, options.data || {});
        if (!rendered || typeof rendered !== "object") {
          throw new TemplateError("Template function must return an object with html and text.");
        }
        html = rendered.html;
        text = rendered.text;
        if (!subject && rendered.subject) {
          subject = rendered.subject;
        }
      } catch (err) {
        if (err instanceof TemplateError) throw err;
        throw new TemplateError(`Failed to render template "${options.template}": ${err.message}`, {
          originalError: err
        });
      }
    }

    if (!subject) {
      throw new ConfigurationError("Email 'subject' is required (or must be provided by template).");
    }

    if (!html && !text) {
      throw new ConfigurationError("Email must contain either 'html', 'text', or a valid 'template'.");
    }

    return dispatchMail(this.transporter, {
      from: options.from || this.from,
      to,
      cc,
      bcc,
      replyTo,
      subject,
      html,
      text,
      attachments: options.attachments,
      headers: options.headers
    });
  }

  /**
   * Convenience: Send a Welcome email.
   * @param {object} params
   * @param {string|string[]} params.to
   * @param {string} [params.name]
   * @param {string} [params.actionUrl]
   * @param {string} [params.actionText]
   * @param {string} [params.intro]
   * @param {string} [params.subject]
   */
  async sendWelcome(params) {
    return this.send({
      to: params.to,
      template: "welcome",
      subject: params.subject,
      data: {
        name: params.name,
        actionUrl: params.actionUrl,
        actionText: params.actionText,
        intro: params.intro
      }
    });
  }

  /**
   * Convenience: Send an Order Confirmation email.
   * @param {object} params
   * @param {string|string[]} params.to
   * @param {string} params.orderId
   * @param {string|number} params.amount
   * @param {string} [params.currency]
   * @param {string} [params.customerName]
   * @param {Array<{ name: string, quantity?: number, price?: string|number }>} [params.items]
   * @param {string} [params.viewOrderUrl]
   * @param {string} [params.subject]
   */
  async sendOrderConfirmation(params) {
    return this.send({
      to: params.to,
      template: "order_confirmation",
      subject: params.subject,
      data: {
        orderId: params.orderId,
        amount: params.amount,
        currency: params.currency,
        customerName: params.customerName,
        items: params.items,
        viewOrderUrl: params.viewOrderUrl
      }
    });
  }

  /**
   * Convenience: Send an Account Notification / Security Notice.
   * @param {object} params
   * @param {string|string[]} params.to
   * @param {string} params.title
   * @param {string} params.message
   * @param {string} [params.actionUrl]
   * @param {string} [params.actionText]
   * @param {string} [params.subject]
   */
  async sendAccountNotification(params) {
    return this.send({
      to: params.to,
      template: "account_notification",
      subject: params.subject,
      data: {
        title: params.title,
        message: params.message,
        actionUrl: params.actionUrl,
        actionText: params.actionText
      }
    });
  }

  /**
   * Convenience: Send a Password Reset security alert (notice that password was changed).
   * @param {object} params
   * @param {string|string[]} params.to
   * @param {string} [params.timestamp]
   * @param {string} [params.ipAddress]
   * @param {string} [params.device]
   * @param {string} [params.subject]
   */
  async sendPasswordResetNotification(params) {
    return this.send({
      to: params.to,
      template: "password_reset_notification",
      subject: params.subject,
      data: {
        timestamp: params.timestamp,
        ipAddress: params.ipAddress,
        device: params.device
      }
    });
  }

  /**
   * Convenience: Send a custom HTML email wrapped in the responsive layout.
   * @param {object} params
   * @param {string|string[]} params.to
   * @param {string} params.subject
   * @param {string} params.html
   * @param {string} [params.text]
   */
  async sendCustom(params) {
    return this.send({
      to: params.to,
      template: "custom",
      subject: params.subject,
      data: {
        subject: params.subject,
        html: params.html,
        text: params.text
      }
    });
  }

  /**
   * Verify SMTP connection status.
   * @returns {Promise<boolean>}
   */
  async verifyConnection() {
    return verifyTransporter(this.transporter);
  }
}

