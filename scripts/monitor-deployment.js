#!/usr/bin/env node

/**
 * Shanal Cars - Deployment Monitoring Script
 *
 * This script monitors the deployment health and provides
 * real-time status updates during and after deployment.
 */

const { initializeApp } = require("firebase/app");
const {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} = require("firebase/firestore");

// Production environment configuration
const productionConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: "shanal-8b8c8.firebaseapp.com",
  projectId: "shanal-8b8c8",
  storageBucket: "shanal-8b8c8.appspot.com",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
};

// Initialize Firebase for production
const app = initializeApp(productionConfig, "production");
const db = getFirestore(app);

// Monitoring configuration
const MONITORING_CONFIG = {
  productionUrl: "https://shanal-cars.web.app",
  functionsUrl: "https://us-central1-shanal-8b8c8.cloudfunctions.net",
  checkInterval: 30000, // 30 seconds
  maxChecks: 20, // 10 minutes total
  alertThresholds: {
    responseTime: 5000, // 5 seconds
    errorRate: 0.05, // 5%
    memoryUsage: 0.8, // 80%
  },
};

/**
 * Check application health
 */
async function checkApplicationHealth() {
  try {
    const startTime = Date.now();
    const response = await fetch(`${MONITORING_CONFIG.productionUrl}/health`, {
      method: "GET",
      timeout: 10000,
    });
    const endTime = Date.now();
    const responseTime = endTime - startTime;

    if (response.ok) {
      const healthData = await response.json();
      return {
        success: true,
        responseTime: responseTime,
        status: healthData.status,
        uptime: healthData.uptime,
        timestamp: new Date(),
      };
    } else {
      return {
        success: false,
        responseTime: responseTime,
        error: `HTTP ${response.status}`,
        timestamp: new Date(),
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      timestamp: new Date(),
    };
  }
}

/**
 * Check Cloud Functions health
 */
async function checkFunctionsHealth() {
  const functions = ["healthCheck", "getBookingStats"];
  const results = [];

  for (const functionName of functions) {
    try {
      const startTime = Date.now();
      const response = await fetch(
        `${MONITORING_CONFIG.functionsUrl}/${functionName}`,
        {
          method: "GET",
          timeout: 10000,
        }
      );
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      results.push({
        function: functionName,
        success: response.ok,
        responseTime: responseTime,
        status: response.status,
      });
    } catch (error) {
      results.push({
        function: functionName,
        success: false,
        error: error.message,
      });
    }
  }

  return results;
}

/**
 * Check database performance
 */
async function checkDatabasePerformance() {
  try {
    const startTime = Date.now();

    // Test a simple query
    const bookingsQuery = query(
      collection(db, "bookings"),
      orderBy("createdAt", "desc"),
      limit(1)
    );

    const snapshot = await getDocs(bookingsQuery);
    const endTime = Date.now();
    const responseTime = endTime - startTime;

    return {
      success: true,
      responseTime: responseTime,
      documentCount: snapshot.size,
      timestamp: new Date(),
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      timestamp: new Date(),
    };
  }
}

/**
 * Check function metrics
 */
async function checkFunctionMetrics() {
  try {
    const metricsQuery = query(
      collection(db, "function_metrics"),
      orderBy("timestamp", "desc"),
      limit(10)
    );

    const snapshot = await getDocs(metricsQuery);
    const metrics = snapshot.docs.map((doc) => doc.data());

    // Calculate average execution time
    const avgExecutionTime =
      metrics.reduce((sum, metric) => sum + metric.executionTime, 0) /
      metrics.length;

    // Calculate error rate
    const errorCount = metrics.filter((metric) => metric.errorCount > 0).length;
    const errorRate = errorCount / metrics.length;

    // Calculate average memory usage
    const avgMemoryUsage =
      metrics.reduce((sum, metric) => sum + metric.memoryUsage, 0) /
      metrics.length;

    return {
      success: true,
      averageExecutionTime: avgExecutionTime,
      errorRate: errorRate,
      averageMemoryUsage: avgMemoryUsage,
      metricsCount: metrics.length,
      timestamp: new Date(),
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      timestamp: new Date(),
    };
  }
}

/**
 * Check for alerts
 */
async function checkAlerts() {
  try {
    const alertsQuery = query(
      collection(db, "alerts"),
      orderBy("timestamp", "desc"),
      limit(5)
    );

    const snapshot = await getDocs(alertsQuery);
    const alerts = snapshot.docs.map((doc) => doc.data());

    // Filter recent alerts (last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentAlerts = alerts.filter(
      (alert) => alert.timestamp && alert.timestamp.toDate() > oneHourAgo
    );

    return {
      success: true,
      totalAlerts: alerts.length,
      recentAlerts: recentAlerts.length,
      alerts: recentAlerts,
      timestamp: new Date(),
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      timestamp: new Date(),
    };
  }
}

