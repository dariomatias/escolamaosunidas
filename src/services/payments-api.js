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

export const STUDENT_PAYMENT_STATUSES = {
  PAID: 'paid',
  CURRENT: 'current',
  OVERDUE: 'overdue',
  PENDING: 'pending',
  NOT_APPLICABLE: 'not_applicable',
};

export const TUITION_DUE_MONTHS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
export const PAYMENT_GRACE_DAY = 10;

/**
 * Months for payment tracking
 */
export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function isTuitionDueMonth(date = new Date()) {
  return TUITION_DUE_MONTHS.includes(date.getMonth() + 1);
}

function getPaymentDateTime(payment) {
  const paymentDate = payment.date ? new Date(payment.date) : null;
  if (!paymentDate || Number.isNaN(paymentDate.getTime())) return 0;
  return new Date(
    paymentDate.getFullYear(),
    paymentDate.getMonth(),
    paymentDate.getDate()
  ).getTime();
}

function getPaymentPeriodSortValue(payment) {
  if (payment.type === PAYMENT_TYPES.ENROLLMENT) return 0;

  const explicitMonth = Number.parseInt(payment.month, 10);
  if (explicitMonth >= 1 && explicitMonth <= 12) {
    return explicitMonth;
  }

  const paymentDate = payment.date ? new Date(payment.date) : null;
  if (paymentDate && !Number.isNaN(paymentDate.getTime())) {
    return paymentDate.getMonth() + 1;
  }

  return 0;
}

export function sortPaymentsForDisplay(payments) {
  return [...payments].sort((a, b) => {
    const dateDifference = getPaymentDateTime(b) - getPaymentDateTime(a);
    if (dateDifference !== 0) return dateDifference;

    const periodDifference = getPaymentPeriodSortValue(b) - getPaymentPeriodSortValue(a);
    if (periodDifference !== 0) return periodDifference;

    return String(b.id || '').localeCompare(String(a.id || ''));
  });
}

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
    
    return sortPaymentsForDisplay(payments);
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
  // Default payment plan: Enrollment fee + monthly fees from February to November.
  // All amounts are in USD (US Dollars)
  const enrollmentFee = parseFloat(student.enrollmentFee) || 20; // USD
  const monthlyFee = parseFloat(student.monthlyFee) || 40; // USD
  const numberOfMonths = parseInt(student.numberOfMonths) || TUITION_DUE_MONTHS.length;
  
  // If student has full payment amount, use that
  if (student.fullPaymentAmount) {
    return parseFloat(student.fullPaymentAmount) || 420; // USD
  }
  
  return enrollmentFee + (monthlyFee * numberOfMonths);
}

function isPaidForMonth(payment, monthNumber, year) {
  if (payment.status !== PAYMENT_STATUSES.PAID) return false;

  const paymentDate = payment.date ? new Date(payment.date) : null;
  const hasValidPaymentDate = paymentDate && !Number.isNaN(paymentDate.getTime());
  const explicitMonth = Number.parseInt(payment.month, 10);

  if (TUITION_DUE_MONTHS.includes(explicitMonth)) {
    return explicitMonth === monthNumber &&
      (!hasValidPaymentDate || paymentDate.getFullYear() === year);
  }

  if (!hasValidPaymentDate) return false;
  return paymentDate.getMonth() + 1 === monthNumber &&
    paymentDate.getFullYear() === year;
}

export function getOverdueTuitionMonths(payments, date = new Date()) {
  const currentMonthNumber = date.getMonth() + 1;
  const currentYear = date.getFullYear();
  const currentDay = date.getDate();
  const firstDueMonth = TUITION_DUE_MONTHS[0];
  const lastDueMonth = TUITION_DUE_MONTHS[TUITION_DUE_MONTHS.length - 1];

  if (currentMonthNumber < firstDueMonth) {
    return [];
  }

  const dueMonthsToEvaluate = TUITION_DUE_MONTHS.filter((monthNumber) => {
    if (currentMonthNumber > lastDueMonth) return true;
    if (monthNumber < currentMonthNumber) return true;
    return monthNumber === currentMonthNumber && currentDay > PAYMENT_GRACE_DAY;
  });

  return dueMonthsToEvaluate.filter((monthNumber) =>
    !payments.some((payment) => isPaidForMonth(payment, monthNumber, currentYear))
  );
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
    
    let paymentStatus = STUDENT_PAYMENT_STATUSES.PENDING;

    if (student.status === 'inactive') {
      paymentStatus = STUDENT_PAYMENT_STATUSES.NOT_APPLICABLE;
    } else if (totalPaid >= totalDue) {
      paymentStatus = STUDENT_PAYMENT_STATUSES.PAID;
    } else {
      const payments = await getStudentPayments(studentId);
      const now = new Date();
      const currentMonthNumber = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      const currentDay = now.getDate();
      const overdueMonths = getOverdueTuitionMonths(payments, now);

      if (overdueMonths.length > 0) {
        paymentStatus = STUDENT_PAYMENT_STATUSES.OVERDUE;
      } else if (!isTuitionDueMonth(now)) {
        paymentStatus = STUDENT_PAYMENT_STATUSES.CURRENT;
      } else {
        const hasPaidCurrentMonth = payments.some(p =>
          isPaidForMonth(p, currentMonthNumber, currentYear)
        );

        if (hasPaidCurrentMonth) {
          paymentStatus = STUDENT_PAYMENT_STATUSES.CURRENT;
        } else if (currentDay <= PAYMENT_GRACE_DAY) {
          paymentStatus = STUDENT_PAYMENT_STATUSES.PENDING;
        } else {
          paymentStatus = STUDENT_PAYMENT_STATUSES.OVERDUE;
        }
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
