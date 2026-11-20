# email-dev-tools

Developer tools built for the AI-assisted development era. Install a package, give your AI coding agent one instruction, and let it integrate the functionality into your existing application.

This monorepo contains two independent npm packages and two AI agent skills.

---

## Packages

| Package | Description | Install |
|---|---|---|
| [`email-auth-kit`](packages/email-auth-kit) | Email OTP authentication, verification, and password reset | `npm install email-auth-kit` |
| [`notify-kit`](packages/notify-kit) | Transactional email notifications with responsive templates | `npm install notify-kit` |

Both packages are **fully independent** — neither depends on the other.

---

## AI Agent Skills

Each package ships with a companion skill for AI coding agents (Claude Code, Cursor, Windsurf, GitHub Copilot, and others).

### Install Skills

Install a single skill:
```bash
npx skills add evlox-cc/email-dev-tools --skill email-auth-kit
npx skills add evlox-cc/email-dev-tools --skill notify-kit
```

Install both skills at once:
```bash
npx skills add evlox-cc/email-dev-tools
```

---

## AI Prompt Examples

Once a skill is installed, you can direct your AI coding agent with a single instruction.

### Add Email OTP Authentication

```
Implement email OTP authentication using email-auth-kit and its skill:
https://github.com/evlox-cc/email-dev-tools

Use the email-auth-kit skill. Inspect my project, configure SMTP,
ask me for missing details, and implement the complete authentication flow.
```

Short version:
```
Implement email OTP authentication using email-auth-kit. Read its skill and integrate it into my existing project.
```

### Add Email Notifications

```
Implement email notifications using notify-kit and its skill:
https://github.com/evlox-cc/email-dev-tools

Use the notify-kit skill. Inspect my project, configure SMTP,
create notification templates, and integrate the required notification workflows.
```

Short version:
```
Add email notifications using notify-kit. Read its skill and integrate it into my existing project.
```

The agent will inspect your project, ask only for missing information, configure SMTP safely, install the package, implement the routes, and test the result.

---

## What the Agent Does Automatically

**For email-auth-kit:**
- Detects your backend framework (Express, Fastify, Next.js, NestJS)
- Asks only for what it cannot discover (sender email, SMTP provider)
- Creates `.env.example` with safe placeholder values
- Implements OTP send and verify endpoints
- Integrates with your existing user model and session system
- Builds frontend components if requested
- Tests with mocked SMTP — does not claim delivery until real credentials are configured

**For notify-kit:**
- Locates the correct point in your registration or checkout flow
- Dispatches emails asynchronously so transport failures never break core transactions
- Uses built-in responsive templates or registers custom ones
- Tests with mocked SMTP

---

## Package Comparison

| Capability | email-auth-kit | notify-kit |
|---|:---:|:---:|
| OTP generation and verification | ✓ | — |
| Email verification tokens | ✓ | — |
| Password reset tokens | ✓ | — |
| Welcome emails | — | ✓ |
| Order confirmations | — | ✓ |
| Account alerts | — | ✓ |
| Custom templates | ✓ | ✓ |
| Pluggable storage adapter | ✓ | — |
| Multiple recipients / CC / BCC | — | ✓ |
| Attachments | — | ✓ |
| Branding customization | ✓ | ✓ |

---

## Project Structure

```
email-dev-tools/
├── packages/
│   ├── email-auth-kit/     — OTP auth package
│   └── notify-kit/         — Notifications package
├── skills/
│   ├── email-auth-kit/     — AI agent skill
│   └── notify-kit/         — AI agent skill
├── examples/
│   ├── express-auth-example/
│   ├── nextjs-auth-example/
│   └── express-notification-example/
└── .github/workflows/ci.yml
```

---

## Running the Monorepo

```bash
git clone https://github.com/evlox-cc/email-dev-tools.git
cd email-dev-tools
npm install
npm test
```

---

## Publishing Packages

Each package is published independently:

```bash
cd packages/email-auth-kit
npm publish --access public

cd packages/notify-kit
npm publish --access public
```

Replace `evlox-cc` throughout documentation before pushing.

---

## Security

Both packages follow secure-by-default principles. See [SECURITY.md](SECURITY.md) for the full policy and vulnerability reporting contact.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

---

## License

MIT — see [LICENSE](LICENSE).

