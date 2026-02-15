import { collection, query, getDocs, getDoc, doc, where, orderBy, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Get all candidates
 * @returns {Promise<Array>} Array of candidates
 */
export async function getAllCandidates() {
  try {
    const candidatesRef = collection(db, 'candidates');
    const q = query(candidatesRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const candidates = [];
    querySnapshot.forEach((doc) => {
      candidates.push({ id: doc.id, ...doc.data() });
    });
    
    return candidates;
  } catch (error) {
    console.error('Error getting candidates:', error);
    throw error;
  }
}

/**
 * Get a single candidate by ID
 * @param {string} candidateId - The candidate ID
 * @returns {Promise<Object>} Candidate data
 */
export async function getCandidateById(candidateId) {
  try {
    const candidateRef = doc(db, 'candidates', candidateId);
    const candidateSnap = await getDoc(candidateRef);
    
    if (candidateSnap.exists()) {
      return { id: candidateSnap.id, ...candidateSnap.data() };
    } else {
      throw new Error('Candidate not found');
    }
  } catch (error) {
    console.error('Error getting candidate:', error);
    throw error;
  }
}

/**
 * Get candidates by status
 * @param {string} status - Status filter (pending, active, archived, etc.)
 * @returns {Promise<Array>} Array of candidates
 */
export async function getCandidatesByStatus(status) {
  try {
    const candidatesRef = collection(db, 'candidates');
    const q = query(
      candidatesRef, 
      where('status', '==', status),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    const candidates = [];
    querySnapshot.forEach((doc) => {
      candidates.push({ id: doc.id, ...doc.data() });
    });
    
    return candidates;
  } catch (error) {
    console.error('Error getting candidates by status:', error);
    throw error;
  }
}

/**
 * Get candidates by period
 * @param {string} period - Period filter (e.g., "2025")
 * @returns {Promise<Array>} Array of candidates
 */
export async function getCandidatesByPeriod(period) {
  try {
    const candidatesRef = collection(db, 'candidates');
    const q = query(
      candidatesRef, 
      where('period', '==', period),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    const candidates = [];
    querySnapshot.forEach((doc) => {
      candidates.push({ id: doc.id, ...doc.data() });
    });
    
    return candidates;
  } catch (error) {
    console.error('Error getting candidates by period:', error);
    throw error;
  }
}

/**
 * Get public candidates (pending status only, without sensitive data)
 * @returns {Promise<Array>} Array of public candidate data
 */
export async function getPublicCandidates() {
  try {
    const candidatesRef = collection(db, 'candidates');
    const q = query(
      candidatesRef,
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    const candidates = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      // Remove sensitive data before returning
      const { guardian, household, audit, ...publicData } = data;
      candidates.push({ 
        id: doc.id,
        ...publicData,
        // Keep basic info but remove sensitive guardian details
        guardian: {
          relationship: data.guardian?.relationship || '',
          // Don't expose personal contact info
        }
      });
    });
    
    return candidates;
  } catch (error) {
    console.error('Error getting public candidates:', error);
    throw error;
  }
}

/**
 * Update candidate data from student data (for synchronization)
 * @param {string} candidateId - The candidate ID
 * @param {Object} studentData - The student data to sync
 * @returns {Promise<void>}
 */
export async function updateCandidateFromStudent(candidateId, studentData) {
  try {
    const candidateRef = doc(db, 'candidates', candidateId);
    
    // Map student fields to candidate fields
    const updateData = {
      firstName: studentData.firstName || '',
      lastName: studentData.lastName || '',
      fullName: studentData.fullName || `${studentData.firstName || ''} ${studentData.lastName || ''}`.trim(),
      documentId: studentData.documentId || '',
      gender: studentData.gender || '',
      birthDate: studentData.birthDate || '',
      level: studentData.currentGrade || '',
      period: studentData.academicYear || '',
      city: studentData.city || '',
      province: studentData.province || '',
      country: studentData.country || '',
      notes: studentData.notes || '',
      photoURL: studentData.photoURL || '',
      photoPath: studentData.photoPath || '',
      updatedAt: new Date().toISOString(),
    };
    
    await updateDoc(candidateRef, updateData);
  } catch (error) {
    console.error('Error updating candidate from student:', error);
    throw error;
  }
}

/**
 * Get candidate by student ID (via candidateId field in student)
 * @param {string} studentId - The student ID
 * @returns {Promise<Object|null>} Candidate data or null
 */
export async function getCandidateByStudentId(studentId) {
  try {
    // First get the student to find candidateId
    const { getStudentById } = await import('./students-api');
    const student = await getStudentById(studentId);
    
    if (student.candidateId) {
      return await getCandidateById(student.candidateId);
    }
    
    return null;
  } catch (error) {
    console.error('Error getting candidate by student ID:', error);
    return null;
  }
}
