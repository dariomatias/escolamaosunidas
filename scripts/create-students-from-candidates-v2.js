/**
 * Script para crear students desde candidates existentes (Versión 2)
 * 
 * INSTRUCCIONES:
 * 1. Abre el panel de administración: https://escola-maos-unidas.web.app/admin
 * 2. Inicia sesión con tu cuenta de administrador
 * 3. Abre la consola del navegador (F12 → Console)
 * 4. Copia y pega este código completo
 * 5. Presiona Enter
 * 
 * IMPORTANTE: Este script debe ejecutarse DESPUÉS de estar autenticado.
 * Asegúrate de estar en el panel de administración y haber iniciado sesión.
 */

// Función helper para esperar
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async function() {
  console.log('🚀 Iniciando migración de candidates a students...\n');
  
  // Importar módulos de Firebase
  const firebaseApp = await import('https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js');
  const firebaseFirestore = await import('https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js');
  const firebaseAuth = await import('https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js');
  
  const { initializeApp, getApps } = firebaseApp;
  const { getFirestore, collection, doc, getDocs, getDoc, addDoc, updateDoc } = firebaseFirestore;
  const { getAuth, onAuthStateChanged } = firebaseAuth;
  
  // Configuración
  const firebaseConfig = {
    apiKey: "AIzaSyDnmHHwzk8zAfvZLySAnJiObOcJA5yPtsA",
    authDomain: "escola-maos-unidas.firebaseapp.com",
    projectId: "escola-maos-unidas",
    storageBucket: "escola-maos-unidas.firebasestorage.app",
    messagingSenderId: "516070200221",
    appId: "1:516070200221:web:43142448297303b17d9574"
  };
  
  // Usar app existente si está disponible
  let app;
  const existingApps = getApps();
  if (existingApps.length > 0) {
    app = existingApps[0];
    console.log('✅ Usando instancia de Firebase existente');
  } else {
    app = initializeApp(firebaseConfig);
    console.log('⚠️  Nueva instancia de Firebase creada');
  }
  
  const db = getFirestore(app);
  const auth = getAuth(app);
  
  // Verificar autenticación
  console.log('🔐 Verificando autenticación...');
  
  let currentUser = auth.currentUser;
  
  // Si no hay usuario actual, esperar un momento por si se está cargando
  if (!currentUser) {
    console.log('⏳ Esperando autenticación...');
    await sleep(1000);
    currentUser = auth.currentUser;
  }
  
  if (!currentUser) {
    // Intentar con onAuthStateChanged como último recurso
    try {
      currentUser = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          unsubscribe();
          reject(new Error('Timeout esperando autenticación'));
        }, 3000);
        
        const unsubscribe = onAuthStateChanged(auth, (user) => {
          clearTimeout(timeout);
          unsubscribe();
          resolve(user);
        });
        
        // También verificar inmediatamente
        const immediateUser = auth.currentUser;
        if (immediateUser) {
          clearTimeout(timeout);
          unsubscribe();
          resolve(immediateUser);
        }
      });
    } catch (error) {
      console.error('❌ ERROR: No se pudo verificar la autenticación');
      console.error('   Por favor, asegúrate de:');
      console.error('   1. Estar en el panel de administración');
      console.error('   2. Haber iniciado sesión con tu cuenta');
      console.error('   3. Esperar a que la página cargue completamente');
      console.error('   4. Volver a ejecutar este script');
      return;
    }
  }
  
  if (!currentUser) {
    console.error('❌ ERROR: No estás autenticado');
    return;
  }
  
  console.log(`✅ Autenticado como: ${currentUser.email}\n`);
  
  // Obtener todos los candidates
  console.log('📥 Cargando candidates...');
  const candidatesRef = collection(db, 'candidates');
  const candidatesSnapshot = await getDocs(candidatesRef);
  
  const candidates = [];
  candidatesSnapshot.forEach((doc) => {
    candidates.push({ id: doc.id, ...doc.data() });
  });
  
  console.log(`📊 Encontrados ${candidates.length} candidates\n`);
  
  // Función para generar número de matrícula
  let currentMatriculationCounter = null;
  
  async function generateNextMatriculationNumber() {
    try {
      // Si ya calculamos el contador, solo incrementar
      if (currentMatriculationCounter !== null) {
        currentMatriculationCounter++;
        return `MAT-${currentMatriculationCounter.toString().padStart(3, '0')}`;
      }
      
      // Primera vez: obtener todos los students y encontrar el máximo
      console.log('🔢 Calculando siguiente número de matrícula...');
      const studentsRef = collection(db, 'students');
      const studentsSnapshot = await getDocs(studentsRef);
      
      let maxNumber = 0;
      studentsSnapshot.forEach((doc) => {
        const student = doc.data();
        const matriculationNumber = student.matriculationNumber;
        if (matriculationNumber && matriculationNumber.startsWith('MAT-')) {
          const numberPart = parseInt(matriculationNumber.split('-')[1] || '0');
          if (numberPart > maxNumber) {
            maxNumber = numberPart;
          }
        }
      });
      
      currentMatriculationCounter = maxNumber + 1;
      const nextNumber = `MAT-${currentMatriculationCounter.toString().padStart(3, '0')}`;
      console.log(`   Siguiente matrícula: ${nextNumber}\n`);
      return nextNumber;
    } catch (error) {
      console.error('   Error generando matrícula:', error.message);
      // Fallback
      if (currentMatriculationCounter === null) {
        currentMatriculationCounter = 0;
      }
      currentMatriculationCounter++;
      return `MAT-${currentMatriculationCounter.toString().padStart(3, '0')}`;
    }
  }
  
  // Función para crear student desde candidate
  async function createStudentFromCandidate(candidate) {
    const trimmedFirstName = (candidate.firstName || '').trim();
    const trimmedLastName = (candidate.lastName || '').trim();
    const fullName = `${trimmedFirstName} ${trimmedLastName}`.replace(/\s+/g, ' ').trim() || candidate.fullName || '';
    
    const matriculationNumber = await generateNextMatriculationNumber();
    const now = new Date().toISOString();
    
    const studentData = {
      firstName: trimmedFirstName,
      lastName: trimmedLastName,
      fullName: fullName,
      documentId: candidate.documentId || '',
      gender: candidate.gender || '',
      birthDate: candidate.birthDate || '',
      currentGrade: candidate.level || 'Jardín',
      academicYear: candidate.period || new Date().getFullYear().toString(),
      status: 'inactive',
      paymentStatus: 'pending',
      city: candidate.city || 'Lichinga',
      province: candidate.province || 'Niassa',
      country: candidate.country || 'Mozambique',
      notes: candidate.notes || '',
      photoURL: candidate.photoURL || '',
      photoPath: candidate.photoPath || '',
      matriculationNumber: matriculationNumber,
      enrollmentDate: now,
      candidateId: candidate.id,
      createdAt: now,
      updatedAt: now,
    };
    
    const studentsRef = collection(db, 'students');
    const docRef = await addDoc(studentsRef, studentData);
    return docRef.id;
  }
  
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;
  
  console.log('🔄 Procesando candidates...\n');
  
  // Procesar cada candidate
  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    const candidateName = candidate.fullName || `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim() || candidate.id;
    
    try {
      // Si ya tiene studentId, verificar que el student existe
      if (candidate.studentId) {
        const studentRef = doc(db, 'students', candidate.studentId);
        const studentSnap = await getDoc(studentRef);
        
        if (studentSnap.exists()) {
          console.log(`⏭️  [${i + 1}/${candidates.length}] Omitido (ya tiene student): ${candidateName}`);
          skipped++;
          continue;
        } else {
          console.log(`⚠️  [${i + 1}/${candidates.length}] Candidate tiene studentId inválido, creando nuevo: ${candidateName}`);
        }
      }
      
      // Crear student
      const studentId = await createStudentFromCandidate(candidate);
      
      // Actualizar candidate con studentId
      const candidateRef = doc(db, 'candidates', candidate.id);
      await updateDoc(candidateRef, {
        studentId: studentId,
        updatedAt: new Date().toISOString(),
      });
      
      console.log(`✅ [${i + 1}/${candidates.length}] Creado: ${candidateName} → ${studentId}`);
      created++;
      updated++;
      
      // Pequeña pausa cada 5 registros
      if ((i + 1) % 5 === 0) {
        await sleep(200);
      }
    } catch (error) {
      console.error(`❌ [${i + 1}/${candidates.length}] Error con ${candidateName}:`, error.message);
      if (error.code) {
        console.error(`   Código de error: ${error.code}`);
      }
      errors++;
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMEN DE MIGRACIÓN');
  console.log('='.repeat(60));
  console.log(`✅ Students creados: ${created}`);
  console.log(`🔄 Candidates actualizados: ${updated}`);
  console.log(`⏭️  Omitidos: ${skipped}`);
  console.log(`❌ Errores: ${errors}`);
  console.log(`📦 Total procesados: ${candidates.length}`);
  console.log('='.repeat(60));
  
  if (errors === 0) {
    console.log('\n✅ ¡Migración completada exitosamente!');
  } else {
    console.log('\n⚠️  Migración completada con algunos errores. Revisa los detalles arriba.');
  }
})();

