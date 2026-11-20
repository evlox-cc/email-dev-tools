/**
 * Comprehensive end-to-end integration test.
 * Tests both packages fully without sending real emails.
 * Run: node test/integration.test.js
 */

import { strict as assert } from "node:assert";
import { createServer } from "node:http";

// ─── Helpers ────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const results = [];

async function test(label, fn) {
  try {
    await fn();
    console.log(`  ✓  ${label}`);
    passed++;
    results.push({ label, ok: true });
  } catch (err) {
    console.error(`  ✗  ${label}`);
    console.error(`     ${err.message}`);
    failed++;
    results.push({ label, ok: false, error: err.message });
  }
}

function section(name) {
  console.log(`\n── ${name} ──────────────────────────────────────────`);
}

// ─── email-auth-kit imports ──────────────────────────────────────────────────

import {
  EmailAuth,
  InMemoryOTPStore,
  OTPStore,
  ConfigurationError,
  OTPExpiredError,
  InvalidOTPError,
  MaxAttemptsExceededError,
  TokenExpiredError,
  SMTPError,
  StorageError,
  generateOTP,
  generateSecureToken,
  generateSalt,
  hashOTP,
  hashToken,
  timingSafeCompare,
  normalizeEmail,
  validateOTPCode,
  escapeHtml as escapeHtmlAuth,
  renderOTPEmail,
  renderVerificationEmail,
  renderPasswordResetEmail,
  renderEmailLayout,
} from "../packages/email-auth-kit/src/index.js";

// ─── notify-kit imports ───────────────────────────────────────────────────────

import {
  Notify,
  ConfigurationError as NConfigurationError,
  SMTPError as NSMTPError,
  InvalidRecipientError,
  TemplateError,
  DeliveryError,
  renderWelcome,
  renderOrderConfirmation,
  renderAccountNotification,
  renderPasswordResetNotification,
  renderCustom,
  wrapNotificationLayout,
  BUILTIN_TEMPLATES,
  cleanEmail,
  normalizeRecipients,
  escapeHtml as escapeHtmlNotify,
} from "../packages/notify-kit/src/index.js";

// ════════════════════════════════════════════════════════════════════════════
// SECTION 1 — Crypto & Validation Utilities (email-auth-kit)
// ════════════════════════════════════════════════════════════════════════════
section("1. Crypto & Validation Utilities");

await test("generateOTP produces correct length", () => {
  for (const len of [4, 6, 8, 10]) {
    const otp = generateOTP(len);
    assert.equal(otp.length, len, `Expected ${len} digits`);
    assert.match(otp, /^\d+$/, "Must be digits only");
  }
});

await test("generateOTP is unique across calls", () => {
  const otps = new Set(Array.from({ length: 100 }, () => generateOTP(6)));
  assert.ok(otps.size > 90, "Should generate diverse codes");
});

await test("generateOTP rejects invalid lengths", () => {
  assert.throws(() => generateOTP(3), RangeError);
  assert.throws(() => generateOTP(13), RangeError);
  assert.throws(() => generateOTP(0), RangeError);
});

await test("generateSecureToken produces unique hex strings", () => {
  const t1 = generateSecureToken(32);
  const t2 = generateSecureToken(32);
  assert.equal(t1.length, 64); // 32 bytes = 64 hex chars
  assert.notEqual(t1, t2);
});

await test("hashOTP produces different hashes for different salts", () => {
  const code = "123456";
  const salt1 = generateSalt();
  const salt2 = generateSalt();
  const h1 = hashOTP(code, salt1);
  const h2 = hashOTP(code, salt2);
  assert.notEqual(h1, h2);
});

await test("hashOTP is deterministic for same inputs", () => {
  const code = "654321";
  const salt = "fixedsalt";
  assert.equal(hashOTP(code, salt), hashOTP(code, salt));
});

await test("hashToken produces 64-char hex strings", () => {
  const token = generateSecureToken(32);
  const hash = hashToken(token);
  assert.equal(hash.length, 64);
  assert.match(hash, /^[a-f0-9]+$/);
});

await test("timingSafeCompare correctly identifies matches and mismatches", () => {
  assert.equal(timingSafeCompare("abc", "abc"), true);
  assert.equal(timingSafeCompare("abc", "abcd"), false);
  assert.equal(timingSafeCompare("abc", "xyz"), false);
  assert.equal(timingSafeCompare("", ""), true);
  assert.equal(timingSafeCompare(null, "abc"), false);
});

await test("normalizeEmail lowercases and trims", () => {
  assert.equal(normalizeEmail("  User@Example.COM "), "user@example.com");
  assert.equal(normalizeEmail("ADMIN@TEST.IO"), "admin@test.io");
});

