import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import Stripe from "stripe";
import { logFunctionMetrics, monitorPaymentSuccessRate } from "./monitoring";

// Initialize Firebase Admin
const app = initializeApp();
const db = getFirestore(app);
const auth = getAuth(app);

// Initialize Stripe (only if config is available)
let stripe: Stripe | null = null;
try {
  // For v2 functions, we'll use environment variables instead of functions.config()
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (stripeSecretKey) {
    stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });
  }
} catch (error) {
  console.log("Stripe configuration not available - running in emulator mode");
}

// Interface for booking data
interface BookingData {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  serviceName: string;
  serviceId: string;
  bookingDate: Date;
  pickupLocation: string;
  duration: string;
  additionalNotes?: string;
  status: "pending" | "pending_payment" | "confirmed" | "cancelled";
  paymentLink?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Service prices
const SERVICE_PRICES: Record<string, number> = {
  "Car Rental": 50,
  "Sightseeing Tour": 80,
  "Catamaran Trip": 120,
  "Ile Aux Cerfs Island Trip": 100,
  "Airport Transfers": 30,
};

/**
 * Cloud Function triggered when a new booking is created
 * Generates a Stripe payment link and updates the booking document
 */
export const generatePaymentLink = onDocumentCreated(
  "bookings/{bookingId}",
  async (event) => {
    const startTime = Date.now();
    const bookingId = event.params.bookingId;
    const bookingData = event.data?.data() as BookingData;

    try {
      // Only process if status is 'pending' and no payment link exists
      if (bookingData.status !== "pending" || bookingData.paymentLink) {
        console.log(
          `Skipping payment link generation for booking ${bookingId}: status=${
            bookingData.status
          }, hasLink=${!!bookingData.paymentLink}`
        );
        return;
      }

      // Check if Stripe is available
      if (!stripe) {
        console.log(
          `Stripe not configured - marking booking ${bookingId} as pending_payment`
        );
        await event.data?.ref.update({
          status: "pending_payment",
          updatedAt: FieldValue.serverTimestamp(),
        });
        return;
      }

      // Get service price
      const servicePrice = SERVICE_PRICES[bookingData.serviceName] || 50;
      const priceInCents = servicePrice * 100; // Convert to cents

      // Create Stripe payment link
      const paymentLink = await stripe.paymentLinks.create({
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `${bookingData.serviceName} - Shanal Cars`,
                description: `Booking for ${
                  bookingData.customerName
                } on ${bookingData.bookingDate.toDateString()}`,
              },
              unit_amount: priceInCents,
            },
            quantity: 1,
          },
        ] as any,
        metadata: {
          bookingId: bookingId,
          customerName: bookingData.customerName,
          customerPhone: bookingData.customerPhone,
          serviceName: bookingData.serviceName,
        },
        after_completion: {
          type: "redirect",
          redirect: {
            url: `${
              process.env.BASE_URL || "https://shanal-cars.web.app"
            }/admin?payment=success&booking=${bookingId}`,
          },
        },
      });

      // Update the booking document with the payment link
      await event.data?.ref.update({
        paymentLink: paymentLink.url,
        status: "pending_payment",
        updatedAt: FieldValue.serverTimestamp(),
      });

      console.log(
        `Payment link generated for booking ${bookingId}: ${paymentLink.url}`
      );
      logFunctionMetrics("generatePaymentLink", startTime);
    } catch (error) {
      console.error(
        `Error generating payment link for booking ${bookingId}:`,
        error
      );

      // Update booking with error status
      await event.data?.ref.update({
        status: "error",
        updatedAt: FieldValue.serverTimestamp(),
      });

      logFunctionMetrics("generatePaymentLink", startTime, error as Error);
    }
  }
);

/**
 * Webhook function to handle Stripe payment confirmations
 * This should be called by Stripe when a payment is completed
 */
export const handleStripeWebhook = onRequest(
  { cors: true },
  async (req, res) => {
    if (!stripe) {
      console.log("Stripe not configured - webhook not available");
      res.status(503).send("Stripe not configured");
      return;
    }

    const sig = req.headers["stripe-signature"] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "test_secret";

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      res.status(400).send(`Webhook Error: ${err}`);
      return;
    }

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(
          event.data.object as Stripe.Checkout.Session
        );
        break;
      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(
          event.data.object as Stripe.PaymentIntent
        );
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  }
);

