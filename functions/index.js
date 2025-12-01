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

    // Manejar preflight
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

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

    // Manejar preflight
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    // Solo permitir POST
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    try {
      const { firstName, lastName, email } = req.body;

      // Validar campos requeridos
      if (!firstName || !lastName || !email) {
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
