import { onCall } from "firebase-functions/v2/https";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";

/**
 * Emergency Response System
 * Secure, auditable emergency functions for critical incidents
 */

// Emergency configuration
const EMERGENCY_CONFIG = {
  // Emergency response team UIDs
  EMERGENCY_RESPONSE_TEAM:
    process.env.EMERGENCY_RESPONSE_TEAM?.split(",") || [],
  // Emergency audit collection
  EMERGENCY_AUDIT_COLLECTION: "emergency_audit_logs",
  // Emergency status collection
  EMERGENCY_STATUS_COLLECTION: "emergency_status",
  // Rate limiting for emergency functions
  EMERGENCY_RATE_LIMIT: {
    maxCallsPerHour: 5,
    maxCallsPerDay: 20,
  },
};

/**
 * Verify emergency response team member
 */
async function verifyEmergencyTeamMember(uid: string): Promise<boolean> {
  try {
    // Check if UID is in emergency response team
    if (!EMERGENCY_CONFIG.EMERGENCY_RESPONSE_TEAM.includes(uid)) {
      return false;
    }

    // Verify user exists and has emergency permissions
    const userRecord = await getAuth().getUser(uid);
    const customClaims = userRecord.customClaims || {};

    return (
      customClaims.admin === true &&
      customClaims.role === "super_admin" &&
      customClaims.emergency_access === true
    );
  } catch (error) {
    console.error("Error verifying emergency team member:", error);
    return false;
  }
}

/**
 * Check rate limiting for emergency functions
 */