/**
 * Handle successful checkout session completion
 */
async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
) {
  const bookingId = session.metadata?.bookingId;
  if (!bookingId) {
    console.error("No booking ID found in session metadata");
    return;
  }

  try {
    await db.collection("bookings").doc(bookingId).update({
      status: "confirmed",
      paymentId: session.payment_intent,
      updatedAt: FieldValue.serverTimestamp(),
    });

    console.log(`Booking ${bookingId} confirmed via checkout session`);
  } catch (error) {
    console.error(`Error updating booking ${bookingId}:`, error);
  }
}

/**
 * Handle successful payment intent
 */
async function handlePaymentIntentSucceeded(
  paymentIntent: Stripe.PaymentIntent
) {
  const bookingId = paymentIntent.metadata?.bookingId;
  if (!bookingId) {
    console.error("No booking ID found in payment intent metadata");
    return;
  }

  try {
    await db.collection("bookings").doc(bookingId).update({
      status: "confirmed",
      paymentId: paymentIntent.id,
      updatedAt: FieldValue.serverTimestamp(),
    });

    console.log(`Booking ${bookingId} confirmed via payment intent`);
  } catch (error) {
    console.error(`Error updating booking ${bookingId}:`, error);
  }
}

/**
 * Callable function for admin to manually confirm a booking
 */
export const confirmBooking = onRequest({ cors: true }, async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).send("Method not allowed");
    return;
  }

  const { bookingId, adminId } = req.body;

  if (!bookingId || !adminId) {
    res.status(400).send("Missing required fields");
    return;
  }

  try {
    // Verify admin permissions (simplified for now)
    const adminUser = await auth.getUser(adminId);
    if (!adminUser.customClaims?.admin) {
      res.status(403).send("Admin access required");
      return;
    }

    await db.collection("bookings").doc(bookingId).update({
      status: "confirmed",
      confirmedBy: adminId,
      confirmedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    res.json({ success: true, message: "Booking confirmed" });
  } catch (error) {
    console.error("Error confirming booking:", error);
    res.status(500).send("Internal server error");
  }
});

/**
 * Callable function to get booking statistics
 */
export const getBookingStats = onRequest({ cors: true }, async (req, res) => {
  try {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get bookings from the last week
    const weeklyBookings = await db
      .collection("bookings")
      .where("createdAt", ">=", oneWeekAgo)
      .get();

    // Get bookings from the last month
    const monthlyBookings = await db
      .collection("bookings")
      .where("createdAt", ">=", oneMonthAgo)
      .get();

    // Calculate statistics
    const weeklyStats = calculateBookingStats(weeklyBookings);
    const monthlyStats = calculateBookingStats(monthlyBookings);

    res.json({
      weekly: weeklyStats,
      monthly: monthlyStats,
      totalBookings: monthlyBookings.size,
    });
  } catch (error) {
    console.error("Error getting booking stats:", error);
    res.status(500).send("Internal server error");
  }
});

/**
 * Calculate booking statistics from a query snapshot
 */
function calculateBookingStats(snapshot: any) {
  const stats = {
    total: snapshot.size,
    pending: 0,
    pendingPayment: 0,
    confirmed: 0,
    cancelled: 0,
    revenue: 0,
  };

  snapshot.docs.forEach((doc: any) => {
    const data = doc.data();
    stats[data.status as keyof typeof stats]++;

    if (data.status === "confirmed") {
      const servicePrice = SERVICE_PRICES[data.serviceName] || 50;
      stats.revenue += servicePrice;
    }
  });

  return stats;
}

/**
 * Scheduled function to monitor system health
 */
export const systemHealthMonitor = onSchedule(
  "every 5 minutes",
  async (event) => {
    const startTime = Date.now();

    try {
      await monitorPaymentSuccessRate();
      logFunctionMetrics("systemHealthMonitor", startTime);
    } catch (error) {
      logFunctionMetrics("systemHealthMonitor", startTime, error as Error);
    }
  }
);
