import { onCall } from "firebase-functions/v2/https";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

/**
 * Admin Management System for Shanal Cars
 * Handles user roles, permissions, and access control
 */

// Admin role definitions
export enum AdminRole {
  SUPER_ADMIN = "super_admin",
  ADMIN = "admin",
  MANAGER = "manager",
  VIEWER = "viewer",
}

// Permission definitions
export enum Permission {
  // Booking management
  VIEW_BOOKINGS = "view_bookings",
  EDIT_BOOKINGS = "edit_bookings",
  DELETE_BOOKINGS = "delete_bookings",
  CONFIRM_BOOKINGS = "confirm_bookings",

  // Payment management
  VIEW_PAYMENTS = "view_payments",
  PROCESS_PAYMENTS = "process_payments",
  GENERATE_PAYMENT_LINKS = "generate_payment_links",

  // User management
  VIEW_USERS = "view_users",
  MANAGE_USERS = "manage_users",
  ASSIGN_ROLES = "assign_roles",

  // System management
  VIEW_ANALYTICS = "view_analytics",
  MANAGE_SYSTEM = "manage_system",
  VIEW_LOGS = "view_logs",
}

// Role-based permissions mapping
const ROLE_PERMISSIONS: Record<AdminRole, Permission[]> = {
  [AdminRole.SUPER_ADMIN]: [
    Permission.VIEW_BOOKINGS,
    Permission.EDIT_BOOKINGS,
    Permission.DELETE_BOOKINGS,
    Permission.CONFIRM_BOOKINGS,
    Permission.VIEW_PAYMENTS,
    Permission.PROCESS_PAYMENTS,
    Permission.GENERATE_PAYMENT_LINKS,
    Permission.VIEW_USERS,
    Permission.MANAGE_USERS,
    Permission.ASSIGN_ROLES,
    Permission.VIEW_ANALYTICS,
    Permission.MANAGE_SYSTEM,
    Permission.VIEW_LOGS,
  ],
  [AdminRole.ADMIN]: [
    Permission.VIEW_BOOKINGS,
    Permission.EDIT_BOOKINGS,
    Permission.CONFIRM_BOOKINGS,
    Permission.VIEW_PAYMENTS,
    Permission.PROCESS_PAYMENTS,
    Permission.GENERATE_PAYMENT_LINKS,
    Permission.VIEW_USERS,
    Permission.VIEW_ANALYTICS,
  ],
  [AdminRole.MANAGER]: [
    Permission.VIEW_BOOKINGS,
    Permission.EDIT_BOOKINGS,
    Permission.CONFIRM_BOOKINGS,
    Permission.VIEW_PAYMENTS,
    Permission.VIEW_ANALYTICS,
  ],
  [AdminRole.VIEWER]: [
    Permission.VIEW_BOOKINGS,
    Permission.VIEW_PAYMENTS,
    Permission.VIEW_ANALYTICS,
  ],
};

/**
 * Set admin role for a user
 */
export const setAdminRole = onCall(async (request) => {
  // Verify the caller is authenticated and has permission to assign roles
  if (!request.auth) {
    throw new Error("User must be authenticated");
  }

  const { targetUid, role } = request.data;

  if (!targetUid || !role) {
    throw new Error("targetUid and role are required");
  }

  if (!Object.values(AdminRole).includes(role)) {
    throw new Error("Invalid role specified");
  }

  // Check if caller has permission to assign roles
  const callerToken = await getAuth().verifyIdToken(
    request.auth.token as unknown as string
  );
  if (!callerToken.admin || callerToken.role !== AdminRole.SUPER_ADMIN) {
    throw new Error("Insufficient permissions to assign roles");
  }

  try {
    // Set custom claims for the target user
    await getAuth().setCustomUserClaims(targetUid, {
      admin: true,
      role: role,
      permissions: ROLE_PERMISSIONS[role as AdminRole],
    });

    // Log the role assignment
    await getFirestore().collection("admin_logs").add({
      action: "role_assigned",
      targetUid: targetUid,
      role: role,
      assignedBy: request.auth.uid,
      timestamp: FieldValue.serverTimestamp(),
    });

    return { success: true, message: `Role ${role} assigned successfully` };
  } catch (error) {
    console.error("Error setting admin role:", error);
    throw new Error("Failed to set admin role");
  }
});

/**
 * Remove admin role from a user
 */
export const removeAdminRole = onCall(async (request) => {
  if (!request.auth) {
    throw new Error("User must be authenticated");
  }

  const { targetUid } = request.data;

  if (!targetUid) {
    throw new Error("targetUid is required");
  }

  // Check if caller has permission to remove roles
  const callerToken = await getAuth().verifyIdToken(
    request.auth.token as unknown as string
  );
  if (!callerToken.admin || callerToken.role !== AdminRole.SUPER_ADMIN) {
    throw new Error("Insufficient permissions to remove roles");
  }

  try {
    // Remove custom claims
    await getAuth().setCustomUserClaims(targetUid, {
      admin: false,
      role: null,
      permissions: [],
    });

    // Log the role removal
    await getFirestore().collection("admin_logs").add({
      action: "role_removed",
      targetUid: targetUid,
      removedBy: request.auth.uid,
      timestamp: FieldValue.serverTimestamp(),
    });

    return { success: true, message: "Admin role removed successfully" };
  } catch (error) {
    console.error("Error removing admin role:", error);
    throw new Error("Failed to remove admin role");
  }
});

/**
 * Get user permissions
 */
export const getUserPermissions = onCall(async (request) => {
  if (!request.auth) {
    throw new Error("User must be authenticated");
  }

  const uid = request.auth.uid;

  try {
    const userRecord = await getAuth().getUser(uid);
    const customClaims = userRecord.customClaims || {};

    return {
      uid: uid,
      admin: customClaims.admin || false,
      role: customClaims.role || null,
      permissions: customClaims.permissions || [],
    };
  } catch (error) {
    console.error("Error getting user permissions:", error);
    throw new Error("Failed to get user permissions");
  }
});

/**
 * List all admin users
 */
export const listAdminUsers = onCall(async (request) => {
  if (!request.auth) {
    throw new Error("User must be authenticated");
  }

  // Check if caller has permission to view users
  const callerToken = await getAuth().verifyIdToken(
    request.auth.token as unknown as string
  );
  if (!callerToken.admin) {
    throw new Error("Insufficient permissions to view admin users");
  }

  try {
    const users = await getAuth().listUsers();
    const adminUsers = users.users
      .filter((user) => user.customClaims?.admin)
      .map((user) => ({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        role: user.customClaims?.role || null,
        permissions: user.customClaims?.permissions || [],
        lastSignIn: user.metadata.lastSignInTime,
        createdAt: user.metadata.creationTime,
      }));

    return { adminUsers };
  } catch (error) {
    console.error("Error listing admin users:", error);
    throw new Error("Failed to list admin users");
  }
});

/**
 * Check if user has specific permission
 */
export function hasPermission(
  userClaims: any,
  permission: Permission
): boolean {
  if (!userClaims?.admin) return false;
  return userClaims.permissions?.includes(permission) || false;
}