async function checkEmergencyRateLimit(
  uid: string,
  functionName: string
): Promise<boolean> {
  try {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    // Check hourly rate limit
    const hourlyCalls = await getFirestore()
      .collection(EMERGENCY_CONFIG.EMERGENCY_AUDIT_COLLECTION)
      .where("performedBy", "==", uid)
      .where("functionName", "==", functionName)
      .where("timestamp", ">=", new Date(oneHourAgo))
      .get();

    if (
      hourlyCalls.size >= EMERGENCY_CONFIG.EMERGENCY_RATE_LIMIT.maxCallsPerHour
    ) {
      return false;
    }

    // Check daily rate limit
    const dailyCalls = await getFirestore()
      .collection(EMERGENCY_CONFIG.EMERGENCY_AUDIT_COLLECTION)
      .where("performedBy", "==", uid)
      .where("functionName", "==", functionName)
      .where("timestamp", ">=", new Date(oneDayAgo))
      .get();

    if (
      dailyCalls.size >= EMERGENCY_CONFIG.EMERGENCY_RATE_LIMIT.maxCallsPerDay
    ) {
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error checking emergency rate limit:", error);
    return false;
  }
}

/**
 * Log emergency action with comprehensive audit trail
 */
async function logEmergencyAction(
  functionName: string,
  performedBy: string,
  action: string,
  details: any,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  try {
    const auditLog = {
      functionName,
      action,
      performedBy,
      details,
      timestamp: FieldValue.serverTimestamp(),
      ipAddress: ipAddress || "unknown",
      userAgent: userAgent || "unknown",
      sessionId: details.sessionId || "unknown",
      // Add security context
      securityContext: {
        incidentId: details.incidentId || "unknown",
        severity: details.severity || "unknown",
        justification: details.justification || "unknown",
      },
      // Add cryptographic hash for integrity verification
      integrityHash: await generateEmergencyIntegrityHash(
        functionName,
        performedBy,
        action,
        details
      ),
    };

    await getFirestore()
      .collection(EMERGENCY_CONFIG.EMERGENCY_AUDIT_COLLECTION)
      .add(auditLog);

    // Also update emergency status
    await getFirestore()
      .collection(EMERGENCY_CONFIG.EMERGENCY_STATUS_COLLECTION)
      .doc("current")
      .set(
        {
          lastEmergencyAction: {
            functionName,
            action,
            performedBy,
            timestamp: FieldValue.serverTimestamp(),
            incidentId: details.incidentId,
          },
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
  } catch (error) {
    console.error("Error logging emergency action:", error);
    throw new HttpsError("internal", "Failed to log emergency action");
  }
}

/**
 * Generate integrity hash for emergency audit log verification
 */
async function generateEmergencyIntegrityHash(
  functionName: string,
  performedBy: string,
  action: string,
  details: any
): Promise<string> {
  const crypto = require("crypto");
  const data = `${functionName}:${performedBy}:${action}:${JSON.stringify(
    details
  )}:${Date.now()}`;
  return crypto.createHash("sha256").update(data).digest("hex");
}

/**
 * Emergency function to disable all payment processing
 */
export const emergencyDisablePayments = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const { incidentId, severity, justification } = request.data;
  const emergencyTeamMemberUid = request.auth.uid;

  // Validate input
  if (!incidentId || !severity || !justification) {
    throw new HttpsError(
      "invalid-argument",
      "Missing required fields: incidentId, severity, justification"
    );
  }

  // Verify emergency team member
  const isEmergencyTeamMember = await verifyEmergencyTeamMember(
    emergencyTeamMemberUid
  );
  if (!isEmergencyTeamMember) {
    throw new HttpsError(
      "permission-denied",
      "Only emergency response team members can execute emergency functions"
    );
  }

  // Check rate limiting
  const rateLimitOk = await checkEmergencyRateLimit(
    emergencyTeamMemberUid,
    "emergencyDisablePayments"
  );
  if (!rateLimitOk) {
    throw new HttpsError(
      "resource-exhausted",
      "Emergency function rate limit exceeded"
    );
  }

  try {
    // Disable payment processing by updating system configuration
    await getFirestore().collection("system_config").doc("payments").set(
      {
        enabled: false,
        disabledAt: FieldValue.serverTimestamp(),
        disabledBy: emergencyTeamMemberUid,
        incidentId,
        severity,
        justification,
        status: "EMERGENCY_DISABLED",
      },
      { merge: true }
    );

    // Update all pending payments to "suspended" status
    const pendingPayments = await getFirestore()
      .collection("bookings")
      .where("status", "in", ["pending_payment", "pending"])
      .get();

    const batch = getFirestore().batch();
    pendingPayments.docs.forEach((doc) => {
      batch.update(doc.ref, {
        status: "suspended",
        suspendedAt: FieldValue.serverTimestamp(),
        suspendedBy: emergencyTeamMemberUid,
        incidentId,
        suspensionReason: "Emergency payment suspension",
      });
    });
    await batch.commit();

    // Log the emergency action
    await logEmergencyAction(
      "emergencyDisablePayments",
      emergencyTeamMemberUid,
      "disable_payments",
      {
        incidentId,
        severity,
        justification,
        affectedPayments: pendingPayments.size,
        sessionId: request.auth.token,
      },
      request.rawRequest?.ip,
      request.rawRequest?.headers?.["user-agent"]
    );

    // Send emergency notifications
    await sendEmergencyNotifications("PAYMENTS_DISABLED", {
      incidentId,
      severity,
      performedBy: emergencyTeamMemberUid,
      affectedPayments: pendingPayments.size,
    });

    return {
      success: true,
      message: "Payment processing disabled successfully",
      affectedPayments: pendingPayments.size,
      incidentId,
    };
  } catch (error) {
    console.error("Error in emergency disable payments:", error);
    throw new HttpsError("internal", "Failed to disable payments");
  }
});

/**
 * Emergency function to enable payment processing
 */
export const emergencyEnablePayments = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const { incidentId, resolution, justification } = request.data;
  const emergencyTeamMemberUid = request.auth.uid;

  // Validate input
  if (!incidentId || !resolution || !justification) {
    throw new HttpsError(
      "invalid-argument",
      "Missing required fields: incidentId, resolution, justification"
    );
  }

  // Verify emergency team member
  const isEmergencyTeamMember = await verifyEmergencyTeamMember(
    emergencyTeamMemberUid
  );
  if (!isEmergencyTeamMember) {
    throw new HttpsError(
      "permission-denied",
      "Only emergency response team members can execute emergency functions"
    );
  }

  try {
    // Enable payment processing
    await getFirestore().collection("system_config").doc("payments").set(
      {
        enabled: true,
        enabledAt: FieldValue.serverTimestamp(),
        enabledBy: emergencyTeamMemberUid,
        incidentId,
        resolution,
        justification,
        status: "ACTIVE",
      },
      { merge: true }
    );

    // Log the emergency action
    await logEmergencyAction(
      "emergencyEnablePayments",
      emergencyTeamMemberUid,
      "enable_payments",
      {
        incidentId,
        resolution,
        justification,
        sessionId: request.auth.token,
      },
      request.rawRequest?.ip,
      request.rawRequest?.headers?.["user-agent"]
    );

    // Send emergency notifications
    await sendEmergencyNotifications("PAYMENTS_ENABLED", {
      incidentId,
      resolution,
      performedBy: emergencyTeamMemberUid,
    });

    return {
      success: true,
      message: "Payment processing enabled successfully",
      incidentId,
    };
  } catch (error) {
    console.error("Error in emergency enable payments:", error);
    throw new HttpsError("internal", "Failed to enable payments");
  }
});

