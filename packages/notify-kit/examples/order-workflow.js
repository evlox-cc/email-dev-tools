/**
 * Example demonstrating non-blocking transactional email in an express-style API route.
 * Shows best practices:
 * 1. Persist the business transaction first.
 * 2. Send email in background or asynchronously so email failures do not roll back successful orders.
 * 3. Log errors without crashing the main request thread.
 */
import { Notify } from "@evlox/notify-kit";

const notify = new Notify({
  jsonTransport: true, // replace with real smtp in production
  from: '"E-Commerce Store" <orders@mystore.com>',
  branding: {
    appName: "Modern E-Commerce",
    primaryColor: "#4f46e5",
    supportEmail: "help@mystore.com"
  }
});

// Mock database order creation
async function handleCheckout(orderData) {
  // 1. Save order to database
  const orderId = `ORD-${Date.now()}`;
  console.log(`[DB] Order ${orderId} saved to database.`);

  // 2. Dispatch email notification in background (fire-and-forget or queue)
  notify
    .sendOrderConfirmation({
      to: orderData.customerEmail,
      orderId,
      amount: orderData.total,
      customerName: orderData.customerName,
      items: orderData.items,
      viewOrderUrl: `https://mystore.com/orders/${orderId}`
    })
    .then((result) => {
      console.log(`[Email] Order confirmation sent: ${result.messageId}`);
    })
    .catch((err) => {
      // Do NOT crash the checkout response if email delivery fails.
      // In production, push to a dead-letter queue or retry table.
      console.error(`[Email Warning] Failed to deliver order email: ${err.message}`);
    });

  // 3. Immediately return response to user
  return { success: true, orderId };
}

handleCheckout({
  customerEmail: "sarah@example.com",
  customerName: "Sarah Connor",
  total: "89.50",
  items: [{ name: "Running Shoes", quantity: 1, price: "89.50" }]
}).then((res) => console.log("Checkout result:", res));