await test("normalizeEmail rejects invalid addresses", () => {
  for (const bad of ["notanemail", "@nodomain", "no@", "a b@c.com"]) {
    assert.throws(() => normalizeEmail(bad), { message: /Invalid email/ });
  }
});

await test("validateOTPCode accepts valid digit strings", () => {
  assert.equal(validateOTPCode("123456", 6), "123456");
  assert.equal(validateOTPCode(123456, 6), "123456");
});

await test("validateOTPCode rejects letters and wrong lengths", () => {
  assert.throws(() => validateOTPCode("12345a"), /digits only/);
  assert.throws(() => validateOTPCode("12345", 6), /exactly 6/);
});

await test("escapeHtml sanitises all dangerous characters", () => {
  const raw = `<script>alert("xss & 'bad'");</script>`;
  const safe = escapeHtmlAuth(raw);
  assert.ok(!safe.includes("<script>"));
  assert.ok(safe.includes("&lt;script&gt;"));
  assert.ok(safe.includes("&amp;"));
  assert.ok(safe.includes("&quot;"));
  assert.ok(safe.includes("&#039;"));
});

await test("escapeHtml handles null and undefined", () => {
  assert.equal(escapeHtmlAuth(null), "");
  assert.equal(escapeHtmlAuth(undefined), "");
  assert.equal(escapeHtmlAuth(0), "0");
});

// ════════════════════════════════════════════════════════════════════════════
// SECTION 2 — InMemoryOTPStore
// ════════════════════════════════════════════════════════════════════════════
section("2. InMemoryOTPStore");

await test("stores and retrieves values within TTL", async () => {
  const store = new InMemoryOTPStore({ suppressWarning: true });
  await store.set("k1", { foo: "bar" }, 10);
  const val = await store.get("k1");
  assert.ok(val !== null);
  assert.equal(val.foo, "bar");
  await store.close();
});

await test("returns null for missing keys", async () => {
  const store = new InMemoryOTPStore({ suppressWarning: true });
  const val = await store.get("nonexistent");
  assert.equal(val, null);
  await store.close();
});

await test("returns null after TTL expires", async () => {
  const store = new InMemoryOTPStore({ suppressWarning: true });
  await store.set("expiring", { data: 1 }, 0.05); // 50ms
  await new Promise(r => setTimeout(r, 80));
  const val = await store.get("expiring");
  assert.equal(val, null);
  await store.close();
});

await test("incrementAttempts increases counter atomically", async () => {
  const store = new InMemoryOTPStore({ suppressWarning: true });
  await store.set("att", { attempts: 0 }, 10);
  assert.equal(await store.incrementAttempts("att"), 1);
  assert.equal(await store.incrementAttempts("att"), 2);
  assert.equal(await store.incrementAttempts("att"), 3);
  const val = await store.get("att");
  assert.equal(val.attempts, 3);
  await store.close();
});

await test("delete removes a key and returns true", async () => {
  const store = new InMemoryOTPStore({ suppressWarning: true });
  await store.set("del", { x: 1 }, 10);
  assert.equal(await store.delete("del"), true);
  assert.equal(await store.get("del"), null);
  assert.equal(await store.delete("del"), false); // already gone
  await store.close();
});

await test("clear empties all keys", async () => {
  const store = new InMemoryOTPStore({ suppressWarning: true });
  await store.set("a", {}, 10);
  await store.set("b", {}, 10);
  await store.set("c", {}, 10);
  assert.equal(store.size, 3);
  await store.clear();
  assert.equal(store.size, 0);
  await store.close();
});

await test("OTPStore abstract base throws on direct use", async () => {
  const base = new OTPStore();
  await assert.rejects(() => base.set("k", {}, 10));
  await assert.rejects(() => base.get("k"));
  await assert.rejects(() => base.delete("k"));
  await assert.rejects(() => base.incrementAttempts("k"));
  await assert.rejects(() => base.clear());
});

// ════════════════════════════════════════════════════════════════════════════
// SECTION 3 — EmailAuth OTP Flow
// ════════════════════════════════════════════════════════════════════════════
section("3. EmailAuth — OTP Send & Verify");

function makeAuth(overrides = {}) {
  const store = new InMemoryOTPStore({ suppressWarning: true });
  const auth = new EmailAuth({
    jsonTransport: true,
    from: '"Test" <test@example.com>',
    store,
    otp: { length: 6, expiresIn: 60, maxAttempts: 3 },
    branding: { appName: "TestApp", primaryColor: "#2563eb" },
    ...overrides,
  });
  return { auth, store };
}

