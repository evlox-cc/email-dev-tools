# Contributing Guide

Thank you for considering contributing to this project.

## Development Setup

```bash
git clone https://github.com/evlox-cc/email-dev-tools.git
cd email-dev-tools
npm install
npm test
```

## Repository Structure

```
packages/email-auth-kit/   — Email OTP auth package
packages/notify-kit/       — Transactional email package
skills/email-auth-kit/     — AI agent skill for email-auth-kit
skills/notify-kit/         — AI agent skill for notify-kit
examples/                  — Working integration examples
```

## Making Changes

1. Fork the repository and create a feature branch
2. Make changes inside the relevant `packages/` directory
3. Add or update tests in `packages/*/tests/`
4. Run `npm test` to ensure all 38 tests pass
5. Run `npm run lint` to check code style
6. Submit a pull request with a clear description

## Code Standards

- JavaScript only (no TypeScript source files)
- ES modules (`import`/`export`) throughout
- JSDoc on all public API methods and classes
- All new features require corresponding Vitest tests
- Use `crypto.randomBytes` or `crypto.randomInt` for any randomness — never `Math.random()`
- HTML-escape all dynamic values before template interpolation
- Credentials must never appear in logs, error messages, or test output

## Testing

```bash
npm test               # Run all tests
npm run test:coverage  # With coverage report
```

Tests use mock SMTP transport — no real email credentials are needed to run tests.

## Publishing

Each package is published independently:

```bash
cd packages/email-auth-kit && npm publish --access public
cd packages/notify-kit     && npm publish --access public
```

Do not publish without explicit maintainer approval.

## Security Issues

Please report security vulnerabilities privately. See [SECURITY.md](SECURITY.md).

