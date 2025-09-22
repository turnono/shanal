import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import Stripe from "stripe";

// Initialize Firebase Admin
admin.initializeApp();

// Initialize Stripe
const stripe = new Stripe(functions.config().stripe.secret_key, {
  apiVersion: "2023-10-16",
});

// Interface for booking data
interface BookingData {
  id: string;
  customerName: string;
  customerPhone: string;
  serviceName: string;
  bookingDate: admin.firestore.Timestamp;
  notes?: string;
  status: string;
  paymentLink?: string;
  userId?: string;
  paidAt?: admin.firestore.Timestamp;
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}

// Service pricing configuration
const SERVICE_PRICES: { [key: string]: number } = {
  "Car Rental": 45,
  "Sightseeing Tour": 65,
  "Catamaran Trip": 85,
  "Ile Aux Cerfs Island Trip": 75,
  "Airport Transfers": 25,
};

/**
 * Cloud Function triggered when a new booking is created
 * Generates a Stripe payment link and updates the booking document
 */
export const generatePaymentLink = functions.firestore
  .document("bookings/{bookingId}")
  .onCreate(async (snap, context) => {
    const bookingId = context.params.bookingId;
    const bookingData = snap.data() as BookingData;

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
                name: `${bookingData.serviceName} - ${bookingData.customerName}`,
                description: `Booking for ${
                  bookingData.customerName
                } on ${bookingData.bookingDate.toDate().toLocaleDateString()}`,
              },
              unit_amount: priceInCents,
            },
            quantity: 1,
          },
        ],
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
              functions.config().app.base_url
            }/admin?payment=success&booking=${bookingId}`,
          },
        },
      });

      // Update the booking document with the payment link
      await snap.ref.update({
        paymentLink: paymentLink.url,
        status: "pending_payment",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(
        `Payment link generated for booking ${bookingId}: ${paymentLink.url}`
      );
    } catch (error) {
      console.error(
        `Error generating payment link for booking ${bookingId}:`,
        error
      );

      // Update booking with error status
      await snap.ref.update({
        status: "error",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  });

/**
 * Webhook function to handle Stripe payment confirmations
 * This should be called by Stripe when a payment is completed
 */
export const handleStripeWebhook = functions.https.onRequest(
  async (req, res) => {
    const sig = req.headers["stripe-signature"] as string;
    const webhookSecret = functions.config().stripe.webhook_secret;

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return res.status(400).send(`Webhook Error: ${err}`);
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
  try {
    const bookingId = session.metadata?.bookingId;

    if (!bookingId) {
      console.error("No booking ID found in session metadata");
      return;
    }

    // Update the booking status to confirmed
    const bookingRef = admin.firestore().collection("bookings").doc(bookingId);
    await bookingRef.update({
      status: "confirmed",
      paidAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`Booking ${bookingId} confirmed after successful payment`);
  } catch (error) {
    console.error("Error handling checkout session completion:", error);
  }
}

/**
 * Handle successful payment intent
 */
async function handlePaymentIntentSucceeded(
  paymentIntent: Stripe.PaymentIntent
) {
  try {
    // Extract booking ID from metadata
    const bookingId = paymentIntent.metadata?.bookingId;

    if (!bookingId) {
      console.error("No booking ID found in payment intent metadata");
      return;
    }

    // Update the booking status to confirmed
    const bookingRef = admin.firestore().collection("bookings").doc(bookingId);
    await bookingRef.update({
      status: "confirmed",
      paidAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(
      `Booking ${bookingId} confirmed after successful payment intent`
    );
  } catch (error) {
    console.error("Error handling payment intent success:", error);
  }
}

/**
 * Function to manually confirm a booking (for admin use)
 */
export const confirmBooking = functions.https.onCall(async (data, context) => {
  // Verify admin authentication
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only admin users can confirm bookings"
    );
  }

  const { bookingId } = data;

  if (!bookingId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Booking ID is required"
    );
  }

  try {
    const bookingRef = admin.firestore().collection("bookings").doc(bookingId);
    await bookingRef.update({
      status: "confirmed",
      paidAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true, message: "Booking confirmed successfully" };
  } catch (error) {
    console.error("Error confirming booking:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Failed to confirm booking"
    );
  }
});

/**
 * Function to get booking statistics
 */
export const getBookingStats = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated"
    );
  }

  try {
    const bookingsRef = admin.firestore().collection("bookings");

    // Get counts for each status
    const [pending, pendingPayment, confirmed, cancelled] = await Promise.all([
      bookingsRef.where("status", "==", "pending").get(),
      bookingsRef.where("status", "==", "pending_payment").get(),
      bookingsRef.where("status", "==", "confirmed").get(),
      bookingsRef.where("status", "==", "cancelled").get(),
    ]);

    return {
      total:
        pending.size + pendingPayment.size + confirmed.size + cancelled.size,
      pending: pending.size,
      pendingPayment: pendingPayment.size,
      confirmed: confirmed.size,
      cancelled: cancelled.size,
    };
  } catch (error) {
    console.error("Error getting booking stats:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Failed to get booking statistics"
    );
  }
});
