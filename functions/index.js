const {onRequest} = require('firebase-functions/v2/https');
const {onSchedule} = require('firebase-functions/v2/scheduler');
const {defineSecret} = require('firebase-functions/params');
const admin = require('firebase-admin');
const sgMail = require('@sendgrid/mail');

admin.initializeApp();

// Definir el secret de SendGrid
const sendgridApiKey = defineSecret('SENDGRID_API_KEY');
const PAYMENT_REMINDER_TIME_ZONE = 'America/Argentina/Buenos_Aires';
const TUITION_DUE_MONTHS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const PAYMENT_STATUSES = {
  PAID: 'paid',
};
const PAYMENT_TYPES = {
  ENROLLMENT: 'enrollment',
};
const MONTH_LABELS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatUsdAmount(amount) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);
}

function getZonedDateParts(date = new Date(), timeZone = PAYMENT_REMINDER_TIME_ZONE) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  });

  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value])
  );

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
  };
}

function getMonthLabel(monthNumber) {
  return MONTH_LABELS_ES[monthNumber - 1] || `Mes ${monthNumber}`;
}

function toDate(value) {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getExplicitPaymentMonth(payment) {
  const month = Number.parseInt(payment.month, 10);
  return month >= 1 && month <= 12 ? month : null;
}

function isPaidForTuitionMonth(payment, monthNumber, year) {
  if (payment.status !== PAYMENT_STATUSES.PAID) return false;
  if (payment.type === PAYMENT_TYPES.ENROLLMENT) return false;

  const paymentDate = toDate(payment.date);
  const explicitMonth = getExplicitPaymentMonth(payment);

  if (TUITION_DUE_MONTHS.includes(explicitMonth)) {
    return explicitMonth === monthNumber &&
      (!paymentDate || paymentDate.getFullYear() === year);
  }

  if (!paymentDate) return false;
  return paymentDate.getMonth() + 1 === monthNumber &&
    paymentDate.getFullYear() === year;
}

function calculateTotalDue(student) {
  const enrollmentFee = Number.parseFloat(student.enrollmentFee) || 20;
  const monthlyFee = Number.parseFloat(student.monthlyFee) || 40;
  const numberOfMonths = Number.parseInt(student.numberOfMonths, 10) || TUITION_DUE_MONTHS.length;

  if (student.fullPaymentAmount) {
    return Number.parseFloat(student.fullPaymentAmount) || 420;
  }

  return enrollmentFee + (monthlyFee * numberOfMonths);
}

function calculateTotalPaid(payments) {
  return payments
    .filter((payment) => payment.status === PAYMENT_STATUSES.PAID)
    .reduce((sum, payment) => sum + (Number.parseFloat(payment.amount) || 0), 0);
}

function getSponsorInfo(student) {
  const sponsor = student.sponsor || {};
  const email = String(sponsor.email || '').trim().toLowerCase();
  const firstName = String(sponsor.firstName || '').trim();
  const lastName = String(sponsor.lastName || '').trim();
  const name = [firstName, lastName].filter(Boolean).join(' ') || 'Patrocinador/a';

  return { email, firstName, lastName, name };
}

function getStudentDisplayName(student) {
  const fullName = [student.firstName, student.lastName]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  return fullName || student.fullName || 'Estudiante';
}

function getReminderLogId(type, year, monthNumber, sponsorEmail) {
  const emailKey = Buffer.from(sponsorEmail).toString('base64url');
  return `${type}_${year}_${String(monthNumber).padStart(2, '0')}_${emailKey}`;
}

async function getStudentPaymentsForSchedule(studentId) {
  const snapshot = await admin.firestore()
    .collection('students')
    .doc(studentId)
    .collection('payments')
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

async function buildPaymentReminderGroups(monthNumber, year) {
  const studentsSnapshot = await admin.firestore()
    .collection('students')
    .where('status', '==', 'active')
    .get();

  const groups = new Map();

  for (const studentDoc of studentsSnapshot.docs) {
    const student = { id: studentDoc.id, ...studentDoc.data() };
    const sponsorInfo = getSponsorInfo(student);

    if (!sponsorInfo.email) continue;

    const payments = await getStudentPaymentsForSchedule(student.id);
    const totalDue = calculateTotalDue(student);
    const totalPaid = calculateTotalPaid(payments);
    const isFullyPaid = totalPaid >= totalDue;
    const hasCurrentMonthPayment = payments.some((payment) =>
      isPaidForTuitionMonth(payment, monthNumber, year)
    );

    if (isFullyPaid || hasCurrentMonthPayment) continue;

    const monthlyFee = Number.parseFloat(student.monthlyFee) || 40;
    const row = {
      studentId: student.id,
      studentName: getStudentDisplayName(student),
      matriculationNumber: student.matriculationNumber || '',
      currentGrade: student.currentGrade || '',
      academicYear: student.academicYear || '',
      monthlyFee,
    };

    const group = groups.get(sponsorInfo.email) || {
      sponsorEmail: sponsorInfo.email,
      sponsorName: sponsorInfo.name,
      students: [],
      total: 0,
    };

    group.students.push(row);
    group.total += monthlyFee;
    groups.set(sponsorInfo.email, group);
  }

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      students: group.students.sort((a, b) => {
        const matriculationCompare = String(a.matriculationNumber).localeCompare(String(b.matriculationNumber));
        if (matriculationCompare !== 0) return matriculationCompare;
        return a.studentName.localeCompare(b.studentName);
      }),
    }))
    .sort((a, b) => a.sponsorName.localeCompare(b.sponsorName));
}

