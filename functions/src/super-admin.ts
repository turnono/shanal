import { onCall } from "firebase-functions/v2/https";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";

/**
 * Super Admin Enforcement System
 * Ensures only designated Super Admins can perform critical operations
 */

// Super Admin configuration
const SUPER_ADMIN_CONFIG = {
  // List of designated Super Admin UIDs (should be set via environment variables)
  DESIGNATED_SUPER_ADMINS: process.env.SUPER_ADMIN_UIDS?.split(",") || [],
  // Minimum number of Super Admins required for certain operations
  MIN_SUPER_ADMINS_FOR_CRITICAL_OPS: 2,
  // Audit log collection
  AUDIT_COLLECTION: "super_admin_audit_logs",
  // Role assignment collection
  ROLE_ASSIGNMENT_COLLECTION: "pending_role_assignments",
};

/**
 * Verify if a user is a designated Super Admin
 */
async function verifySuperAdmin(uid: string): Promise<boolean> {
  try {
    // Check if UID is in the designated list
    if (!SUPER_ADMIN_CONFIG.DESIGNATED_SUPER_ADMINS.includes(uid)) {
      return false;
    }

    // Verify user exists and has Super Admin claims
    const userRecord = await getAuth().getUser(uid);
    const customClaims = userRecord.customClaims || {};

    return customClaims.admin === true && customClaims.role === "super_admin";
  } catch (error) {
    console.error("Error verifying Super Admin:", error);
    return false;
  }
}

/**
 * Log Super Admin action with comprehensive audit trail
 */
async function logSuperAdminAction(
  action: string,
  performedBy: string,
  details: any,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  try {
    await getFirestore()
      .collection(SUPER_ADMIN_CONFIG.AUDIT_COLLECTION)
      .add({
        action,
        performedBy,
        details,
        timestamp: FieldValue.serverTimestamp(),
        ipAddress: ipAddress || "unknown",
        userAgent: userAgent || "unknown",
        sessionId: details.sessionId || "unknown",
        // Add cryptographic hash for integrity verification
        integrityHash: await generateIntegrityHash(
          action,
          performedBy,
          details
        ),
      });
  } catch (error) {
    console.error("Error logging Super Admin action:", error);
    throw new HttpsError("internal", "Failed to log Super Admin action");
  }
}

/**
 * Generate integrity hash for audit log verification
 */
async function generateIntegrityHash(
  action: string,
  performedBy: string,
  details: any
): Promise<string> {
  const crypto = require("crypto");
  const data = `${action}:${performedBy}:${JSON.stringify(
    details
  )}:${Date.now()}`;
  return crypto.createHash("sha256").update(data).digest("hex");
}

/**
 * Request Super Admin approval for role assignment
 */
export const requestRoleAssignment = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const { targetUid, role, businessJustification, managerApproval } =
    request.data;
  const requesterUid = request.auth.uid;

  // Validate input
  if (!targetUid || !role || !businessJustification) {
    throw new HttpsError("invalid-argument", "Missing required fields");
  }

  // Check if requester has permission to request role assignments
  const requesterRecord = await getAuth().getUser(requesterUid);
  const requesterClaims = requesterRecord.customClaims || {};

  if (
    !requesterClaims.admin ||
    !["super_admin", "admin"].includes(requesterClaims.role)
  ) {
    throw new HttpsError(
      "permission-denied",
      "Insufficient permissions to request role assignments"
    );
  }

  try {
    // Create pending role assignment request
    const requestId = await getFirestore()
      .collection(SUPER_ADMIN_CONFIG.ROLE_ASSIGNMENT_COLLECTION)
      .add({
        targetUid,
        role,
        businessJustification,
        managerApproval: managerApproval || false,
        requestedBy: requesterUid,
        status: "pending_super_admin_approval",
        createdAt: FieldValue.serverTimestamp(),
        // Add approval workflow
        approvalWorkflow: {
          requiresSuperAdminApproval: true,
          approvedBy: null,
          approvedAt: null,
          rejectionReason: null,
        },
        // Add security context
        securityContext: {
          ipAddress: request.rawRequest?.ip || "unknown",
          userAgent: request.rawRequest?.headers?.["user-agent"] || "unknown",
          sessionId: request.auth.token || "unknown",
        },
      });

    // Log the request
    await logSuperAdminAction(
      "role_assignment_requested",
      requesterUid,
      {
        requestId: requestId.id,
        targetUid,
        role,
        businessJustification,
        managerApproval,
      },
      request.rawRequest?.ip,
      request.rawRequest?.headers?.["user-agent"]
    );

    // Notify Super Admins (in a real implementation, this would send notifications)
    await notifySuperAdminsOfPendingRequest(requestId.id, targetUid, role);

    return {
      success: true,
      requestId: requestId.id,
      message: "Role assignment request submitted for Super Admin approval",
    };
  } catch (error) {
    console.error("Error requesting role assignment:", error);
    throw new HttpsError("internal", "Failed to request role assignment");
  }
});

/**
 * Super Admin approves or rejects role assignment
 */
