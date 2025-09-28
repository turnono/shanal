# Security Configuration Guide

## 🔐 Super Admin Enforcement

### Environment Variables Required

```bash
# Super Admin Configuration
SUPER_ADMIN_UIDS=uid1,uid2,uid3  # Comma-separated list of designated Super Admin UIDs
EMERGENCY_RESPONSE_TEAM=uid1,uid2,uid3  # Emergency response team UIDs
```

### Firebase Authentication Custom Claims Structure

```typescript
interface CustomClaims {
  admin: boolean;
  role: "super_admin" | "admin" | "manager" | "viewer";
  permissions: string[];
  emergency_access?: boolean; // Only for emergency response team
  assignedAt: number;
  assignedBy: string;
  approvedBy: string;
  approvedAt: number;
}
```

### Super Admin Workflow

1. **Role Assignment Request**

   - Admin/Manager requests role assignment via `requestRoleAssignment`
   - Request stored in `pending_role_assignments` collection
   - Super Admins notified automatically

2. **Super Admin Approval**

   - Super Admin reviews request via `getPendingRoleRequests`
   - Approves/rejects via `approveRoleAssignment`
   - All actions logged in `super_admin_audit_logs`

3. **Audit Trail**
   - Every Super Admin action logged with integrity hash
   - IP address, user agent, and session tracking
   - Cryptographic verification of log integrity

## 🛡️ Security Scan Integration

### GitHub Actions Workflow

The security scan integration includes:

1. **Multi-Tool Scanning**

   - **Trivy**: Filesystem and container vulnerability scanning
   - **Snyk**: Dependency vulnerability scanning
   - **OWASP Dependency Check**: Comprehensive dependency analysis

2. **Automated Issue Creation**

   - Critical vulnerabilities automatically create GitHub issues
   - Issues tagged with `security`, `critical`, `vulnerability` labels
   - Detailed scan results and remediation steps included

3. **Deployment Blocking**

   - Critical security issues block deployments
   - High-severity issues require manual approval
   - Security gate prevents vulnerable code from reaching production

4. **Notification System**
   - Slack notifications for security alerts
   - Email notifications to security team
   - Dashboard updates with scan trends

### Security Scan Results Processing

```yaml
# Example security report structure
{
  "timestamp": "2024-01-15T10:30:00Z",
  "status": "CRITICAL|HIGH|PASS",
  "critical_issues": 2,
  "high_issues": 5,
  "scans":
    {
      "trivy": { "critical": 1, "high": 2 },
      "snyk": { "critical": 1, "high": 2 },
      "owasp": { "critical": 0, "high": 1 },
    },
}
```

## 🚨 Emergency Function Security

### Emergency Response Team Configuration

```bash
# Emergency Response Team UIDs
EMERGENCY_RESPONSE_TEAM=uid1,uid2,uid3
```

### Emergency Function Access Control

1. **Authentication Requirements**

   - User must be authenticated
   - UID must be in `EMERGENCY_RESPONSE_TEAM` environment variable
   - User must have `super_admin` role with `emergency_access: true`

2. **Rate Limiting**

   - Maximum 5 emergency function calls per hour
   - Maximum 20 emergency function calls per day
   - Prevents abuse and accidental multiple executions

3. **Audit Logging**
   - Every emergency action logged with comprehensive details
   - IP address, user agent, and session tracking
   - Cryptographic integrity hashing for log verification

### Emergency Functions Available

1. **`emergencyDisablePayments`**

   - Disables all payment processing
   - Suspends pending payments
   - Requires: `incidentId`, `severity`, `justification`

2. **`emergencyEnablePayments`**

   - Re-enables payment processing
   - Requires: `incidentId`, `resolution`, `justification`

3. **`emergencyDatabaseBackup`**

   - Creates emergency database backup
   - Requires: `incidentId`, `severity`, `justification`

4. **`getEmergencyStatus`**
   - Views current emergency status
   - Shows recent emergency actions
   - Lists emergency team members

### Emergency Function Usage Example

```typescript
// Disable payments during security incident
const result = await emergencyDisablePayments({
  incidentId: "SEC-2024-001",
  severity: "P0",
  justification: "Suspected payment system compromise",
});

// Re-enable payments after resolution
const result = await emergencyEnablePayments({
  incidentId: "SEC-2024-001",
  resolution: "Security patch applied, system verified",
  justification: "Incident resolved, payments safe to resume",
});
```

## 🔍 Monitoring and Alerting

### Security Event Monitoring

1. **Real-time Alerts**

   - Failed authentication attempts
   - Unauthorized access attempts
   - Emergency function executions
   - Super Admin role changes

2. **Audit Log Analysis**

   - Automated analysis of audit logs
   - Anomaly detection for suspicious activities
   - Compliance reporting

3. **Incident Response Integration**
   - Automatic incident creation for security events
   - Integration with incident management systems
   - Escalation procedures for critical events

### Security Metrics Dashboard

- **Authentication Metrics**: Login attempts, failures, success rates
- **Authorization Metrics**: Permission checks, role assignments, access denials
- **Emergency Metrics**: Emergency function usage, response times, incident resolution
- **Audit Metrics**: Log volume, integrity checks, compliance status

## 🛠️ Implementation Checklist

### Phase 1: Basic Security Setup

- [ ] Configure environment variables for Super Admin UIDs
- [ ] Set up emergency response team UIDs
- [ ] Deploy security functions to Firebase
- [ ] Configure Firebase Authentication custom claims

### Phase 2: Security Scanning

- [ ] Set up GitHub Actions security workflow
- [ ] Configure Snyk token and Trivy scanning
- [ ] Set up Slack webhook for security notifications
- [ ] Test security scan integration

### Phase 3: Emergency Response

- [ ] Configure emergency response team
- [ ] Test emergency functions in staging
- [ ] Set up emergency notification system
- [ ] Create incident response procedures

### Phase 4: Monitoring and Compliance

- [ ] Set up security monitoring dashboard
- [ ] Configure audit log analysis
- [ ] Implement compliance reporting
- [ ] Train team on security procedures

## 🔒 Security Best Practices

1. **Principle of Least Privilege**

   - Users only get minimum required permissions
   - Regular permission reviews and audits
   - Automatic permission expiration

2. **Defense in Depth**

   - Multiple layers of security controls
   - Fail-safe defaults
   - Comprehensive logging and monitoring

3. **Incident Response**

   - Clear incident response procedures
   - Regular security drills and testing
   - Post-incident analysis and improvement

4. **Compliance and Auditing**
   - Regular security assessments
   - Compliance with industry standards
   - Transparent audit trails

## 📞 Emergency Contacts

- **Security Team**: security@shanalcars.com
- **Emergency Response**: +230-XXX-XXXX
- **Incident Management**: incidents@shanalcars.com

## 🔄 Regular Security Tasks

### Daily

- Review security alerts and notifications
- Check emergency function audit logs
- Monitor authentication metrics

### Weekly

- Review pending role assignment requests
- Analyze security scan results
- Update security documentation

### Monthly

- Conduct security assessment
- Review and update emergency response procedures
- Train team on security best practices

### Quarterly

- Full security audit and penetration testing
- Review and update security policies
- Emergency response drill and testing