function buildScheduledPaymentReminderEmail({ group, type, monthLabel }) {
  const isOverdue = type === 'overdue';
  const title = isOverdue
    ? 'Pago atrasado - Escola Mãos Unidas'
    : 'Recordatorio de cuota mensual - Escola Mãos Unidas';
  const intro = isOverdue
    ? `Al día 11 no registramos el pago correspondiente al mes de ${monthLabel}.`
    : `Le recordamos que está pendiente el pago correspondiente al mes de ${monthLabel}.`;
  const actionText = isOverdue
    ? 'Por favor, comuníquese con nosotros para regularizar el pago atrasado.'
    : 'Si el pago ya fue realizado, puede desestimar este mensaje. En caso contrario, por favor comuníquese con nosotros para coordinarlo.';
  const subject = isOverdue
    ? `Pago atrasado - ${monthLabel} - Escola Mãos Unidas`
    : `Recordatorio de cuota mensual - ${monthLabel} - Escola Mãos Unidas`;

  const textRows = group.students.map((student) => (
    `- ${student.studentName}` +
    `${student.matriculationNumber ? ` (${student.matriculationNumber})` : ''}` +
    `${student.currentGrade ? ` - ${student.currentGrade}` : ''}` +
    ` - ${monthLabel}: ${formatUsdAmount(student.monthlyFee)}`
  )).join('\n');

  const htmlRows = group.students.map((student) => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${escapeHtml(student.studentName)}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${escapeHtml(student.matriculationNumber || '-')}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${escapeHtml(student.currentGrade || '-')}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${escapeHtml(monthLabel)}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">${escapeHtml(formatUsdAmount(student.monthlyFee))}</td>
    </tr>
  `).join('');

  return {
    to: group.sponsorEmail,
    from: 'noreply@escolamaosunidas.com',
    subject,
    text: `
Estimado/a ${group.sponsorName},

${intro}

Detalle:
${textRows}

Total pendiente: ${formatUsdAmount(group.total)}

${actionText}

Gracias por su apoyo continuo a Escola Mãos Unidas.

Saludos cordiales,
Equipo Escola Mãos Unidas
    `,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 680px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #4a5568; border-bottom: 2px solid ${isOverdue ? '#dc2626' : '#659141'}; padding-bottom: 10px;">
          ${escapeHtml(title)}
        </h2>

        <p>Estimado/a <strong>${escapeHtml(group.sponsorName)}</strong>,</p>
        <p style="color: #4a5568;">${escapeHtml(intro)}</p>

        <div style="background-color: #f7fafc; border-left: 4px solid ${isOverdue ? '#dc2626' : '#659141'}; padding: 18px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #2d3748; margin-top: 0;">Detalle del pago ${isOverdue ? 'atrasado' : 'pendiente'}</h3>
          <table style="width: 100%; border-collapse: collapse; background: #ffffff;">
            <thead>
              <tr>
                <th style="padding: 10px; border-bottom: 2px solid #cbd5e0; text-align: left;">Estudiante</th>
                <th style="padding: 10px; border-bottom: 2px solid #cbd5e0; text-align: left;">Matrícula</th>
                <th style="padding: 10px; border-bottom: 2px solid #cbd5e0; text-align: left;">Curso</th>
                <th style="padding: 10px; border-bottom: 2px solid #cbd5e0; text-align: left;">Mes</th>
                <th style="padding: 10px; border-bottom: 2px solid #cbd5e0; text-align: right;">Valor</th>
              </tr>
            </thead>
            <tbody>${htmlRows}</tbody>
            <tfoot>
              <tr>
                <td colspan="4" style="padding: 12px 10px; text-align: right; font-weight: bold;">Total pendiente</td>
                <td style="padding: 12px 10px; text-align: right; font-weight: bold;">${escapeHtml(formatUsdAmount(group.total))}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <p style="color: #4a5568;">${escapeHtml(actionText)}</p>
        <p style="color: #4a5568;">Gracias por su apoyo continuo a <strong>Escola Mãos Unidas</strong>.</p>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #718096; font-size: 12px;">
          <p>Saludos cordiales,<br><strong>Equipo Escola Mãos Unidas</strong></p>
          <p>Email: info@escolamaosunidas.com</p>
        </div>
      </div>
    `,
  };
}

