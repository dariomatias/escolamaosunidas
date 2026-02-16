const {onRequest} = require('firebase-functions/v2/https');
const {defineSecret} = require('firebase-functions/params');
const admin = require('firebase-admin');
const sgMail = require('@sendgrid/mail');

admin.initializeApp();

// Definir el secret de SendGrid
const sendgridApiKey = defineSecret('SENDGRID_API_KEY');

exports.sendContactEmail = onRequest(
  {
    secrets: [sendgridApiKey],
    cors: true,
  },
  async (req, res) => {
    // Configurar SendGrid con el secret
    sgMail.setApiKey(sendgridApiKey.value());

    // Manejar preflight con headers CORS explícitos
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type');
      res.set('Access-Control-Max-Age', '3600');
      res.status(204).send('');
      return;
    }

    // Establecer headers CORS para todas las respuestas
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    // Solo permitir POST
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    try {
      const { name, email, message } = req.body;

      // Validar campos requeridos
      if (!name || !email || !message) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      // Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        res.status(400).json({ error: 'Invalid email format' });
        return;
      }

      // Configurar el email
      const msg = {
        to: 'info@escolamaosunidas.com',
        from: 'noreply@escolamaosunidas.com', // Debe ser un email verificado en SendGrid
        subject: `Nuevo contacto desde Escola Mãos Unidas - ${name}`,
        text: `
Nuevo mensaje de contacto desde el sitio web:

Nombre: ${name}
Email: ${email}

Mensaje:
${message}

---
Este mensaje fue enviado desde el formulario de contacto de escolamaosunidas.com
        `,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4a5568;">Nuevo mensaje de contacto</h2>
            <div style="background-color: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Nombre:</strong> ${name}</p>
              <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
            </div>
            <div style="background-color: #ffffff; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
              <h3 style="color: #2d3748; margin-top: 0;">Mensaje:</h3>
              <p style="color: #4a5568; white-space: pre-wrap;">${message}</p>
            </div>
            <p style="color: #718096; font-size: 12px; margin-top: 20px;">
              Este mensaje fue enviado desde el formulario de contacto de escolamaosunidas.com
            </p>
          </div>
        `,
        replyTo: email, // Para que puedas responder directamente
      };

      // Enviar el email
      await sgMail.send(msg);

      // Responder con éxito
      res.status(200).json({ 
        success: true, 
        message: 'Email sent successfully' 
      });

    } catch (error) {
      console.error('Error sending email:', error);
      
      // Responder con error
      res.status(500).json({ 
        error: 'Failed to send email',
        message: error.message 
      });
    }
  }
);

exports.sendSponsorshipEmail = onRequest(
  {
    secrets: [sendgridApiKey],
    cors: true,
  },
  async (req, res) => {
    // Configurar SendGrid con el secret
    sgMail.setApiKey(sendgridApiKey.value());

    // Manejar preflight con headers CORS explícitos
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type');
      res.set('Access-Control-Max-Age', '3600');
      res.status(204).send('');
      return;
    }

    // Establecer headers CORS para todas las respuestas
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    // Solo permitir POST
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    try {
      const { firstName, lastName, email, phone } = req.body;

      // Validar campos requeridos
      if (!firstName || !lastName || !email || !phone) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      // Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        res.status(400).json({ error: 'Invalid email format' });
        return;
      }

      const fullName = `${firstName} ${lastName}`;

      // Configurar el email
      const msg = {
        to: 'becas@escolamaosunidas.com',
        from: 'noreply@escolamaosunidas.com', // Debe ser un email verificado en SendGrid
        subject: `Nueva solicitud de apadrinamiento - ${fullName}`,
        text: `
Nueva solicitud de apadrinamiento desde el sitio web:

Nombre: ${firstName}
Apellido: ${lastName}
Email: ${email}
Teléfono: ${phone}

---
Este mensaje fue enviado desde el formulario de apadrinamiento de escolamaosunidas.com
        `,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4a5568;">Nueva solicitud de apadrinamiento</h2>
            <div style="background-color: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Nombre:</strong> ${firstName}</p>
              <p><strong>Apellido:</strong> ${lastName}</p>
              <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
              <p><strong>Teléfono:</strong> ${phone}</p>
            </div>
            <p style="color: #718096; font-size: 12px; margin-top: 20px;">
              Este mensaje fue enviado desde el formulario de apadrinamiento de escolamaosunidas.com
            </p>
          </div>
        `,
        replyTo: email, // Para que puedas responder directamente
      };

      // Enviar el email
      await sgMail.send(msg);

      // Responder con éxito
      res.status(200).json({ 
        success: true, 
        message: 'Email sent successfully' 
      });

    } catch (error) {
      console.error('Error sending sponsorship email:', error);
      
      // Responder con error
      res.status(500).json({ 
        error: 'Failed to send email',
        message: error.message 
      });
    }
  }
);

