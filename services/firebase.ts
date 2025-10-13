// fix: Use namespace import for firebase/app to fix module resolution errors.
import * as firebaseApp from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';

const firebaseConfig = {
  // Fix: Use import.meta.env for Vite environment variables
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
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