function buildOverduePaymentReportEmail({ group }) {
  const subject = 'Pago atrasado - Detalle de cuotas pendientes - Escola Mãos Unidas';
  const textRows = group.students.map((student) => (
    `- ${student.studentName}` +
    `${student.matriculationNumber ? ` (${student.matriculationNumber})` : ''}` +
    `${student.currentGrade ? ` - ${student.currentGrade}` : ''}` +
    ` - Meses: ${student.overdueMonthLabels.join(', ') || '-'}` +
    ` - Valor mensual: ${formatUsdAmount(student.monthlyFee)}` +
    ` - Total: ${formatUsdAmount(student.total)}`
  )).join('\n');

  const htmlRows = group.students.map((student) => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${escapeHtml(student.studentName)}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${escapeHtml(student.matriculationNumber || '-')}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${escapeHtml(student.currentGrade || '-')}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${escapeHtml(student.overdueMonthLabels.join(', ') || '-')}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">${escapeHtml(formatUsdAmount(student.monthlyFee))}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">${escapeHtml(formatUsdAmount(student.total))}</td>
    </tr>
  `).join('');

  return {
    to: group.sponsorEmail,
    from: 'noreply@escolamaosunidas.com',
    subject,
    text: `
Estimado/a ${group.sponsorName},

Al día de hoy registramos cuotas atrasadas para los siguientes estudiantes apadrinados:

${textRows}

Total pendiente: ${formatUsdAmount(group.total)}

Por favor, comuníquese con nosotros para regularizar los pagos pendientes.

Gracias por su apoyo continuo a Escola Mãos Unidas.

Saludos cordiales,
Equipo Escola Mãos Unidas
    `,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 720px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #4a5568; border-bottom: 2px solid #dc2626; padding-bottom: 10px;">
          Pago atrasado - Escola Mãos Unidas
        </h2>

        <p>Estimado/a <strong>${escapeHtml(group.sponsorName)}</strong>,</p>
        <p style="color: #4a5568;">Al día de hoy registramos cuotas atrasadas para los siguientes estudiantes apadrinados:</p>

        <div style="background-color: #f7fafc; border-left: 4px solid #dc2626; padding: 18px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #2d3748; margin-top: 0;">Detalle de pagos atrasados</h3>
          <table style="width: 100%; border-collapse: collapse; background: #ffffff;">
            <thead>
              <tr>
                <th style="padding: 10px; border-bottom: 2px solid #cbd5e0; text-align: left;">Estudiante</th>
                <th style="padding: 10px; border-bottom: 2px solid #cbd5e0; text-align: left;">Matrícula</th>
                <th style="padding: 10px; border-bottom: 2px solid #cbd5e0; text-align: left;">Curso</th>
                <th style="padding: 10px; border-bottom: 2px solid #cbd5e0; text-align: left;">Meses adeudados</th>
                <th style="padding: 10px; border-bottom: 2px solid #cbd5e0; text-align: right;">Valor mensual</th>
                <th style="padding: 10px; border-bottom: 2px solid #cbd5e0; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>${htmlRows}</tbody>
            <tfoot>
              <tr>
                <td colspan="5" style="padding: 12px 10px; text-align: right; font-weight: bold;">Total pendiente</td>
                <td style="padding: 12px 10px; text-align: right; font-weight: bold;">${escapeHtml(formatUsdAmount(group.total))}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <p style="color: #4a5568;">Por favor, comuníquese con nosotros para regularizar los pagos pendientes.</p>
        <p style="color: #4a5568;">Gracias por su apoyo continuo a <strong>Escola Mãos Unidas</strong>.</p>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #718096; font-size: 12px;">
          <p>Saludos cordiales,<br><strong>Equipo Escola Mãos Unidas</strong></p>
          <p>Email: info@escolamaosunidas.com</p>
        </div>
      </div>
    `,
  };
}