exports.sendPaymentReminder = onRequest(
  {
    secrets: [sendgridApiKey],
    cors: true,
  },
  async (req, res) => {
    // Configurar SendGrid con el secret
    sgMail.setApiKey(sendgridApiKey.value());

    // Manejar preflight con headers CORS explícitos
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type');
      res.set('Access-Control-Max-Age', '3600');
      res.status(204).send('');
      return;
    }

    // Establecer headers CORS para todas las respuestas
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    // Solo permitir POST
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    try {
      const { 
        sponsorEmail, 
        sponsorFirstName, 
        sponsorLastName,
        studentName,
        studentMatriculationNumber,
        academicYear,
        overdueMonth
      } = req.body;

      // Validar campos requeridos
      if (!sponsorEmail || !studentName) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      // Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(sponsorEmail)) {
        res.status(400).json({ error: 'Invalid email format' });
        return;
      }

      const sponsorName = sponsorFirstName && sponsorLastName 
        ? `${sponsorFirstName} ${sponsorLastName}` 
        : sponsorFirstName || sponsorLastName || 'Patrocinador';

      // Configurar el email
      const msg = {
        to: sponsorEmail,
        from: 'noreply@escolamaosunidas.com',
        subject: `Recordatorio de Pago - ${studentName} - ${overdueMonth || 'Mes en curso'}`,
        text: `
Estimado/a ${sponsorName},

Le recordamos el pago pendiente de su estudiante apadrinado:

Estudiante: ${studentName}
${studentMatriculationNumber ? `Número de Matrícula: ${studentMatriculationNumber}` : ''}
${academicYear ? `Año Académico: ${academicYear}` : ''}

Mes pendiente: ${overdueMonth || 'Mes en curso'}

Por favor, comuníquese con nosotros para realizar el pago pendiente.

Gracias por su apoyo continuo a Escola Mãos Unidas.

Saludos cordiales,
Equipo Escola Mãos Unidas
        `,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #4a5568; border-bottom: 2px solid #68d391; padding-bottom: 10px;">
              Recordatorio de Pago - Escola Mãos Unidas
            </h2>
            
            <p>Estimado/a <strong>${sponsorName}</strong>,</p>
            
            <p>Le recordamos el pago pendiente de su estudiante apadrinado:</p>
            
            <div style="background-color: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #68d391;">
              <h3 style="color: #2d3748; margin-top: 0;">Información del Estudiante</h3>
              <p style="margin: 10px 0;"><strong>Estudiante:</strong> ${studentName}</p>
              ${studentMatriculationNumber ? `<p style="margin: 10px 0;"><strong>Número de Matrícula:</strong> ${studentMatriculationNumber}</p>` : ''}
              ${academicYear ? `<p style="margin: 10px 0;"><strong>Año Académico:</strong> ${academicYear}</p>` : ''}
            </div>
            
            <div style="background-color: #ffffff; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #2d3748; margin-top: 0;">Pago Pendiente</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 12px 0; color: #4a5568;"><strong>Mes pendiente:</strong></td>
                  <td style="padding: 12px 0; color: #2d3748; font-weight: bold;">
                    ${overdueMonth || 'Mes en curso'}
                  </td>
                </tr>
              </table>
            </div>
            
            <p style="color: #4a5568;">Por favor, comuníquese con nosotros para realizar el pago pendiente.</p>
            
            <p style="color: #4a5568;">Gracias por su apoyo continuo a <strong>Escola Mãos Unidas</strong>.</p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #718096; font-size: 12px;">
              <p>Saludos cordiales,<br><strong>Equipo Escola Mãos Unidas</strong></p>
              <p>Email: info@escolamaosunidas.com</p>
            </div>
          </div>
        `,
      };

      // Enviar el email
      await sgMail.send(msg);

      // Responder con éxito
      res.status(200).json({ 
        success: true, 
        message: 'Payment reminder email sent successfully' 
      });

    } catch (error) {
      console.error('Error sending payment reminder email:', error);
      
      // Responder con error
      res.status(500).json({ 
        error: 'Failed to send email',
        message: error.message 
      });
    }
  }
);

exports.sendAdmissionsEmail = onRequest(
  {
    secrets: [sendgridApiKey],
    cors: true,
  },
  async (req, res) => {
    // Configurar SendGrid con el secret
    sgMail.setApiKey(sendgridApiKey.value());

    // Manejar preflight con headers CORS explícitos
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type');
      res.set('Access-Control-Max-Age', '3600');
      res.status(204).send('');
      return;
    }

    // Establecer headers CORS para todas las respuestas
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    // Solo permitir POST
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    try {
      const { 
        studentName, 
        studentLastName, 
        birthDate, 
        grade, 
        parentName, 
        parentEmail, 
        parentPhone, 
        address,
        notes 
      } = req.body;

      // Validar campos requeridos
      if (!studentName || !studentLastName || !parentName || !parentEmail || !parentPhone) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      // Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(parentEmail)) {
        res.status(400).json({ error: 'Invalid email format' });
        return;
      }

      const fullStudentName = `${studentName} ${studentLastName}`;

      // Configurar el email
      const msg = {
        to: 'administracion@escolamaosunidas.com',
        from: 'noreply@escolamaosunidas.com',
        subject: `Nueva solicitud de inscripción 2026 - ${fullStudentName}`,
        text: `
Nueva solicitud de inscripción para el ciclo lectivo 2026:

INFORMACIÓN DEL ESTUDIANTE:
Nombre: ${studentName}
Apellido: ${studentLastName}
${birthDate ? `Fecha de Nacimiento: ${birthDate}` : ''}
${grade ? `Grado/Nivel: ${grade}` : ''}

INFORMACIÓN DEL TUTOR/RESPONSABLE:
Nombre: ${parentName}
Email: ${parentEmail}
Teléfono: ${parentPhone}
${address ? `Dirección: ${address}` : ''}

${notes ? `NOTAS ADICIONALES:\n${notes}` : ''}

---
Este mensaje fue enviado desde el formulario de admisiones 2026 de escolamaosunidas.com
        `,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4a5568; border-bottom: 2px solid #68d391; padding-bottom: 10px;">
              Nueva Solicitud de Inscripción 2026
            </h2>
            
            <div style="background-color: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #68d391;">
              <h3 style="color: #2d3748; margin-top: 0;">Información del Estudiante</h3>
              <p style="margin: 8px 0;"><strong>Nombre:</strong> ${studentName}</p>
              <p style="margin: 8px 0;"><strong>Apellido:</strong> ${studentLastName}</p>
              ${birthDate ? `<p style="margin: 8px 0;"><strong>Fecha de Nacimiento:</strong> ${birthDate}</p>` : ''}
              ${grade ? `<p style="margin: 8px 0;"><strong>Grado/Nivel:</strong> ${grade}</p>` : ''}
            </div>
            
            <div style="background-color: #ffffff; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #2d3748; margin-top: 0;">Información del Tutor/Responsable</h3>
              <p style="margin: 8px 0;"><strong>Nombre:</strong> ${parentName}</p>
              <p style="margin: 8px 0;"><strong>Email:</strong> <a href="mailto:${parentEmail}">${parentEmail}</a></p>
              <p style="margin: 8px 0;"><strong>Teléfono:</strong> ${parentPhone}</p>
              ${address ? `<p style="margin: 8px 0;"><strong>Dirección:</strong> ${address}</p>` : ''}
            </div>
            
            ${notes ? `
            <div style="background-color: #fef5e7; padding: 20px; border: 1px solid #f6ad55; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #2d3748; margin-top: 0;">Notas Adicionales</h3>
              <p style="color: #4a5568; white-space: pre-wrap; margin: 0;">${notes}</p>
            </div>
            ` : ''}
            
            <p style="color: #718096; font-size: 12px; margin-top: 20px;">
              Este mensaje fue enviado desde el formulario de admisiones 2026 de escolamaosunidas.com
            </p>
          </div>
        `,
        replyTo: parentEmail,
      };

      // Enviar el email
      await sgMail.send(msg);

      // Responder con éxito
      res.status(200).json({ 
        success: true, 
        message: 'Admissions email sent successfully' 
      });

    } catch (error) {
      console.error('Error sending admissions email:', error);
      
      // Responder con error
      res.status(500).json({ 
        error: 'Failed to send email',
        message: error.message 
      });
    }
  }
);