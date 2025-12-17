import { collection, query, getDocs, getDoc, doc, where, orderBy, addDoc, updateDoc, deleteDoc, limit, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Get all students
 * @returns {Promise<Array>} Array of students
 */
export async function getAllStudents() {
  try {
    const studentsRef = collection(db, 'students');
    const q = query(studentsRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const students = [];
    querySnapshot.forEach((doc) => {
      students.push({ id: doc.id, ...doc.data() });
    });
    
    return students;
  } catch (error) {
    console.error('Error getting students:', error);
    throw error;
  }
}

/**
 * Get a single student by ID
 * @param {string} studentId - The student ID
 * @returns {Promise<Object>} Student data
 */
export async function getStudentById(studentId) {
  try {
    const studentRef = doc(db, 'students', studentId);
    const studentSnap = await getDoc(studentRef);
    
    if (studentSnap.exists()) {
      return { id: studentSnap.id, ...studentSnap.data() };
    } else {
      throw new Error('Student not found');
    }
  } catch (error) {
    console.error('Error getting student:', error);
    throw error;
  }
}

/**
 * Get students by status
 * @param {string} status - Status filter (active, inactive, graduated, suspended)
 * @returns {Promise<Array>} Array of students
 */
export async function getStudentsByStatus(status) {
  try {
    const studentsRef = collection(db, 'students');
    const q = query(
      studentsRef, 
      where('status', '==', status),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    const students = [];
    querySnapshot.forEach((doc) => {
      students.push({ id: doc.id, ...doc.data() });
    });
    
    return students;
  } catch (error) {
    console.error('Error getting students by status:', error);
    throw error;
  }
}

/**
 * Get students by academic year
 * @param {string} academicYear - Academic year (e.g., "2026")
 * @returns {Promise<Array>} Array of students
 */
export async function getStudentsByAcademicYear(academicYear) {
  try {
    const studentsRef = collection(db, 'students');
    const q = query(
      studentsRef, 
      where('academicYear', '==', academicYear),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    const students = [];
    querySnapshot.forEach((doc) => {
      students.push({ id: doc.id, ...doc.data() });
    });
    
    return students;
  } catch (error) {
    console.error('Error getting students by academic year:', error);
    throw error;
  }
}

/**
 * Get student by matriculation number
 * @param {string} matriculationNumber - The matriculation number
 * @returns {Promise<Object|null>} Student data or null
 */
export async function getStudentByMatriculationNumber(matriculationNumber) {
  try {
    const studentsRef = collection(db, 'students');
    const q = query(
      studentsRef, 
      where('matriculationNumber', '==', matriculationNumber)
    );
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    }
    return null;
  } catch (error) {
    console.error('Error getting student by matriculation number:', error);
    throw error;
  }
}

/**
 * Generate next matriculation number
 * @returns {Promise<string>} Next available matriculation number
 */
export async function generateNextMatriculationNumber() {
  try {
    const studentsRef = collection(db, 'students');
    const q = query(studentsRef, orderBy('matriculationNumber', 'desc'), limit(1));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return 'MAT-001';
    }
    
    const lastStudent = querySnapshot.docs[0].data();
    const lastNumber = lastStudent.matriculationNumber || 'MAT-000';
    const numberPart = parseInt(lastNumber.split('-')[1] || '0');
    const nextNumber = (numberPart + 1).toString().padStart(3, '0');
    
    return `MAT-${nextNumber}`;
  } catch (error) {
    console.error('Error generating matriculation number:', error);
    // Fallback to timestamp-based number if orderBy fails
    const timestamp = Date.now().toString().slice(-6);
    return `MAT-${timestamp}`;
  }
}

/**
 * Update student status based on candidate status
 * @param {string} candidateId - The candidate ID
 * @param {string} studentStatus - The new student status ('active' or 'inactive')
 * @returns {Promise<void>}
 */
export async function updateStudentStatusByCandidateId(candidateId, studentStatus) {
  try {
    const existingStudents = await getAllStudents();
    const existingStudent = existingStudents.find(s => s.candidateId === candidateId);
    
    if (existingStudent) {
      const studentRef = doc(db, 'students', existingStudent.id);
      await updateDoc(studentRef, {
        status: studentStatus,
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error(`Error updating student status for candidate ${candidateId}:`, error);
    throw error;
  }
}

/**
 * Create or update a student from an approved candidate
 * @param {Object} candidateData - The candidate data
 * @param {Object} sponsorData - The sponsor data (optional)
 * @returns {Promise<string>} The ID of the created/updated student
 */
export async function createOrUpdateStudentFromCandidate(candidateData, sponsorData = null) {
  try {
    // Check if student already exists for this candidate
    const existingStudents = await getAllStudents();
    const existingStudent = existingStudents.find(s => s.candidateId === candidateData.id);
    
    // Map candidate fields to student fields
    const studentData = {
      firstName: candidateData.firstName || '',
      lastName: candidateData.lastName || '',
      fullName: candidateData.fullName || `${candidateData.firstName || ''} ${candidateData.lastName || ''}`.trim(),
      documentId: candidateData.documentId || '',
      gender: candidateData.gender || '',
      birthDate: candidateData.birthDate || '',
      currentGrade: candidateData.level || 'Jardín',
      academicYear: candidateData.period || new Date().getFullYear().toString(),
      status: 'active',
      paymentStatus: 'pending',
      city: candidateData.city || 'Lichinga',
      province: candidateData.province || 'Niassa',
      country: candidateData.country || 'Mozambique',
      notes: candidateData.notes || '',
      photoURL: candidateData.photoURL || '',
      photoPath: candidateData.photoPath || '',
      candidateId: candidateData.id, // Reference to the candidate
      updatedAt: new Date().toISOString(),
    };

    // Add sponsor information if available
    if (sponsorData || candidateData.sponsorId) {
      studentData.sponsorId = candidateData.sponsorId || sponsorData?.id || null;
      if (sponsorData) {
        studentData.sponsor = {
          firstName: sponsorData.firstName || '',
          lastName: sponsorData.lastName || '',
          email: sponsorData.email || '',
          phone: sponsorData.phone || '',
          address: sponsorData.address || '',
          city: sponsorData.city || '',
          country: sponsorData.country || '',
        };
      }
      studentData.sponsorAssignedDate = candidateData.sponsorAssignedDate || new Date().toISOString();
    }

    if (existingStudent) {
      // Update existing student
      const studentRef = doc(db, 'students', existingStudent.id);
      // Generate matriculation number if not exists
      if (!existingStudent.matriculationNumber) {
        studentData.matriculationNumber = await generateNextMatriculationNumber();
      } else {
        studentData.matriculationNumber = existingStudent.matriculationNumber;
      }
      // Preserve enrollment date if exists
      if (existingStudent.enrollmentDate) {
        studentData.enrollmentDate = existingStudent.enrollmentDate;
      } else {
        studentData.enrollmentDate = new Date().toISOString();
      }
      if (existingStudent.createdAt) {
        studentData.createdAt = existingStudent.createdAt;
      }
      
      await updateDoc(studentRef, studentData);
      return existingStudent.id;
    } else {
      // Create new student
      studentData.matriculationNumber = await generateNextMatriculationNumber();
      studentData.enrollmentDate = new Date().toISOString();
      studentData.createdAt = new Date().toISOString();
      
      const studentsRef = collection(db, 'students');
      const docRef = await addDoc(studentsRef, studentData);
      return docRef.id;
    }
  } catch (error) {
    console.error('Error creating/updating student from candidate:', error);
    throw error;
  }
}

