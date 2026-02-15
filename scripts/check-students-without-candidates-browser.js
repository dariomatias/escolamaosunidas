/**
 * Script para verificar estudiantes que no tienen candidato asociado
 * 
 * INSTRUCCIONES:
 * 1. Abre el panel de administración: https://escola-maos-unidas.web.app/admin
 * 2. Inicia sesión con tu cuenta de administrador
 * 3. Abre la consola del navegador (F12 → Console)
 * 4. Copia y pega este código completo
 * 5. Presiona Enter
 */

(async function() {
  try {
    console.log('📊 Verificando estudiantes sin candidato asociado...\n');
    
    // Import Firebase modules
    const { initializeApp, getApps } = await import('https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js');
    const { 
      getFirestore, 
      collection, 
      getDocs, 
      query, 
      orderBy 
    } = await import('https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js');
    const { getAuth, onAuthStateChanged } = await import('https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js');
    
    // Firebase configuration
    const firebaseConfig = {
      apiKey: "AIzaSyDnmHHwzk8zAfvZLySAnJiObOcJA5yPtsA",
      authDomain: "escola-maos-unidas.firebaseapp.com",
      projectId: "escola-maos-unidas",
      storageBucket: "escola-maos-unidas.firebasestorage.app",
      messagingSenderId: "516070200221",
      appId: "1:516070200221:web:43142448297303b17d9574"
    };
    
    // Try to use existing app or create new one
    let app;
    try {
      const existingApps = getApps();
      if (existingApps.length > 0) {
        app = existingApps[0];
        console.log('✅ Usando instancia de Firebase existente');
      } else {
        app = initializeApp(firebaseConfig);
        console.log('⚠️  Nueva instancia de Firebase creada');
      }
    } catch (error) {
      app = initializeApp(firebaseConfig);
      console.log('⚠️  Nueva instancia de Firebase creada debido a error');
    }
    
    const db = getFirestore(app);
    const auth = getAuth(app);
    
    // Wait for authentication
    console.log('🔐 Verificando autenticación...');
    
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
      
      // Timeout after 2 seconds
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
    
    // Fetch all students
    console.log('\n🔍 Obteniendo estudiantes de la base de datos...');
    const studentsRef = collection(db, 'students');
    const studentsQuery = query(studentsRef, orderBy('createdAt', 'desc'));
    const studentsSnapshot = await getDocs(studentsQuery);
    
    const students = [];
    studentsSnapshot.forEach((doc) => {
      students.push({ id: doc.id, ...doc.data() });
    });
    
    console.log(`✅ Encontrados ${students.length} estudiantes\n`);
    
    // Fetch all candidates
    console.log('🔍 Obteniendo candidatos de la base de datos...');
    const candidatesRef = collection(db, 'candidates');
    const candidatesQuery = query(candidatesRef, orderBy('createdAt', 'desc'));
    const candidatesSnapshot = await getDocs(candidatesQuery);
    
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
          console.log(`   Fecha de Nacimiento: ${new Date(student.birthDate).toLocaleDateString()}`);
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
          console.log(`   Fecha de Inscripción: ${new Date(student.enrollmentDate).toLocaleDateString()}`);
        }
        if (student.sponsorId) {
          console.log(`   ⚠️  Tiene patrocinador asignado (ID: ${student.sponsorId})`);
        }
      });
      console.log('\n' + '-'.repeat(80));
    }
    
    if (studentsWithCandidates.length > 0) {
      console.log('\n✅ ESTUDIANTES CON CANDIDATO ASOCIADO:');
      console.log('-'.repeat(80));
      console.log(`Total: ${studentsWithCandidates.length} estudiantes`);
      console.log('(Lista completa disponible en la variable "studentsWithCandidates")');
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
    
    // Return results for further processing
    return { 
      studentsWithoutCandidates, 
      studentsWithCandidates,
      totalStudents: students.length,
      totalCandidates: candidates.length,
      statistics: {
        studentsWithCandidate: studentsWithCandidates.length,
        studentsWithoutCandidate: studentsWithoutCandidates.length,
        candidatesWithStudent: candidates.filter(c => c.studentId).length,
        studentsWithCandidateId: students.filter(s => s.candidateId).length,
      }
    };
    
  } catch (error) {
    console.error('❌ Error verificando estudiantes:', error);
    throw error;
  }
})();
