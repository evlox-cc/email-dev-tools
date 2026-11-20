import {
  ConfigurationError,
  OTPExpiredError,
  InvalidOTPError,
  MaxAttemptsExceededError,
  TokenExpiredError
} from "./errors.js";
import { InMemoryOTPStore } from "./store/memory.js";
import {
  generateOTP,
  generateSecureToken,
  generateSalt,
  hashOTP,
  hashToken,
  timingSafeCompare
} from "./crypto.js";
import { normalizeEmail, validateOTPCode } from "./validator.js";
import {
  renderOTPEmail,
  renderVerificationEmail,
  renderPasswordResetEmail
} from "./templates/index.js";
import {
  createTransporter,
  sendEmailMessage,
  verifyTransporter
} from "./transport.js";

/**
 * Main authentication and OTP management class.
 */
export class EmailAuth {
  /**
   * @param {object} options
   * @param {object} [options.smtp] - SMTP connection details
   * @param {string} [options.smtp.host]
   * @param {number} [options.smtp.port]
   * @param {boolean} [options.smtp.secure]
   * @param {object} [options.smtp.auth]
   * @param {string} [options.smtp.auth.user]
   * @param {string} [options.smtp.auth.pass]
   * @param {string} [options.smtp.service]
   * @param {object} [options.transporter] - Pre-configured nodemailer transporter
   * @param {boolean} [options.jsonTransport] - Mock mode for testing
   * @param {string} options.from - Sender address ("AppName <no-reply@app.com>")
   * @param {object} [options.otp]
   * @param {number} [options.otp.length=6] - Number of digits (4-12)
   * @param {number} [options.otp.expiresIn=300] - Expiry in seconds (default 5m)
   * @param {number} [options.otp.maxAttempts=5] - Maximum verification attempts
   * @param {object} [options.token]
   * @param {number} [options.token.expiresIn=3600] - Token expiry in seconds (default 1h)
   * @param {object} [options.branding]
   * @param {string} [options.branding.appName="Application"]
   * @param {string} [options.branding.logo]
   * @param {string} [options.branding.primaryColor="#2563eb"]
   * @param {string} [options.branding.footer]
   * @param {string} [options.branding.supportEmail]
   * @param {import("./store/base.js").OTPStore} [options.store] - Custom store adapter
   */
  constructor(options = {}) {
    if (!options.from) {
      throw new ConfigurationError("Missing required option 'from' (sender email address).");
    }

    this.from = options.from;

    this.otpConfig = {
      length: options.otp?.length ?? 6,
      expiresIn: options.otp?.expiresIn ?? 300,
      maxAttempts: options.otp?.maxAttempts ?? 5
    };

    if (this.otpConfig.length < 4 || this.otpConfig.length > 12) {
      throw new ConfigurationError("OTP length must be between 4 and 12 digits.");
    }
    if (this.otpConfig.expiresIn < 10) {
      throw new ConfigurationError("OTP expiresIn must be at least 10 seconds.");
    }
    if (this.otpConfig.maxAttempts < 1) {
      throw new ConfigurationError("OTP maxAttempts must be at least 1.");
    }

    this.tokenConfig = {
      expiresIn: options.token?.expiresIn ?? 3600
    };

    this.branding = {
      appName: options.branding?.appName || "Application",
      logo: options.branding?.logo,
      primaryColor: options.branding?.primaryColor || "#2563eb",
      footer: options.branding?.footer,
      supportEmail: options.branding?.supportEmail
    };

    this.store = options.store || new InMemoryOTPStore();
    this.transporter = createTransporter(options);
  }

  /**
   * Send a one-time password (OTP) to an email address.
   * Invalidates any prior active OTP for this email.
   *
   * @param {string} email - Destination email
   * @param {object} [options]
   * @param {number} [options.length]
   * @param {number} [options.expiresIn]
   * @param {number} [options.maxAttempts]
   * @param {string} [options.subject]
   * @param {Function} [options.template] - Custom template function ({ appName, code, expiresInSeconds })
   * @returns {Promise<{ success: true, messageId: string, expiresIn: number }>}
   */
  async sendOTP(email, options = {}) {
    const cleanEmail = normalizeEmail(email);
    const length = options.length ?? this.otpConfig.length;
    const expiresIn = options.expiresIn ?? this.otpConfig.expiresIn;
    const maxAttempts = options.maxAttempts ?? this.otpConfig.maxAttempts;

    // Resend invalidation: delete previous OTP for this address
    const storeKey = `otp:${cleanEmail}`;
    await this.store.delete(storeKey);

    // Generate secure random OTP and salt
    const code = generateOTP(length);
    const salt = generateSalt(16);
    const hashedOtp = hashOTP(code, salt);

    // Save record to store
    await this.store.set(
      storeKey,
      {
        hashedOtp,
        salt,
        length,
        maxAttempts,
        attempts: 0,
        createdAt: Date.now()
      },
      expiresIn
    );

    // Prepare email content
    let rendered;
    if (typeof options.template === "function") {
      rendered = options.template({
        appName: this.branding.appName,
        code,
        expiresInSeconds: expiresIn,
        primaryColor: this.branding.primaryColor,
        logo: this.branding.logo,
        supportEmail: this.branding.supportEmail
      });
    } else {
      rendered = renderOTPEmail({
        appName: this.branding.appName,
        code,
        expiresInSeconds: expiresIn,
        logo: this.branding.logo,
        primaryColor: this.branding.primaryColor,
        footer: this.branding.footer,
        supportEmail: this.branding.supportEmail
      });
    }

    const subject = options.subject || rendered.subject;

    const result = await sendEmailMessage(this.transporter, {
      from: this.from,
      to: cleanEmail,
      subject,
      html: rendered.html,
      text: rendered.text
    });

    return {
      success: true,
      messageId: result.messageId,
      expiresIn
    };
  }

