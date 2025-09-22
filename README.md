# Shanal Cars - Online Booking and Admin System

A comprehensive car rental and tour booking system for Mauritius, built with Angular and Firebase.

## Features

### Customer-Facing Website

- **Service Display**: Showcase car rental, sightseeing tours, catamaran trips, Ile Aux Cerfs island trips, and airport transfers
- **Booking Form**: Easy-to-use booking forms for each service
- **Mobile Responsive**: Clean, modern design that works on all devices
- **Real-time Updates**: Instant booking confirmation

### Admin Dashboard

- **Secure Access**: Protected admin area with Firebase Authentication
- **Booking Management**: View and manage all booking requests
- **Payment Integration**: Generate Stripe payment links for customers
- **Real-time Updates**: Live dashboard updates when payments are confirmed
- **Status Tracking**: Track bookings from pending to confirmed

### Automated Business Logic

- **Payment Link Generation**: Automatic Stripe payment link creation for new bookings
- **Payment Confirmation**: Webhook integration to update booking status after successful payment
- **Email Notifications**: Automated confirmation emails (configurable)

## Tech Stack

- **Frontend**: Angular 17 (Standalone Components)
- **Backend**: Firebase (Firestore, Cloud Functions, Authentication, Hosting)
- **Payment Processing**: Stripe
- **Styling**: SCSS with modern design system
- **Deployment**: Firebase Hosting

## Prerequisites

Before you begin, ensure you have the following installed:

- Node.js (v18 or higher)
- npm or yarn
- Firebase CLI
- Git

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd shanal-cars-booking
```

### 2. Install Dependencies

```bash
# Install Angular dependencies
npm install

# Install Firebase Functions dependencies
cd functions
npm install
cd ..
```

### 3. Firebase Setup

#### Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable the following services:
   - Authentication (Email/Password)
   - Firestore Database
   - Cloud Functions
   - Hosting

#### Configure Firebase

1. Install Firebase CLI if you haven't already:

   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:

   ```bash
   firebase login
   ```

3. Initialize Firebase in your project:

   ```bash
   firebase init
   ```

   Select the following services:

   - Firestore
   - Functions
   - Hosting

4. Update your Firebase configuration in `src/environments/environment.ts`:
   ```typescript
   export const environment = {
     production: false,
     firebase: {
       apiKey: "your-api-key",
       authDomain: "your-project.firebaseapp.com",
       projectId: "your-project-id",
       storageBucket: "your-project.appspot.com",
       messagingSenderId: "123456789",
       appId: "your-app-id",
     },
     stripe: {
       publishableKey: "your-stripe-publishable-key",
     },
   };
   ```

### 4. Stripe Setup

#### Create a Stripe Account

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Create an account or login
3. Get your API keys from the Developers section

#### Configure Stripe

1. Set your Stripe configuration in Firebase Functions:

   ```bash
   firebase functions:config:set stripe.secret_key="sk_test_your_secret_key"
   firebase functions:config:set stripe.webhook_secret="whsec_your_webhook_secret"
   firebase functions:config:set app.base_url="https://your-project.web.app"
   ```

2. Update the Stripe publishable key in your environment files

### 5. Create Admin User

1. Go to Firebase Console > Authentication
2. Add a new user with email/password
3. Set custom claims for admin access:
   ```javascript
   // Run this in Firebase Console > Functions > Cloud Shell
   admin.auth().setCustomUserClaims(userId, { admin: true });
   ```

### 6. Deploy the Application

#### Deploy Firebase Functions

```bash
cd functions
npm run build
cd ..
firebase deploy --only functions
```

#### Deploy Firestore Rules

```bash
firebase deploy --only firestore:rules
```

#### Build and Deploy Frontend

```bash
# Build the Angular app
npm run build

# Deploy to Firebase Hosting
firebase deploy --only hosting
```

### 7. Configure Stripe Webhooks

1. In your Stripe Dashboard, go to Webhooks
2. Add a new webhook endpoint: `https://your-region-your-project.cloudfunctions.net/handleStripeWebhook`
3. Select these events:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
4. Copy the webhook secret and update your Firebase Functions config

## Development

### Running Locally

1. Start the Angular development server:

   ```bash
   npm start
   ```

2. Start Firebase emulators (optional):

   ```bash
   firebase emulators:start
   ```

3. Access the application at `http://localhost:4200`

### Project Structure

```
src/
├── app/
│   ├── components/
│   │   ├── home/                 # Customer-facing website
│   │   └── admin-dashboard/      # Admin dashboard
│   ├── services/
│   │   ├── auth.service.ts       # Authentication service
│   │   ├── booking.service.ts    # Booking management
│   │   └── services.service.ts   # Service definitions
│   ├── models/
│   │   └── booking.model.ts      # Data models
│   ├── guards/
│   │   └── auth.guard.ts         # Route protection
│   └── app.component.ts          # Main app component
├── environments/                 # Environment configurations
└── styles.scss                   # Global styles

functions/
├── src/
│   └── index.ts                  # Cloud Functions
└── package.json                  # Functions dependencies
```

## Business Flow

1. **Customer Booking**: Customer visits website and submits booking form
2. **Data Storage**: Booking is saved to Firestore with 'pending' status
3. **Payment Link Generation**: Cloud Function automatically generates Stripe payment link
4. **Admin Notification**: Admin sees new booking in dashboard
5. **Payment Processing**: Admin sends payment link to customer via WhatsApp
6. **Payment Confirmation**: Stripe webhook updates booking status to 'confirmed'
7. **Final Confirmation**: Admin sends final confirmation to customer

## Customization

### Adding New Services

1. Update the services array in `src/app/services/services.service.ts`
2. Add corresponding pricing in `functions/src/index.ts`
3. Update the service icons in the home component

### Styling

- Global styles: `src/styles.scss`
- Component styles: Individual `.scss` files in component directories
- Design system variables are defined at the top of each SCSS file

### Configuration

- Environment variables: `src/environments/`
- Firebase config: `firebase.json`
- Firestore rules: `firestore.rules`

## Security

- Firebase Authentication for admin access
- Firestore security rules for data protection
- Stripe webhook signature verification
- Input validation and sanitization

## Support

For support or questions, please contact the development team or create an issue in the repository.

## License

This project is proprietary software developed for Shanal Cars, Mauritius.
