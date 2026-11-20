import { describe, it, expect, beforeEach } from "vitest";
import {
  Notify,
  ConfigurationError,
  InvalidRecipientError,
  TemplateError,
  escapeHtml
} from "../src/index.js";

describe("notify-kit Validation & Escaping", () => {
  it("escapes dangerous HTML characters safely", () => {
    const raw = `"><img src=x onerror=alert('xss')>&`;
    const escaped = escapeHtml(raw);
    expect(escaped).not.toContain("<img");
    expect(escaped).toContain("&lt;img");
    expect(escaped).toContain("&amp;");
    expect(escaped).toContain("&quot;");
  });

  it("handles empty or null escaping gracefully", () => {
    expect(escapeHtml(null)).toBe("");
    expect(escapeHtml(undefined)).toBe("");
    expect(escapeHtml("hello")).toBe("hello");
  });
});

describe("Notify Client", () => {
  let notify;

  beforeEach(() => {
    notify = new Notify({
      jsonTransport: true,
      from: '"Test Service" <service@example.com>',
      branding: {
        appName: "Acme App",
        primaryColor: "#2563eb",
        supportEmail: "support@example.com"
      }
    });
  });

  it("throws ConfigurationError when from is missing", () => {
    expect(() => new Notify({ jsonTransport: true })).toThrow(ConfigurationError);
  });

  it("throws InvalidRecipientError when recipient is invalid", async () => {
    await expect(
      notify.send({
        to: "not-an-email",
        subject: "Hello",
        html: "<p>Hi</p>"
      })
    ).rejects.toThrow(InvalidRecipientError);
  });

  it("sends simple email to single recipient and returns structured delivery result", async () => {
    const res = await notify.send({
      to: "customer@example.com",
      subject: "Welcome",
      text: "Hello world"
    });

    expect(res).toBeDefined();
    expect(res.status).toBe("accepted");
    expect(res.accepted).toContain("customer@example.com");
    expect(res.messageId).toBeDefined();
  });

  it("supports multiple recipients, CC, and BCC", async () => {
    const res = await notify.send({
      to: ["user1@example.com", "user2@example.com"],
      cc: "manager@example.com",
      bcc: ["audit@example.com"],
      subject: "Important Notice",
      html: "<p>Notice content</p>"
    });

    expect(res.status).toBe("accepted");
    expect(res.accepted).toEqual(
      expect.arrayContaining([
        "user1@example.com",
        "user2@example.com",
        "manager@example.com",
        "audit@example.com"
      ])
    );
  });

  it("sends welcome email using convenience method", async () => {
    const res = await notify.sendWelcome({
      to: "newuser@example.com",
      name: "Jane Doe",
      actionUrl: "https://example.com/onboarding"
    });

    expect(res.status).toBe("accepted");
    expect(res.accepted).toContain("newuser@example.com");
  });

  it("sends order confirmation with items and total", async () => {
    const res = await notify.sendOrderConfirmation({
      to: "buyer@example.com",
      orderId: "ORD-9876",
      amount: "49.99",
      customerName: "Alice",
      items: [
        { name: "Widget A", quantity: 2, price: "19.99" },
        { name: "Widget B", quantity: 1, price: "10.01" }
      ],
      viewOrderUrl: "https://example.com/orders/ORD-9876"
    });

    expect(res.status).toBe("accepted");
    expect(res.accepted).toContain("buyer@example.com");
  });

  it("sends account notification alert", async () => {
    const res = await notify.sendAccountNotification({
      to: "user@example.com",
      title: "New Login Detected",
      message: "A new login was recorded from Chrome on MacOS.",
      actionUrl: "https://example.com/security"
    });

    expect(res.status).toBe("accepted");
  });

  it("sends password reset security notification", async () => {
    const res = await notify.sendPasswordResetNotification({
      to: "user@example.com",
      ipAddress: "192.168.1.1",
      device: "Safari on iPhone"
    });

    expect(res.status).toBe("accepted");
  });

  it("sends custom email wrapped in layout", async () => {
    const res = await notify.sendCustom({
      to: "user@example.com",
      subject: "Monthly Newsletter",
      html: "<p>Check out our latest product updates.</p>"
    });

    expect(res.status).toBe("accepted");
  });

  it("allows registering and using custom templates", async () => {
    notify.registerTemplate("invoice_ready", (branding, data) => {
      return {
        subject: `Invoice #${data.invoiceNumber} is ready`,
        html: `<h2>Invoice for ${data.client}</h2><p>Amount: $${data.total}</p>`,
        text: `Invoice #${data.invoiceNumber} for $${data.total}`
      };
    });

    const res = await notify.send({
      to: "finance@client.com",
      template: "invoice_ready",
      data: { invoiceNumber: "INV-202", client: "Globex Corp", total: "1500" }
    });

    expect(res.status).toBe("accepted");
  });

  it("throws TemplateError when an unregistered template name is given", async () => {
    await expect(
      notify.send({
        to: "user@example.com",
        template: "non_existent_template"
      })
    ).rejects.toThrow(TemplateError);
  });

  it("verifies transport connectivity check", async () => {
    const conn = await notify.verifyConnection();
    expect(conn).toBe(true);
  });

  it("throws InvalidRecipientError when CC recipient is malformed", async () => {
    await expect(
      notify.send({
        to: "valid@example.com",
        cc: "invalid-cc-address",
        subject: "Test",
        text: "Body"
      })
    ).rejects.toThrow(InvalidRecipientError);
  });

  it("sends email with custom headers and attachments", async () => {
    const res = await notify.send({
      to: "recipient@example.com",
      subject: "Report Attached",
      text: "See attached report.",
      headers: {
        "X-Custom-Tracking-ID": "TRK-12345"
      },
      attachments: [
        {
          filename: "report.txt",
          content: "Sample report data"
        }
      ]
    });

    expect(res.status).toBe("accepted");
    expect(res.accepted).toContain("recipient@example.com");
  });
});