  /**
   * Verify an OTP code provided by the user.
   * Atomically consumes the OTP upon successful match (single-use).
   *
   * @param {string} email
   * @param {string|number} code
   * @param {object} [options]
   * @param {boolean} [options.consume=true] - Atomically consume on success
   * @returns {Promise<{ valid: true, email: string }>}
   */
  async verifyOTP(email, code, options = {}) {
    const cleanEmail = normalizeEmail(email);
    const storeKey = `otp:${cleanEmail}`;

    const record = await this.store.get(storeKey);
    if (!record) {
      throw new OTPExpiredError("OTP has expired or was not requested.", {
        email: cleanEmail
      });
    }

    const expectedLength = typeof record.length === "number" ? record.length : this.otpConfig.length;
    let cleanCode;
    try {
      cleanCode = validateOTPCode(code, expectedLength);
    } catch (err) {
      throw new InvalidOTPError(err instanceof Error ? err.message : "Invalid OTP code provided.", {
        email: cleanEmail
      });
    }

    const maxAttempts = record.maxAttempts ?? this.otpConfig.maxAttempts;
    const currentAttempts = (record.attempts ?? 0);

    if (currentAttempts >= maxAttempts) {
      await this.store.delete(storeKey);
      throw new MaxAttemptsExceededError(
        "Maximum verification attempts exceeded. Please request a new OTP.",
        { email: cleanEmail, maxAttempts }
      );
    }

    // Increment attempt count atomically
    const newAttempts = await this.store.incrementAttempts(storeKey);

    // Timing-safe verification
    const inputHash = hashOTP(cleanCode, record.salt);
    const isMatch = timingSafeCompare(inputHash, record.hashedOtp);

    if (!isMatch) {
      if (newAttempts >= maxAttempts) {
        await this.store.delete(storeKey);
        throw new MaxAttemptsExceededError(
          "Maximum verification attempts exceeded. Please request a new OTP.",
          { email: cleanEmail, maxAttempts }
        );
      }

      const remainingAttempts = Math.max(0, maxAttempts - newAttempts);
      throw new InvalidOTPError("Invalid OTP code provided.", {
        email: cleanEmail,
        remainingAttempts
      });
    }

    // Success: atomically consume OTP (one-time consumption)
    if (options.consume !== false) {
      await this.store.delete(storeKey);
    }

    return {
      valid: true,
      email: cleanEmail
    };
  }

  /**
   * Send an email verification link with a secure single-use token.
   *
   * @param {string} email
   * @param {object} options
   * @param {string} options.url - Verification destination (e.g. "https://app.com/verify?token=")
   * @param {number} [options.expiresIn=86400] - Expiration in seconds (default 24h)
   * @param {string} [options.subject]
   * @returns {Promise<{ success: true, messageId: string, expiresIn: number }>}
   */
  async sendVerificationEmail(email, options) {
    if (!options || !options.url) {
      throw new ConfigurationError("Missing required option 'url' for email verification.");
    }

    const cleanEmail = normalizeEmail(email);
    const expiresIn = options.expiresIn ?? 86400; // 24 hours
    const storeKey = `verify:${cleanEmail}`;

    await this.store.delete(storeKey);

    const token = generateSecureToken(32);
    const hashedToken = hashToken(token);

    await this.store.set(
      storeKey,
      {
        hashedToken,
        createdAt: Date.now()
      },
      expiresIn
    );

    // Build URL: replace placeholder {{token}} or append query param
    let destinationUrl = options.url;
    if (destinationUrl.includes("{{token}}")) {
      destinationUrl = destinationUrl.replace("{{token}}", encodeURIComponent(token));
    } else {
      const sep = destinationUrl.includes("?") ? "&" : "?";
      destinationUrl = `${destinationUrl}${sep}token=${encodeURIComponent(token)}`;
    }

    const rendered = renderVerificationEmail({
      appName: this.branding.appName,
      url: destinationUrl,
      expiresInSeconds: expiresIn,
      logo: this.branding.logo,
      primaryColor: this.branding.primaryColor,
      footer: this.branding.footer,
      supportEmail: this.branding.supportEmail
    });

    const subject = options.subject || rendered.subject;

    const result = await sendEmailMessage(this.transporter, {
      from: this.from,
      to: cleanEmail,
      subject,
      html: rendered.html,
      text: rendered.text
    });

    return {
      success: true,
      messageId: result.messageId,
      expiresIn
    };
  }