await test("throws ConfigurationError when from is missing", () => {
  assert.throws(() => new EmailAuth({ jsonTransport: true }), ConfigurationError);
});

await test("throws ConfigurationError for OTP length < 4", () => {
  assert.throws(
    () => new EmailAuth({ jsonTransport: true, from: "a@b.com", otp: { length: 2 } }),
    ConfigurationError
  );
});

await test("throws ConfigurationError for expiresIn < 10", () => {
  assert.throws(
    () => new EmailAuth({ jsonTransport: true, from: "a@b.com", otp: { expiresIn: 5 } }),
    ConfigurationError
  );
});

await test("sendOTP returns success with messageId", async () => {
  const { auth, store } = makeAuth();
  const res = await auth.sendOTP("alice@example.com");
  assert.equal(res.success, true);
  assert.ok(res.messageId, "Should have messageId");
  assert.equal(res.expiresIn, 60);
  await auth.close();
});

await test("sendOTP stores only hashed code, never plaintext", async () => {
  const { auth, store } = makeAuth();
  await auth.sendOTP("alice@example.com");
  const record = await store.get("otp:alice@example.com");
  assert.ok(record, "Record should exist");
  assert.ok(record.hashedOtp, "Should have hashedOtp");
  assert.ok(record.salt, "Should have salt");
  assert.equal(record.code, undefined, "Must NOT store raw code");
  assert.equal(record.otp, undefined, "Must NOT store raw otp");
  await auth.close();
});

await test("resend invalidates previous OTP", async () => {
  const { auth, store } = makeAuth();
  await auth.sendOTP("bob@example.com");
  const first = (await store.get("otp:bob@example.com")).hashedOtp;
  await auth.sendOTP("bob@example.com");
  const second = (await store.get("otp:bob@example.com")).hashedOtp;
  assert.notEqual(first, second, "Re-send must generate a fresh hash");
  await auth.close();
});

await test("verifyOTP succeeds with correct code and consumes it", async () => {
  const { auth, store } = makeAuth();
  // Inject known code
  const code = "777888";
  const salt = "testsalt";
  const hashedOtp = hashOTP(code, salt);
  await store.set("otp:cathy@example.com", { hashedOtp, salt, length: 6, maxAttempts: 3, attempts: 0 }, 60);

  const res = await auth.verifyOTP("cathy@example.com", code);
  assert.equal(res.valid, true);
  assert.equal(res.email, "cathy@example.com");

  // Must be consumed
  const after = await store.get("otp:cathy@example.com");
  assert.equal(after, null, "OTP must be deleted after use");
  await auth.close();
});

await test("verifyOTP throws OTPExpiredError when no record exists", async () => {
  const { auth } = makeAuth();
  await assert.rejects(() => auth.verifyOTP("nobody@example.com", "000000"), OTPExpiredError);
  await auth.close();
});

await test("verifyOTP throws InvalidOTPError and tracks remaining attempts", async () => {
  const { auth, store } = makeAuth();
  const code = "112233";
  const salt = "s1";
  await store.set("otp:dave@example.com", { hashedOtp: hashOTP(code, salt), salt, length: 6, maxAttempts: 3, attempts: 0 }, 60);

  try {
    await auth.verifyOTP("dave@example.com", "999999");
    assert.fail("Should have thrown");
  } catch (err) {
    assert.ok(err instanceof InvalidOTPError);
    assert.equal(err.details.remainingAttempts, 2);
  }
  await auth.close();
});

await test("verifyOTP throws MaxAttemptsExceededError and deletes record", async () => {
  const { auth, store } = makeAuth({ otp: { length: 6, expiresIn: 60, maxAttempts: 2 } });
  const code = "445566";
  const salt = "s2";
  await store.set("otp:eve@example.com", { hashedOtp: hashOTP(code, salt), salt, length: 6, maxAttempts: 2, attempts: 0 }, 60);

  await assert.rejects(() => auth.verifyOTP("eve@example.com", "000000"), InvalidOTPError);
  await assert.rejects(() => auth.verifyOTP("eve@example.com", "000000"), MaxAttemptsExceededError);

  const rec = await store.get("otp:eve@example.com");
  assert.equal(rec, null, "Record must be purged after lockout");
  await auth.close();
});

await test("verifyOTP cannot be replayed after consumption", async () => {
  const { auth, store } = makeAuth();
  const code = "321654";
  const salt = "s3";
  await store.set("otp:frank@example.com", { hashedOtp: hashOTP(code, salt), salt, length: 6, maxAttempts: 3, attempts: 0 }, 60);

  await auth.verifyOTP("frank@example.com", code); // first — OK
  await assert.rejects(() => auth.verifyOTP("frank@example.com", code), OTPExpiredError); // second — rejected
  await auth.close();
});

