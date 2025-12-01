/**
 * Script para importar candidatos desde la consola del navegador
 * 
 * INSTRUCCIONES:
 * 1. Abre el panel de administración: https://escola-maos-unidas.web.app/admin
 * 2. Inicia sesión con tu cuenta de administrador
 * 3. Abre la consola del navegador (F12 → Console)
 * 4. Copia y pega este código completo
 * 5. Presiona Enter
 */

(async function() {
  // Importar módulos de Firebase
  const { initializeApp } = await import('https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js');
  const { getFirestore, collection, doc, setDoc, getDoc } = await import('https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js');
  
  // Configuración de Firebase (debe coincidir con tu proyecto)
  const firebaseConfig = {
    apiKey: "AIzaSyDnmHHwzk8zAfvZLySAnJiObOcJA5yPtsA",
    authDomain: "escola-maos-unidas.firebaseapp.com",
    projectId: "escola-maos-unidas",
    storageBucket: "escola-maos-unidas.firebasestorage.app",
    messagingSenderId: "516070200221",
    appId: "1:516070200221:web:43142448297303b17d9574"
  };
  
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  
  console.log('📥 Cargando datos de candidatos...');
  
  // Cargar el archivo JSON
  const response = await fetch('/src/data/candidates.json');
  if (!response.ok) {
    console.error('❌ Error: No se pudo cargar el archivo candidates.json');
    console.error('   Asegúrate de que el archivo esté disponible en /src/data/candidates.json');
    return;
  }
  
  const candidates = await response.json();
  console.log(`📊 Encontrados ${candidates.length} candidatos en el archivo`);
  
  let imported = 0;
  let skipped = 0;
  let errors = 0;
  
  // Función para derivar nombres
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
  
  // Procesar cada candidato
  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    const candidateRef = doc(db, 'candidates', candidate.candidate_id);
    
    try {
      // Verificar si ya existe
      const docSnap = await getDoc(candidateRef);
      if (docSnap.exists()) {
        console.log(`⏭️  Omitido (ya existe): ${candidate.fullName}`);
        skipped++;
        continue;
      }
      
      // Derivar nombres
      const { firstName, lastName } = deriveNames(candidate);
      const fullName = `${firstName} ${lastName}`.replace(/\s+/g, ' ').trim() || candidate.fullName || '';
      
      const application = {
        ...(candidate.application || {}),
        scholarshipType: candidate.application?.scholarshipType || 'Completa',
        priority: candidate.application?.priority || 'media',
      };
      
      const candidateData = {
        ...candidate,
        firstName,
        lastName,
        fullName,
        application,
      };
      
      // Guardar en Firestore
      await setDoc(candidateRef, candidateData);
      console.log(`✅ Importado (${i + 1}/${candidates.length}): ${fullName}`);
      imported++;
      
      // Pequeña pausa para no sobrecargar
      if ((i + 1) % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error(`❌ Error con ${candidate.fullName}:`, error.message);
      errors++;
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 RESUMEN DE IMPORTACIÓN');
  console.log('='.repeat(50));
  console.log(`✅ Importados: ${imported}`);
  console.log(`⏭️  Omitidos: ${skipped}`);
  console.log(`❌ Errores: ${errors}`);
  console.log(`📦 Total procesados: ${candidates.length}`);
  console.log('='.repeat(50));
})();

