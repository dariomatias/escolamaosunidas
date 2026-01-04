# Script: Crear Students desde Candidates Existentes

Este script crea automáticamente un `student` en estado `inactive` para cada `candidate` existente que no tenga un `studentId` asignado.

## Versiones Disponibles

- **`create-students-from-candidates-v2.js`** (RECOMENDADO): Versión mejorada con mejor manejo de autenticación
- **`create-students-from-candidates.js`**: Versión original

## Instrucciones de Uso

1. Abre el panel de administración en tu navegador:
   ```
   https://escola-maos-unidas.web.app/admin
   ```

2. Inicia sesión con tu cuenta de administrador

3. Abre la consola del navegador:
   - Presiona `F12` o `Ctrl+Shift+I` (Windows/Linux)
   - Presiona `Cmd+Option+I` (Mac)
   - O haz clic derecho → "Inspeccionar" → pestaña "Console"

4. Abre el archivo `scripts/create-students-from-candidates.js`

5. Copia TODO el contenido del archivo

6. Pégalo en la consola del navegador

7. Presiona `Enter`

## ¿Qué hace este script?

- ✅ Obtiene todos los candidates de Firestore
- ✅ Para cada candidate que no tenga `studentId`:
  - Crea un nuevo `student` en estado `inactive`
  - Asigna un número de matrícula único
  - Mapea los campos del candidate al student
  - Actualiza el candidate con el `studentId` del student creado
- ✅ Muestra un resumen del proceso

## Campos mapeados

| Candidate Field | Student Field |
|----------------|---------------|
| `firstName` | `firstName` |
| `lastName` | `lastName` |
| `fullName` | `fullName` |
| `documentId` | `documentId` |
| `gender` | `gender` |
| `birthDate` | `birthDate` |
| `level` | `currentGrade` |
| `period` | `academicYear` |
| `city` | `city` |
| `province` | `province` |
| `country` | `country` |
| `notes` | `notes` |
| `photoURL` | `photoURL` |
| `photoPath` | `photoPath` |
| `id` | `candidateId` (referencia al candidate) |

## Estado del Student

Todos los students creados tendrán:
- `status`: `"inactive"`
- `paymentStatus`: `"pending"`
- `matriculationNumber`: Generado automáticamente (MAT-001, MAT-002, etc.)
- `enrollmentDate`: Fecha actual
- `candidateId`: ID del candidate que lo creó

## Notas Importantes

⚠️ **Este script es idempotente**: Puedes ejecutarlo múltiples veces sin crear duplicados. Si un candidate ya tiene un `studentId` válido, será omitido.

⚠️ **No elimina datos existentes**: Solo crea nuevos students y actualiza candidates.

⚠️ **Asegúrate de tener permisos**: Necesitas estar autenticado como administrador para ejecutar este script.

## Solución de Problemas

Si encuentras errores:

1. **Error de permisos**: Asegúrate de estar autenticado como administrador
2. **Error de conexión**: Verifica tu conexión a internet
3. **Errores específicos**: Revisa la consola para ver qué candidate causó el problema

## Después de Ejecutar

Una vez completada la migración:
- Todos los candidates existentes tendrán un student asociado
- Los nuevos candidates creados desde ahora tendrán automáticamente un student (gracias a los cambios en el código)
- Puedes verificar los students en el panel de administración → Students