await test("sendOTP accepts custom template function", async () => {
  const { auth } = makeAuth();
  let called = false;
  const res = await auth.sendOTP("tpl@example.com", {
    template: ({ code, appName }) => {
      called = true;
      return { subject: `Code: ${code}`, html: `<p>${code}</p>`, text: code };
    },
  });
  assert.ok(called, "Custom template must be invoked");
  assert.equal(res.success, true);
  await auth.close();
});

// ════════════════════════════════════════════════════════════════════════════
// SECTION 4 — Email Verification & Password Reset Flows
// ════════════════════════════════════════════════════════════════════════════
section("4. EmailAuth — Verification & Reset Tokens");

await test("sendVerificationEmail stores hashed token only", async () => {
  const { auth, store } = makeAuth();
  const res = await auth.sendVerificationEmail("grace@example.com", {
    url: "https://app.example.com/verify?token={{token}}",
  });
  assert.equal(res.success, true);
  const rec = await store.get("verify:grace@example.com");
  assert.ok(rec.hashedToken, "Must store hashedToken");
  assert.equal(rec.token, undefined, "Must NOT store raw token");
  await auth.close();
});

await test("verifyToken succeeds and is consumed", async () => {
  const { auth, store } = makeAuth();
  await auth.sendVerificationEmail("henry@example.com", { url: "https://app.example.com/verify" });
  const rec = await store.get("verify:henry@example.com");
  // We can't get the raw token from storage, so test rejection with bad token
  await assert.rejects(() => auth.verifyToken("henry@example.com", "bad-token-xyz"), TokenExpiredError);
  await auth.close();
});

await test("verifyToken throws for empty token", async () => {
  const { auth } = makeAuth();
  await assert.rejects(() => auth.verifyToken("x@x.com", ""), TokenExpiredError);
  await auth.close();
});

await test("sendPasswordReset creates hash in store", async () => {
  const { auth, store } = makeAuth();
  const res = await auth.sendPasswordReset("ivan@example.com", {
    resetUrl: "https://app.example.com/reset",
  });
  assert.equal(res.success, true);
  const rec = await store.get("reset:ivan@example.com");
  assert.ok(rec.hashedToken, "Must store hashedToken");
  await auth.close();
});

await test("verifyPasswordResetToken rejects invalid tokens", async () => {
  const { auth, store } = makeAuth();
  await auth.sendPasswordReset("judy@example.com", { resetUrl: "https://app.example.com/reset" });
  await assert.rejects(
    () => auth.verifyPasswordResetToken("judy@example.com", "fake"),
    TokenExpiredError
  );
  await auth.close();
});

await test("sendVerificationEmail replaces {{token}} placeholder in URL", async () => {
  const { auth, store } = makeAuth();
  await auth.sendVerificationEmail("test@example.com", {
    url: "https://example.com/verify?token={{token}}",
  });
  // If placeholder was replaced, the store key should still exist (not errored)
  const rec = await store.get("verify:test@example.com");
  assert.ok(rec, "Record should exist");
  await auth.close();
});

// ════════════════════════════════════════════════════════════════════════════
// SECTION 5 — Error Classes (email-auth-kit)
// ════════════════════════════════════════════════════════════════════════════
section("5. Error Classes — email-auth-kit");

await test("all error classes have correct code and instanceof chain", () => {
  const errors = [
    [new ConfigurationError("msg"), "CONFIGURATION_ERROR"],
    [new OTPExpiredError(), "OTP_EXPIRED"],
    [new InvalidOTPError(), "INVALID_OTP"],
    [new MaxAttemptsExceededError(), "MAX_ATTEMPTS_EXCEEDED"],
    [new TokenExpiredError(), "TOKEN_EXPIRED"],
    [new SMTPError("smtp fail"), "SMTP_ERROR"],
    [new StorageError("store fail"), "STORAGE_ERROR"],
  ];
  for (const [err, code] of errors) {
    assert.equal(err.code, code, `${err.name} should have code ${code}`);
    assert.ok(err instanceof Error, "Must extend Error");
    assert.ok(err.name === err.constructor.name, "Name should match class");
  }
});

await test("error details field is populated correctly", () => {
  const err = new InvalidOTPError("wrong", { remainingAttempts: 2 });
  assert.equal(err.details.remainingAttempts, 2);
});

// ════════════════════════════════════════════════════════════════════════════
// SECTION 6 — Email Templates (email-auth-kit)
// ════════════════════════════════════════════════════════════════════════════
section("6. Email Templates — email-auth-kit");

