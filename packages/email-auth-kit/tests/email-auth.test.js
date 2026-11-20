import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  EmailAuth,
  InMemoryOTPStore,
  ConfigurationError,
  OTPExpiredError,
  InvalidOTPError,
  MaxAttemptsExceededError,
  TokenExpiredError
} from "../src/index.js";
import {
  generateOTP,
  hashOTP,
  timingSafeCompare
} from "../src/crypto.js";
import { normalizeEmail, escapeHtml, validateOTPCode } from "../src/validator.js";

describe("Crypto & Validator Utilities", () => {
  it("generates OTP with configurable length", () => {
    const otp6 = generateOTP(6);
    expect(otp6).toHaveLength(6);
    expect(/^\d{6}$/.test(otp6)).toBe(true);

    const otp4 = generateOTP(4);
    expect(otp4).toHaveLength(4);

    const otp8 = generateOTP(8);
    expect(otp8).toHaveLength(8);

    expect(() => generateOTP(3)).toThrow(RangeError);
    expect(() => generateOTP(13)).toThrow(RangeError);
  });

  it("timingSafeCompare properly compares strings", () => {
    expect(timingSafeCompare("abcdef", "abcdef")).toBe(true);
    expect(timingSafeCompare("abcdef", "abcdeg")).toBe(false);
    expect(timingSafeCompare("short", "longer_string")).toBe(false);
    expect(timingSafeCompare("", "")).toBe(true);
  });

  it("normalizes email addresses", () => {
    expect(normalizeEmail("  User@Example.COM ")).toBe("user@example.com");
    expect(() => normalizeEmail("not-an-email")).toThrow();
    expect(() => normalizeEmail(123)).toThrow(TypeError);
  });

  it("validates OTP code input", () => {
    expect(validateOTPCode("123456", 6)).toBe("123456");
    expect(validateOTPCode(123456, 6)).toBe("123456");
    expect(() => validateOTPCode("12345a", 6)).toThrow(/digits only/);
    expect(() => validateOTPCode("12345", 6)).toThrow(/exactly 6 digits/);
  });

  it("escapes dangerous HTML characters", () => {
    const dangerous = `<script>alert("xss & 'bad'")</script>`;
    const escaped = escapeHtml(dangerous);
    expect(escaped).not.toContain("<script>");
    expect(escaped).toContain("&lt;script&gt;");
    expect(escaped).toContain("&amp;");
    expect(escaped).toContain("&quot;");
    expect(escaped).toContain("&#039;");
  });
});

describe("InMemoryOTPStore", () => {
  let store;

  beforeEach(() => {
    store = new InMemoryOTPStore({ cleanupIntervalMs: 500, suppressWarning: true });
  });

  afterEach(async () => {
    await store.close();
  });

  it("stores and retrieves data within TTL", async () => {
    await store.set("test:1", { secret: "abc" }, 5);
    const item = await store.get("test:1");
    expect(item).not.toBeNull();
    expect(item.secret).toBe("abc");
  });

  it("returns null for expired data", async () => {
    await store.set("test:exp", { secret: "exp" }, 0.05); // 50ms
    await new Promise((r) => setTimeout(r, 80));
    const item = await store.get("test:exp");
    expect(item).toBeNull();
  });

  it("atomically increments attempts", async () => {
    await store.set("test:att", { attempts: 0 }, 10);
    const count1 = await store.incrementAttempts("test:att");
    expect(count1).toBe(1);
    const count2 = await store.incrementAttempts("test:att");
    expect(count2).toBe(2);

    const data = await store.get("test:att");
    expect(data.attempts).toBe(2);
  });

  it("deletes stored keys", async () => {
    await store.set("test:del", { val: 1 }, 10);
    const deleted = await store.delete("test:del");
    expect(deleted).toBe(true);
    expect(await store.get("test:del")).toBeNull();
  });

  it("clears all keys", async () => {
    await store.set("k1", { v: 1 }, 10);
    await store.set("k2", { v: 2 }, 10);
    expect(store.size).toBe(2);
    await store.clear();
    expect(store.size).toBe(0);
  });
});

