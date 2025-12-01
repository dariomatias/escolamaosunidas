import admin from 'firebase-admin';
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

const projectId = envVars.VITE_FIREBASE_PROJECT_ID || "escola-maos-unidas";

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  let initialized = false;
  
  // Try to use service account if available
  const serviceAccountPath = join(__dirname, '..', 'serviceAccountKey.json');
  try {
    const serviceAccount = JSON.parse(await readFile(serviceAccountPath, 'utf-8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: projectId,
    });
    console.log('✅ Initializing Firebase Admin with service account...');
    initialized = true;
  } catch (error) {
    // Service account not found, try other methods
  }
  
  if (!initialized) {
    // Try using environment variable for service account
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      try {
        const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
        const serviceAccount = JSON.parse(await readFile(credPath, 'utf-8'));
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: projectId,
        });
        console.log('✅ Initializing Firebase Admin with credentials from GOOGLE_APPLICATION_CREDENTIALS...');
        initialized = true;
      } catch (error) {
        // Failed to load from env var
      }
    }
  }
  
  if (!initialized) {
    console.error('\n❌ No se encontraron credenciales de Firebase Admin.');
    console.error('\n📋 Para importar los candidatos, necesitas configurar las credenciales de servicio:');
    console.error('\n   1. Ve a: https://console.firebase.google.com/project/escola-maos-unidas/settings/serviceaccounts/adminsdk');
    console.error('   2. Haz clic en "Generar nueva clave privada"');
    console.error('   3. Guarda el archivo JSON como "serviceAccountKey.json" en la raíz del proyecto');
    console.error('   4. Vuelve a ejecutar este script\n');
    console.error('   O alternativamente, establece la variable de entorno:');
    console.error('   $env:GOOGLE_APPLICATION_CREDENTIALS="ruta\\al\\archivo.json"\n');
    process.exit(1);
  }
}

const db = admin.firestore();

async function importCandidates() {
  console.log('Loading candidates data...');
  
  const candidatesPath = join(__dirname, '..', 'src', 'data', 'candidates.json');
  const candidatesData = JSON.parse(await readFile(candidatesPath, 'utf-8'));
  
  console.log(`Importing ${candidatesData.length} candidates...`);
  
  const batchSize = 500;
  let totalImported = 0;

  for (let i = 0; i < candidatesData.length; i += batchSize) {
    const batch = db.batch();
    const batchEnd = Math.min(i + batchSize, candidatesData.length);
    
    for (let j = i; j < batchEnd; j++) {
      const candidate = candidatesData[j];
      const candidateRef = db.collection('candidates').doc(candidate.candidate_id);

      const deriveNames = (source) => {
        if (source.firstName || source.lastName) {
          return {
            firstName: source.firstName || '',
            lastName: source.lastName || '',
          };
        }
        const full = (source.fullName || '').trim();
        if (!full) {
          return { firstName: '', lastName: '' };
        }
        const parts = full.split(' ').filter(Boolean);
        if (parts.length === 1) {
          return { firstName: parts[0], lastName: '' };
        }
        return {
          firstName: parts.slice(0, -1).join(' '),
          lastName: parts.slice(-1).join(' '),
        };
      };

      const { firstName, lastName } = deriveNames(candidate);
      const fullName = `${firstName} ${lastName}`.replace(/\s+/g, ' ').trim() || candidate.fullName || '';

      const application = {
        ...(candidate.application || {}),
        scholarshipType: candidate.application?.scholarshipType || 'Completa',
        priority: candidate.application?.priority || 'media',
      };

      batch.set(candidateRef, {
        ...candidate,
        firstName,
        lastName,
        fullName,
        application,
      });
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