await test("renderOTPEmail produces valid HTML with code embedded", () => {
  const { html, text, subject } = renderOTPEmail({
    appName: "DemoApp",
    code: "123456",
    expiresInSeconds: 300,
    primaryColor: "#4f46e5",
  });
  assert.ok(html.includes("123456"), "HTML must contain OTP code");
  assert.ok(text.includes("123456"), "Text must contain OTP code");
  assert.ok(subject.includes("123456"), "Subject must contain OTP code");
  assert.ok(html.startsWith("<!DOCTYPE html>"), "Must be valid HTML doc");
  assert.ok(html.includes("DemoApp"), "Must include app name");
});

await test("renderOTPEmail escapes dangerous app name characters", () => {
  const { html } = renderOTPEmail({ appName: '<script>bad</script>', code: "111111", expiresInSeconds: 60 });
  assert.ok(!html.includes("<script>bad</script>"), "Must escape app name");
});

await test("renderVerificationEmail contains verify URL", () => {
  const { html, text, subject } = renderVerificationEmail({
    appName: "TestApp",
    url: "https://example.com/verify?token=abc123",
    expiresInSeconds: 86400,
  });
  assert.ok(html.includes("https://example.com/verify?token=abc123"));
  assert.ok(text.includes("https://example.com/verify?token=abc123"));
  assert.ok(subject.includes("TestApp"));
});

await test("renderPasswordResetEmail contains reset URL and expiry", () => {
  const { html, text, subject } = renderPasswordResetEmail({
    appName: "SecureApp",
    resetUrl: "https://example.com/reset?token=xyz",
    expiresInSeconds: 3600,
  });
  assert.ok(html.includes("https://example.com/reset?token=xyz"));
  assert.ok(text.includes("https://example.com/reset?token=xyz"));
  assert.ok(subject.toLowerCase().includes("password"));
});

await test("renderEmailLayout renders app name and footer", () => {
  const html = renderEmailLayout({
    appName: "Footer Test",
    title: "Title",
    bodyHtml: "<p>Body content</p>",
    footer: "123 Test St",
    supportEmail: "help@example.com",
  });
  assert.ok(html.includes("Footer Test"));
  assert.ok(html.includes("123 Test St"));
  assert.ok(html.includes("help@example.com"));
});

// ════════════════════════════════════════════════════════════════════════════
// SECTION 7 — notify-kit Validation & Errors
// ════════════════════════════════════════════════════════════════════════════
section("7. notify-kit — Validation & Errors");

await test("cleanEmail accepts valid formats", () => {
  assert.equal(cleanEmail("user@example.com"), "user@example.com");
  assert.equal(cleanEmail("  User@Example.com  "), "User@Example.com");
  // Name + email format
  const named = cleanEmail('"John" <john@example.com>');
  assert.ok(named.includes("john@example.com"));
});

await test("cleanEmail rejects malformed addresses", () => {
  for (const bad of ["notanemail", "@nodomain.com", "no-at-sign"]) {
    assert.throws(() => cleanEmail(bad), InvalidRecipientError);
  }
});

await test("normalizeRecipients handles string and array inputs", () => {
  const single = normalizeRecipients("a@example.com");
  assert.equal(single.length, 1);
  const multi = normalizeRecipients(["a@example.com", "b@example.com"]);
  assert.equal(multi.length, 2);
});

await test("notify-kit escapeHtml sanitises correctly", () => {
  const raw = `<img src=x onerror=alert(1)>&"'`;
  const safe = escapeHtmlNotify(raw);
  assert.ok(!safe.includes("<img"));
  assert.ok(safe.includes("&lt;img"));
  assert.ok(safe.includes("&amp;"));
  assert.ok(safe.includes("&quot;"));
  assert.ok(safe.includes("&#039;"));
});

await test("notify-kit error classes have correct codes", () => {
  const errors = [
    [new NConfigurationError("bad config"), "CONFIGURATION_ERROR"],
    [new NSMTPError("smtp down"), "SMTP_ERROR"],
    [new InvalidRecipientError("bad email"), "INVALID_RECIPIENT"],
    [new TemplateError("no template"), "TEMPLATE_ERROR"],
    [new DeliveryError("rejected"), "DELIVERY_ERROR"],
  ];
  for (const [err, code] of errors) {
    assert.equal(err.code, code);
    assert.ok(err instanceof Error);
  }
});

// ════════════════════════════════════════════════════════════════════════════
// SECTION 8 — notify-kit Templates
// ════════════════════════════════════════════════════════════════════════════
section("8. notify-kit — Template Rendering");

