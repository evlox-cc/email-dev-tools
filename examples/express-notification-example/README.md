# Express Transactional Email Example with notify-kit

This application demonstrates best practices for transactional email delivery in Express:
- **Registration Flow**: Dispatches a branded welcome email with onboarding action link.
- **Order Checkout**: Dispatches an itemized order confirmation email with order breakdown and link.
- **Security Alert**: Dispatches account activity alerts.
- **Non-blocking Resilience**: Ensures failures in SMTP transport never roll back or fail successful database writes.

## Running Locally

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. By default `USE_MOCK_SMTP=true` is enabled, allowing tests without real credentials.
3. Start the server:
   ```bash
   npm start
   ```
4. Test with curl:
   ```bash
   # Register User
   curl -X POST http://localhost:3001/api/users/register \
     -H "Content-Type: application/json" \
     -d '{"email":"customer@example.com","name":"Alex"}'

   # Place Order
   curl -X POST http://localhost:3001/api/checkout \
     -H "Content-Type: application/json" \
     -d '{"customerEmail":"customer@example.com","amount":"79.00","items":[{"name":"Wireless Headphones","price":"79.00"}]}'
   ```

