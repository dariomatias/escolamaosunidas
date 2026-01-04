import { 
  collection, 
  query, 
  getDocs, 
  getDoc, 
  doc, 
  where, 
  orderBy, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Payment types
 */
export const PAYMENT_TYPES = {
  ENROLLMENT: 'enrollment',      // Matrícula
  MONTHLY: 'monthly',            // Cuota mensual
  FULL: 'full',                  // Pago completo
  BALANCE: 'balance',            // Saldo total
  OTHER: 'other',                // Otro
};

/**
 * Payment statuses
 */
export const PAYMENT_STATUSES = {
  PAID: 'paid',
  PENDING: 'pending',
  CANCELLED: 'cancelled',
};

/**
 * Months for payment tracking
 */
export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Get all payments for a student
 * @param {string} studentId - The student ID
 * @returns {Promise<Array>} Array of payments
 */
export async function getStudentPayments(studentId) {
  try {
    const paymentsRef = collection(db, 'students', studentId, 'payments');
    const q = query(paymentsRef, orderBy('date', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const payments = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      payments.push({ 
        id: doc.id, 
        ...data,
        // Convert Firestore Timestamp to ISO string if needed
        date: data.date?.toDate ? data.date.toDate().toISOString() : data.date,
      });
    });
    
    return payments;
  } catch (error) {
    console.error('Error getting student payments:', error);
    throw error;
  }
}

/**
 * Get a single payment by ID
 * @param {string} studentId - The student ID
 * @param {string} paymentId - The payment ID
 * @returns {Promise<Object>} Payment data
 */
export async function getPaymentById(studentId, paymentId) {
  try {
    const paymentRef = doc(db, 'students', studentId, 'payments', paymentId);
    const paymentSnap = await getDoc(paymentRef);
    
    if (paymentSnap.exists()) {
      const data = paymentSnap.data();
      return { 
        id: paymentSnap.id, 
        ...data,
        date: data.date?.toDate ? data.date.toDate().toISOString() : data.date,
      };
    } else {
      throw new Error('Payment not found');
    }
  } catch (error) {
    console.error('Error getting payment:', error);
    throw error;
  }
}

/**
 * Add a new payment for a student
 * @param {string} studentId - The student ID
 * @param {Object} paymentData - Payment data
 * @returns {Promise<string>} Payment ID
 */
export async function addPayment(studentId, paymentData) {
  try {
    const paymentsRef = collection(db, 'students', studentId, 'payments');
    
    // Convert date string to Firestore Timestamp if needed
    const paymentDataWithTimestamp = {
      ...paymentData,
      date: paymentData.date ? Timestamp.fromDate(new Date(paymentData.date)) : Timestamp.now(),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    
    const docRef = await addDoc(paymentsRef, paymentDataWithTimestamp);
    
    // Update student payment status
    await updateStudentPaymentStatus(studentId);
    
    return docRef.id;
  } catch (error) {
    console.error('Error adding payment:', error);
    throw error;
  }
}

/**
 * Update a payment
 * @param {string} studentId - The student ID
 * @param {string} paymentId - The payment ID
 * @param {Object} paymentData - Updated payment data
 */
export async function updatePayment(studentId, paymentId, paymentData) {
  try {
    const paymentRef = doc(db, 'students', studentId, 'payments', paymentId);
    
    const updateData = {
      ...paymentData,
      updatedAt: Timestamp.now(),
    };
    
    // Convert date string to Firestore Timestamp if needed
    if (updateData.date && typeof updateData.date === 'string') {
      updateData.date = Timestamp.fromDate(new Date(updateData.date));
    }
    
    await updateDoc(paymentRef, updateData);
    
    // Update student payment status
    await updateStudentPaymentStatus(studentId);
  } catch (error) {
    console.error('Error updating payment:', error);
    throw error;
  }
}

/**
 * Delete a payment
 * @param {string} studentId - The student ID
 * @param {string} paymentId - The payment ID
 */
export async function deletePayment(studentId, paymentId) {
  try {
    const paymentRef = doc(db, 'students', studentId, 'payments', paymentId);
    await deleteDoc(paymentRef);
    
    // Update student payment status
    await updateStudentPaymentStatus(studentId);
  } catch (error) {
    console.error('Error deleting payment:', error);
    throw error;
  }
}

/**
 * Calculate total paid amount for a student
 * @param {string} studentId - The student ID
 * @returns {Promise<number>} Total paid amount
 */
export async function getTotalPaid(studentId) {
  try {
    const payments = await getStudentPayments(studentId);
    return payments
      .filter(p => p.status === PAYMENT_STATUSES.PAID)
      .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  } catch (error) {
    console.error('Error calculating total paid:', error);
    throw error;
  }
}

/**
 * Calculate total due amount for a student
 * @param {Object} student - Student data with payment plan info
 * @returns {number} Total due amount
 */
export function calculateTotalDue(student) {
  // Default payment plan: Enrollment fee + 10 monthly fees
  // All amounts are in USD (US Dollars)
  const enrollmentFee = parseFloat(student.enrollmentFee) || 20; // USD
  const monthlyFee = parseFloat(student.monthlyFee) || 40; // USD
  const numberOfMonths = parseInt(student.numberOfMonths) || 10;
  
  // If student has full payment amount, use that
  if (student.fullPaymentAmount) {
    return parseFloat(student.fullPaymentAmount) || 420; // USD
  }
  
  return enrollmentFee + (monthlyFee * numberOfMonths);
}

/**
 * Update student payment status based on payments
 * @param {string} studentId - The student ID
 */
export async function updateStudentPaymentStatus(studentId) {
  try {
    const studentRef = doc(db, 'students', studentId);
    const studentSnap = await getDoc(studentRef);
    
    if (!studentSnap.exists()) {
      throw new Error('Student not found');
    }
    
    const student = studentSnap.data();
    const totalDue = calculateTotalDue(student);
    const totalPaid = await getTotalPaid(studentId);
    
    let paymentStatus = 'pending';
    
    if (totalPaid >= totalDue) {
      paymentStatus = 'paid';
    } else {
      // Check if there are overdue payments (simplified logic)
      const payments = await getStudentPayments(studentId);
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      // If we're past the payment month and no payment was made, it's overdue
      // This is a simplified check - you might want to make it more sophisticated
      const hasRecentPayment = payments.some(p => {
        const paymentDate = p.date ? new Date(p.date) : null;
        if (!paymentDate) return false;
        return paymentDate.getMonth() === currentMonth && 
               paymentDate.getFullYear() === currentYear;
      });
      
      if (hasRecentPayment || totalPaid > 0) {
        paymentStatus = 'current';
      } else {
        paymentStatus = 'overdue';
      }
    }
    
    await updateDoc(studentRef, {
      paymentStatus,
      totalPaid,
      totalDue,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error updating student payment status:', error);
    // Don't throw - this is a background update
  }
}