  /**
   * Verify an email verification token. Single-use: consumed on success.
   *
   * @param {string} email
   * @param {string} token
   * @returns {Promise<{ valid: true, email: string }>}
   */
  async verifyToken(email, token) {
    if (!token || typeof token !== "string") {
      throw new TokenExpiredError("Verification token must be a non-empty string.");
    }

    const cleanEmail = normalizeEmail(email);
    const storeKey = `verify:${cleanEmail}`;

    const record = await this.store.get(storeKey);
    if (!record) {
      throw new TokenExpiredError("Verification token has expired or is invalid.", {
        email: cleanEmail
      });
    }

    const inputHash = hashToken(token);
    const isMatch = timingSafeCompare(inputHash, record.hashedToken);

    if (!isMatch) {
      throw new TokenExpiredError("Verification token has expired or is invalid.", {
        email: cleanEmail
      });
    }

    // Consume single-use token
    await this.store.delete(storeKey);

    return {
      valid: true,
      email: cleanEmail
    };
  }

  /**
   * Send a password reset email with a secure single-use token.
   *
   * @param {string} email
   * @param {object} options
   * @param {string} options.resetUrl - Reset destination (e.g. "https://app.com/reset-password")
   * @param {number} [options.expiresIn=3600] - Expiry in seconds (default 1h)
   * @param {string} [options.subject]
   * @returns {Promise<{ success: true, messageId: string, expiresIn: number }>}
   */
  async sendPasswordReset(email, options) {
    if (!options || !options.resetUrl) {
      throw new ConfigurationError("Missing required option 'resetUrl' for password reset.");
    }

    const cleanEmail = normalizeEmail(email);
    const expiresIn = options.expiresIn ?? this.tokenConfig.expiresIn;
    const storeKey = `reset:${cleanEmail}`;

    await this.store.delete(storeKey);

    const token = generateSecureToken(32);
    const hashedToken = hashToken(token);

    await this.store.set(
      storeKey,
      {
        hashedToken,
        createdAt: Date.now()
      },
      expiresIn
    );

    let destinationUrl = options.resetUrl;
    if (destinationUrl.includes("{{token}}")) {
      destinationUrl = destinationUrl.replace("{{token}}", encodeURIComponent(token));
    } else {
      const sep = destinationUrl.includes("?") ? "&" : "?";
      destinationUrl = `${destinationUrl}${sep}token=${encodeURIComponent(token)}`;
    }

    const rendered = renderPasswordResetEmail({
      appName: this.branding.appName,
      resetUrl: destinationUrl,
      expiresInSeconds: expiresIn,
      logo: this.branding.logo,
      primaryColor: this.branding.primaryColor,
      footer: this.branding.footer,
      supportEmail: this.branding.supportEmail
    });

    const subject = options.subject || rendered.subject;

    const result = await sendEmailMessage(this.transporter, {
      from: this.from,
      to: cleanEmail,
      subject,
      html: rendered.html,
      text: rendered.text
    });

    return {
      success: true,
      messageId: result.messageId,
      expiresIn
    };
  }

  /**
   * Verify a password reset token. Single-use: consumed on success.
   *
   * @param {string} email
   * @param {string} token
   * @returns {Promise<{ valid: true, email: string }>}
   */
  async verifyPasswordResetToken(email, token) {
    if (!token || typeof token !== "string") {
      throw new TokenExpiredError("Password reset token must be a non-empty string.");
    }

    const cleanEmail = normalizeEmail(email);
    const storeKey = `reset:${cleanEmail}`;

    const record = await this.store.get(storeKey);
    if (!record) {
      throw new TokenExpiredError("Password reset token has expired or is invalid.", {
        email: cleanEmail
      });
    }

    const inputHash = hashToken(token);
    const isMatch = timingSafeCompare(inputHash, record.hashedToken);

    if (!isMatch) {
      throw new TokenExpiredError("Password reset token has expired or is invalid.", {
        email: cleanEmail
      });
    }

    // Consume single-use token
    await this.store.delete(storeKey);

    return {
      valid: true,
      email: cleanEmail
    };
  }

  /**
   * Test connection to the SMTP server.
   * @returns {Promise<boolean>}
   */
  async verifyConnection() {
    return verifyTransporter(this.transporter);
  }

  /**
   * Clean up background store resources.
   * @returns {Promise<void>}
   */
  async close() {
    if (this.store && typeof this.store.close === "function") {
      await this.store.close();
    }
  }
}

