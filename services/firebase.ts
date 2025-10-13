// fix: Use namespace import for firebase/app to fix module resolution errors.
import * as firebaseApp from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';

const firebaseConfig = {
  // fix: Use process.env to access environment variables to resolve TypeScript error.
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  // fix: Use process.env to access environment variables to resolve TypeScript error.
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  // fix: Use process.env to access environment variables to resolve TypeScript error.
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  // fix: Use process.env to access environment variables to resolve TypeScript error.
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  // fix: Use process.env to access environment variables to resolve TypeScript error.
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  // fix: Use process.env to access environment variables to resolve TypeScript error.
  appId: process.env.VITE_FIREBASE_APP_ID,
};

let app: firebaseApp.FirebaseApp;
let db: Firestore | null = null;

// Check if all necessary config values are provided
const isConfigValid = Object.values(firebaseConfig).every(value => value);

if (isConfigValid) {
  try {
    app = firebaseApp.initializeApp(firebaseConfig);
    db = getFirestore(app);
  } catch (error) {
    console.error("Error initializing Firebase:", error);
  }
} else {
  console.warn("Configuración de Firebase incompleta. La persistencia de datos está deshabilitada. Revisa tus variables de entorno.");
}

export { db };
