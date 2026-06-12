import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// 環境ごとにコレクションを分離する（DEV のときは "-dev" サフィックスを付与）
const isDev = import.meta.env.VITE_PRODUCT_MODE === 'DEV';
export const collections = {
  users: isDev ? 'users-dev' : 'users',
  ips: isDev ? 'ips-dev' : 'ips',
  fingerprints: isDev ? 'fingerprints-dev' : 'fingerprints',
};
