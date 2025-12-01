import { readFile, writeFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { randomUUID } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Raw data from user
const rawData = [
  { apellidos: 'Giovana Esperanza', nombres: '', fechaNacimiento: '03/12/2022', aplicanteA: 'Jardin', comentarios: '' },
  { apellidos: 'Isaque Paulo Anelito Mois', nombres: '', fechaNacimiento: '15/02/2020', aplicanteA: '1 Grado', comentarios: '' },
  { apellidos: 'Letonia Joaquin Abudo', nombres: '', fechaNacimiento: '01/08/2021', aplicanteA: 'Jardin', comentarios: '' },
  { apellidos: 'Alverson Avelios Alves', nombres: '', fechaNacimiento: '08/01/2021', aplicanteA: 'Jardin', comentarios: '' },
  { apellidos: 'Erikson Zito Jacinto', nombres: '', fechaNacimiento: '22/01/2022', aplicanteA: 'Jardin', comentarios: '' },
  { apellidos: 'Fideltone Amilcar Adolfo', nombres: '', fechaNacimiento: '12/05/2021', aplicanteA: 'Jardin', comentarios: '' },
  { apellidos: 'Vanesa alima Adolfo', nombres: '', fechaNacimiento: '', aplicanteA: '1 Grado', comentarios: '' },
  { apellidos: 'Ariel Maxwell da Cruz', nombres: '', fechaNacimiento: '16/03/2023', aplicanteA: 'Jardin', comentarios: '' },
  { apellidos: 'Edina da Diego', nombres: '', fechaNacimiento: '21/11/2021', aplicanteA: 'Jardin', comentarios: '' },
  { apellidos: 'Cristina Jemusse', nombres: '', fechaNacimiento: '09/03/2020', aplicanteA: 'Jardin', comentarios: '' },
  { apellidos: 'David Fernandez Mucheape', nombres: '', fechaNacimiento: '31/03/2018', aplicanteA: '3 Grado', comentarios: '' },
  { apellidos: 'Gerson Ernesto Jose', nombres: '', fechaNacimiento: '29/01/2017', aplicanteA: '4 Grado', comentarios: '' },
  { apellidos: 'Yusney Sansa Flavio Jaime', nombres: '', fechaNacimiento: '06/11/2023', aplicanteA: 'Jardin', comentarios: '' },
  { apellidos: 'Gabriela Filismino Simeao', nombres: '', fechaNacimiento: '', aplicanteA: 'Jardin', comentarios: '' },
  { apellidos: 'Kelvin da Gracinda Dominguez', nombres: '', fechaNacimiento: '10/02/2020', aplicanteA: 'Jardin', comentarios: '' },
  { apellidos: 'Osaias Alberto Reinaldo', nombres: '', fechaNacimiento: '30/09/2019', aplicanteA: '1 Grado', comentarios: '' },
  { apellidos: 'Edivania Eugenio', nombres: '', fechaNacimiento: '14/04/2018', aplicanteA: '', comentarios: '' },
  { apellidos: 'Neyma Eugenio Tuabo', nombres: '', fechaNacimiento: '17/11/2019', aplicanteA: '1 Grado', comentarios: '' },
  { apellidos: 'Miguel Timoteo Paulo', nombres: '', fechaNacimiento: '27/07/2020', aplicanteA: '', comentarios: '' },
  { apellidos: 'Luisa Esperanza Jorge', nombres: '', fechaNacimiento: '03/01/2021', aplicanteA: 'Jardin', comentarios: '' },
  { apellidos: 'Dernilo Arnaldo Julio', nombres: '', fechaNacimiento: '24/01/2021', aplicanteA: '', comentarios: '' },
  { apellidos: 'Ivanildo Esperanza Anibal', nombres: '', fechaNacimiento: '19/01/2020', aplicanteA: '1 Grado', comentarios: '' },
  { apellidos: 'Johana Teodoro Custodio', nombres: '', fechaNacimiento: '09/09/2021', aplicanteA: 'Jardin', comentarios: '' },
  { apellidos: 'Reginaldo Abibo Brito', nombres: '', fechaNacimiento: '09/09/2019', aplicanteA: '1 Grado', comentarios: '' },
  { apellidos: 'Assane Oscar Adriano', nombres: '', fechaNacimiento: '', aplicanteA: '1 Grado', comentarios: 'Gemelo 1' },
  { apellidos: 'Sanito Oscar Adriano', nombres: '', fechaNacimiento: '', aplicanteA: '1 Grado', comentarios: 'Gemelo 2' },
  { apellidos: 'Inacio da Saquina Cambula', nombres: '', fechaNacimiento: '', aplicanteA: '', comentarios: '' },
  { apellidos: 'Samiate Solange Cazembe', nombres: '', fechaNacimiento: '16/06/2018', aplicanteA: '1 Grado', comentarios: '' },
  { apellidos: 'Jesica Arnaldo', nombres: '', fechaNacimiento: '02/09/2019', aplicanteA: '1 Grado', comentarios: '' },
  { apellidos: 'Heleny Arnaldo', nombres: '', fechaNacimiento: '17/09/2021', aplicanteA: 'Jardin', comentarios: '' },
];

// Helper function to convert DD/MM/YYYY to YYYY-MM-DD
function convertDate(dateStr) {
  if (!dateStr || dateStr.trim() === '') return null;
  const parts = dateStr.split('/');
  if (parts.length !== 3) return null;
  const [day, month, year] = parts;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

// Helper function to map level
function mapLevel(levelStr) {
  if (!levelStr || levelStr.trim() === '') return 'Jardín';
  const normalized = levelStr.trim().toLowerCase();
  if (normalized.includes('jardin')) return 'Jardín';
  if (normalized.includes('1') && normalized.includes('grado')) return '1° grado';
  if (normalized.includes('3') && normalized.includes('grado')) return '3º Grado';
  if (normalized.includes('4') && normalized.includes('grado')) return '4º Grado';
  return levelStr.trim();
}

// Helper function to create candidate object
function createCandidate(data) {
  const candidateId = randomUUID();
  const fullName = data.apellidos.trim();
  const birthDate = convertDate(data.fechaNacimiento);
  const level = mapLevel(data.aplicanteA);
  const notes = data.comentarios.trim() || '';
  const now = new Date().toISOString();
  const today = new Date().toISOString().split('T')[0];

  return {
    candidate_id: candidateId,
    fullName: fullName,
    birthDate: birthDate,
    level: level,
    city: 'Lichinga',
    province: 'Niassa',
    country: 'Mozambique',
    photoPath: `candidates/${candidateId}/profile.jpg`,
    status: 'pending',
    period: '2025',
    notes: notes,
    createdAt: now,
    updatedAt: now,
    createdBy: '',
    guardian: {
      firstName: '',
      lastName: '',
      relationship: '',
      phone: '',
      email: '',
      altContact: '',
      idDocument: '',
      consentData: false,
      consentDataDate: null,
      consentImage: false,
      consentImageDate: null,
    },
    household: {
      members: null,
      incomeRange: '',
      guardianEmployment: '',
      housing: '',
      vulnerabilities: [],
      previousSupport: '',
    },
    application: {
      scholarshipType: 'Completa',
      reason: '',
      priority: 'media',
      state: 'pendiente',
      evaluator: '',
      createdOn: today,
      updatedOn: today,
    },
    documents: {
      birthCertPath: '',
      schoolCertPath: '',
      medicalPath: '',
      consentPath: '',
    },
    audit: {
      created_by: '',
      updated_by: '',
      created_at: now,
      updated_at: now,
    },
  };
}

async function addCandidates() {
  try {
    // Read existing candidates
    const candidatesPath = join(__dirname, '..', 'src', 'data', 'candidates.json');
    const existingData = JSON.parse(await readFile(candidatesPath, 'utf-8'));

    // Create new candidates
    const newCandidates = rawData.map(createCandidate);

    // Check for duplicates by fullName
    const existingNames = new Set(existingData.map(c => c.fullName.toLowerCase().trim()));
    const uniqueNewCandidates = newCandidates.filter(c => {
      const name = c.fullName.toLowerCase().trim();
      if (existingNames.has(name)) {
        console.log(`⚠️  Skipping duplicate: ${c.fullName}`);
        return false;
      }
      existingNames.add(name);
      return true;
    });

    // Add new candidates
    const updatedData = [...existingData, ...uniqueNewCandidates];

    // Write back to file
    await writeFile(candidatesPath, JSON.stringify(updatedData, null, 2), 'utf-8');

    console.log(`✅ Added ${uniqueNewCandidates.length} new candidates`);
    console.log(`📊 Total candidates: ${updatedData.length}`);
    console.log(`⚠️  Skipped ${newCandidates.length - uniqueNewCandidates.length} duplicates`);
  } catch (error) {
    console.error('❌ Error adding candidates:', error);
    process.exit(1);
  }
}

addCandidates();