/**
 * Generate deployment report
 */
function generateDeploymentReport(healthChecks) {
  const report = {
    deploymentId: process.env.GITHUB_RUN_ID || Date.now(),
    deploymentTime: new Date(),
    totalChecks: healthChecks.length,
    successfulChecks: healthChecks.filter((check) => check.overall.success)
      .length,
    failedChecks: healthChecks.filter((check) => !check.overall.success).length,
    averageResponseTime: 0,
    maxResponseTime: 0,
    minResponseTime: Infinity,
    errors: [],
    warnings: [],
    recommendations: [],
  };

  // Calculate response time statistics
  const responseTimes = healthChecks
    .map((check) => check.overall.responseTime)
    .filter((time) => time !== undefined);

  if (responseTimes.length > 0) {
    report.averageResponseTime =
      responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    report.maxResponseTime = Math.max(...responseTimes);
    report.minResponseTime = Math.min(...responseTimes);
  }

  // Analyze errors and warnings
  healthChecks.forEach((check, index) => {
    if (!check.overall.success) {
      report.errors.push({
        check: index + 1,
        timestamp: check.overall.timestamp,
        error: check.overall.error,
      });
    }

    if (
      check.overall.responseTime >
      MONITORING_CONFIG.alertThresholds.responseTime
    ) {
      report.warnings.push({
        check: index + 1,
        timestamp: check.overall.timestamp,
        warning: `High response time: ${check.overall.responseTime}ms`,
      });
    }
  });

  // Generate recommendations
  if (report.averageResponseTime > 2000) {
    report.recommendations.push(
      "Consider optimizing application performance - average response time is high"
    );
  }

  if (report.failedChecks > 0) {
    report.recommendations.push(
      "Investigate failed health checks and resolve issues"
    );
  }

  if (report.errors.length > 0) {
    report.recommendations.push("Review error logs and implement fixes");
  }

  return report;
}

/**
 * Main monitoring function
 */
