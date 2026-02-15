# Diferencias entre Candidatos (Becados) y Estudiantes

## Resumen Ejecutivo

**Candidatos (Candidates/Becados)** son solicitudes de beca que están en proceso de evaluación.  
**Estudiantes (Students)** son niños que ya están matriculados y asistiendo a la escuela.

---

## 1. Propósito y Flujo

### Candidatos (Becados)
- **Propósito**: Representan solicitudes de beca en proceso de evaluación
- **Flujo**: 
  1. Se crea un candidato cuando alguien solicita una beca
  2. El candidato pasa por estados: `pending` → `active` (aprobado) o `rejected` (rechazado)
  3. Cuando un candidato es aprobado (`active`) y tiene un patrocinador asignado, se crea automáticamente un estudiante

### Estudiantes
- **Propósito**: Representan niños que ya están matriculados y asistiendo a la escuela
- **Flujo**:
  1. Se crean automáticamente cuando un candidato es aprobado
  2. También se pueden crear manualmente
  3. Tienen un número de matrícula único (`matriculationNumber`)

---

## 2. Estados (Status)

### Candidatos
- `pending` - Pendiente de evaluación
- `active` - Aprobado y activo (tiene patrocinador)
- `rejected` - Rechazado
- `archived` - Archivado

### Estudiantes
- `active` - Activo (asistiendo a clases)
- `inactive` - Inactivo (no asiste actualmente)
- `graduated` - Graduado
- `suspended` - Suspendido

---

## 3. Campos Específicos

### Campos Únicos de Candidatos

| Campo | Descripción |
|-------|-------------|
| `application` | Objeto con información de la solicitud de beca |
| `application.scholarshipType` | Tipo de beca (ej: "Completa") |
| `application.priority` | Prioridad de la solicitud (`alta`, `media`, `baja`) |
| `application.reason` | Razón de la solicitud |
| `application.state` | Estado de la aplicación (`pendiente`, etc.) |
| `application.evaluator` | Evaluador de la solicitud |
| `household` | Información del hogar y situación socioeconómica |
| `household.members` | Número de miembros del hogar |
| `household.incomeRange` | Rango de ingresos |
| `household.vulnerabilities` | Vulnerabilidades identificadas |
| `guardian` | Información del tutor/guardian |
| `guardian.consentData` | Consentimiento para uso de datos |
| `guardian.consentImage` | Consentimiento para uso de imágenes |
| `documents` | Documentos de la solicitud (certificado de nacimiento, etc.) |
| `period` | Período de la solicitud (ej: "2025") |
| `level` | Nivel educativo solicitado (ej: "Jardín", "1 Grado") |
| `notes` | Notas sobre la solicitud |
| `candidate_id` | ID único del candidato |

### Campos Únicos de Estudiantes

| Campo | Descripción |
|-------|-------------|
| `matriculationNumber` | Número de matrícula único (ej: "MAT-001") |
| `enrollmentDate` | Fecha de inscripción/matrícula |
| `currentGrade` | Grado actual en el que está |
| `academicYear` | Año académico (ej: "2026") |
| `paymentStatus` | Estado de pago (`paid`, `current`, `overdue`, `pending`) |
| `sponsorId` | ID del patrocinador asignado |
| `sponsor` | Información del patrocinador (nombre, email, etc.) |
| `sponsorAssignedDate` | Fecha en que se asignó el patrocinador |
| `candidateId` | Referencia al candidato que originó este estudiante |

---

## 4. Relación entre Candidatos y Estudiantes

### Relación 1:1 (Uno a Uno)
- Un candidato puede tener **un solo estudiante** asociado
- Un estudiante puede tener **un solo candidato** de origen

### Campos de Relación
- **En Candidatos**: `studentId` - ID del estudiante asociado
- **En Estudiantes**: `candidateId` - ID del candidato de origen

### Flujo de Creación
1. Se crea un **candidato** con estado `pending`
2. Cuando el candidato es aprobado (`active`) y tiene patrocinador:
   - Se crea automáticamente un **estudiante** en estado `active`
   - El candidato se actualiza con el `studentId`
   - El estudiante se crea con el `candidateId` de referencia

---

## 5. Funcionalidades Específicas