async function sendScheduledPaymentEmail({ group, type, year, monthNumber, monthLabel }) {
  const logRef = admin.firestore()
    .collection('scheduledPaymentEmailLogs')
    .doc(getReminderLogId(type, year, monthNumber, group.sponsorEmail));
  const existingLog = await logRef.get();

  if (existingLog.exists && existingLog.data()?.status === 'sent') {
    return { status: 'skipped', sponsorEmail: group.sponsorEmail };
  }

  await logRef.set({
    type,
    year,
    month: monthNumber,
    monthLabel,
    sponsorEmail: group.sponsorEmail,
    sponsorName: group.sponsorName,
    studentCount: group.students.length,
    total: group.total,
    status: 'sending',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  try {
    await sgMail.send(buildScheduledPaymentReminderEmail({ group, type, monthLabel }));
    await logRef.set({
      status: 'sent',
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    return { status: 'sent', sponsorEmail: group.sponsorEmail };
  } catch (error) {
    await logRef.set({
      status: 'failed',
      lastError: error.message,
      failedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    throw error;
  }
}

async function runScheduledPaymentReminder(type, date = new Date()) {
  sgMail.setApiKey(sendgridApiKey.value());

  const { year, month: monthNumber } = getZonedDateParts(date);
  const monthLabel = getMonthLabel(monthNumber);

  if (!TUITION_DUE_MONTHS.includes(monthNumber)) {
    console.log(`Skipping ${type} payment reminders for non-tuition month ${monthNumber}.`);
    return {
      skipped: true,
      reason: 'non_tuition_month',
      type,
      year,
      month: monthNumber,
    };
  }

  const groups = await buildPaymentReminderGroups(monthNumber, year);
  const results = [];

  for (const group of groups) {
    try {
      results.push(await sendScheduledPaymentEmail({
        group,
        type,
        year,
        monthNumber,
        monthLabel,
      }));
    } catch (error) {
      console.error(`Error sending ${type} payment email to ${group.sponsorEmail}:`, error);
      results.push({
        status: 'failed',
        sponsorEmail: group.sponsorEmail,
        message: error.message,
      });
    }
  }

  const summary = results.reduce((acc, result) => {
    acc[result.status] = (acc[result.status] || 0) + 1;
    return acc;
  }, {});

  console.log(`Scheduled ${type} payment reminders finished`, {
    year,
    month: monthNumber,
    monthLabel,
    groups: groups.length,
    summary,
  });

  return {
    type,
    year,
    month: monthNumber,
    monthLabel,
    groups: groups.length,
    summary,
  };
}

exports.sendMonthlyPaymentPendingReminders = onSchedule(
  {
    schedule: '0 9 1 * *',
    timeZone: PAYMENT_REMINDER_TIME_ZONE,
    secrets: [sendgridApiKey],
  },
  async () => runScheduledPaymentReminder('pending')
);

exports.sendMonthlyPaymentOverdueReminders = onSchedule(
  {
    schedule: '0 9 11 * *',
    timeZone: PAYMENT_REMINDER_TIME_ZONE,
    secrets: [sendgridApiKey],
  },
  async () => runScheduledPaymentReminder('overdue')
);

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

// Envía recibo de pago por email al patrocinador (SendGrid)
exports.sendPaymentReceiptEmail = onRequest(
  {
    secrets: [sendgridApiKey],
    cors: true,
  },
  async (req, res) => {
    sgMail.setApiKey(sendgridApiKey.value());

    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.set('Access-Control-Max-Age', '3600');
      res.status(204).send('');
      return;
    }
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    try {
      const {
        to,
        sponsorFirstName,
        sponsorLastName,
        studentName,
        studentMatriculationNumber,
        academicYear,
        amount,
        date,
        paymentType,
        receiptNumber,
        monthLabel,
        receiptPdfBase64,
        receiptFilename,
      } = req.body;

      if (!to) {
        res.status(400).json({ error: 'Missing required field: to' });
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(to)) {
        res.status(400).json({ error: 'Invalid email format' });
        return;
      }

      const sponsorName = [sponsorFirstName, sponsorLastName].filter(Boolean).join(' ') || 'Patrocinador/a';

      const attachments = [];
      if (receiptPdfBase64 && receiptFilename) {
        attachments.push({
          content: receiptPdfBase64,
          filename: receiptFilename,
          type: 'application/pdf',
          disposition: 'attachment',
        });
      }

      const msg = {
        to,
        from: 'noreply@escolamaosunidas.com',
        subject: `Recibo de pago - ${studentName} - Escola Mãos Unidas`,
        text: `
Estimado/a ${sponsorName},

Le enviamos el recibo correspondiente al pago realizado para su estudiante apadrinado.

Datos del pago:
- Estudiante: ${studentName}
${studentMatriculationNumber ? `- Número de matrícula: ${studentMatriculationNumber}` : ''}
${academicYear ? `- Ciclo lectivo: ${academicYear}` : ''}
- Tipo: ${paymentType || '-'}
${monthLabel ? `- Mes: ${monthLabel}` : ''}
- Fecha: ${date || '-'}
- Monto: ${amount || '-'}
- Nº de recibo: ${receiptNumber || '-'}

El comprobante en PDF se adjunta a este correo.

Agradecemos profundamente su compromiso con la educación de nuestros estudiantes. Su apoyo hace posible que cada niño y niña pueda acceder a una educación de calidad.

Quedamos a su disposición para cualquier consulta.

Atentamente,
Equipo Escola Mãos Unidas
        `,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #4a5568; border-bottom: 2px solid #659141; padding-bottom: 10px;">
              Recibo de Pago - Escola Mãos Unidas
            </h2>
            <p>Estimado/a <strong>${sponsorName}</strong>,</p>
            <p>Le enviamos el recibo correspondiente al pago realizado para su estudiante apadrinado.</p>
            <div style="background-color: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #659141;">
              <h3 style="color: #2d3748; margin-top: 0;">Datos del pago</h3>
              <p style="margin: 8px 0;"><strong>Estudiante:</strong> ${studentName}</p>
              ${studentMatriculationNumber ? `<p style="margin: 8px 0;"><strong>Nº de matrícula:</strong> ${studentMatriculationNumber}</p>` : ''}
              ${academicYear ? `<p style="margin: 8px 0;"><strong>Ciclo lectivo:</strong> ${academicYear}</p>` : ''}
              <p style="margin: 8px 0;"><strong>Tipo:</strong> ${paymentType || '-'}</p>
              ${monthLabel ? `<p style="margin: 8px 0;"><strong>Mes:</strong> ${monthLabel}</p>` : ''}
              <p style="margin: 8px 0;"><strong>Fecha:</strong> ${date || '-'}</p>
              <p style="margin: 8px 0;"><strong>Monto:</strong> ${amount || '-'}</p>
              <p style="margin: 8px 0;"><strong>Nº de recibo:</strong> ${receiptNumber || '-'}</p>
            </div>
            <p>El comprobante en PDF se adjunta a este correo.</p>
            <p style="color: #4a5568;">Agradecemos profundamente su compromiso con la educación de nuestros estudiantes. Su apoyo hace posible que cada niño y niña pueda acceder a una educación de calidad.</p>
            <p>Quedamos a su disposición para cualquier consulta.</p>
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #718096; font-size: 12px;">
              <p>Atentamente,<br><strong>Equipo Escola Mãos Unidas</strong></p>
              <p>Email: info@escolamaosunidas.com</p>
            </div>
          </div>
        `,
        attachments,
      };

      await sgMail.send(msg);
      res.status(200).json({ success: true, message: 'Receipt email sent successfully' });
    } catch (error) {
      // SendGrid errors include response.body with details
      const details = error.response?.body ? JSON.stringify(error.response.body) : error.message;
      console.error('Error sending receipt email:', error.message, details);
      const userMessage = error.response?.statusCode === 401
        ? 'Configuración de SendGrid incorrecta (API key). Contacte al administrador.'
        : error.message;
      res.status(500).json({ error: 'Failed to send email', message: userMessage });
    }
  }
);

exports.sendOverduePaymentReportEmail = onRequest(
  {
    secrets: [sendgridApiKey],
    cors: true,
  },
  async (req, res) => {
    sgMail.setApiKey(sendgridApiKey.value());

    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.set('Access-Control-Max-Age', '3600');
      res.status(204).send('');
      return;
    }
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    try {
      const authHeader = req.get('Authorization') || '';
      const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

      if (!idToken) {
        res.status(401).json({ error: 'Missing authorization token' });
        return;
      }

      await admin.auth().verifyIdToken(idToken);

      const {
        sponsorEmail,
        sponsorName,
        students,
        total,
      } = req.body;

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!sponsorEmail || !emailRegex.test(sponsorEmail)) {
        res.status(400).json({ error: 'Invalid sponsor email' });
        return;
      }

      if (!Array.isArray(students) || students.length === 0) {
        res.status(400).json({ error: 'Missing overdue students' });
        return;
      }

      const safeStudents = students.map((student) => {
        const overdueMonthLabels = Array.isArray(student.overdueMonthLabels)
          ? student.overdueMonthLabels.filter(Boolean).map(String)
          : [];
        const monthlyFee = Number.parseFloat(student.monthlyFee) || 0;
        const studentTotal = Number.parseFloat(student.total) || (monthlyFee * overdueMonthLabels.length);

        return {
          studentName: String(student.studentName || 'Estudiante'),
          matriculationNumber: String(student.matriculationNumber || ''),
          currentGrade: String(student.currentGrade || ''),
          overdueMonthLabels,
          monthlyFee,
          total: studentTotal,
        };
      });

      const group = {
        sponsorEmail,
        sponsorName: String(sponsorName || 'Patrocinador/a'),
        students: safeStudents,
        total: Number.parseFloat(total) || safeStudents.reduce((sum, student) => sum + student.total, 0),
      };

      await sgMail.send(buildOverduePaymentReportEmail({ group }));

      res.status(200).json({
        success: true,
        message: 'Overdue payment report email sent successfully',
      });
    } catch (error) {
      const details = error.response?.body ? JSON.stringify(error.response.body) : error.message;
      console.error('Error sending overdue payment report email:', error.message, details);
      res.status(500).json({
        error: 'Failed to send email',
        message: error.message,
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
