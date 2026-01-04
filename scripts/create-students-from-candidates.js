/**
 * Script para crear students desde candidates existentes
 * 
 * INSTRUCCIONES:
 * 1. Abre el panel de administración: https://escola-maos-unidas.web.app/admin
 * 2. Inicia sesión con tu cuenta de administrador
 * 3. Abre la consola del navegador (F12 → Console)
 * 4. Copia y pega este código completo
 * 5. Presiona Enter
 * 
 * IMPORTANTE: Este script usa la instancia de Firebase ya inicializada en la página.
 * Asegúrate de estar en el panel de administración y autenticado.
 * 
 * Este script:
 * - Obtiene todos los candidates existentes
 * - Para cada candidate sin studentId, crea un student en estado "inactive"
 * - Actualiza el candidate con el studentId
 */

(async function() {
  // Importar módulos de Firebase
  const { initializeApp, getApps } = await import('https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js');
  const { 
    getFirestore, 
    collection, 
    doc, 
    getDocs, 
    getDoc, 
    addDoc, 
    updateDoc,
    connectAuthEmulator
  } = await import('https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js');
  const { getAuth, connectAuthEmulator: connectAuthEmulatorAuth } = await import('https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js');
  
  // Configuración de Firebase
  const firebaseConfig = {
    apiKey: "AIzaSyDnmHHwzk8zAfvZLySAnJiObOcJA5yPtsA",
    authDomain: "escola-maos-unidas.firebaseapp.com",
    projectId: "escola-maos-unidas",
    storageBucket: "escola-maos-unidas.firebasestorage.app",
    messagingSenderId: "516070200221",
    appId: "1:516070200221:web:43142448297303b17d9574"
  };
  
  // Intentar usar app existente o crear una nueva
  let app;
  try {
    const existingApps = getApps();
    if (existingApps.length > 0) {
      app = existingApps[0];
      console.log('✅ Usando instancia de Firebase existente');
    } else {
      app = initializeApp(firebaseConfig);
      console.log('⚠️  Nueva instancia de Firebase creada - necesitas autenticarte');
    }
  } catch (error) {
    app = initializeApp(firebaseConfig);
    console.log('⚠️  Nueva instancia de Firebase creada debido a error');
  }
  
  const db = getFirestore(app);
  const auth = getAuth(app);
  
  // Esperar a que la autenticación se cargue
  console.log('🔐 Verificando autenticación...');
  
  // Usar onAuthStateChanged para esperar la autenticación
  const { onAuthStateChanged } = await import('https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js');
  
  await new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      if (user) {
        console.log(`✅ Autenticado como: ${user.email}`);
        resolve(user);
      } else {
        console.error('❌ ERROR: No estás autenticado. Por favor:');
        console.error('   1. Asegúrate de estar en el panel de administración');
        console.error('   2. Inicia sesión con tu cuenta de administrador');
        console.error('   3. Vuelve a ejecutar este script');
        reject(new Error('Usuario no autenticado'));
      }
    });
    
    // Timeout después de 2 segundos si no hay cambio de estado
    setTimeout(() => {
      const currentUser = auth.currentUser;
      unsubscribe();
      if (currentUser) {
        console.log(`✅ Autenticado como: ${currentUser.email}`);
        resolve(currentUser);
      } else {
        console.error('❌ ERROR: No se pudo verificar la autenticación');
        reject(new Error('No se pudo verificar autenticación'));
      }
    }, 2000);
  });
  
  console.log('📥 Cargando candidates...');
  
  // Obtener todos los candidates
  const candidatesRef = collection(db, 'candidates');
  const candidatesSnapshot = await getDocs(candidatesRef);
  
  const candidates = [];
  candidatesSnapshot.forEach((doc) => {
    candidates.push({ id: doc.id, ...doc.data() });
  });
  
  console.log(`📊 Encontrados ${candidates.length} candidates`);
  
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
      return `MAT-${currentMatriculationCounter.toString().padStart(3, '0')}`;
    } catch (error) {
      console.error('Error generating matriculation number:', error);
      // Fallback: usar timestamp
      if (currentMatriculationCounter === null) {
        currentMatriculationCounter = 0;
      }
      currentMatriculationCounter++;
      const timestamp = Date.now().toString().slice(-6);
      return `MAT-${timestamp}`;
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
      status: 'inactive', // Always inactive when created from candidate
      paymentStatus: 'pending',
      city: candidate.city || 'Lichinga',
      province: candidate.province || 'Niassa',
      country: candidate.country || 'Mozambique',
      notes: candidate.notes || '',
      photoURL: candidate.photoURL || '',
      photoPath: candidate.photoPath || '',
      matriculationNumber: matriculationNumber,
      enrollmentDate: now,
      candidateId: candidate.id, // Reference to the candidate
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
  
  console.log('\n🔄 Procesando candidates...\n');
  
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
          console.log(`⏭️  Omitido (ya tiene student): ${candidateName}`);
          skipped++;
          continue;
        } else {
          console.log(`⚠️  Candidate tiene studentId inválido, creando nuevo student: ${candidateName}`);
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
      
      console.log(`✅ Creado student (${i + 1}/${candidates.length}): ${candidateName} → ${studentId}`);
      created++;
      updated++;
      
      // Pequeña pausa para no sobrecargar
      if ((i + 1) % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error(`❌ Error con ${candidateName}:`, error.message);
      errors++;
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 RESUMEN DE MIGRACIÓN');
  console.log('='.repeat(50));
  console.log(`✅ Students creados: ${created}`);
  console.log(`🔄 Candidates actualizados: ${updated}`);
  console.log(`⏭️  Omitidos: ${skipped}`);
  console.log(`❌ Errores: ${errors}`);
  console.log(`📦 Total procesados: ${candidates.length}`);
  console.log('='.repeat(50));
  console.log('\n✅ Migración completada!');
})();

