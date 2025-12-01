import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDnmHHwzk8zAfvZLySAnJiObOcJA5yPtsA",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "escola-maos-unidas.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "escola-maos-unidas",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "escola-maos-unidas.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "516070200221",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:516070200221:web:43142448297303b17d9574",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

