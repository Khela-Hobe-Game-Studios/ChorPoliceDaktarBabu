import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";

// Firebase configuration is provided via Vite env vars. Make sure
// you have a .env file with VITE_FB_* keys set appropriately.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FB_API_KEY as string,
  authDomain: import.meta.env.VITE_FB_AUTH_DOMAIN as string,
  databaseURL: import.meta.env.VITE_FB_DATABASE_URL as string,
  projectId: import.meta.env.VITE_FB_PROJECT_ID as string,
  storageBucket: import.meta.env.VITE_FB_STORAGE_BUCKET as string,
  messagingSenderId: import.meta.env.VITE_FB_MESSAGING_SENDER_ID as string,
  appId: import.meta.env.VITE_FB_APP_ID as string,
};

export const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);

// Optional: Firebase Analytics (works on HTTPS or localhost only)
export let analytics: Analytics | undefined;
const measurementId = import.meta.env.VITE_FB_MEASUREMENT_ID as string | undefined;
if (typeof window !== "undefined" && measurementId) {
  // Only attempt if environment supports analytics (avoids errors in some browsers)
  isSupported().then((ok) => {
    if (ok) {
      analytics = getAnalytics(app);
    }
  }).catch(() => {
    // ignore analytics init errors silently in dev
  });
}


