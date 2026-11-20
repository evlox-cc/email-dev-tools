# Changelog — notify-kit

All notable changes to this package are documented here.

## [1.0.0] - 2026-11-19

### Added
- `Notify` class for transactional email delivery
- `send(options)` — full-featured email send with template support
- `sendWelcome(params)` — welcome email convenience method
- `sendOrderConfirmation(params)` — order confirmation with line items
- `sendAccountNotification(params)` — account activity alert
- `sendPasswordResetNotification(params)` — security notice for password changes
- `sendCustom(params)` — custom HTML wrapped in responsive layout
- `registerTemplate(name, fn)` — custom template registry
- Five built-in responsive HTML templates
- `wrapNotificationLayout()` — base responsive email layout renderer
- Full branding support: app name, logo, primary color, support email, footer
- Multiple recipients, CC, BCC, reply-to, attachments, custom headers
- Structured delivery results: `{ messageId, accepted, rejected, status, response }`
- Typed error classes: `ConfigurationError`, `SMTPError`, `InvalidRecipientError`, `TemplateError`, `DeliveryError`
- `verifyConnection()` for SMTP connectivity testing
- Safe HTML escaping on all template variables
- JSDoc documentation on all public API methods
- Full Vitest test suite (16 tests)

