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
- **Manual Payment Coordination**: Tools to contact customers and update booking status after collecting payment offline
- **Real-time Updates**: Live dashboard updates when bookings are confirmed or cancelled
- **Status Tracking**: Track bookings from pending to confirmed or cancelled

### Automated Business Logic

- **Owner Notifications**: Automatic alerts when new bookings arrive so the team can reach out for manual payment
- **Status Automation**: Booking follow-up timestamps to track outreach to customers

## Tech Stack

- **Frontend**: Angular 17 (Standalone Components)
- **Backend**: Firebase (Firestore, Cloud Functions, Authentication, Hosting)
- **Notifications**: SendGrid (email) or WhatsApp webhook (configurable)
- **Styling**: SCSS with modern design system
- **Deployment**: Firebase Hosting

## Prerequisites

Before you begin, ensure you have the following installed:

- Node.js (v18 or higher; v22 required for Cloud Functions runtime)
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
   When you are ready for production, set `useEmulators` to `false` in `environment.prod.ts` and provide your real `recaptchaSiteKey`.

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
     recaptchaSiteKey: "", // leave blank locally to disable App Check
     useEmulators: true,
     emulatorConfig: {
       firestore: { host: "127.0.0.1", port: 8081 },
       auth: { host: "127.0.0.1", port: 9099 },
       functions: { host: "127.0.0.1", port: 5001 },
     },
   };
   ```

### 4. Manual Payment & Notification Setup

Because payments are collected offline, configure at least one notification channel so the owner knows when a new booking arrives.

#### Option A: Email via SendGrid

1. Create a [SendGrid](https://sendgrid.com/) account and generate an API key.
2. Set the following Firebase environment variables for Cloud Functions:

   ```bash
   firebase functions:config:set SENDGRID_API_KEY="YOUR_SENDGRID_API_KEY"
   firebase functions:config:set NOTIFICATION_EMAIL_TO="owner@example.com"
   firebase functions:config:set NOTIFICATION_EMAIL_FROM="bookings@example.com"
   ```

3. Mirror these values in your hosting configuration (for example using `.env` files) if you deploy with CI/CD.

#### Option B: WhatsApp or Custom Webhook

1. Provide a webhook endpoint that can deliver WhatsApp or SMS alerts.
2. Configure the webhook details:

   ```bash
   firebase functions:config:set WHATSAPP_WEBHOOK_URL="https://your-webhook"
   firebase functions:config:set WHATSAPP_API_TOKEN="YOUR_BEARER_TOKEN"
   firebase functions:config:set OWNER_WHATSAPP_NUMBER="2301234567"
   ```

Cloud Functions will try email first and then fall back to the WhatsApp webhook. If neither channel is configured the function will log an error so you can add credentials.

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

### 7. Test Booking Notifications

1. Deploy the latest Cloud Functions with your notification environment variables configured.
2. Submit a test booking from the public site and verify that the owner receives the email or WhatsApp alert.
3. Log into the admin dashboard, contact the customer, and update the booking status manually.

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
3. **Owner Notification**: Cloud Function notifies the owner via email or WhatsApp
4. **Manual Payment Coordination**: Admin contacts the customer to arrange cash, EFT, or mobile wallet payment
5. **Status Update**: Admin updates the booking to confirmed or cancelled in the dashboard
6. **Final Confirmation**: Admin sends a confirmation message to the customer once payment is arranged

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
- Owner notification audit trail via Firestore timestamps
- Input validation and sanitization

## Support

For support or questions, please contact the development team or create an issue in the repository.

## License

This project is proprietary software developed for Shanal Cars, Mauritius.
