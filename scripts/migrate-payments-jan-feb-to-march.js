/**
 * Script para mover pagos de enero/febrero a marzo.
 *
 * INSTRUCCIONES:
 * 1. Abre el panel de administración: https://escola-maos-unidas.web.app/admin
 * 2. Inicia sesión con tu cuenta de administrador
 * 3. Abre la consola del navegador (F12 → Console)
 * 4. Copia y pega este código completo
 * 5. Presiona Enter
 *
 * Este script:
 * - Busca pagos con mes 1 o 2 (enero/febrero)
 * - Actualiza el mes a 3 (marzo)
 * - Muestra un listado de los pagos modificados
 */

(async function() {
  const firebaseConfig = {
    apiKey: "AIzaSyDnmHHwzk8zAfvZLySAnJiObOcJA5yPtsA",
    authDomain: "escola-maos-unidas.firebaseapp.com",
    projectId: "escola-maos-unidas",
    storageBucket: "escola-maos-unidas.firebasestorage.app",
    messagingSenderId: "516070200221",
    appId: "1:516070200221:web:43142448297303b17d9574"
  };

  const { initializeApp, getApps } = await import('https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js');
  const { getFirestore, collection, getDocs, doc, updateDoc } = await import('https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js');

  let app;
  try {
    const existingApps = getApps();
    app = existingApps.length > 0 ? existingApps[0] : initializeApp(firebaseConfig);
  } catch (error) {
    app = initializeApp(firebaseConfig);
  }

  const db = getFirestore(app);

  const studentsSnapshot = await getDocs(collection(db, 'students'));
  const updates = [];

  for (const studentDoc of studentsSnapshot.docs) {
    const studentId = studentDoc.id;
    const student = studentDoc.data() || {};
    const studentName = `${student.firstName || ''} ${student.lastName || ''}`.trim() || student.fullName || studentId;

    const paymentsSnapshot = await getDocs(collection(db, 'students', studentId, 'payments'));
    for (const paymentDoc of paymentsSnapshot.docs) {
      const payment = paymentDoc.data() || {};
      const monthValue = payment.month;
      const numericMonth = typeof monthValue === 'number' ? monthValue : Number.parseInt(monthValue, 10);

      if (numericMonth === 1 || numericMonth === 2) {
        await updateDoc(doc(db, 'students', studentId, 'payments', paymentDoc.id), {
          month: '3',
        });
        updates.push({
          studentId,
          studentName,
          paymentId: paymentDoc.id,
          previousMonth: monthValue,
          newMonth: '3',
        });
      }
    }
  }

  console.log('✅ Migración completada.');
  console.log(`Pagos actualizados: ${updates.length}`);
  console.table(updates);
  return updates;
})();
