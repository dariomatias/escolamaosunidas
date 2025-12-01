# Importar Candidatos desde el Navegador

Si no tienes configuradas las credenciales de Firebase Admin, puedes importar los candidatos desde la consola del navegador cuando estés autenticado en el panel de administración.

## Pasos:

1. Abre el panel de administración: `https://escola-maos-unidas.web.app/admin`
2. Inicia sesión
3. Abre la consola del navegador (F12)
4. Copia y pega el siguiente código:

```javascript
// Cargar los datos del archivo JSON
fetch('/src/data/candidates.json')
  .then(res => res.json())
  .then(async (candidates) => {
    const { getFirestore, collection, doc, setDoc } = await import('https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js');
    const db = getFirestore();
    
    let imported = 0;
    let skipped = 0;
    
    for (const candidate of candidates) {
      try {
        const candidateRef = doc(db, 'candidates', candidate.candidate_id);
        await setDoc(candidateRef, candidate);
        imported++;
        console.log(`✅ Importado: ${candidate.fullName}`);
      } catch (error) {
        if (error.code === 'permission-denied') {
          console.error(`❌ Sin permisos para: ${candidate.fullName}`);
        } else {
          console.error(`❌ Error con ${candidate.fullName}:`, error);
        }
        skipped++;
      }
    }
    
    console.log(`\n✅ Importación completada: ${imported} importados, ${skipped} omitidos`);
  })
  .catch(error => console.error('Error cargando datos:', error));
```

## Nota:

Los candidatos ya están en el archivo `src/data/candidates.json`. Si prefieres, también puedes agregarlos manualmente uno por uno usando el botón "Agregar Candidato" en el panel de administración.

