#!/usr/bin/env node

/**
 * Shanal Cars - Staging Deployment Test Script
 *
 * This script runs comprehensive tests against the staging environment
 * to ensure all functionality works before production deployment.
 */

const { initializeApp } = require("firebase/app");
const {
  getFirestore,
  collection,
  addDoc,
  doc,
  getDoc,
  query,
  where,
  getDocs,
} = require("firebase/firestore");
const { getAuth, signInWithEmailAndPassword } = require("firebase/auth");

// Staging environment configuration
const stagingConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: "shanal-staging.firebaseapp.com",
  projectId: "shanal-staging",
  storageBucket: "shanal-staging.appspot.com",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
};

// Initialize Firebase for staging
const app = initializeApp(stagingConfig, "staging");
const db = getFirestore(app);
const auth = getAuth(app);

// Test configuration
const TEST_CONFIG = {
  stagingUrl: "https://shanal-staging.web.app",
  functionsUrl: "https://us-central1-shanal-staging.cloudfunctions.net",
  testTimeout: 30000, // 30 seconds
  maxRetries: 3,
};

/**
 * Test 1: Frontend Application Health
 */
async function testFrontendHealth() {
  console.log("🧪 Test 1: Frontend Application Health");

  try {
    const response = await fetch(`${TEST_CONFIG.stagingUrl}/health`, {
      method: "GET",
      timeout: TEST_CONFIG.testTimeout,
    });

    if (response.ok) {
      const healthData = await response.json();
      console.log("✅ Frontend health check passed");
      console.log(`   Status: ${healthData.status}`);
      console.log(`   Uptime: ${healthData.uptime}s`);
      return { success: true, data: healthData };
    } else {
      console.log(`❌ Frontend health check failed: ${response.status}`);
      return { success: false, error: `HTTP ${response.status}` };
    }
  } catch (error) {
    console.log(`❌ Frontend health check error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Test 2: Cloud Functions Health
 */
async function testFunctionsHealth() {
  console.log("🧪 Test 2: Cloud Functions Health");

  const functions = ["healthCheck", "getBookingStats", "confirmBooking"];

  const results = [];

  for (const functionName of functions) {
    try {
      const response = await fetch(
        `${TEST_CONFIG.functionsUrl}/${functionName}`,
        {
          method: "GET",
          timeout: TEST_CONFIG.testTimeout,
        }
      );

      if (response.ok) {
        console.log(`✅ Function ${functionName} is healthy`);
        results.push({ function: functionName, success: true });
      } else {
        console.log(`❌ Function ${functionName} failed: ${response.status}`);
        results.push({
          function: functionName,
          success: false,
          error: response.status,
        });
      }
    } catch (error) {
      console.log(`❌ Function ${functionName} error: ${error.message}`);
      results.push({
        function: functionName,
        success: false,
        error: error.message,
      });
    }
  }

  const successCount = results.filter((r) => r.success).length;
  const totalCount = results.length;

  return {
    success: successCount === totalCount,
    results: results,
    summary: `${successCount}/${totalCount} functions healthy`,
  };
}

/**
 * Test 3: Database Connectivity
 */
async function testDatabaseConnectivity() {
  console.log("🧪 Test 3: Database Connectivity");

  try {
    // Test read operation
    const testCollection = collection(db, "health_check");
    const testDoc = doc(testCollection, "staging_test");

    // Test write operation
    await addDoc(testCollection, {
      test: true,
      timestamp: new Date(),
      environment: "staging",
    });

    // Test read operation
    const snapshot = await getDocs(
      query(testCollection, where("test", "==", true))
    );

    if (snapshot.size > 0) {
      console.log("✅ Database connectivity test passed");
      console.log(`   Test documents found: ${snapshot.size}`);
      return { success: true, documentCount: snapshot.size };
    } else {
      console.log(
        "❌ Database connectivity test failed: No test documents found"
      );
      return { success: false, error: "No test documents found" };
    }
  } catch (error) {
    console.log(`❌ Database connectivity error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Test 4: Authentication System
 */
async function testAuthenticationSystem() {
  console.log("🧪 Test 4: Authentication System");

  try {
    // Test admin authentication (if test credentials available)
    if (process.env.STAGING_ADMIN_EMAIL && process.env.STAGING_ADMIN_PASSWORD) {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        process.env.STAGING_ADMIN_EMAIL,
        process.env.STAGING_ADMIN_PASSWORD
      );

      if (userCredential.user) {
        console.log("✅ Admin authentication test passed");
        console.log(`   User: ${userCredential.user.email}`);
        return { success: true, user: userCredential.user.email };
      } else {
        console.log("❌ Admin authentication test failed: No user returned");
        return { success: false, error: "No user returned" };
      }
    } else {
      console.log("⏭️  Admin authentication test skipped: No test credentials");
      return { success: true, skipped: true };
    }
  } catch (error) {
    console.log(`❌ Authentication test error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Test 5: Payment System Integration
 */
async function testPaymentSystemIntegration() {
  console.log("🧪 Test 5: Payment System Integration");

  try {
    // Test payment link generation (without actual payment)
    const testBooking = {
      customerName: "Staging Test Customer",
      customerEmail: "test@staging.shanalcars.com",
      customerPhone: "+1234567890",
      serviceName: "Car Rental",
      serviceId: "car-rental",
      bookingDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      pickupLocation: "Staging Test Location",
      duration: "1 day",
      additionalNotes: "Staging deployment test",
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Create test booking
    const docRef = await addDoc(collection(db, "bookings"), testBooking);
    console.log(`✅ Test booking created: ${docRef.id}`);

    // Wait for payment link generation
    console.log("⏳ Waiting for payment link generation...");
    await new Promise((resolve) => setTimeout(resolve, 10000));

    // Check if payment link was generated
    const bookingDoc = await getDoc(doc(db, "bookings", docRef.id));
    const bookingData = bookingDoc.data();

    if (bookingData.paymentLink || bookingData.status === "pending_payment") {
      console.log("✅ Payment system integration test passed");
      console.log(`   Status: ${bookingData.status}`);
      return {
        success: true,
        bookingId: docRef.id,
        status: bookingData.status,
      };
    } else {
      console.log(
        "❌ Payment system integration test failed: No payment link generated"
      );
      return { success: false, error: "No payment link generated" };
    }
  } catch (error) {
    console.log(`❌ Payment system test error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Test 6: Performance Testing
 */
async function testPerformance() {
  console.log("🧪 Test 6: Performance Testing");

  try {
    const startTime = Date.now();

    // Test multiple concurrent requests
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(
        fetch(`${TEST_CONFIG.stagingUrl}/api/services`, {
          method: "GET",
          timeout: TEST_CONFIG.testTimeout,
        })
      );
    }

    const responses = await Promise.all(promises);
    const endTime = Date.now();
    const duration = endTime - startTime;

    const successCount = responses.filter((r) => r.ok).length;
    const averageResponseTime = duration / responses.length;

    console.log(`✅ Performance test completed in ${duration}ms`);
    console.log(
      `   Average response time: ${averageResponseTime.toFixed(2)}ms`
    );
    console.log(`   Success rate: ${successCount}/${responses.length}`);

    const performancePassed =
      averageResponseTime < 2000 && successCount === responses.length;

    return {
      success: performancePassed,
      duration: duration,
      averageResponseTime: averageResponseTime,
      successRate: successCount / responses.length,
    };
  } catch (error) {
    console.log(`❌ Performance test error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Main test runner
 */
async function runStagingTests() {
  console.log("🚀 Starting Shanal Cars Staging Deployment Tests");
  console.log("=".repeat(60));
  console.log(`Staging URL: ${TEST_CONFIG.stagingUrl}`);
  console.log(`Functions URL: ${TEST_CONFIG.functionsUrl}`);
  console.log("=".repeat(60));

  const tests = [
    { name: "Frontend Health", fn: testFrontendHealth },
    { name: "Functions Health", fn: testFunctionsHealth },
    { name: "Database Connectivity", fn: testDatabaseConnectivity },
    { name: "Authentication System", fn: testAuthenticationSystem },
    { name: "Payment System Integration", fn: testPaymentSystemIntegration },
    { name: "Performance", fn: testPerformance },
  ];

  const results = {};

  for (const test of tests) {
    try {
      results[test.name] = await test.test();
    } catch (error) {
      results[test.name] = { success: false, error: error.message };
    }
    console.log(""); // Add spacing between tests
  }

  // Print summary
  console.log("📊 Staging Test Results Summary");
  console.log("=".repeat(60));

  let passedTests = 0;
  let totalTests = 0;

  Object.entries(results).forEach(([testName, result]) => {
    totalTests++;
    const status = result.success ? "✅ PASS" : "❌ FAIL";
    console.log(`${testName}: ${status}`);

    if (result.error) {
      console.log(`  Error: ${result.error}`);
    }

    if (result.success) {
      passedTests++;
    }
  });

  console.log("=".repeat(60));
  console.log(`🎯 Overall: ${passedTests}/${totalTests} tests passed`);

  if (passedTests === totalTests) {
    console.log(
      "🎉 All staging tests passed! Ready for production deployment."
    );
    process.exit(0);
  } else {
    console.log(
      "⚠️  Some staging tests failed. Production deployment blocked."
    );
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runStagingTests().catch((error) => {
    console.error("❌ Staging tests failed:", error);
    process.exit(1);
  });
}

module.exports = {
  testFrontendHealth,
  testFunctionsHealth,
  testDatabaseConnectivity,
  testAuthenticationSystem,
  testPaymentSystemIntegration,
  testPerformance,
  runStagingTests,
};
