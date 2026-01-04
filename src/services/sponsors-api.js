import { collection, query, getDocs, getDoc, doc, addDoc, updateDoc, deleteDoc, where, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Get all sponsors
 * @returns {Promise<Array>} Array of sponsors
 */
export async function getAllSponsors() {
  try {
    const sponsorsRef = collection(db, 'sponsors');
    const q = query(sponsorsRef, orderBy('lastName', 'asc'), orderBy('firstName', 'asc'));
    const querySnapshot = await getDocs(q);
    
    const sponsors = [];
    querySnapshot.forEach((doc) => {
      sponsors.push({ id: doc.id, ...doc.data() });
    });
    
    return sponsors;
  } catch (error) {
    console.error('Error getting sponsors:', error);
    throw error;
  }
}

/**
 * Get a single sponsor by ID
 * @param {string} sponsorId - The sponsor ID
 * @returns {Promise<Object>} Sponsor data
 */
export async function getSponsorById(sponsorId) {
  try {
    const sponsorRef = doc(db, 'sponsors', sponsorId);
    const sponsorSnap = await getDoc(sponsorRef);
    
    if (sponsorSnap.exists()) {
      return { id: sponsorSnap.id, ...sponsorSnap.data() };
    } else {
      throw new Error('Sponsor not found');
    }
  } catch (error) {
    console.error('Error getting sponsor:', error);
    throw error;
  }
}

/**
 * Search sponsors by first name or last name
 * @param {string} searchTerm - Search term to match against firstName or lastName
 * @returns {Promise<Array>} Array of matching sponsors
 */
export async function searchSponsors(searchTerm) {
  try {
    if (!searchTerm || searchTerm.trim().length === 0) {
      return [];
    }

    const searchLower = searchTerm.toLowerCase().trim();
    const sponsorsRef = collection(db, 'sponsors');
    
    // Get all sponsors and filter client-side (Firestore doesn't support case-insensitive search easily)
    const q = query(sponsorsRef, orderBy('lastName', 'asc'), orderBy('firstName', 'asc'));
    const querySnapshot = await getDocs(q);
    
    const sponsors = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const firstName = (data.firstName || '').toLowerCase();
      const lastName = (data.lastName || '').toLowerCase();
      const fullName = `${firstName} ${lastName}`.trim();
      
      if (firstName.includes(searchLower) || 
          lastName.includes(searchLower) || 
          fullName.includes(searchLower)) {
        sponsors.push({ id: doc.id, ...data });
      }
    });
    
    return sponsors;
  } catch (error) {
    console.error('Error searching sponsors:', error);
    throw error;
  }
}

/**
 * Create a new sponsor
 * @param {Object} sponsorData - Sponsor data
 * @returns {Promise<string>} The ID of the created sponsor
 */
export async function createSponsor(sponsorData) {
  try {
    const sponsorsRef = collection(db, 'sponsors');
    const newSponsor = {
      ...sponsorData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    const docRef = await addDoc(sponsorsRef, newSponsor);
    return docRef.id;
  } catch (error) {
    console.error('Error creating sponsor:', error);
    throw error;
  }
}

/**
 * Update an existing sponsor
 * @param {string} sponsorId - The sponsor ID
 * @param {Object} sponsorData - Updated sponsor data
 * @returns {Promise<void>}
 */
export async function updateSponsor(sponsorId, sponsorData) {
  try {
    const sponsorRef = doc(db, 'sponsors', sponsorId);
    await updateDoc(sponsorRef, {
      ...sponsorData,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error updating sponsor:', error);
    throw error;
  }
}

/**
 * Get sponsors by candidate ID (sponsors linked to a specific candidate)
 * @param {string} candidateId - The candidate ID
 * @returns {Promise<Array>} Array of sponsors
 */
export async function getSponsorsByCandidate(candidateId) {
  try {
    const sponsorsRef = collection(db, 'sponsors');
    const q = query(sponsorsRef, where('candidateIds', 'array-contains', candidateId));
    const querySnapshot = await getDocs(q);
    
    const sponsors = [];
    querySnapshot.forEach((doc) => {
      sponsors.push({ id: doc.id, ...doc.data() });
    });
    
    return sponsors;
  } catch (error) {
    console.error('Error getting sponsors by candidate:', error);
    throw error;
  }
}

/**
 * Delete a sponsor
 * @param {string} sponsorId - The sponsor ID
 * @returns {Promise<void>}
 */
export async function deleteSponsor(sponsorId) {
  try {
    const sponsorRef = doc(db, 'sponsors', sponsorId);
    await deleteDoc(sponsorRef);
  } catch (error) {
    console.error('Error deleting sponsor:', error);
    throw error;
  }
}

