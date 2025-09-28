# Shanal Cars - Manual Payment Flow Testing Strategy

## 🧪 Testing Phases

### Phase 1: Booking Capture & Firestore Write
- Submit bookings from the public site and verify documents are created with `pending` status.
- Confirm required fields (name, phone, service, date) are stored accurately.
- Check that `ownerNotifiedAt` is empty before Cloud Functions run.

### Phase 2: Owner Notification Delivery
- Deploy Cloud Functions with SendGrid or WhatsApp credentials in staging.
- Trigger bookings and ensure at least one notification channel delivers the alert.
- Inspect Firestore updates to confirm `ownerNotifiedAt` and `updatedAt` are stamped with server timestamps.

### Phase 3: Admin Follow-up Workflow
- Log into the admin dashboard, use the contact shortcuts, and confirm you can reach customers.
- Update bookings to `confirmed` or `cancelled` and verify status changes propagate immediately.
- Re-run scenarios with cancellations or reschedules to ensure `paidAt` is cleared when reverting.

## 🔧 Testing Tools & Commands

### Firebase Emulator Suite (optional)
```bash
# Start local emulators for iterative testing
firebase emulators:start --only functions,firestore,auth
```

### Manual Notification Verification
- **Email**: Inspect SendGrid activity or your inbox for the notification email.
- **WhatsApp/Webhook**: Review webhook logs or the downstream provider dashboard to confirm delivery.
- **Firestore**: Watch the `bookings` collection for the `ownerNotifiedAt` timestamp.

## 📊 Test Scenarios

### 1. Happy Path Testing
- Customer submits a booking.
- Owner receives the notification.
- Admin contacts the customer, collects payment offline, and marks the booking confirmed.

### 2. Error Scenarios
- Notification channel unavailable (SendGrid outage or webhook failure).
- Incorrect contact information supplied by customer.
- Admin marks booking cancelled after failed follow-up.

### 3. Edge Cases
- Duplicate bookings for the same date and service.
- Customer reschedules (admin updates notes and booking date).
- Notifications configured for both email and WhatsApp fire simultaneously.

## 🚨 Monitoring & Alerts

### Critical Metrics
- Notification success rate.
- Number of bookings remaining in `pending` status beyond agreed SLA.
- Cloud Function execution duration and error rate.
- Firestore write failures.

### Alert Thresholds
- Notification failure rate > 5%.
- Pending bookings older than 24 hours without follow-up.
- Function timeout rate > 1%.
- Database connection errors.

## 🔄 Rollback Procedures

### Immediate Rollback
1. Pause notification triggers if they repeatedly fail.
2. Communicate with the team to handle follow-up manually via existing contact lists.
3. Track pending bookings in a shared spreadsheet until automation is restored.
4. Resume Cloud Functions after credentials or provider issues are resolved.

### Data Recovery
1. Export booking data from Firestore for audit.
2. Verify payment commitments recorded during manual calls.
3. Reconcile notes in the admin dashboard with external records.
4. Update booking statuses manually once outstanding payments are confirmed.
