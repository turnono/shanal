import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { onRequest } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { logFunctionMetrics } from "./monitoring";
export { healthCheck, systemHealthMonitor } from "./monitoring";

// Initialize Firebase Admin
const app = initializeApp();
const db = getFirestore(app);
const auth = getAuth(app);

// Service pricing used for rough revenue estimates
const SERVICE_PRICES: Record<string, number> = {
  "Car Rental": 50,
  "Sightseeing Tour": 80,
  "Catamaran Trip": 120,
  "Ile Aux Cerfs Island Trip": 100,
  "Airport Transfers": 30,
};

type BookingStatus = "pending" | "confirmed" | "cancelled";

interface BookingData {
  id?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone: string;
  serviceName: string;
  bookingDate: FirebaseFirestore.Timestamp | Date | string;
  notes?: string;
  status: BookingStatus;
  createdAt: FirebaseFirestore.Timestamp | Date | string;
  updatedAt: FirebaseFirestore.Timestamp | Date | string;
}

const notificationEmailTo = process.env.NOTIFICATION_EMAIL_TO;
const notificationEmailFrom =
  process.env.NOTIFICATION_EMAIL_FROM || "notifications@shanalcars.com";
const sendgridApiKey = process.env.SENDGRID_API_KEY;
const whatsappWebhookUrl = process.env.WHATSAPP_WEBHOOK_URL;
const whatsappApiToken = process.env.WHATSAPP_API_TOKEN;
const whatsappRecipient = process.env.OWNER_WHATSAPP_NUMBER;

function normalizeDate(date: FirebaseFirestore.Timestamp | Date | string): Date {
  if (date instanceof Date) {
    return date;
  }

  if (typeof date === "string") {
    return new Date(date);
  }

  if (date && typeof (date as FirebaseFirestore.Timestamp).toDate === "function") {
    return (date as FirebaseFirestore.Timestamp).toDate();
  }

  return new Date();
}

function buildNotificationMessage(
  bookingId: string,
  booking: BookingData,
  formattedDate: string
) {
  return (
    `A new booking has been submitted on Shanal Cars.\n\n` +
    `Booking ID: ${bookingId}\n` +
    `Customer Name: ${booking.customerName}\n` +
    (booking.customerEmail ? `Customer Email: ${booking.customerEmail}\n` : "") +
    `Customer Phone: ${booking.customerPhone}\n` +
    `Service: ${booking.serviceName}\n` +
    `Preferred Date: ${formattedDate}\n` +
    (booking.notes ? `Notes: ${booking.notes}\n\n` : "\n") +
    `Please contact the customer to confirm availability and arrange manual payment (cash, EFT, or local mobile wallet).`
  );
}

async function trySendEmail(
  bookingId: string,
  booking: BookingData,
  formattedDate: string
): Promise<boolean> {
  if (!sendgridApiKey || !notificationEmailTo) {
    return false;
  }

  const message = buildNotificationMessage(bookingId, booking, formattedDate);
  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sendgridApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [
        {
          to: [{ email: notificationEmailTo }],
        },
      ],
      from: { email: notificationEmailFrom },
      subject: `New Booking Request: ${booking.serviceName} on ${formattedDate}`,
      content: [{ type: "text/plain", value: message }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `SendGrid notification failed with status ${response.status}: ${errorText}`
    );
  }

  return true;
}

async function trySendWhatsApp(
  bookingId: string,
  booking: BookingData,
  formattedDate: string
): Promise<boolean> {
  if (!whatsappWebhookUrl || !whatsappRecipient) {
    return false;
  }

  const message = buildNotificationMessage(bookingId, booking, formattedDate);
  const response = await fetch(whatsappWebhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(whatsappApiToken ? { Authorization: `Bearer ${whatsappApiToken}` } : {}),
    },
    body: JSON.stringify({
      to: whatsappRecipient,
      message,
      metadata: {
        bookingId,
        serviceName: booking.serviceName,
        bookingDate: formattedDate,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `WhatsApp notification failed with status ${response.status}: ${errorText}`
    );
  }

  return true;
}

async function sendOwnerNotification(bookingId: string, booking: BookingData) {
  const bookingDate = normalizeDate(booking.bookingDate);
  const formattedDate = bookingDate.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const attempts: Array<() => Promise<boolean>> = [];
  attempts.push(() => trySendEmail(bookingId, booking, formattedDate));
  attempts.push(() => trySendWhatsApp(bookingId, booking, formattedDate));

  let delivered = false;
  const errors: Error[] = [];

  for (const attempt of attempts) {
    try {
      delivered = (await attempt()) || delivered;
      if (delivered) {
        break;
      }
    } catch (error) {
      errors.push(error as Error);
    }
  }

  if (!delivered) {
    errors.forEach((error) =>
      console.error("Notification attempt failed for", bookingId, error)
    );
    throw new Error(
      "No notification channel configured. Provide SendGrid or WhatsApp credentials to enable owner alerts."
    );
  }
}

/**
 * Triggered when a new booking is created.
 * Sends an email notification to the business owner so that payments can be
 * arranged manually with the customer.
 */
export const notifyOwnerOnBooking = onDocumentCreated(
  "bookings/{bookingId}",
  async (event) => {
    const startTime = Date.now();
    const bookingId = event.params.bookingId;
    const bookingData = event.data?.data() as BookingData | undefined;

    if (!bookingData) {
      console.warn("Booking data missing for", bookingId);
      return;
    }

    try {
      await sendOwnerNotification(bookingId, bookingData);
      await event.data?.ref.update({
        updatedAt: FieldValue.serverTimestamp(),
        ownerNotifiedAt: FieldValue.serverTimestamp(),
      });
      logFunctionMetrics("notifyOwnerOnBooking", startTime);
    } catch (error) {
      console.error("Failed to send owner notification for", bookingId, error);
      logFunctionMetrics("notifyOwnerOnBooking", startTime, error as Error);
    }
  }
);

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
    const adminUser = await auth.getUser(adminId);
    if (!adminUser.customClaims?.admin) {
      res.status(403).send("Admin access required");
      return;
    }

    await db.collection("bookings").doc(bookingId).update({
      status: "confirmed" as BookingStatus,
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

    const weeklyBookings = await db
      .collection("bookings")
      .where("createdAt", ">=", oneWeekAgo)
      .get();

    const monthlyBookings = await db
      .collection("bookings")
      .where("createdAt", ">=", oneMonthAgo)
      .get();

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

function calculateBookingStats(snapshot: FirebaseFirestore.QuerySnapshot) {
  const stats: Record<string, number> = {
    total: snapshot.size,
    pending: 0,
    confirmed: 0,
    cancelled: 0,
    revenue: 0,
  };

  snapshot.docs.forEach((doc) => {
    const data = doc.data() as BookingData;
    const status = data.status as BookingStatus;

    if (stats[status] !== undefined) {
      stats[status]++;
    }

    if (status === "confirmed") {
      const servicePrice = SERVICE_PRICES[data.serviceName] || 50;
      stats.revenue += servicePrice;
    }
  });

  return stats;
}