describe("EmailAuth", () => {
  let auth;
  let store;

  beforeEach(() => {
    store = new InMemoryOTPStore({ suppressWarning: true });
    auth = new EmailAuth({
      jsonTransport: true,
      from: '"Test App" <auth@example.com>',
      store,
      otp: {
        length: 6,
        expiresIn: 300,
        maxAttempts: 3
      },
      branding: {
        appName: "Test App",
        primaryColor: "#3b82f6"
      }
    });
  });

  afterEach(async () => {
    await auth.close();
  });

  it("throws ConfigurationError if from is missing", () => {
    expect(() => new EmailAuth({ jsonTransport: true })).toThrow(ConfigurationError);
  });

  it("throws ConfigurationError if invalid OTP length is configured", () => {
    expect(
      () =>
        new EmailAuth({
          from: "test@example.com",
          jsonTransport: true,
          otp: { length: 2 }
        })
    ).toThrow(ConfigurationError);
  });

  it("sends OTP and stores hashed representation with salt", async () => {
    const res = await auth.sendOTP("alice@example.com");
    expect(res.success).toBe(true);
    expect(res.messageId).toBeDefined();
    expect(res.expiresIn).toBe(300);

    const stored = await store.get("otp:alice@example.com");
    expect(stored).not.toBeNull();
    expect(stored.hashedOtp).toBeDefined();
    expect(stored.salt).toBeDefined();
    // Raw OTP must NOT be stored in plain text
    expect(stored.code).toBeUndefined();
    expect(stored.otp).toBeUndefined();
  });

  it("resend invalidates any prior OTP", async () => {
    await auth.sendOTP("bob@example.com");
    const firstStored = await store.get("otp:bob@example.com");

    await auth.sendOTP("bob@example.com");
    const secondStored = await store.get("otp:bob@example.com");

    expect(firstStored.hashedOtp).not.toBe(secondStored.hashedOtp);
  });

  it("verifies valid OTP successfully and consumes it (one-time)", async () => {
    // Inject known OTP into store to verify matching logic
    const email = "charlie@example.com";
    const code = "654321";
    const salt = "somesalt123";
    const hashedOtp = hashOTP(code, salt);

    await store.set(
      `otp:${email}`,
      {
        hashedOtp,
        salt,
        length: 6,
        maxAttempts: 3,
        attempts: 0,
        createdAt: Date.now()
      },
      300
    );

    const verifyResult = await auth.verifyOTP(email, code);
    expect(verifyResult.valid).toBe(true);
    expect(verifyResult.email).toBe(email);

    // One-time consumption: store must now be empty for this key
    const after = await store.get(`otp:${email}`);
    expect(after).toBeNull();

    // Re-verification must fail as OTP is already consumed
    await expect(auth.verifyOTP(email, code)).rejects.toThrow(OTPExpiredError);
  });

  it("throws InvalidOTPError on wrong code and decrements remaining attempts", async () => {
    const email = "david@example.com";
    const code = "112233";
    const salt = "saltsalt";
    const hashedOtp = hashOTP(code, salt);

    await store.set(
      `otp:${email}`,
      {
        hashedOtp,
        salt,
        length: 6,
        maxAttempts: 3,
        attempts: 0,
        createdAt: Date.now()
      },
      300
    );

    try {
      await auth.verifyOTP(email, "999999");
      expect.fail("Should have thrown InvalidOTPError");
    } catch (err) {
      expect(err).toBeInstanceOf(InvalidOTPError);
      expect(err.details.remainingAttempts).toBe(2);
    }
  });

  it("locks out and throws MaxAttemptsExceededError when limit is reached", async () => {
    const email = "eve@example.com";
    const code = "888888";
    const salt = "salt1234";
    const hashedOtp = hashOTP(code, salt);

    await store.set(
      `otp:${email}`,
      {
        hashedOtp,
        salt,
        length: 6,
        maxAttempts: 2,
        attempts: 0,
        createdAt: Date.now()
      },
      300
    );

    // Attempt 1: wrong
    await expect(auth.verifyOTP(email, "000000")).rejects.toThrow(InvalidOTPError);

    // Attempt 2: wrong -> exceeds maxAttempts (2)
    await expect(auth.verifyOTP(email, "000000")).rejects.toThrow(MaxAttemptsExceededError);

    // Key must be removed from store
    expect(await store.get(`otp:${email}`)).toBeNull();
  });

  it("throws OTPExpiredError when verifying non-existent or expired OTP", async () => {
    await expect(auth.verifyOTP("nobody@example.com", "123456")).rejects.toThrow(OTPExpiredError);
  });

  it("handles email verification workflow with secure tokens", async () => {
    const email = "frank@example.com";
    const sendRes = await auth.sendVerificationEmail(email, {
      url: "https://example.com/verify?token={{token}}"
    });

    expect(sendRes.success).toBe(true);

    const stored = await store.get(`verify:${email}`);
    expect(stored).not.toBeNull();
    expect(stored.hashedToken).toBeDefined();

    // Verify connection verification method
    const conn = await auth.verifyConnection();
    expect(conn).toBe(true);
  });

  it("handles password reset workflow", async () => {
    const email = "grace@example.com";
    const sendRes = await auth.sendPasswordReset(email, {
      resetUrl: "https://example.com/reset-password"
    });

    expect(sendRes.success).toBe(true);

    const stored = await store.get(`reset:${email}`);
    expect(stored).not.toBeNull();
    expect(stored.hashedToken).toBeDefined();

    // Rejection on invalid token
    await expect(auth.verifyPasswordResetToken(email, "fake-token")).rejects.toThrow(
      TokenExpiredError
    );
  });

  it("supports custom OTP template function", async () => {
    const email = "custom-template@example.com";
    let customRendered = false;

    const res = await auth.sendOTP(email, {
      template: ({ code, appName }) => {
        customRendered = true;
        return {
          subject: `Custom: ${code}`,
          html: `<p>Your code is <b>${code}</b> for ${appName}</p>`,
          text: `Code: ${code}`
        };
      }
    });

    expect(res.success).toBe(true);
    expect(customRendered).toBe(true);
  });

  it("rejects invalid or expired verification token", async () => {
    await expect(auth.verifyToken("test@example.com", "random-bad-token")).rejects.toThrow(
      TokenExpiredError
    );
    await expect(auth.verifyToken("test@example.com", "")).rejects.toThrow(TokenExpiredError);
  });
});