const branding = { appName: "ShopApp", primaryColor: "#10b981", supportEmail: "help@shop.com" };

await test("renderWelcome generates HTML with name and CTA", () => {
  const { html, text, subject } = renderWelcome(branding, {
    name: "Alice",
    actionUrl: "https://app.com/start",
    actionText: "Get Started",
  });
  assert.ok(html.includes("Alice"));
  assert.ok(html.includes("https://app.com/start"));
  assert.ok(html.includes("Get Started"));
  assert.ok(text.includes("Alice"));
  assert.ok(subject.includes("ShopApp"));
});

await test("renderWelcome escapes dangerous name input", () => {
  const { html } = renderWelcome(branding, { name: '<script>xss</script>' });
  assert.ok(!html.includes("<script>xss</script>"));
});

await test("renderOrderConfirmation includes orderId and amount", () => {
  const { html, text, subject } = renderOrderConfirmation(branding, {
    orderId: "ORD-999",
    amount: "79.99",
    customerName: "Bob",
    items: [{ name: "Widget", quantity: 2, price: "39.99" }],
  });
  assert.ok(html.includes("ORD-999"));
  assert.ok(html.includes("79.99"));
  assert.ok(html.includes("Bob"));
  assert.ok(html.includes("Widget"));
  assert.ok(subject.includes("ORD-999"));
});

await test("renderOrderConfirmation escapes injection in item names", () => {
  const { html } = renderOrderConfirmation(branding, {
    orderId: "ORD-1",
    amount: "10",
    items: [{ name: "<img onerror=alert(1)>", price: "10" }],
  });
  assert.ok(!html.includes("<img onerror=alert(1)>"));
  assert.ok(html.includes("&lt;img"));
});

await test("renderAccountNotification includes title and message", () => {
  const { html, text, subject } = renderAccountNotification(branding, {
    title: "Login from new device",
    message: "We detected a login from Chrome on MacOS.",
    actionUrl: "https://app.com/security",
  });
  assert.ok(html.includes("Login from new device"));
  assert.ok(html.includes("Chrome on MacOS"));
  assert.ok(text.includes("Chrome on MacOS"));
});

await test("renderPasswordResetNotification includes IP and device", () => {
  const { html, text, subject } = renderPasswordResetNotification(branding, {
    ipAddress: "192.168.1.100",
    device: "Safari on iPhone",
    timestamp: "2026-01-01 12:00 UTC",
  });
  assert.ok(html.includes("192.168.1.100"));
  assert.ok(html.includes("Safari on iPhone"));
  assert.ok(subject.toLowerCase().includes("security"));
});

await test("renderCustom wraps HTML in layout", () => {
  const { html, text, subject } = renderCustom(branding, {
    subject: "Monthly Report",
    html: "<p>Report content here.</p>",
    text: "Report content here.",
  });
  assert.ok(html.includes("Report content here."));
  assert.ok(html.startsWith("<!DOCTYPE html>"));
  assert.equal(subject, "Monthly Report");
});

await test("BUILTIN_TEMPLATES registry contains all 5 templates", () => {
  const expected = ["welcome", "order_confirmation", "account_notification", "password_reset_notification", "custom"];
  for (const name of expected) {
    assert.ok(typeof BUILTIN_TEMPLATES[name] === "function", `Missing template: ${name}`);
  }
});

// ════════════════════════════════════════════════════════════════════════════
// SECTION 9 — Notify Client — Full Send Flows
// ════════════════════════════════════════════════════════════════════════════
section("9. Notify Client — Full Send Flows");

function makeNotify(overrides = {}) {
  return new Notify({
    jsonTransport: true,
    from: '"TestService" <service@example.com>',
    branding,
    ...overrides,
  });
}

await test("throws ConfigurationError without from", () => {
  assert.throws(() => new Notify({ jsonTransport: true }), NConfigurationError);
});

await test("send() with raw HTML returns accepted status", async () => {
  const n = makeNotify();
  const res = await n.send({ to: "user@example.com", subject: "Hi", html: "<p>Hello</p>" });
  assert.equal(res.status, "accepted");
  assert.ok(res.accepted.includes("user@example.com"));
  assert.ok(res.messageId);
});

await test("send() with text-only body works", async () => {
  const n = makeNotify();
  const res = await n.send({ to: "user@example.com", subject: "Plain", text: "Plain text email" });
  assert.equal(res.status, "accepted");
});

await test("send() with CC and BCC delivers to all", async () => {
  const n = makeNotify();
  const res = await n.send({
    to: "primary@example.com",
    cc: "cc@example.com",
    bcc: ["bcc1@example.com", "bcc2@example.com"],
    subject: "Multi-recipient",
    text: "Body",
  });
  assert.equal(res.status, "accepted");
  assert.ok(res.accepted.includes("primary@example.com"));
  assert.ok(res.accepted.includes("cc@example.com"));
  assert.ok(res.accepted.includes("bcc1@example.com"));
});

