# Shanal Cars - Payment Flow Testing Strategy

## 🧪 Testing Phases

### Phase 1: Stripe Test Mode Integration

- **Test Cards**: Use Stripe's test card numbers
- **Webhook Testing**: Use Stripe CLI for local webhook testing
- **Payment Links**: Test with $1 amounts in test mode

### Phase 2: Production Simulation

- **Staging Environment**: Mirror production setup
- **Real Payment Links**: Generate with test amounts
- **Webhook Validation**: Test with real Stripe webhooks

### Phase 3: Production Validation

- **Small Transactions**: Start with minimal amounts
- **Monitoring**: Real-time error tracking
- **Rollback Plan**: Quick revert capability

## 🔧 Testing Tools & Commands

### Stripe CLI Setup

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhooks to local emulator
stripe listen --forward-to localhost:5001/shanal/us-central1/handleStripeWebhook
```

### Test Card Numbers

- **Success**: 4242 4242 4242 4242
- **Decline**: 4000 0000 0000 0002
- **3D Secure**: 4000 0025 0000 3155

## 📊 Test Scenarios

### 1. Happy Path Testing

- Customer creates booking
- Payment link generated
- Customer completes payment
- Webhook received and processed
- Booking status updated to 'confirmed'

### 2. Error Scenarios

- Payment declined
- Webhook timeout
- Network failures
- Invalid webhook signatures

### 3. Edge Cases

- Duplicate payments
- Partial payments
- Refund processing
- Currency conversion

## 🚨 Monitoring & Alerts

### Critical Metrics

- Payment success rate
- Webhook processing time
- Function execution duration
- Error rates by function

### Alert Thresholds

- Payment failure rate > 5%
- Webhook processing time > 30s
- Function timeout rate > 1%
- Database connection errors

## 🔄 Rollback Procedures

### Immediate Rollback

1. Disable payment link generation
2. Switch to manual payment processing
3. Notify customers of temporary issues
4. Process pending payments manually

### Data Recovery

1. Export booking data
2. Verify payment statuses
3. Reconcile with Stripe dashboard
4. Update booking statuses manually
