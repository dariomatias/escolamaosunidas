# Configuración de Firebase Storage

Si recibes un error 403 al intentar habilitar Firebase Storage, sigue estos pasos:

## Opción 1: Habilitar desde Google Cloud Console (Recomendado)

1. **Ve a Google Cloud Console:**
   - https://console.cloud.google.com/apis/library/firebasestorage.googleapis.com?project=escola-maos-unidas
   - O busca "Firebase Storage API" en la biblioteca de APIs

2. **Habilita la API:**
   - Haz clic en "HABILITAR" o "ENABLE"
   - Espera a que se habilite (puede tardar unos minutos)

3. **Verifica la facturación:**
   - Ve a: https://console.cloud.google.com/billing?project=escola-maos-unidas
   - Asegúrate de que hay una cuenta de facturación vinculada
   - Nota: Firebase Storage tiene un tier gratuito generoso, pero requiere facturación activada

4. **Verifica permisos:**
   - Ve a: https://console.cloud.google.com/iam-admin/iam?project=escola-maos-unidas
   - Asegúrate de que tu cuenta tenga uno de estos roles:
     - Owner
     - Editor
     - Firebase Admin
     - Storage Admin

5. **Vuelve a Firebase Console:**
   - https://console.firebase.google.com/project/escola-maos-unidas/storage
   - Intenta habilitar Storage nuevamente

## Opción 2: Habilitar desde Firebase CLI

Si tienes permisos, puedes intentar habilitar la API desde la línea de comandos:

```bash
# Primero, instala Google Cloud SDK si no lo tienes
# Luego autentícate:
gcloud auth login

# Habilita la API de Storage
gcloud services enable firebasestorage.googleapis.com --project=escola-maos-unidas
```

## Opción 3: Verificar y habilitar facturación

Si no tienes facturación activada:

1. Ve a: https://console.cloud.google.com/billing?project=escola-maos-unidas
2. Si no hay cuenta de facturación:
   - Haz clic en "VINCULAR CUENTA DE FACTURACIÓN"
   - Sigue el proceso para agregar una tarjeta de crédito
   - Nota: Firebase tiene un tier gratuito que incluye:
     - 5 GB de almacenamiento
     - 1 GB de transferencia de salida por día
     - 50,000 operaciones de lectura por día
     - 20,000 operaciones de escritura por día

## Después de habilitar Storage

Una vez que Storage esté habilitado, despliega las reglas:

```bash
firebase deploy --only storage
```

## Verificar que funciona

1. Ve a Firebase Console → Storage
2. Deberías ver el bucket creado
3. Intenta subir una foto desde el panel de administración

## Solución de problemas

Si sigues teniendo problemas:

1. **Verifica que eres el propietario del proyecto:**
   - Ve a: https://console.firebase.google.com/project/escola-maos-unidas/settings/iam
   - Tu email debe aparecer con rol "Owner" o "Editor"

2. **Limpia la caché del navegador:**
   - A veces el error 403 es un problema de caché
   - Prueba en modo incógnito o limpia la caché

3. **Contacta al propietario del proyecto:**
   - Si no eres el propietario, pídele que te otorgue permisos o que habilite Storage

## Nota sobre costos

Firebase Storage tiene un tier gratuito generoso:
- **Gratis:** 5 GB almacenamiento, 1 GB transferencia/día
- **Pago:** $0.026 por GB adicional de almacenamiento
- **Transferencia:** $0.12 por GB adicional

Para una escuela pequeña, es muy probable que nunca excedas el tier gratuito.