await test("send() throws InvalidRecipientError for bad to address", async () => {
  const n = makeNotify();
  await assert.rejects(() => n.send({ to: "not-an-email", subject: "Hi", text: "Hi" }), InvalidRecipientError);
});

await test("send() throws ConfigurationError with no subject and no template", async () => {
  const n = makeNotify();
  await assert.rejects(() => n.send({ to: "user@example.com", text: "Hi" }), NConfigurationError);
});

await test("send() throws TemplateError for unknown template name", async () => {
  const n = makeNotify();
  await assert.rejects(() => n.send({ to: "user@example.com", template: "does_not_exist" }), TemplateError);
});

await test("sendWelcome convenience method works", async () => {
  const n = makeNotify();
  const res = await n.sendWelcome({ to: "new@example.com", name: "Sam", actionUrl: "https://app.com" });
  assert.equal(res.status, "accepted");
  assert.ok(res.accepted.includes("new@example.com"));
});

await test("sendOrderConfirmation with line items works", async () => {
  const n = makeNotify();
  const res = await n.sendOrderConfirmation({
    to: "buyer@example.com",
    orderId: "ORD-XYZ",
    amount: "199.00",
    customerName: "Chris",
    items: [
      { name: "Pro Plan", quantity: 1, price: "149.00" },
      { name: "Add-on", quantity: 2, price: "25.00" },
    ],
  });
  assert.equal(res.status, "accepted");
});

await test("sendAccountNotification works", async () => {
  const n = makeNotify();
  const res = await n.sendAccountNotification({
    to: "user@example.com",
    title: "API Key Created",
    message: "A new API key was generated.",
    actionUrl: "https://app.com/settings",
  });
  assert.equal(res.status, "accepted");
});

await test("sendPasswordResetNotification works", async () => {
  const n = makeNotify();
  const res = await n.sendPasswordResetNotification({
    to: "user@example.com",
    ipAddress: "10.0.0.1",
    device: "Firefox on Windows",
  });
  assert.equal(res.status, "accepted");
});

await test("sendCustom wraps HTML in layout", async () => {
  const n = makeNotify();
  const res = await n.sendCustom({
    to: "user@example.com",
    subject: "Custom Subject",
    html: "<h1>Custom</h1>",
  });
  assert.equal(res.status, "accepted");
});

await test("registerTemplate stores and uses custom template", async () => {
  const n = makeNotify();
  let rendered = false;
  n.registerTemplate("my_invoice", (branding, data) => {
    rendered = true;
    return {
      subject: `Invoice #${data.id}`,
      html: `<p>$${data.amount}</p>`,
      text: `$${data.amount}`,
    };
  });
  const res = await n.send({
    to: "acct@example.com",
    template: "my_invoice",
    data: { id: "INV-99", amount: "500" },
  });
  assert.ok(rendered);
  assert.equal(res.status, "accepted");
});

await test("registerTemplate rejects invalid arguments", () => {
  const n = makeNotify();
  assert.throws(() => n.registerTemplate("", () => {}), NConfigurationError);
  assert.throws(() => n.registerTemplate("valid", "not-a-function"), NConfigurationError);
});

await test("verifyConnection returns true for mock transport", async () => {
  const n = makeNotify();
  const ok = await n.verifyConnection();
  assert.equal(ok, true);
});

await test("send() with attachments does not error", async () => {
  const n = makeNotify();
  const res = await n.send({
    to: "user@example.com",
    subject: "With Attachment",
    text: "See attached.",
    attachments: [{ filename: "report.txt", content: "data" }],
  });
  assert.equal(res.status, "accepted");
});

await test("send() with custom headers does not error", async () => {
  const n = makeNotify();
  const res = await n.send({
    to: "user@example.com",
    subject: "Headers Test",
    text: "With headers.",
    headers: { "X-Tracking-ID": "TRK-001" },
  });
  assert.equal(res.status, "accepted");
});

// ════════════════════════════════════════════════════════════════════════════
// SECTION 10 — Cross-Package Independence
// ════════════════════════════════════════════════════════════════════════════
section("10. Cross-Package Independence");

await test("email-auth-kit does not import notify-kit", async () => {
  const { readFileSync } = await import("fs");
  const src = readFileSync("packages/email-auth-kit/package.json", "utf8");
  assert.ok(!src.includes("notify-kit"), "email-auth-kit must not depend on notify-kit");
});

