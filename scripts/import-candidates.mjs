import { initializeApp } from 'firebase/app';
import { getFirestore, doc, writeBatch } from 'firebase/firestore';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local or use defaults
const envPath = join(__dirname, '..', '.env.local');
let envVars = {};

try {
  const envContent = await readFile(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length) {
      envVars[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
    }
  });
} catch (error) {
  console.log('No .env.local found, using default credentials...');
}

const firebaseConfig = {
  apiKey: envVars.VITE_FIREBASE_API_KEY || "AIzaSyDnmHHwzk8zAfvZLySAnJiObOcJA5yPtsA",
  authDomain: envVars.VITE_FIREBASE_AUTH_DOMAIN || "escola-maos-unidas.firebaseapp.com",
  projectId: envVars.VITE_FIREBASE_PROJECT_ID || "escola-maos-unidas",
  storageBucket: envVars.VITE_FIREBASE_STORAGE_BUCKET || "escola-maos-unidas.firebasestorage.app",
  messagingSenderId: envVars.VITE_FIREBASE_MESSAGING_SENDER_ID || "516070200221",
  appId: envVars.VITE_FIREBASE_APP_ID || "1:516070200221:web:43142448297303b17d9574",
};

console.log('Initializing Firebase...');
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function importCandidates() {
  console.log('Loading candidates data...');
  
  const candidatesPath = join(__dirname, '..', 'src', 'data', 'candidates.json');
  const candidatesData = JSON.parse(await readFile(candidatesPath, 'utf-8'));
  
  console.log(`Importing ${candidatesData.length} candidates...`);
  
  const batchSize = 500;
  let totalImported = 0;

  for (let i = 0; i < candidatesData.length; i += batchSize) {
    const batch = writeBatch(db);
    const batchEnd = Math.min(i + batchSize, candidatesData.length);
    
    for (let j = i; j < batchEnd; j++) {
      const candidate = candidatesData[j];
      const candidateRef = doc(db, 'candidates', candidate.candidate_id);
      batch.set(candidateRef, candidate);
    }
    
    await batch.commit();
    totalImported += (batchEnd - i);
    console.log(`Imported ${totalImported}/${candidatesData.length} candidates...`);
  }

  console.log(`✅ Successfully imported ${totalImported} candidates!`);
}

importCandidates().catch((error) => {
  console.error('❌ Error importing candidates:', error);
  process.exit(1);
});

