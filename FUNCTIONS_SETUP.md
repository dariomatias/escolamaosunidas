# Configuración de Firebase Functions con SendGrid

## Pasos para configurar el envío de emails

### 1. Crear cuenta en SendGrid

1. Ve a https://sendgrid.com y crea una cuenta gratuita
2. La cuenta gratuita permite enviar hasta 100 emails por día

### 2. Verificar dominio en SendGrid

1. En el panel de SendGrid, ve a **Settings** → **Sender Authentication**
2. Verifica tu dominio `escolamaosunidas.com` o crea un "Single Sender Verification"
3. Para producción, es recomendable verificar el dominio completo
4. Para pruebas, puedes usar "Single Sender Verification" con `noreply@escolamaosunidas.com`

### 3. Obtener API Key de SendGrid

1. En SendGrid, ve a **Settings** → **API Keys**
2. Haz clic en **Create API Key**
3. Dale un nombre (ej: "Firebase Functions")
4. Selecciona permisos: **Full Access** o **Mail Send** (mínimo necesario)
5. Copia la API Key (solo se muestra una vez)

### 4. Configurar la API Key en Firebase

Ejecuta este comando en la terminal (reemplaza `TU_API_KEY` con tu API Key de SendGrid):

```bash
firebase functions:config:set sendgrid.key="TU_API_KEY"
```

O si estás usando la nueva sintaxis de Firebase:

```bash
firebase functions:secrets:set SENDGRID_API_KEY
```

Cuando te pida el valor, pega tu API Key de SendGrid.

### 5. Instalar dependencias

```bash
cd functions
npm install
```

### 6. Desplegar la función

```bash
# Desde la raíz del proyecto
firebase deploy --only functions
```

### 7. Actualizar la URL de la función en el código

Después del deploy, Firebase te dará la URL de la función. Actualiza la URL en `src/site.jsx`:

```javascript
const functionUrl = 'https://us-central1-escola-maos-unidas.cloudfunctions.net/sendContactEmail';
```

Reemplaza `escola-maos-unidas` con tu Project ID si es diferente.

## Verificación

1. Prueba el formulario en el sitio web
2. Verifica que recibes el email en `info@escolamaosunidas.com`
3. Revisa los logs de Firebase Functions si hay errores:
   ```bash
   firebase functions:log
   ```

## Notas importantes

- El email "from" debe ser un email verificado en SendGrid
- La cuenta gratuita de SendGrid tiene límites (100 emails/día)
- Los emails se envían a `info@escolamaosunidas.com` como está configurado en `functions/index.js`
- El campo `replyTo` está configurado con el email del usuario para poder responder directamente

## Solución de problemas

### Error: "Unauthorized"
- Verifica que la API Key de SendGrid esté correctamente configurada
- Asegúrate de que la API Key tenga permisos de "Mail Send"

### Error: "Forbidden"
- Verifica que el email "from" esté verificado en SendGrid
- Si usas un dominio, asegúrate de que esté completamente verificado

### No se reciben emails
- Revisa la carpeta de spam
- Verifica los logs de Firebase Functions
- Asegúrate de que el email de destino (`info@escolamaosunidas.com`) sea válido

