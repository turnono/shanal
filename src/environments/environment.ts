export const environment = {
  production: false,
  firebase: {
    apiKey: "AIzaSyBfCXzGoOWJmYhbkDIssX-2F3YSt3onhi4",
    authDomain: "shanal.firebaseapp.com",
    projectId: "shanal",
    storageBucket: "shanal.firebasestorage.app",
    messagingSenderId: "695845474792",
    appId: "1:695845474792:web:c931691f9b34ef6dbf545d",
    measurementId: "G-BJ4K4H91DD",
  },
  stripe: {
    publishableKey: "your-stripe-publishable-key",
  },
  useEmulators: true,
  emulatorConfig: {
    firestore: {
      host: "127.0.0.1",
      port: 8081,
    },
    auth: {
      host: "127.0.0.1",
      port: 9099,
    },
    functions: {
      host: "127.0.0.1",
      port: 5001,
    },
  },
};
