# Security Policy — notify-kit

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.x     | Yes       |

## Reporting Vulnerabilities

Do **not** open public issues for security vulnerabilities.

Contact: **security@YOUR_DOMAIN**

## Security Architecture

- All template variables are HTML-escaped before rendering via `escapeHtml()`
- SMTP credentials are never logged or included in error messages
- Raw Nodemailer errors are wrapped in typed `SMTPError` / `DeliveryError` before propagation
- No credentials are stored by the library — they are passed through to Nodemailer only

## Delivery Disclaimer

SMTP submission acceptance confirms the mail server accepted the message for relay.
It does **not** guarantee inbox delivery, which depends on recipient spam filters, DNS records (SPF/DKIM/DMARC), and provider policies.

