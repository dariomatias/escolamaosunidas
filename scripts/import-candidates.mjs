import { initializeApp } from 'firebase/app';
import { getFirestore, doc, writeBatch } from 'firebase/firestore';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local
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
  console.error('Error loading .env.local:', error.message);
}

const firebaseConfig = {
  apiKey: envVars.VITE_FIREBASE_API_KEY,
  authDomain: envVars.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: envVars.VITE_FIREBASE_PROJECT_ID,
  storageBucket: envVars.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: envVars.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: envVars.VITE_FIREBASE_APP_ID,
};

console.log('Initializing Firebase...');
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function importCandidates() {
  console.log('Loading candidates data...');
  
  const candidatesPath = join(__dirname, '..', 'src', 'data', 'candidates.json');
  const candidatesData = JSON.parse(await readFile(candidatesPath, 'utf-8'));
  
  console.log(`Importing ${candidatesData.length} candidates...`);
  
  const batch = writeBatch(db);
  const batchSize = 500;
  let batchCount = 0;
  let totalImported = 0;

  for (let i = 0; i < candidatesData.length; i++) {
    const candidate = candidatesData[i];
    const candidateRef = doc(db, 'candidates', candidate.candidate_id);
    
    batch.set(candidateRef, candidate);
    batchCount++;

    // Commit batch if we reach the limit or it's the last item
    if (batchCount === batchSize || i === candidatesData.length - 1) {
      await batch.commit();
      totalImported += batchCount;
      console.log(`Imported ${totalImported}/${candidatesData.length} candidates...`);
      batchCount = 0;
    }
  }

  console.log(`✅ Successfully imported ${totalImported} candidates!`);
}

importCandidates().catch((error) => {
  console.error('❌ Error importing candidates:', error);
  process.exit(1);
});