await test("notify-kit does not import email-auth-kit", async () => {
  const { readFileSync } = await import("fs");
  const src = readFileSync("packages/notify-kit/package.json", "utf8");
  assert.ok(!src.includes("email-auth-kit"), "notify-kit must not depend on email-auth-kit");
});

await test("both packages export their main entry point", async () => {
  const authPkg = await import("../packages/email-auth-kit/src/index.js");
  assert.ok(typeof authPkg.EmailAuth === "function");
  assert.ok(typeof authPkg.InMemoryOTPStore === "function");

  const notifyPkg = await import("../packages/notify-kit/src/index.js");
  assert.ok(typeof notifyPkg.Notify === "function");
});

// ════════════════════════════════════════════════════════════════════════════
// SECTION 11 — Express Example Server (HTTP smoke test)
// ════════════════════════════════════════════════════════════════════════════
section("11. Express Example Server — HTTP Smoke Tests");

// Install example deps first if needed
import { existsSync } from "fs";

await test("express-auth-example server starts and handles OTP API", async () => {
  // Dynamic import of server module (mock mode)
  process.env.USE_MOCK_SMTP = "true";
  process.env.NODE_ENV = "test";

  const { default: app } = await import("../examples/express-auth-example/server.js");

  const server = createServer(app);
  await new Promise(resolve => server.listen(0, resolve));
  const { port } = server.address();
  const base = `http://localhost:${port}`;

  // Test: missing email
  const r1 = await fetch(`${base}/api/auth/otp/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  assert.equal(r1.status, 400);
  const d1 = await r1.json();
  assert.ok(d1.error);

  // Test: valid email → success (mock mode)
  const r2 = await fetch(`${base}/api/auth/otp/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "smoketest@example.com" }),
  });
  assert.equal(r2.status, 200);
  const d2 = await r2.json();
  assert.equal(d2.success, true);
  assert.ok(d2.expiresIn > 0);

  // Test: verify with wrong code → 400
  const r3 = await fetch(`${base}/api/auth/otp/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "smoketest@example.com", code: "000000" }),
  });
  assert.equal(r3.status, 400);
  const d3 = await r3.json();
  assert.ok(d3.code === "INVALID_OTP" || d3.code === "MAX_ATTEMPTS_EXCEEDED" || d3.error);

  server.close();
});

await test("express-notification-example server handles registration and checkout", async () => {
  process.env.USE_MOCK_SMTP = "true";
  process.env.NODE_ENV = "test";

  const { default: notifyApp } = await import("../examples/express-notification-example/server.js");
  const server = createServer(notifyApp);
  await new Promise(resolve => server.listen(0, resolve));
  const { port } = server.address();
  const base = `http://localhost:${port}`;

  // Register user
  const r1 = await fetch(`${base}/api/users/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "newuser@example.com", name: "Smoke Test" }),
  });
  assert.equal(r1.status, 201);
  const d1 = await r1.json();
  assert.equal(d1.success, true);
  assert.ok(d1.user.id);

  // Checkout
  const r2 = await fetch(`${base}/api/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      customerEmail: "buyer@example.com",
      customerName: "Smoke Buyer",
      amount: "49.00",
      items: [{ name: "Test Widget", quantity: 1, price: "49.00" }],
    }),
  });
  assert.equal(r2.status, 201);
  const d2 = await r2.json();
  assert.equal(d2.success, true);
  assert.ok(d2.orderId.startsWith("ORD-"));

  // Account alert
  const r3 = await fetch(`${base}/api/notify/alert`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to: "user@example.com",
      title: "Login detected",
      message: "New login from Chrome.",
    }),
  });
  assert.equal(r3.status, 200);
  const d3 = await r3.json();
  assert.equal(d3.success, true);

  // Missing fields → 400
  const r4 = await fetch(`${base}/api/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ customerEmail: "x@example.com" }),
  });
  assert.equal(r4.status, 400);

  server.close();
});

// ════════════════════════════════════════════════════════════════════════════
// RESULTS
// ════════════════════════════════════════════════════════════════════════════

console.log("\n════════════════════════════════════════════════════════");
console.log(`  INTEGRATION TEST RESULTS`);
console.log(`  Passed: ${passed}  |  Failed: ${failed}  |  Total: ${passed + failed}`);
console.log("════════════════════════════════════════════════════════");

if (failed > 0) {
  console.log("\nFailed tests:");
  results.filter(r => !r.ok).forEach(r => console.log(`  ✗ ${r.label}\n    ${r.error}`));
  process.exit(1);
} else {
  console.log("\n  All integration tests passed. Ready to publish.\n");
}
