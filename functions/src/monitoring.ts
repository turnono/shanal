import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { getFirestore } from "firebase-admin/firestore";

/**
 * Monitoring and Alerting System for Shanal Cars Cloud Functions
 */

// Performance metrics interface
interface FunctionMetrics {
  functionName: string;
  executionTime: number;
  memoryUsage: number;
  errorCount: number;
  successCount: number;
  timestamp: Date;
}

// Alert thresholds
const ALERT_THRESHOLDS = {
  EXECUTION_TIME_MS: 30000, // 30 seconds
  ERROR_RATE_PERCENT: 5, // 5%
  MEMORY_USAGE_MB: 512, // 512 MB
  WEBHOOK_TIMEOUT_MS: 10000, // 10 seconds
};

/**
 * Log function execution metrics
 */
export function logFunctionMetrics(
  functionName: string,
  startTime: number,
  error?: Error
): void {
  const executionTime = Date.now() - startTime;
  const memoryUsage = process.memoryUsage();

  const metrics: FunctionMetrics = {
    functionName,
    executionTime,
    memoryUsage: memoryUsage.heapUsed / 1024 / 1024, // Convert to MB
    errorCount: error ? 1 : 0,
    successCount: error ? 0 : 1,
    timestamp: new Date(),
  };

  // Log to Firebase
  getFirestore().collection("function_metrics").add(metrics);

  // Check for alerts
  checkAlertThresholds(metrics);

  // Log to console for debugging
  console.log(`Function ${functionName} executed in ${executionTime}ms`, {
    memoryUsage: `${metrics.memoryUsage.toFixed(2)}MB`,
    error: error?.message,
  });
}

/**
 * Check if metrics exceed alert thresholds
 */
function checkAlertThresholds(metrics: FunctionMetrics): void {
  const alerts: string[] = [];

  if (metrics.executionTime > ALERT_THRESHOLDS.EXECUTION_TIME_MS) {
    alerts.push(`Slow execution: ${metrics.executionTime}ms`);
  }

  if (metrics.memoryUsage > ALERT_THRESHOLDS.MEMORY_USAGE_MB) {
    alerts.push(`High memory usage: ${metrics.memoryUsage.toFixed(2)}MB`);
  }

  if (alerts.length > 0) {
    // Log critical alerts
    console.error(`ALERT: ${metrics.functionName}`, alerts);

    // Store alert in Firestore for dashboard
    getFirestore().collection("alerts").add({
      functionName: metrics.functionName,
      alerts,
      timestamp: new Date(),
      severity: "HIGH",
    });
  }
}

/**
 * Monitor payment processing success rate
 */
export async function monitorPaymentSuccessRate(): Promise<void> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const bookings = await getFirestore()
    .collection("bookings")
    .where("createdAt", ">=", oneHourAgo)
    .get();

  const totalBookings = bookings.size;
  const confirmedBookings = bookings.docs.filter(
    (doc) => doc.data().status === "confirmed"
  ).length;

  const successRate = (confirmedBookings / totalBookings) * 100;

  if (successRate < 100 - ALERT_THRESHOLDS.ERROR_RATE_PERCENT) {
    console.error(`Payment success rate alert: ${successRate.toFixed(2)}%`);

    await getFirestore()
      .collection("alerts")
      .add({
        type: "payment_success_rate",
        value: successRate,
        threshold: 100 - ALERT_THRESHOLDS.ERROR_RATE_PERCENT,
        timestamp: new Date(),
        severity: "CRITICAL",
      });
  }
}

/**
 * Health check function for monitoring
 */
export const healthCheck = onRequest({ cors: true }, async (req, res) => {
  const startTime = Date.now();

  try {
    // Check Firestore connection
    await getFirestore().collection("health_check").doc("test").set({
      timestamp: new Date(),
    });

    // Check function metrics
    const recentMetrics = await getFirestore()
      .collection("function_metrics")
      .orderBy("timestamp", "desc")
      .limit(10)
      .get();

    const healthStatus = {
      status: "healthy",
      timestamp: new Date(),
      firestore: "connected",
      recentExecutions: recentMetrics.size,
      uptime: process.uptime(),
    };

    logFunctionMetrics("healthCheck", startTime);
    res.json(healthStatus);
  } catch (error) {
    logFunctionMetrics("healthCheck", startTime, error as Error);
    res.status(500).json({
      status: "unhealthy",
      error: (error as Error).message,
      timestamp: new Date(),
    });
  }
});

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