### Candidatos
- ✅ Gestión de solicitudes de beca
- ✅ Evaluación y priorización
- ✅ Asignación de patrocinadores
- ✅ Gestión de documentos de solicitud
- ✅ Información del hogar y situación socioeconómica
- ✅ Consentimientos legales (datos e imágenes)
- ✅ Exportación a PDF de la solicitud

### Estudiantes
- ✅ Gestión de matrículas
- ✅ Seguimiento académico (grado actual, año académico)
- ✅ Gestión de pagos (registro de pagos, estado de pago)
- ✅ Asignación de patrocinadores
- ✅ Envío de recordatorios de pago a patrocinadores
- ✅ Estados de asistencia (activo, inactivo, graduado, suspendido)

---

## 6. Diferencias Clave en la Interfaz

### Página de Candidatos (Becados)
- Muestra: Estado de solicitud, Prioridad, Período, Nivel solicitado
- Acciones: Aprobar/Rechazar, Asignar patrocinador, Evaluar solicitud
- Filtros: Por estado, período, nivel, prioridad

### Página de Estudiantes
- Muestra: Número de matrícula, Grado actual, Año académico, Estado de pago
- Acciones: Gestionar pagos, Enviar recordatorio de pago, Cambiar estado
- Filtros: Por grado, año académico, estado, estado de pago, patrocinador

---

## 7. Casos de Uso

### Cuándo usar Candidatos
- Cuando alguien solicita una beca por primera vez
- Para evaluar y priorizar solicitudes
- Para gestionar el proceso de aprobación
- Para asignar patrocinadores a solicitudes aprobadas

### Cuándo usar Estudiantes
- Cuando un candidato ya fue aprobado y matriculado
- Para gestionar la asistencia a clases
- Para registrar y seguir pagos
- Para comunicarse con patrocinadores sobre el progreso del estudiante

---

## 8. Migración y Conversión

### Conversión Automática
Cuando un candidato cambia de estado `pending` a `active` y tiene un patrocinador:
- Se crea automáticamente un estudiante
- El estudiante se crea con estado `active`
- Se genera un número de matrícula único
- Se copian los datos relevantes del candidato al estudiante

### Scripts de Migración
Existen scripts para crear estudiantes desde candidatos existentes:
- `create-students-from-candidates.js` - Crea estudiantes para todos los candidatos que no tienen uno
- Los estudiantes se crean en estado `inactive` inicialmente

---

## 9. Resumen Visual

```
┌─────────────────┐
│   CANDIDATO     │
│  (Solicitud)    │
│                 │
│ Status: pending │
│                 │
│  ↓ (Aprobado)   │
│                 │
│ Status: active  │
│ + Patrocinador  │
└────────┬────────┘
         │
         │ Se crea automáticamente
         ↓
┌─────────────────┐
│   ESTUDIANTE    │
│  (Matriculado)  │
│                 │
│ Status: active  │
│ Matrícula: MAT- │
│                 │
│ Gestión pagos   │
│ Seguimiento     │
└─────────────────┘
```

---

## 10. Preguntas Frecuentes

**P: ¿Un candidato siempre se convierte en estudiante?**  
R: No, solo los candidatos aprobados (`active`) con patrocinador asignado se convierten en estudiantes.

**P: ¿Puedo crear un estudiante sin candidato?**  
R: Sí, los estudiantes se pueden crear manualmente sin necesidad de un candidato previo.

**P: ¿Qué pasa si un estudiante deja de asistir?**  
R: El estado del estudiante cambia a `inactive`, pero el candidato original mantiene su estado.

**P: ¿Un estudiante puede tener múltiples patrocinadores?**  
R: No, la relación es 1:1 - un estudiante tiene un solo patrocinador.

**P: ¿Los pagos se gestionan en candidatos o estudiantes?**  
R: Los pagos se gestionan exclusivamente en estudiantes, no en candidatos.

---

## Conclusión

**Candidatos** = Proceso de solicitud y evaluación de becas  
**Estudiantes** = Gestión de niños matriculados y asistiendo a la escuela

El sistema está diseñado para que los candidatos se conviertan en estudiantes una vez aprobados, manteniendo una relación clara entre ambos para el seguimiento completo del proceso educativo.