export const approveRoleAssignment = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const { requestId, action, reason } = request.data; // action: "approve" or "reject"
  const superAdminUid = request.auth.uid;

  // Verify Super Admin status
  const isSuperAdmin = await verifySuperAdmin(superAdminUid);
  if (!isSuperAdmin) {
    throw new HttpsError(
      "permission-denied",
      "Only designated Super Admins can approve role assignments"
    );
  }

  try {
    // Get the pending request
    const requestDoc = await getFirestore()
      .collection(SUPER_ADMIN_CONFIG.ROLE_ASSIGNMENT_COLLECTION)
      .doc(requestId)
      .get();

    if (!requestDoc.exists) {
      throw new HttpsError("not-found", "Role assignment request not found");
    }

    const requestData = requestDoc.data();
    if (requestData?.status !== "pending_super_admin_approval") {
      throw new HttpsError(
        "failed-precondition",
        "Request is not pending approval"
      );
    }

    if (action === "approve") {
      // Approve the role assignment
      await getAuth().setCustomUserClaims(requestData.targetUid, {
        admin: true,
        role: requestData.role,
        permissions: getRolePermissions(requestData.role),
        assignedAt: Date.now(),
        assignedBy: superAdminUid,
        approvedBy: superAdminUid,
        approvedAt: Date.now(),
      });

      // Update request status
      await requestDoc.ref.update({
        status: "approved",
        approvedBy: superAdminUid,
        approvedAt: FieldValue.serverTimestamp(),
        approvalReason: reason || "Approved by Super Admin",
      });

      // Log the approval
      await logSuperAdminAction(
        "role_assignment_approved",
        superAdminUid,
        {
          requestId,
          targetUid: requestData.targetUid,
          role: requestData.role,
          reason,
        },
        request.rawRequest?.ip,
        request.rawRequest?.headers?.["user-agent"]
      );

      return {
        success: true,
        message: "Role assignment approved and applied",
      };
    } else if (action === "reject") {
      // Reject the role assignment
      await requestDoc.ref.update({
        status: "rejected",
        rejectedBy: superAdminUid,
        rejectedAt: FieldValue.serverTimestamp(),
        rejectionReason: reason || "Rejected by Super Admin",
      });

      // Log the rejection
      await logSuperAdminAction(
        "role_assignment_rejected",
        superAdminUid,
        {
          requestId,
          targetUid: requestData.targetUid,
          role: requestData.role,
          reason,
        },
        request.rawRequest?.ip,
        request.rawRequest?.headers?.["user-agent"]
      );

      return {
        success: true,
        message: "Role assignment rejected",
      };
    } else {
      throw new HttpsError(
        "invalid-argument",
        "Invalid action. Must be 'approve' or 'reject'"
      );
    }
  } catch (error) {
    console.error("Error processing role assignment approval:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError(
      "internal",
      "Failed to process role assignment approval"
    );
  }
});

/**
 * Get permissions for a role
 */
function getRolePermissions(role: string): string[] {
  const rolePermissions: Record<string, string[]> = {
    super_admin: [
      "view_bookings",
      "edit_bookings",
      "delete_bookings",
      "confirm_bookings",
      "view_payments",
      "process_payments",
      "generate_payment_links",
      "view_users",
      "manage_users",
      "assign_roles",
      "view_analytics",
      "manage_system",
      "view_logs",
    ],
    admin: [
      "view_bookings",
      "edit_bookings",
      "confirm_bookings",
      "view_payments",
      "process_payments",
      "generate_payment_links",
      "view_users",
      "view_analytics",
    ],
    manager: [
      "view_bookings",
      "edit_bookings",
      "confirm_bookings",
      "view_payments",
      "view_analytics",
    ],
    viewer: ["view_bookings", "view_payments", "view_analytics"],
  };

  return rolePermissions[role] || [];
}

/**
 * Notify Super Admins of pending requests
 */
async function notifySuperAdminsOfPendingRequest(
  requestId: string,
  targetUid: string,
  role: string
): Promise<void> {
  try {
    // In a real implementation, this would:
    // 1. Send email notifications to all Super Admins
    // 2. Send Slack/Teams notifications
    // 3. Create tickets in project management system

    console.log(
      `Super Admin notification: Role assignment request ${requestId} for ${targetUid} as ${role}`
    );

    // For now, we'll create a notification document
    await getFirestore().collection("super_admin_notifications").add({
      type: "role_assignment_request",
      requestId,
      targetUid,
      role,
      timestamp: FieldValue.serverTimestamp(),
      status: "pending",
    });
  } catch (error) {
    console.error("Error notifying Super Admins:", error);
  }
}

/**
 * Get pending role assignment requests (Super Admin only)
 */
export const getPendingRoleRequests = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const superAdminUid = request.auth.uid;
  const isSuperAdmin = await verifySuperAdmin(superAdminUid);

  if (!isSuperAdmin) {
    throw new HttpsError(
      "permission-denied",
      "Only Super Admins can view pending requests"
    );
  }

  try {
    const pendingRequests = await getFirestore()
      .collection(SUPER_ADMIN_CONFIG.ROLE_ASSIGNMENT_COLLECTION)
      .where("status", "==", "pending_super_admin_approval")
      .orderBy("createdAt", "desc")
      .get();

    const requests = pendingRequests.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return { requests };
  } catch (error) {
    console.error("Error getting pending requests:", error);
    throw new HttpsError("internal", "Failed to get pending requests");
  }
});
