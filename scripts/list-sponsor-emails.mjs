/**
 * Lista los emails de todos los padrinos (sponsors) en Firestore.
 * Usa la config de src/config/firebase.js y login con cuenta admin.
 *
 * Uso:
 *   ADMIN_EMAIL=tu@email.com ADMIN_PASSWORD=tupassword node scripts/list-sponsor-emails.mjs
 *
 * O define ADMIN_EMAIL y ADMIN_PASSWORD en .env.local
 */

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Cargar .env.local
let env = {};
try {
  const envPath = join(__dirname, '..', '.env.local');
  const content = await readFile(envPath, 'utf-8');
  content.split('\n').forEach((line) => {
    const [key, ...v] = line.split('=');
    if (key && v.length) env[key.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
  });
} catch (_) {}

// Misma config que src/config/firebase.js
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || env.VITE_FIREBASE_API_KEY || 'AIzaSyDnmHHwzk8zAfvZLySAnJiObOcJA5yPtsA',
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || env.VITE_FIREBASE_AUTH_DOMAIN || 'escola-maos-unidas.firebaseapp.com',
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || env.VITE_FIREBASE_PROJECT_ID || 'escola-maos-unidas',
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || env.VITE_FIREBASE_STORAGE_BUCKET || 'escola-maos-unidas.firebasestorage.app',
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || env.VITE_FIREBASE_MESSAGING_SENDER_ID || '516070200221',
  appId: process.env.VITE_FIREBASE_APP_ID || env.VITE_FIREBASE_APP_ID || '1:516070200221:web:43142448297303b17d9574',
};

const adminEmail = process.env.ADMIN_EMAIL || env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD || env.ADMIN_PASSWORD;

if (!adminEmail || !adminPassword) {
  console.error('❌ Necesitas ADMIN_EMAIL y ADMIN_PASSWORD (cuenta admin de Firebase).');
  console.error('   Ejemplo: ADMIN_EMAIL=admin@... ADMIN_PASSWORD=*** node scripts/list-sponsor-emails.mjs');
  console.error('   O añade ADMIN_EMAIL y ADMIN_PASSWORD en .env.local');
  process.exit(1);
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function listSponsorEmails() {
  await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
  const snapshot = await getDocs(collection(db, 'sponsors'));
  const emails = [];
  snapshot.forEach((doc) => {
    const email = (doc.data().email || '').trim();
    if (email) emails.push(email);
  });
  console.log(emails.join(', '));
}

listSponsorEmails().catch((err) => {
  console.error('Error:', err.message || err);
  process.exit(1);
});