async function monitorDeployment() {
  console.log("🔍 Starting Shanal Cars Deployment Monitoring");
  console.log("=".repeat(60));
  console.log(`Production URL: ${MONITORING_CONFIG.productionUrl}`);
  console.log(`Functions URL: ${MONITORING_CONFIG.functionsUrl}`);
  console.log(`Check Interval: ${MONITORING_CONFIG.checkInterval / 1000}s`);
  console.log(`Max Checks: ${MONITORING_CONFIG.maxChecks}`);
  console.log("=".repeat(60));

  const healthChecks = [];
  let checkCount = 0;

  const monitoringInterval = setInterval(async () => {
    checkCount++;
    console.log(
      `\n🔍 Health Check #${checkCount}/${MONITORING_CONFIG.maxChecks}`
    );
    console.log(`Time: ${new Date().toISOString()}`);

    try {
      // Run all health checks
      const [
        appHealth,
        functionsHealth,
        dbPerformance,
        functionMetrics,
        alerts,
      ] = await Promise.all([
        checkApplicationHealth(),
        checkFunctionsHealth(),
        checkDatabasePerformance(),
        checkFunctionMetrics(),
        checkAlerts(),
      ]);

      // Compile overall health status
      const overallHealth = {
        success:
          appHealth.success &&
          functionsHealth.every((f) => f.success) &&
          dbPerformance.success,
        responseTime: appHealth.responseTime,
        timestamp: new Date(),
        error:
          appHealth.error ||
          functionsHealth.find((f) => !f.success)?.error ||
          dbPerformance.error,
      };

      // Store health check result
      const healthCheck = {
        checkNumber: checkCount,
        timestamp: new Date(),
        overall: overallHealth,
        details: {
          application: appHealth,
          functions: functionsHealth,
          database: dbPerformance,
          metrics: functionMetrics,
          alerts: alerts,
        },
      };

      healthChecks.push(healthCheck);

      // Display results
      console.log(
        `Overall Status: ${
          overallHealth.success ? "✅ HEALTHY" : "❌ UNHEALTHY"
        }`
      );
      console.log(`Response Time: ${overallHealth.responseTime || "N/A"}ms`);

      if (functionMetrics.success) {
        console.log(
          `Function Metrics: ${functionMetrics.metricsCount} recent executions`
        );
        console.log(
          `Average Execution Time: ${functionMetrics.averageExecutionTime.toFixed(
            2
          )}ms`
        );
        console.log(
          `Error Rate: ${(functionMetrics.errorRate * 100).toFixed(2)}%`
        );
      }

      if (alerts.success && alerts.recentAlerts > 0) {
        console.log(`⚠️  Recent Alerts: ${alerts.recentAlerts}`);
      }

      // Check if we should stop monitoring
      if (checkCount >= MONITORING_CONFIG.maxChecks) {
        clearInterval(monitoringInterval);
        await finalizeMonitoring(healthChecks);
      }
    } catch (error) {
      console.error(`❌ Health check error: ${error.message}`);

      const errorCheck = {
        checkNumber: checkCount,
        timestamp: new Date(),
        overall: {
          success: false,
          error: error.message,
        },
      };

      healthChecks.push(errorCheck);
    }
  }, MONITORING_CONFIG.checkInterval);

  // Handle process termination
  process.on("SIGINT", async () => {
    console.log("\n🛑 Monitoring interrupted by user");
    clearInterval(monitoringInterval);
    await finalizeMonitoring(healthChecks);
  });
}

/**
 * Finalize monitoring and generate report
 */
async function finalizeMonitoring(healthChecks) {
  console.log("\n📊 Deployment Monitoring Complete");
  console.log("=".repeat(60));

  const report = generateDeploymentReport(healthChecks);

  console.log(`Total Checks: ${report.totalChecks}`);
  console.log(`Successful: ${report.successfulChecks}`);
  console.log(`Failed: ${report.failedChecks}`);
  console.log(
    `Average Response Time: ${report.averageResponseTime.toFixed(2)}ms`
  );
  console.log(`Max Response Time: ${report.maxResponseTime}ms`);
  console.log(`Min Response Time: ${report.minResponseTime}ms`);

  if (report.errors.length > 0) {
    console.log(`\n❌ Errors (${report.errors.length}):`);
    report.errors.forEach((error) => {
      console.log(`  Check #${error.check}: ${error.error}`);
    });
  }

  if (report.warnings.length > 0) {
    console.log(`\n⚠️  Warnings (${report.warnings.length}):`);
    report.warnings.forEach((warning) => {
      console.log(`  Check #${warning.check}: ${warning.warning}`);
    });
  }

  if (report.recommendations.length > 0) {
    console.log(`\n💡 Recommendations:`);
    report.recommendations.forEach((rec) => {
      console.log(`  • ${rec}`);
    });
  }

  // Save report to file
  const fs = require("fs");
  const reportPath = "deployment-monitoring-report.json";
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Report saved to: ${reportPath}`);

  // Exit with appropriate code
  const deploymentHealthy =
    report.failedChecks === 0 && report.errors.length === 0;
  process.exit(deploymentHealthy ? 0 : 1);
}

// Run monitoring if this script is executed directly
if (require.main === module) {
  monitorDeployment().catch((error) => {
    console.error("❌ Monitoring failed:", error);
    process.exit(1);
  });
}

module.exports = {
  checkApplicationHealth,
  checkFunctionsHealth,
  checkDatabasePerformance,
  checkFunctionMetrics,
  checkAlerts,
  generateDeploymentReport,
  monitorDeployment,
};
