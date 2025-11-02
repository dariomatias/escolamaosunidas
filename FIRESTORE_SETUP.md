# Firestore Setup Instructions

Firestore está configurado para la aplicación Escola Mãos Unidas. Este documento explica cómo configurar las credenciales y cargar los datos.

## 📋 Estado Actual

- ✅ Firebase SDK instalado
- ✅ Firestore habilitado en Firebase
- ✅ Reglas de seguridad desplegadas
- ✅ API de candidatos creada
- ⏳ Falta: Configurar credenciales y cargar datos

## 🔑 Configuración de Credenciales

### Opción 1: Usar Firebase CLI (Recomendado)

1. Ve a la [Consola de Firebase](https://console.firebase.google.com/project/escola-maos-unidas/settings/general)
2. En la sección "Your apps", crea una nueva app web si no existe
3. Copia las credenciales de configuración
4. Crea un archivo `.env.local` en la raíz del proyecto:

```env
VITE_FIREBASE_API_KEY=tu-api-key-aqui
VITE_FIREBASE_AUTH_DOMAIN=escola-maos-unidas.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=escola-maos-unidas
VITE_FIREBASE_STORAGE_BUCKET=escola-maos-unidas.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=tu-sender-id-aqui
VITE_FIREBASE_APP_ID=tu-app-id-aqui
```

### Opción 2: Usar Firebase Admin SDK (Para scripts)

Si planeas usar el script de importación, necesitarás:

1. Instalar Firebase Admin: `npm install firebase-admin`
2. Descargar la clave de cuenta de servicio desde la consola de Firebase
3. Actualizar el script `scripts/import-candidates.mjs` para usar Admin SDK

## 📊 Cargar Datos de Candidatos

### Método 1: Script de importación (Node.js)

```bash
# Primero, instala dotenv si usas .env.local
npm install dotenv

# Ejecuta el script de importación
node scripts/import-candidates.mjs
```

### Método 2: Consola de Firebase (Manual)

1. Ve a [Firestore Console](https://console.firebase.google.com/project/escola-maos-unidas/firestore)
2. Crea una nueva colección llamada `candidates`
3. Importa manualmente los datos desde `src/data/candidates.json`

### Método 3: Firebase CLI (Batch Import)

```bash
# Primero necesitas convertir el JSON al formato de importación de Firebase
# Luego usa:
firebase firestore:import candidates.json
```

## 🔐 Reglas de Seguridad

Las reglas actuales permiten:

- **Lectura pública**: Todos pueden leer información básica de candidatos
- **Escritura**: Solo usuarios autenticados pueden escribir
- **Datos sensibles**: Solo admins pueden acceder a:
  - `guardian` (contacto, consentimientos)
  - `household` (situación económica)
  - `application` (evaluación interna)
  - `documents` (documentos personales)
  - `audit` (log de cambios)

## 🔌 Uso de la API

Una vez configuradas las credenciales, puedes usar la API en tu app:

```javascript
import { getAllCandidates, getPublicCandidates, getCandidateById } from './services/candidates-api';

// Obtener todos los candidatos (requiere auth)
const allCandidates = await getAllCandidates();

// Obtener candidatos públicos (sin auth, datos limitados)
const publicCandidates = await getPublicCandidates();

// Obtener candidato por ID
const candidate = await getCandidateById('f854ee0f-f7f7-4a60-8084-e984c438f75d');
```

## 📁 Estructura de Datos

```
candidates/
  └── {candidate_id}/
      ├── candidate_id
      ├── fullName
      ├── birthDate
      ├── level
      ├── city
      ├── province
      ├── country
      ├── photoPath
      ├── status (pending, active, archived, etc.)
      ├── period (e.g., "2025")
      ├── notes
      ├── createdAt
      ├── updatedAt
      ├── guardian/ (sensitive - solo admins)
      ├── household/ (sensitive - solo admins)
      ├── application/ (sensitive - solo admins)
      ├── documents/ (sensitive - solo admins)
      └── audit/ (sensitive - solo admins)
```

## 🚀 Despliegue

Las reglas de Firestore se despliegan automáticamente con:

```bash
firebase deploy --only firestore:rules
```

Para desplegar todo (Hosting + Firestore):

```bash
firebase deploy
```

## 👥 Configurar Usuarios Administradores

Para acceder al panel de administración, necesitas crear usuarios en Firebase Authentication:

1. Ve a la [Consola de Firebase Authentication](https://console.firebase.google.com/project/escola-maos-unidas/authentication/users)
2. Haz clic en "Agregar usuario"
3. Ingresa un email y una contraseña
4. Haz clic en "Agregar"

Luego podrás iniciar sesión en `https://escola-maos-unidas.web.app/login`

**Importante**: Las credenciales se configuran manualmente. No hay sistema de registro público.

## 📝 Próximos Pasos

1. ✅ Configurar `.env.local` con las credenciales de Firebase
2. Cargar los datos de candidatos
3. ✅ Configurar Firebase Authentication para admins (listo)
4. ✅ Integrar la API de candidatos en la UI (listo)
5. ✅ Agregar autenticación de usuarios (listo)

## 🆘 Troubleshooting

### Error: "Missing or insufficient permissions"
- Verifica que las reglas de Firestore están desplegadas correctamente
- Asegúrate de que el usuario esté autenticado para operaciones de escritura

### Error: "Firebase: No Firebase App"
- Verifica que `.env.local` existe y tiene las credenciales correctas
- Asegúrate de que las variables empiezan con `VITE_`

### Error: "Collection not found"
- Crea la colección manualmente en la consola de Firestore
- O ejecuta el script de importación para crear los documentos

