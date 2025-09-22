# Shanal Cars - Secure Admin Onboarding Process

## 🚀 Admin Onboarding Workflow

### Phase 1: Pre-Onboarding Security Verification

1. **Identity Verification**

   - Valid business email address
   - Phone number verification
   - Background check (if required)
   - Signed confidentiality agreement

2. **Access Request Documentation**
   - Business justification for admin access
   - Manager approval
   - Role specification and permissions
   - Duration of access (temporary/permanent)

### Phase 2: Secure Account Creation

1. **Firebase Authentication Setup**

   - Create user account with business email
   - Enable 2FA (Two-Factor Authentication)
   - Set strong password requirements
   - Verify email address

2. **Role Assignment Process**
   - Super Admin reviews and approves
   - Custom claims assigned via secure function
   - Audit log entry created
   - Welcome email with access instructions

### Phase 3: Training & Access Validation

1. **Security Training**

   - Password management best practices
   - Phishing awareness
   - Data handling procedures
   - Incident reporting protocols

2. **System Access Testing**
   - Login verification
   - Permission testing
   - Dashboard navigation
   - Basic operations validation

## 🔧 Technical Implementation

### Admin Onboarding Function

```typescript
// Secure admin creation with multi-step verification
export const createAdminUser = functions.https.onCall(async (data, context) => {
  // Verify caller is Super Admin
  if (!context.auth || !isSuperAdmin(context.auth.uid)) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Super Admin access required"
    );
  }

  const { email, role, businessJustification, managerApproval } = data;

  // Validate business justification
  if (!businessJustification || businessJustification.length < 50) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Business justification required"
    );
  }

  // Create user with temporary access
  const userRecord = await admin.auth().createUser({
    email: email,
    emailVerified: false,
    disabled: true, // Disabled until verification complete
  });

  // Create onboarding record
  await admin
    .firestore()
    .collection("admin_onboarding")
    .doc(userRecord.uid)
    .set({
      email: email,
      requestedRole: role,
      businessJustification: businessJustification,
      managerApproval: managerApproval,
      status: "pending_verification",
      createdBy: context.auth.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      verificationSteps: {
        emailVerified: false,
        phoneVerified: false,
        trainingCompleted: false,
        accessTested: false,
      },
    });

  // Send verification email
  await sendVerificationEmail(email, userRecord.uid);

  return { success: true, userId: userRecord.uid };
});
```

### Role Assignment with Audit Trail

```typescript
export const assignAdminRole = functions.https.onCall(async (data, context) => {
  const { userId, role, justification } = data;

  // Verify all onboarding steps completed
  const onboardingDoc = await admin
    .firestore()
    .collection("admin_onboarding")
    .doc(userId)
    .get();

  const onboardingData = onboardingDoc.data();
  if (
    !onboardingData ||
    onboardingData.status !== "ready_for_role_assignment"
  ) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "Onboarding not complete"
    );
  }

  // Assign role with custom claims
  await admin.auth().setCustomUserClaims(userId, {
    admin: true,
    role: role,
    permissions: ROLE_PERMISSIONS[role],
    assignedAt: Date.now(),
    assignedBy: context.auth.uid,
  });

  // Enable user account
  await admin.auth().updateUser(userId, { disabled: false });

  // Create comprehensive audit log
  await admin.firestore().collection("admin_audit_log").add({
    action: "role_assigned",
    userId: userId,
    role: role,
    assignedBy: context.auth.uid,
    justification: justification,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    ipAddress: context.rawRequest.ip,
    userAgent: context.rawRequest.headers["user-agent"],
  });

  // Update onboarding status
  await onboardingDoc.ref.update({
    status: "active",
    roleAssigned: role,
    roleAssignedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { success: true };
});
```

## 📋 Onboarding Checklist

### For New Admin

- [ ] Receive and verify business email
- [ ] Complete identity verification
- [ ] Sign confidentiality agreement
- [ ] Complete security training
- [ ] Set up 2FA
- [ ] Test system access
- [ ] Review admin procedures

### For Super Admin

- [ ] Verify business justification
- [ ] Confirm manager approval
- [ ] Review requested permissions
- [ ] Create user account
- [ ] Monitor onboarding progress
- [ ] Assign role after verification
- [ ] Document in audit log

## 🔒 Security Measures

### Access Controls

- **Temporary Access**: New admins start with disabled accounts
- **Progressive Permissions**: Access granted step-by-step
- **Audit Logging**: All actions logged with IP and timestamp
- **Regular Reviews**: Quarterly access reviews

### Verification Steps

1. **Email Verification**: Business email confirmation
2. **Phone Verification**: SMS code verification
3. **Manager Approval**: Direct supervisor confirmation
4. **Training Completion**: Security training certificate
5. **Access Testing**: Functional verification

## 📊 Monitoring & Compliance

### Onboarding Metrics

- Average onboarding time
- Completion rates by step
- Failed verification attempts
- Role assignment accuracy

### Compliance Reporting

- Monthly admin access reports
- Quarterly security reviews
- Annual access audits
- Incident response tracking