/**
 * Emergency function to create database backup
 */
export const emergencyDatabaseBackup = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const { incidentId, severity, justification } = request.data;
  const emergencyTeamMemberUid = request.auth.uid;

  // Validate input
  if (!incidentId || !severity || !justification) {
    throw new HttpsError(
      "invalid-argument",
      "Missing required fields: incidentId, severity, justification"
    );
  }

  // Verify emergency team member
  const isEmergencyTeamMember = await verifyEmergencyTeamMember(
    emergencyTeamMemberUid
  );
  if (!isEmergencyTeamMember) {
    throw new HttpsError(
      "permission-denied",
      "Only emergency response team members can execute emergency functions"
    );
  }

  try {
    // Create emergency backup
    const backupId = `emergency_backup_${Date.now()}`;

    // In a real implementation, this would trigger a Firebase backup
    // For now, we'll create a backup record
    await getFirestore().collection("emergency_backups").doc(backupId).set({
      backupId,
      incidentId,
      severity,
      createdBy: emergencyTeamMemberUid,
      createdAt: FieldValue.serverTimestamp(),
      status: "IN_PROGRESS",
      justification,
    });

    // Log the emergency action
    await logEmergencyAction(
      "emergencyDatabaseBackup",
      emergencyTeamMemberUid,
      "create_backup",
      {
        incidentId,
        severity,
        justification,
        backupId,
        sessionId: request.auth.token,
      },
      request.rawRequest?.ip,
      request.rawRequest?.headers?.["user-agent"]
    );

    // Send emergency notifications
    await sendEmergencyNotifications("DATABASE_BACKUP_CREATED", {
      incidentId,
      severity,
      performedBy: emergencyTeamMemberUid,
      backupId,
    });

    return {
      success: true,
      message: "Emergency database backup initiated",
      backupId,
      incidentId,
    };
  } catch (error) {
    console.error("Error in emergency database backup:", error);
    throw new HttpsError("internal", "Failed to create emergency backup");
  }
});

/**
 * Get emergency status and recent actions
 */
export const getEmergencyStatus = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const emergencyTeamMemberUid = request.auth.uid;
  const isEmergencyTeamMember = await verifyEmergencyTeamMember(
    emergencyTeamMemberUid
  );

  if (!isEmergencyTeamMember) {
    throw new HttpsError(
      "permission-denied",
      "Only emergency response team members can view emergency status"
    );
  }

  try {
    // Get current emergency status
    const statusDoc = await getFirestore()
      .collection(EMERGENCY_CONFIG.EMERGENCY_STATUS_COLLECTION)
      .doc("current")
      .get();

    // Get recent emergency actions
    const recentActions = await getFirestore()
      .collection(EMERGENCY_CONFIG.EMERGENCY_AUDIT_COLLECTION)
      .orderBy("timestamp", "desc")
      .limit(10)
      .get();

    const actions = recentActions.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return {
      currentStatus: statusDoc.data() || {},
      recentActions: actions,
      emergencyTeamMembers: EMERGENCY_CONFIG.EMERGENCY_RESPONSE_TEAM,
    };
  } catch (error) {
    console.error("Error getting emergency status:", error);
    throw new HttpsError("internal", "Failed to get emergency status");
  }
});

/**
 * Send emergency notifications
 */
async function sendEmergencyNotifications(
  eventType: string,
  details: any
): Promise<void> {
  try {
    // In a real implementation, this would:
    // 1. Send email notifications to emergency response team
    // 2. Send Slack/Teams notifications
    // 3. Send SMS alerts for critical incidents
    // 4. Create tickets in incident management system

    console.log(`Emergency notification: ${eventType}`, details);

    // Create notification record
    await getFirestore().collection("emergency_notifications").add({
      eventType,
      details,
      timestamp: FieldValue.serverTimestamp(),
      status: "sent",
    });
  } catch (error) {
    console.error("Error sending emergency notifications:", error);
  }
}
