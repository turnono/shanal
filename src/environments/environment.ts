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
  recaptchaSiteKey: "",
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
  // Local/dev owner WhatsApp number for wa.me (E.164 without '+')
  ownerWhatsAppNumber: "27658623499",
};
