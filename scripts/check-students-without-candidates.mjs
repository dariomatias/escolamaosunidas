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
    console.error('\n📋 Para verificar los estudiantes, necesitas configurar las credenciales de servicio:');
    console.error('\n   1. Ve a: https://console.firebase.google.com/project/escola-maos-unidas/settings/serviceaccounts/adminsdk');
    console.error('   2. Haz clic en "Generar nueva clave privada"');
    console.error('   3. Guarda el archivo JSON como "serviceAccountKey.json" en la raíz del proyecto');
    console.error('   4. Vuelve a ejecutar este script\n');
    console.error('   O alternativamente, establece la variable de entorno:');
    console.error('   $env:GOOGLE_APPLICATION_CREDENTIALS="ruta\\al\\archivo.json"\n');
    console.error('   O usa el script del navegador: scripts/check-students-without-candidates-browser.js\n');
    process.exit(1);
  }
}

const db = admin.firestore();

async function checkStudentsWithoutCandidates() {
  try {
    console.log('📊 Verificando estudiantes sin candidato asociado...\n');
    
    // Fetch all students
    console.log('🔍 Obteniendo estudiantes de la base de datos...');
    const studentsRef = db.collection('students');
    const studentsSnapshot = await studentsRef.get();
    
    const students = [];
    studentsSnapshot.forEach((doc) => {
      students.push({ id: doc.id, ...doc.data() });
    });
    
    console.log(`✅ Encontrados ${students.length} estudiantes\n`);
    
    // Fetch all candidates
    console.log('🔍 Obteniendo candidatos de la base de datos...');
    const candidatesRef = db.collection('candidates');
    const candidatesSnapshot = await candidatesRef.get();
    
    const candidates = [];
    candidatesSnapshot.forEach((doc) => {
      candidates.push({ id: doc.id, ...doc.data() });
    });
    
    console.log(`✅ Encontrados ${candidates.length} candidatos\n`);
    
    // Create a map of candidate IDs for quick lookup
    const candidateIds = new Set(candidates.map(c => c.id));
    const candidateStudentIds = new Set(
      candidates
        .filter(c => c.studentId)
        .map(c => c.studentId)
    );
    
    // Find students without candidates
    const studentsWithoutCandidates = [];
    const studentsWithCandidates = [];
    
    for (const student of students) {
      const hasCandidateId = student.candidateId && candidateIds.has(student.candidateId);
      const isReferencedByCandidate = candidateStudentIds.has(student.id);
      
      if (!hasCandidateId && !isReferencedByCandidate) {
        studentsWithoutCandidates.push(student);
      } else {
        studentsWithCandidates.push({
          student,
          candidateId: student.candidateId || (candidates.find(c => c.studentId === student.id)?.id),
        });
      }
    }
    
    // Print results
    console.log('='.repeat(80));
    console.log('📊 RESULTADOS');
    console.log('='.repeat(80));
    console.log(`\n✅ Estudiantes con candidato asociado: ${studentsWithCandidates.length}`);
    console.log(`❌ Estudiantes SIN candidato asociado: ${studentsWithoutCandidates.length}\n`);
    
    if (studentsWithoutCandidates.length > 0) {
      console.log('❌ ESTUDIANTES SIN CANDIDATO ASOCIADO:');
      console.log('-'.repeat(80));
      studentsWithoutCandidates.forEach((student, index) => {
        const fullName = `${student.firstName || ''} ${student.lastName || ''}`.trim() || student.fullName || 'Sin nombre';
        console.log(`\n${index + 1}. ${fullName}`);
        console.log(`   ID Estudiante: ${student.id}`);
        console.log(`   Número de Matrícula: ${student.matriculationNumber || 'N/A'}`);
        if (student.birthDate) {
          const birthDate = student.birthDate?.toDate ? student.birthDate.toDate() : new Date(student.birthDate);
          console.log(`   Fecha de Nacimiento: ${birthDate.toLocaleDateString()}`);
        }
        if (student.currentGrade) {
          console.log(`   Grado: ${student.currentGrade}`);
        }
        if (student.status) {
          console.log(`   Estado: ${student.status}`);
        }
        if (student.academicYear) {
          console.log(`   Año Académico: ${student.academicYear}`);
        }
        if (student.enrollmentDate) {
          const enrollmentDate = student.enrollmentDate?.toDate ? student.enrollmentDate.toDate() : new Date(student.enrollmentDate);
          console.log(`   Fecha de Inscripción: ${enrollmentDate.toLocaleDateString()}`);
        }
        if (student.sponsorId) {
          console.log(`   ⚠️  Tiene patrocinador asignado (ID: ${student.sponsorId})`);
        }
      });
      console.log('\n' + '-'.repeat(80));
    }
    
    // Statistics
    console.log('\n📈 ESTADÍSTICAS:');
    console.log('-'.repeat(80));
    console.log(`Total de estudiantes: ${students.length}`);
    console.log(`Total de candidatos: ${candidates.length}`);
    console.log(`Candidatos con studentId: ${candidates.filter(c => c.studentId).length}`);
    console.log(`Estudiantes con candidateId: ${students.filter(s => s.candidateId).length}`);
    console.log(`Estudiantes referenciados por candidatos: ${candidateStudentIds.size}`);
    console.log(`Estudiantes sin candidato: ${studentsWithoutCandidates.length}`);
    
    // Breakdown by status
    if (studentsWithoutCandidates.length > 0) {
      console.log('\n📊 ESTUDIANTES SIN CANDIDATO POR ESTADO:');
      const byStatus = {};
      studentsWithoutCandidates.forEach(s => {
        const status = s.status || 'sin-estado';
        byStatus[status] = (byStatus[status] || 0) + 1;
      });
      Object.entries(byStatus).forEach(([status, count]) => {
        console.log(`   ${status}: ${count}`);
      });
    }
    
    console.log('\n' + '='.repeat(80));
    
  } catch (error) {
    console.error('❌ Error verificando estudiantes:', error);
    process.exit(1);
  }
}

checkStudentsWithoutCandidates();
