#!/usr/bin/env node

/**
 * Shanal Cars - Payment Flow Testing Script
 *
 * This script tests the complete payment flow from booking creation
 * to payment confirmation using Stripe test mode.
 */

const { initializeApp } = require("firebase/app");
const {
  getFirestore,
  collection,
  addDoc,
  doc,
  getDoc,
  updateDoc,
} = require("firebase/firestore");
const { getAuth, signInWithEmailAndPassword } = require("firebase/auth");

// Firebase configuration (use your actual config)
const firebaseConfig = {
  apiKey: "AIzaSyBvOkBwLqPZx8K9mN2oR3sT4uV5wX6yZ7a",
  authDomain: "shanal-8b8c8.firebaseapp.com",
  projectId: "shanal-8b8c8",
  storageBucket: "shanal-8b8c8.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890",
  measurementId: "G-XXXXXXXXXX",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Test data
const testBooking = {
  customerName: "Test Customer",
  customerEmail: "test@example.com",
  customerPhone: "+1234567890",
  serviceName: "Car Rental",
  serviceId: "car-rental",
  bookingDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
  pickupLocation: "Test Location",
  duration: "1 day",
  additionalNotes: "Test booking for payment flow",
  status: "pending",
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Test scenarios
const testScenarios = [
  {
    name: "Happy Path - Successful Payment",
    description: "Complete booking to payment confirmation flow",
    expectedStatus: "confirmed",
  },
  {
    name: "Payment Link Generation",
    description: "Test payment link generation without actual payment",
    expectedStatus: "pending_payment",
  },
  {
    name: "Error Handling",
    description: "Test error scenarios and recovery",
    expectedStatus: "error",
  },
];

/**
 * Test 1: Create booking and verify payment link generation
 */
async function testPaymentLinkGeneration() {
  console.log("🧪 Test 1: Payment Link Generation");

  try {
    // Create test booking
    const docRef = await addDoc(collection(db, "bookings"), testBooking);
    console.log(`✅ Booking created with ID: ${docRef.id}`);

    // Wait for payment link generation (Cloud Function trigger)
    console.log("⏳ Waiting for payment link generation...");
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Check if payment link was generated
    const bookingDoc = await getDoc(doc(db, "bookings", docRef.id));
    const bookingData = bookingDoc.data();

    if (bookingData.paymentLink) {
      console.log(`✅ Payment link generated: ${bookingData.paymentLink}`);
      console.log(`✅ Status updated to: ${bookingData.status}`);
      return {
        success: true,
        bookingId: docRef.id,
        paymentLink: bookingData.paymentLink,
      };
    } else {
      console.log("❌ Payment link not generated");
      return { success: false, bookingId: docRef.id };
    }
  } catch (error) {
    console.error("❌ Error in payment link generation test:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Test 2: Simulate webhook payment confirmation
 */
async function testWebhookConfirmation(bookingId) {
  console.log("🧪 Test 2: Webhook Payment Confirmation");

  try {
    // Simulate webhook payload
    const webhookPayload = {
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_" + Date.now(),
          payment_status: "paid",
          customer_email: testBooking.customerEmail,
          metadata: {
            bookingId: bookingId,
          },
        },
      },
    };

    // Call webhook function (you'll need to implement this endpoint)
    const response = await fetch(
      "http://localhost:5001/shanal/us-central1/handleStripeWebhook",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "stripe-signature": "test_signature",
        },
        body: JSON.stringify(webhookPayload),
      }
    );

    if (response.ok) {
      console.log("✅ Webhook processed successfully");

      // Check booking status
      const bookingDoc = await getDoc(doc(db, "bookings", bookingId));
      const bookingData = bookingDoc.data();

      if (bookingData.status === "confirmed") {
        console.log("✅ Booking status updated to confirmed");
        return { success: true };
      } else {
        console.log(
          `❌ Booking status is ${bookingData.status}, expected confirmed`
        );
        return { success: false };
      }
    } else {
      console.log("❌ Webhook processing failed");
      return { success: false };
    }
  } catch (error) {
    console.error("❌ Error in webhook confirmation test:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Test 3: Error handling and recovery
 */
async function testErrorHandling() {
  console.log("🧪 Test 3: Error Handling");

  try {
    // Create booking with invalid data
    const invalidBooking = {
      ...testBooking,
      serviceName: "Invalid Service", // This should cause an error
      customerEmail: "invalid-email", // Invalid email format
    };

    const docRef = await addDoc(collection(db, "bookings"), invalidBooking);
    console.log(`✅ Invalid booking created with ID: ${docRef.id}`);

    // Wait for processing
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Check if error was handled gracefully
    const bookingDoc = await getDoc(doc(db, "bookings", docRef.id));
    const bookingData = bookingDoc.data();

    if (bookingData.status === "error") {
      console.log("✅ Error handled gracefully");
      return { success: true };
    } else {
      console.log(
        `❌ Error not handled properly, status: ${bookingData.status}`
      );
      return { success: false };
    }
  } catch (error) {
    console.error("❌ Error in error handling test:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Test 4: Performance monitoring
 */
async function testPerformanceMonitoring() {
  console.log("🧪 Test 4: Performance Monitoring");

  try {
    // Create multiple bookings to test performance
    const startTime = Date.now();
    const promises = [];

    for (let i = 0; i < 5; i++) {
      const booking = {
        ...testBooking,
        customerName: `Test Customer ${i}`,
        customerEmail: `test${i}@example.com`,
      };
      promises.push(addDoc(collection(db, "bookings"), booking));
    }

    const results = await Promise.all(promises);
    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`✅ Created ${results.length} bookings in ${duration}ms`);
    console.log(`✅ Average time per booking: ${duration / results.length}ms`);

    // Check function metrics
    const metricsSnapshot = await getDocs(collection(db, "function_metrics"));
    console.log(
      `✅ Function metrics collected: ${metricsSnapshot.size} entries`
    );

    return { success: true, duration, bookingCount: results.length };
  } catch (error) {
    console.error("❌ Error in performance monitoring test:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Main test runner
 */
async function runAllTests() {
  console.log("🚀 Starting Shanal Cars Payment Flow Tests");
  console.log("=".repeat(50));

  const results = {
    paymentLinkGeneration: await testPaymentLinkGeneration(),
    webhookConfirmation: null,
    errorHandling: await testErrorHandling(),
    performanceMonitoring: await testPerformanceMonitoring(),
  };

  // Test webhook confirmation if payment link was generated
  if (results.paymentLinkGeneration.success) {
    results.webhookConfirmation = await testWebhookConfirmation(
      results.paymentLinkGeneration.bookingId
    );
  }

  // Print summary
  console.log("\n📊 Test Results Summary");
  console.log("=".repeat(50));

  Object.entries(results).forEach(([testName, result]) => {
    if (result) {
      const status = result.success ? "✅ PASS" : "❌ FAIL";
      console.log(`${testName}: ${status}`);
      if (result.error) {
        console.log(`  Error: ${result.error}`);
      }
    } else {
      console.log(`${testName}: ⏭️  SKIPPED`);
    }
  });

  const passedTests = Object.values(results).filter(
    (r) => r && r.success
  ).length;
  const totalTests = Object.values(results).filter((r) => r !== null).length;

  console.log(`\n🎯 Overall: ${passedTests}/${totalTests} tests passed`);

  if (passedTests === totalTests) {
    console.log("🎉 All tests passed! Payment flow is working correctly.");
  } else {
    console.log("⚠️  Some tests failed. Please check the logs above.");
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  testPaymentLinkGeneration,
  testWebhookConfirmation,
  testErrorHandling,
  testPerformanceMonitoring,
  runAllTests,
};
