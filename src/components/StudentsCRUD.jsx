import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc, addDoc, query, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage, auth } from '../config/firebase';
import AdminNavbar from './AdminNavbar';
import { getAllStudents, generateNextMatriculationNumber } from '../services/students-api';
import { 
  getStudentPayments, 
  addPayment, 
  updatePayment, 
  deletePayment,
  getTotalPaid,
  calculateTotalDue,
  PAYMENT_TYPES,
  PAYMENT_STATUSES,
  MONTHS
} from '../services/payments-api';
import {
  ADMIN_TRANSLATIONS,
  ADMIN_DEFAULT_LOCALE,
  ADMIN_LOCALE_STORAGE_KEY,
} from '../i18n/adminTranslations';

const STATUS_OPTIONS = ['active', 'inactive', 'graduated', 'suspended'];
const GRADE_OPTIONS = ['Jardín', '1° grado', '2do grado', '3º Grado', '4º Grado', '5º Grado', '6º Grado'];
const PAYMENT_STATUS_OPTIONS = ['paid', 'current', 'overdue', 'pending'];

const getInitialAdminLocale = () => {
  if (typeof window === 'undefined') {
    return ADMIN_DEFAULT_LOCALE;
  }
  return localStorage.getItem(ADMIN_LOCALE_STORAGE_KEY) || ADMIN_DEFAULT_LOCALE;
};

export default function StudentsCRUD() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPaymentsModal, setShowPaymentsModal] = useState(false);
  const [selectedStudentForPayments, setSelectedStudentForPayments] = useState(null);
  const [locale, setLocale] = useState(() => getInitialAdminLocale());
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [searchText, setSearchText] = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  const [filterAcademicYear, setFilterAcademicYear] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPaymentStatus, setFilterPaymentStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(25);

  const t = ADMIN_TRANSLATIONS[locale] || ADMIN_TRANSLATIONS[ADMIN_DEFAULT_LOCALE];
  const statusLabels = t.students?.statuses || {};
  const paymentStatusLabels = {
    paid: t.students?.payments?.paymentStatusPaid || 'Pagado Completo',
    current: t.students?.payments?.paymentStatusCurrent || 'Al Día',
    overdue: t.students?.payments?.paymentStatusOverdue || 'Atrasado',
    pending: t.students?.payments?.paymentStatusPending || 'Pendiente',
  };

  const getStudentDisplayName = (student) => {
    const first = student.firstName?.trim() || '';
    const last = student.lastName?.trim() || '';
    const combined = `${first} ${last}`.replace(/\s+/g, ' ').trim();
    if (combined.length > 0) return combined;
    return student.fullName || 'Sin nombre';
  };

  const fetchStudents = async () => {
    try {
      setIsLoading(true);
      const studentsList = await getAllStudents();
      setStudents(studentsList);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
      setIsLoading(false);
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm(t.students?.confirm?.delete || '¿Estás seguro de eliminar este estudiante?')) return;
    
    try {
      setIsLoading(true);
      await deleteDoc(doc(db, 'students', id));
      await fetchStudents();
    } catch (error) {
      console.error('Error deleting student:', error);
      alert(t.students?.errors?.delete || 'Error al eliminar estudiante');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendPaymentReminder = async (student) => {
    if (!student.sponsorId && !student.sponsor?.email) {
      alert(t.students?.errors?.noSponsorEmail || 'Este estudiante no tiene un patrocinador con email registrado.');
      return;
    }

    const sponsorEmail = student.sponsor?.email;
    if (!sponsorEmail) {
      alert(t.students?.errors?.noSponsorEmail || 'Este estudiante no tiene un email de patrocinador registrado.');
      return;
    }

    if (!confirm(t.students?.confirm?.sendReminder || `¿Enviar recordatorio de pago a ${sponsorEmail}?`)) {
      return;
    }

    try {
      setIsLoading(true);
      
      // Calculate payment information
      const totalPaid = await getTotalPaid(student.id);
      const totalDue = await calculateTotalDue(student.id);
      
      // Get the Cloud Function URL
      // Using the v2 URL pattern (update after deployment)
      // After deployment, the URL will be: https://sendpaymentreminder-[hash]-uc.a.run.app
      const functionUrl = 'https://sendpaymentreminder-zogw5ohfvq-uc.a.run.app';
      
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sponsorEmail: sponsorEmail,
          sponsorFirstName: student.sponsor?.firstName || '',
          sponsorLastName: student.sponsor?.lastName || '',
          studentName: getStudentDisplayName(student),
          studentMatriculationNumber: student.matriculationNumber || '',
          totalDue: totalDue,
          totalPaid: totalPaid,
          paymentStatus: student.paymentStatus || 'pending',
          academicYear: student.academicYear || '',
        }),
      });

      if (!response.ok) {
        let errorMessage = 'Error al enviar el recordatorio';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (e) {
          // Si no se puede parsear la respuesta, usar el status text
          errorMessage = `Error ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      alert(t.students?.success?.reminderSent || 'Recordatorio de pago enviado exitosamente.');
    } catch (error) {
      console.error('Error sending payment reminder:', error);
      alert(t.students?.errors?.sendReminder || `Error al enviar recordatorio: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (updatedData) => {
    try {
      setIsLoading(true);
      const { id, firstName, lastName, ...rest } = updatedData;
      const studentRef = doc(db, 'students', id);
      const computedFullName = `${(firstName || '').trim()} ${(lastName || '').trim()}`
        .replace(/\s+/g, ' ')
        .trim() || '';
      
      await updateDoc(studentRef, {
        ...rest,
        firstName: firstName || '',
        lastName: lastName || '',
        fullName: computedFullName,
        updatedAt: new Date().toISOString(),
      });
      setEditingStudent(null);
      await fetchStudents();
    } catch (error) {
      console.error('Error updating student:', error);
      alert(t.students?.errors?.update || 'Error al actualizar estudiante');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(ADMIN_LOCALE_STORAGE_KEY, locale);
    }
  }, [locale]);

  // Get unique values for filter dropdowns
  const uniqueGrades = useMemo(() => {
    const grades = students.map(s => s.currentGrade).filter(Boolean);
    return [...new Set(grades)].sort();
  }, [students]);

  const uniqueAcademicYears = useMemo(() => {
    const years = students.map(s => s.academicYear).filter(Boolean);
    return [...new Set(years)].sort().reverse();
  }, [students]);

  const handleClearFilters = () => {
    setSearchText('');
    setFilterGrade('');
    setFilterAcademicYear('');
    setFilterStatus('');
    setFilterPaymentStatus('');
  };

  const sortedStudents = useMemo(() => {
    // First, apply filters
    let filtered = students.filter(student => {
      // Search filter (name, last name, or matriculation number)
      if (searchText.trim()) {
        const searchLower = searchText.toLowerCase().trim();
        const fullName = getStudentDisplayName(student).toLowerCase();
        const firstName = (student.firstName || '').toLowerCase();
        const lastName = (student.lastName || '').toLowerCase();
        const matriculation = (student.matriculationNumber || '').toLowerCase();
        if (!fullName.includes(searchLower) && 
            !firstName.includes(searchLower) && 
            !lastName.includes(searchLower) &&
            !matriculation.includes(searchLower)) {
          return false;
        }
      }

      // Grade filter
      if (filterGrade && student.currentGrade !== filterGrade) {
        return false;
      }

      // Academic year filter
      if (filterAcademicYear && student.academicYear !== filterAcademicYear) {
        return false;
      }

      // Status filter
      if (filterStatus && student.status !== filterStatus) {
        return false;
      }

      // Payment status filter
      if (filterPaymentStatus && student.paymentStatus !== filterPaymentStatus) {
        return false;
      }

      return true;
    });

    // Then, sort the filtered results
    const sorted = [...filtered];
    sorted.sort((a, b) => {
      let aValue, bValue;

      switch (sortField) {
        case 'name':
          aValue = getStudentDisplayName(a).toLowerCase();
          bValue = getStudentDisplayName(b).toLowerCase();
          break;
        case 'matriculation':
          aValue = (a.matriculationNumber || '').toLowerCase();
          bValue = (b.matriculationNumber || '').toLowerCase();
          break;
        case 'grade':
          aValue = (a.currentGrade || '').toLowerCase();
          bValue = (b.currentGrade || '').toLowerCase();
          break;
        case 'academicYear':
          aValue = (a.academicYear || '').toLowerCase();
          bValue = (b.academicYear || '').toLowerCase();
          break;
        case 'status':
          aValue = (statusLabels[a.status] || a.status || '').toLowerCase();
          bValue = (statusLabels[b.status] || b.status || '').toLowerCase();
          break;
        case 'paymentStatus':
          aValue = (paymentStatusLabels[a.paymentStatus] || a.paymentStatus || '').toLowerCase();
          bValue = (paymentStatusLabels[b.paymentStatus] || b.paymentStatus || '').toLowerCase();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [students, sortField, sortDirection, statusLabels, paymentStatusLabels, searchText, filterGrade, filterAcademicYear, filterStatus, filterPaymentStatus]);

  // Pagination logic
  const paginatedStudents = useMemo(() => {
    if (!sortedStudents || sortedStudents.length === 0) return [];
    const totalRecords = sortedStudents.length;
    if (recordsPerPage === 'all') return sortedStudents;
    const startIndex = (currentPage - 1) * recordsPerPage;
    const endIndex = startIndex + recordsPerPage;
    return sortedStudents.slice(startIndex, endIndex);
  }, [sortedStudents, currentPage, recordsPerPage]);

  const totalRecords = sortedStudents.length;
  const totalPages = recordsPerPage === 'all' ? 1 : Math.ceil(totalRecords / recordsPerPage);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchText, filterGrade, filterAcademicYear, filterStatus, filterPaymentStatus, recordsPerPage]);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-olive-600 mx-auto mb-4"></div>
          <p className="text-neutral-600">{t.common?.loading || 'Cargando...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <AdminNavbar onLocaleChange={setLocale} />
      <div className="py-8 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Title and Add Button */}
          <div className="bg-white rounded-2xl shadow-sm border border-olive-100 p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-olive-800 mb-2">{t.students?.header?.title || 'Gestión de Estudiantes'}</h1>
                <p className="text-neutral-600">{t.students?.header?.subtitle || 'Gestiona los estudiantes regulares'}</p>
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-6 py-2 rounded-lg bg-gradient-to-r from-olive-600 to-olive-700 text-white font-semibold hover:from-olive-700 hover:to-olive-800 transition-colors"
              >
                {t.students?.buttons?.addStudent || '+ Agregar Estudiante'}
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-white rounded-xl border border-olive-100 p-6">
              <div className="text-sm text-neutral-600 mb-1">{t.students?.stats?.total || 'Total Estudiantes'}</div>
              <div className="text-3xl font-bold text-olive-700">{students.length}</div>
            </div>
            <div className="bg-white rounded-xl border border-olive-100 p-6">
              <div className="text-sm text-neutral-600 mb-1">{t.students?.stats?.active || 'Activos'}</div>
              <div className="text-3xl font-bold text-green-600">
                {students.filter(s => s.status === 'active').length}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-olive-100 p-6">
              <div className="text-sm text-neutral-600 mb-1">{t.students?.stats?.current || 'Al Día'}</div>
              <div className="text-3xl font-bold text-blue-600">
                {students.filter(s => s.paymentStatus === 'current').length}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-olive-100 p-6">
              <div className="text-sm text-neutral-600 mb-1">{t.students?.stats?.overdue || 'Atrasados'}</div>
              <div className="text-3xl font-bold text-red-600">
                {students.filter(s => s.paymentStatus === 'overdue').length}
              </div>
            </div>
          </div>

          {/* Filters Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-olive-100 p-6 mb-6">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-olive-800 mb-4">{t.students?.filters?.filterBy || 'Filtrar por'}</h2>
              
              {/* Search and Filters Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                {/* Search Input */}
                <div className="lg:col-span-2">
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    {t.students?.filters?.search || 'Buscar'}
                  </label>
                  <input
                    type="text"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    placeholder={t.students?.filters?.searchPlaceholder || 'Buscar por nombre, apellido o matrícula...'}
                    className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500 text-neutral-900"
                  />
                </div>

                {/* Grade Filter */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    {t.students?.filters?.grade || 'Curso'}
                  </label>
                  <select
                    value={filterGrade}
                    onChange={(e) => setFilterGrade(e.target.value)}
                    className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500 text-neutral-900 bg-white"
                  >
                    <option value="">{t.students?.filters?.allGrades || 'Todos los cursos'}</option>
                    {uniqueGrades.map(grade => (
                      <option key={grade} value={grade}>{grade}</option>
                    ))}
                  </select>
                </div>

                {/* Academic Year Filter */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    {t.students?.filters?.academicYear || 'Ciclo Lectivo'}
                  </label>
                  <select
                    value={filterAcademicYear}
                    onChange={(e) => setFilterAcademicYear(e.target.value)}
                    className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500 text-neutral-900 bg-white"
                  >
                    <option value="">{t.students?.filters?.allYears || 'Todos los años'}</option>
                    {uniqueAcademicYears.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>

                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    {t.students?.filters?.status || 'Estado'}
                  </label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500 text-neutral-900 bg-white"
                  >
                    <option value="">{t.students?.filters?.allStatuses || 'Todos los estados'}</option>
                    {STATUS_OPTIONS.map(status => {
                      const label = statusLabels[status] || status;
                      const capitalizedLabel = label.charAt(0).toUpperCase() + label.slice(1);
                      return (
                        <option key={status} value={status}>{capitalizedLabel}</option>
                      );
                    })}
                  </select>
                </div>

                {/* Payment Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    {t.students?.filters?.paymentStatus || 'Condición de Pago'}
                  </label>
                  <select
                    value={filterPaymentStatus}
                    onChange={(e) => setFilterPaymentStatus(e.target.value)}
                    className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500 text-neutral-900 bg-white"
                  >
                    <option value="">{t.students?.filters?.allPaymentStatuses || t.students?.filters?.allStatuses || 'Todas las condiciones'}</option>
                    {PAYMENT_STATUS_OPTIONS.map(paymentStatus => (
                      <option key={paymentStatus} value={paymentStatus}>{paymentStatusLabels[paymentStatus] || paymentStatus}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Clear Filters Button */}
              {(searchText || filterGrade || filterAcademicYear || filterStatus || filterPaymentStatus) && (
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={handleClearFilters}
                    className="px-4 py-2 text-sm font-medium text-olive-700 hover:text-olive-800 hover:bg-olive-50 rounded-lg border border-olive-200 transition-colors"
                  >
                    {t.students?.filters?.clearFilters || 'Limpiar filtros'}
                  </button>
                </div>
              )}

              {/* Results Count */}
              <div className="mt-4 text-sm text-neutral-600">
                {sortedStudents.length} {sortedStudents.length === 1 ? (t.students?.filters?.result || 'resultado') : (t.students?.filters?.results || 'resultados')}
              </div>
            </div>
          </div>

          {/* Students Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-olive-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-olive-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-olive-800 w-16"></th>
                    <th 
                      className="px-6 py-4 text-left text-sm font-semibold text-olive-800 cursor-pointer hover:bg-olive-100 transition-colors select-none"
                      onClick={() => handleSort('matriculation')}
                    >
                      <div className="flex items-center gap-2">
                        <span>{t.students?.table?.matriculationNumber || 'Nº Matrícula'}</span>
                        <div className="flex flex-col">
                          <svg 
                            className={`w-3 h-3 ${sortField === 'matriculation' && sortDirection === 'asc' ? 'text-olive-600' : 'text-olive-300'}`}
                            fill="currentColor" 
                            viewBox="0 0 20 20"
                          >
                            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                          </svg>
                          <svg 
                            className={`w-3 h-3 -mt-1 ${sortField === 'matriculation' && sortDirection === 'desc' ? 'text-olive-600' : 'text-olive-300'}`}
                            fill="currentColor" 
                            viewBox="0 0 20 20"
                          >
                            <path d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" />
                          </svg>
                        </div>
                      </div>
                    </th>
                    <th 
                      className="px-6 py-4 text-left text-sm font-semibold text-olive-800 cursor-pointer hover:bg-olive-100 transition-colors select-none"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center gap-2">
                        <span>{t.students?.table?.name || 'Nombre'}</span>
                        <div className="flex flex-col">
                          <svg 
                            className={`w-3 h-3 ${sortField === 'name' && sortDirection === 'asc' ? 'text-olive-600' : 'text-olive-300'}`}
                            fill="currentColor" 
                            viewBox="0 0 20 20"
                          >
                            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                          </svg>
                          <svg 
                            className={`w-3 h-3 -mt-1 ${sortField === 'name' && sortDirection === 'desc' ? 'text-olive-600' : 'text-olive-300'}`}
                            fill="currentColor" 
                            viewBox="0 0 20 20"
                          >
                            <path d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" />
                          </svg>
                        </div>
                      </div>
                    </th>
                    <th 
                      className="px-6 py-4 text-left text-sm font-semibold text-olive-800 cursor-pointer hover:bg-olive-100 transition-colors select-none"
                      onClick={() => handleSort('grade')}
                    >
                      <div className="flex items-center gap-2">
                        <span>{t.students?.table?.currentGrade || 'Curso'}</span>
                        <div className="flex flex-col">
                          <svg 
                            className={`w-3 h-3 ${sortField === 'grade' && sortDirection === 'asc' ? 'text-olive-600' : 'text-olive-300'}`}
                            fill="currentColor" 
                            viewBox="0 0 20 20"
                          >
                            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                          </svg>
                          <svg 
                            className={`w-3 h-3 -mt-1 ${sortField === 'grade' && sortDirection === 'desc' ? 'text-olive-600' : 'text-olive-300'}`}
                            fill="currentColor" 
                            viewBox="0 0 20 20"
                          >
                            <path d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" />
                          </svg>
                        </div>
                      </div>
                    </th>
                    <th 
                      className="px-6 py-4 text-left text-sm font-semibold text-olive-800 cursor-pointer hover:bg-olive-100 transition-colors select-none"
                      onClick={() => handleSort('academicYear')}
                    >
                      <div className="flex items-center gap-2">
                        <span>{t.students?.table?.academicYear || 'Ciclo Lectivo'}</span>
                        <div className="flex flex-col">
                          <svg 
                            className={`w-3 h-3 ${sortField === 'academicYear' && sortDirection === 'asc' ? 'text-olive-600' : 'text-olive-300'}`}
                            fill="currentColor" 
                            viewBox="0 0 20 20"
                          >
                            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                          </svg>
                          <svg 
                            className={`w-3 h-3 -mt-1 ${sortField === 'academicYear' && sortDirection === 'desc' ? 'text-olive-600' : 'text-olive-300'}`}
                            fill="currentColor" 
                            viewBox="0 0 20 20"
                          >
                            <path d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" />
                          </svg>
                        </div>
                      </div>
                    </th>
                    <th 
                      className="px-6 py-4 text-left text-sm font-semibold text-olive-800 cursor-pointer hover:bg-olive-100 transition-colors select-none"
                      onClick={() => handleSort('status')}
                    >
                      <div className="flex items-center gap-2">
                        <span>{t.students?.table?.status || 'Estado'}</span>
                        <div className="flex flex-col">
                          <svg 
                            className={`w-3 h-3 ${sortField === 'status' && sortDirection === 'asc' ? 'text-olive-600' : 'text-olive-300'}`}
                            fill="currentColor" 
                            viewBox="0 0 20 20"
                          >
                            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                          </svg>
                          <svg 
                            className={`w-3 h-3 -mt-1 ${sortField === 'status' && sortDirection === 'desc' ? 'text-olive-600' : 'text-olive-300'}`}
                            fill="currentColor" 
                            viewBox="0 0 20 20"
                          >
                            <path d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" />
                          </svg>
                        </div>
                      </div>
                    </th>
                    <th 
                      className="px-6 py-4 text-left text-sm font-semibold text-olive-800 cursor-pointer hover:bg-olive-100 transition-colors select-none"
                      onClick={() => handleSort('paymentStatus')}
                    >
                      <div className="flex items-center gap-2">
                        <span>{t.students?.table?.paymentStatus || 'Condición de Pago'}</span>
                        <div className="flex flex-col">
                          <svg 
                            className={`w-3 h-3 ${sortField === 'paymentStatus' && sortDirection === 'asc' ? 'text-olive-600' : 'text-olive-300'}`}
                            fill="currentColor" 
                            viewBox="0 0 20 20"
                          >
                            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                          </svg>
                          <svg 
                            className={`w-3 h-3 -mt-1 ${sortField === 'paymentStatus' && sortDirection === 'desc' ? 'text-olive-600' : 'text-olive-300'}`}
                            fill="currentColor" 
                            viewBox="0 0 20 20"
                          >
                            <path d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" />
                          </svg>
                        </div>
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-olive-800">{t.students?.table?.actions || 'Acciones'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-olive-100">
                  {sortedStudents.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center text-neutral-500">
                        {t.students?.table?.noResults || 'No hay estudiantes que coincidan con los filtros'}
                      </td>
                    </tr>
                  ) : (
                    paginatedStudents.map((student) => (
                      <tr key={student.id} className="hover:bg-olive-50/30 transition-colors">
                        <td className="px-6 py-4">
                          <div 
                            className="relative flex-shrink-0 overflow-hidden rounded-lg border-2 border-olive-200 bg-olive-50 flex items-center justify-center"
                            style={{ width: '48px', height: '48px', minWidth: '48px', minHeight: '48px' }}
                          >
                            {student.gender === 'femenino' || student.gender === 'female' ? (
                              <svg className="w-8 h-8 text-pink-500" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                              </svg>
                            ) : student.gender === 'masculino' || student.gender === 'male' ? (
                              <svg className="w-8 h-8 text-blue-500" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                              </svg>
                            ) : (
                              <svg className="w-8 h-8 text-olive-600" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                              </svg>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-neutral-900">{student.matriculationNumber || '-'}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-neutral-900">{getStudentDisplayName(student)}</div>
                          {student.documentId && (
                            <div className="text-xs text-neutral-500">ID: {student.documentId}</div>
                          )}
                          {student.birthDate && (
                            <div className="text-sm text-neutral-500">
                              {new Date(student.birthDate).toLocaleDateString()}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-neutral-700">{student.currentGrade || '-'}</td>
                        <td className="px-6 py-4 text-neutral-700">{student.academicYear || '-'}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            student.status === 'active' ? 'bg-green-100 text-green-800' :
                            student.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                            student.status === 'graduated' ? 'bg-blue-100 text-blue-800' :
                            student.status === 'suspended' ? 'bg-red-100 text-red-800' :
                            'bg-neutral-100 text-neutral-800'
                          }`}>
                            {statusLabels[student.status] || student.status || 'Desconocido'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            student.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' :
                            student.paymentStatus === 'current' ? 'bg-blue-100 text-blue-800' :
                            student.paymentStatus === 'overdue' ? 'bg-red-100 text-red-800' :
                            student.paymentStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-neutral-100 text-neutral-800'
                          }`}>
                            {paymentStatusLabels[student.paymentStatus] || student.paymentStatus || 'Pendiente'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2 flex-wrap">
                            <button
                              onClick={() => setEditingStudent(student)}
                              className="px-3 py-1 text-sm bg-olive-600 text-white rounded hover:bg-olive-700 transition-colors"
                            >
                              {t.students?.table?.edit || 'Editar'}
                            </button>
                            <button
                              onClick={() => handleDelete(student.id)}
                              className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                            >
                              {t.students?.table?.delete || 'Eliminar'}
                            </button>
                            {(student.sponsorId || student.sponsor?.email) && (
                              <button
                                onClick={() => handleSendPaymentReminder(student)}
                                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-1"
                                title={t.students?.table?.sendReminder || 'Enviar recordatorio de pago'}
                                disabled={isLoading}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                {t.students?.table?.reminder || 'Recordatorio'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payments Management Modal */}
          {showPaymentsModal && selectedStudentForPayments && (
            <PaymentsModal
              student={selectedStudentForPayments}
              onClose={() => {
                setShowPaymentsModal(false);
                setSelectedStudentForPayments(null);
                fetchStudents(); // Refresh student list to update payment status
              }}
              t={t}
            />
          )}

          {/* Add/Edit Student Modal */}
          {(showAddModal || editingStudent) && (
            <StudentFormModal
              student={editingStudent}
              onClose={() => {
                setShowAddModal(false);
                setEditingStudent(null);
              }}
              onSave={async (studentData) => {
                try {
                  setIsLoading(true);
                  if (editingStudent) {
                    await handleSave({ ...studentData, id: editingStudent.id });
                  } else {
                    const matriculationNumber = await generateNextMatriculationNumber();
                    await addDoc(collection(db, 'students'), {
                      ...studentData,
                      matriculationNumber,
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                    });
                    setShowAddModal(false);
                    await fetchStudents();
                  }
                } catch (error) {
                  console.error('Error saving student:', error);
                  alert(t.students?.errors?.add || 'Error al guardar estudiante');
                } finally {
                  setIsLoading(false);
                }
              }}
              t={t}
              statusOptions={STATUS_OPTIONS}
              gradeOptions={GRADE_OPTIONS}
              paymentStatusOptions={PAYMENT_STATUS_OPTIONS}
              statusLabels={statusLabels}
              paymentStatusLabels={paymentStatusLabels}
            />
          )}

          {/* Loading Overlay */}
          {isLoading && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
              <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-4">
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 border-4 border-olive-200 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-olive-600 rounded-full border-t-transparent animate-spin"></div>
                </div>
                <p className="text-lg font-semibold text-neutral-700">Cargando...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Student Form Modal Component
function StudentFormModal({ 
  student, 
  onClose, 
  onSave, 
  t, 
  statusOptions = [], 
  gradeOptions = [], 
  paymentStatusOptions = [],
  statusLabels = {},
  paymentStatusLabels = {}
}) {
  const formatDateToInput = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      return date.toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  const [formData, setFormData] = useState({
    firstName: student?.firstName || '',
    lastName: student?.lastName || '',
    documentId: student?.documentId || '',
    gender: student?.gender || '',
    birthDate: formatDateToInput(student?.birthDate),
    matriculationNumber: student?.matriculationNumber || '',
    enrollmentDate: formatDateToInput(student?.enrollmentDate) || formatDateToInput(new Date().toISOString()),
    currentGrade: student?.currentGrade || '',
    academicYear: student?.academicYear || new Date().getFullYear().toString(),
    status: student?.status || 'active',
    paymentStatus: student?.paymentStatus || 'pending',
    city: student?.city || 'Lichinga',
    province: student?.province || 'Niassa',
    country: student?.country || 'Mozambique',
    notes: student?.notes || '',
    photoURL: student?.photoURL || '',
    photoPath: student?.photoPath || '',
    sponsorId: student?.sponsorId || '',
    sponsor: student?.sponsor || null,
    sponsorAssignedDate: student?.sponsorAssignedDate || '',
    candidateId: student?.candidateId || '', // Reference to the candidate that created this student
  });

  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(student?.photoURL || null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [errors, setErrors] = useState({});

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('La foto debe ser menor a 5MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        alert('Por favor selecciona un archivo de imagen');
        return;
      }
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    setFormData(prev => ({ ...prev, photoURL: '', photoPath: '' }));
  };

  const uploadPhoto = async () => {
    if (!photoFile) return null;

    if (!auth.currentUser) {
      alert('Debes estar autenticado para subir fotos');
      return null;
    }

    try {
      setUploadingPhoto(true);
      const studentId = student?.id || `temp-${Date.now()}`;
      const fileExtension = photoFile.name.split('.').pop();
      const photoPath = `students/${studentId}/profile.${fileExtension}`;
      const storageRef = ref(storage, photoPath);
      
      await uploadBytes(storageRef, photoFile);
      const downloadURL = await getDownloadURL(storageRef);
      
      return { photoURL: downloadURL, photoPath };
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('Error al subir la foto');
      return null;
    } finally {
      setUploadingPhoto(false);
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.firstName.trim()) {
      newErrors.firstName = t.students?.forms?.required || 'Requerido';
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = t.students?.forms?.required || 'Requerido';
    }
    if (!formData.birthDate) {
      newErrors.birthDate = t.students?.forms?.required || 'Requerido';
    }
    if (!formData.currentGrade) {
      newErrors.currentGrade = t.students?.forms?.required || 'Requerido';
    }
    if (!formData.academicYear) {
      newErrors.academicYear = t.students?.forms?.required || 'Requerido';
    }
    if (!formData.documentId || !formData.documentId.trim()) {
      newErrors.documentId = t.students?.forms?.required || 'Requerido';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    let photoData = {};
    if (photoFile) {
      const uploaded = await uploadPhoto();
      if (uploaded) {
        photoData = uploaded;
      }
    } else if (formData.photoURL) {
      photoData = { photoURL: formData.photoURL, photoPath: formData.photoPath };
    }

    const trimmedFirstName = (formData.firstName || '').trim();
    const trimmedLastName = (formData.lastName || '').trim();
    const fullName = `${trimmedFirstName} ${trimmedLastName}`.replace(/\s+/g, ' ').trim();

    const studentData = {
      ...formData,
      firstName: trimmedFirstName,
      lastName: trimmedLastName,
      fullName,
      ...photoData,
    };

    onSave(studentData);
  };

  const isEditMode = !!student;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-olive-100 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-2xl font-bold text-olive-800">
            {isEditMode ? (t.students?.forms?.editTitle || 'Editar Estudiante') : (t.students?.forms?.addTitle || 'Agregar Estudiante')}
          </h2>
          <button 
            onClick={onClose} 
            className="text-neutral-400 hover:text-neutral-600 text-3xl font-bold leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="border-b border-olive-100 pb-4">
              <h3 className="text-lg font-semibold text-olive-800 mb-4">{t.students?.forms?.basicInfo || 'Información Básica'}</h3>
              
              {/* Photo */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-neutral-700 mb-2">{t.students?.forms?.photo || 'Foto de Perfil'}</label>
                <div className="flex items-center gap-4">
                  {photoPreview ? (
                    <div className="relative">
                      <img 
                        src={photoPreview} 
                        alt="Preview" 
                        className="w-24 h-24 rounded-lg object-cover border-2 border-olive-200"
                      />
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                        title={t.students?.forms?.photoRemove || 'Eliminar Foto'}
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-lg border-2 border-dashed border-olive-200 flex items-center justify-center bg-olive-50">
                      <svg className="w-8 h-8 text-olive-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  <div>
                    <input
                      type="file"
                      id="photo-upload"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                    <label
                      htmlFor="photo-upload"
                      className="inline-block px-4 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700 cursor-pointer transition-colors"
                    >
                      {t.students?.forms?.photoUpload || 'Subir Foto'}
                    </label>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    {t.students?.forms?.firstName || 'Nombres'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500 text-neutral-900 ${errors.firstName ? 'border-red-500' : 'border-olive-200'}`}
                  />
                  {errors.firstName && <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    {t.students?.forms?.lastName || 'Apellidos'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500 text-neutral-900 ${errors.lastName ? 'border-red-500' : 'border-olive-200'}`}
                  />
                  {errors.lastName && <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    {t.students?.forms?.documentId || 'Documento de Identidad'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.documentId}
                    onChange={(e) => setFormData(prev => ({ ...prev, documentId: e.target.value }))}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500 text-neutral-900 ${errors.documentId ? 'border-red-500' : 'border-olive-200'}`}
                    placeholder={t.students?.forms?.documentIdPlaceholder || 'Número de documento'}
                  />
                  {errors.documentId && <p className="text-red-500 text-sm mt-1">{errors.documentId}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    {t.students?.forms?.gender || 'Género'}
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value }))}
                    className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500 text-neutral-900 bg-white"
                  >
                    <option value="">{t.students?.forms?.selectPlaceholder || 'Seleccionar'}</option>
                    <option value="masculino">{t.students?.forms?.genderMale || 'Masculino'}</option>
                    <option value="femenino">{t.students?.forms?.genderFemale || 'Femenino'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    {t.students?.forms?.birthDate || 'Fecha de Nacimiento'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.birthDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, birthDate: e.target.value }))}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500 text-neutral-900 ${errors.birthDate ? 'border-red-500' : 'border-olive-200'}`}
                  />
                  {errors.birthDate && <p className="text-red-500 text-sm mt-1">{errors.birthDate}</p>}
                </div>

                {isEditMode && (
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      {t.students?.forms?.matriculationNumber || 'Número de Matrícula'}
                    </label>
                    <input
                      type="text"
                      value={formData.matriculationNumber}
                      disabled
                      className="w-full px-4 py-2 border border-olive-200 rounded-lg bg-neutral-100 text-neutral-600 cursor-not-allowed"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    {t.students?.forms?.enrollmentDate || 'Fecha de Matriculación'}
                  </label>
                  <input
                    type="date"
                    value={formData.enrollmentDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, enrollmentDate: e.target.value }))}
                    className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500 text-neutral-900"
                  />
                </div>
              </div>
            </div>

            {/* Academic Information */}
            <div className="border-b border-olive-100 pb-4">
              <h3 className="text-lg font-semibold text-olive-800 mb-4">{t.students?.forms?.academicInfo || 'Información Académica'}</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    {t.students?.forms?.currentGrade || 'Curso Actual'} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.currentGrade}
                    onChange={(e) => setFormData(prev => ({ ...prev, currentGrade: e.target.value }))}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500 text-neutral-900 bg-white ${errors.currentGrade ? 'border-red-500' : 'border-olive-200'}`}
                  >
                    <option value="">{t.students?.forms?.selectPlaceholder || 'Seleccionar'}</option>
                    {gradeOptions.map(grade => (
                      <option key={grade} value={grade}>{grade}</option>
                    ))}
                  </select>
                  {errors.currentGrade && <p className="text-red-500 text-sm mt-1">{errors.currentGrade}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    {t.students?.forms?.academicYear || 'Ciclo Lectivo'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.academicYear}
                    onChange={(e) => setFormData(prev => ({ ...prev, academicYear: e.target.value }))}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500 text-neutral-900 ${errors.academicYear ? 'border-red-500' : 'border-olive-200'}`}
                    placeholder="2025"
                  />
                  {errors.academicYear && <p className="text-red-500 text-sm mt-1">{errors.academicYear}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    {t.students?.forms?.status || 'Estado'}
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500 text-neutral-900 bg-white"
                  >
                    {statusOptions.map(status => (
                      <option key={status} value={status}>{statusLabels[status] || status}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    {t.students?.forms?.paymentStatus || 'Condición de Pago'}
                  </label>
                  <select
                    value={formData.paymentStatus}
                    onChange={(e) => setFormData(prev => ({ ...prev, paymentStatus: e.target.value }))}
                    className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500 text-neutral-900 bg-white"
                  >
                    {paymentStatusOptions.map(paymentStatus => (
                      <option key={paymentStatus} value={paymentStatus}>{paymentStatusLabels[paymentStatus] || paymentStatus}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Location Information */}
            <div className="border-b border-olive-100 pb-4">
              <h3 className="text-lg font-semibold text-olive-800 mb-4">{t.students?.forms?.locationInfo || 'Ubicación'}</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    {t.students?.forms?.city || 'Ciudad'}
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                    className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500 text-neutral-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    {t.students?.forms?.province || 'Provincia'}
                  </label>
                  <input
                    type="text"
                    value={formData.province}
                    onChange={(e) => setFormData(prev => ({ ...prev, province: e.target.value }))}
                    className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500 text-neutral-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    {t.students?.forms?.country || 'País'}
                  </label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                    className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500 text-neutral-900"
                  />
                </div>
              </div>
            </div>

            {/* Sponsor Information (Optional) */}
            <div className="border-b border-olive-100 pb-4">
              <h3 className="text-lg font-semibold text-olive-800 mb-4">{t.students?.forms?.sponsorInfo || 'Información del Patrocinador (Opcional)'}</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    {t.students?.forms?.sponsorFirstName || 'Nombre del Patrocinador'}
                  </label>
                  <input
                    type="text"
                    value={formData.sponsor?.firstName || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      sponsor: { ...(prev.sponsor || {}), firstName: e.target.value }
                    }))}
                    className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500 text-neutral-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    {t.students?.forms?.sponsorLastName || 'Apellido del Patrocinador'}
                  </label>
                  <input
                    type="text"
                    value={formData.sponsor?.lastName || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      sponsor: { ...(prev.sponsor || {}), lastName: e.target.value }
                    }))}
                    className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500 text-neutral-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    {t.students?.forms?.sponsorEmail || 'Email del Patrocinador'}
                  </label>
                  <input
                    type="email"
                    value={formData.sponsor?.email || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      sponsor: { ...(prev.sponsor || {}), email: e.target.value }
                    }))}
                    className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500 text-neutral-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    {t.students?.forms?.sponsorPhone || 'Teléfono del Patrocinador'}
                  </label>
                  <input
                    type="text"
                    value={formData.sponsor?.phone || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      sponsor: { ...(prev.sponsor || {}), phone: e.target.value }
                    }))}
                    className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500 text-neutral-900"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    {t.students?.forms?.sponsorAddress || 'Dirección del Patrocinador'}
                  </label>
                  <input
                    type="text"
                    value={formData.sponsor?.address || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      sponsor: { ...(prev.sponsor || {}), address: e.target.value }
                    }))}
                    className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500 text-neutral-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    {t.students?.forms?.sponsorCity || 'Ciudad del Patrocinador'}
                  </label>
                  <input
                    type="text"
                    value={formData.sponsor?.city || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      sponsor: { ...(prev.sponsor || {}), city: e.target.value }
                    }))}
                    className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500 text-neutral-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    {t.students?.forms?.sponsorCountry || 'País del Patrocinador'}
                  </label>
                  <input
                    type="text"
                    value={formData.sponsor?.country || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      sponsor: { ...(prev.sponsor || {}), country: e.target.value }
                    }))}
                    className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500 text-neutral-900"
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                {t.students?.forms?.notes || 'Notas Generales'}
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={4}
                className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500 text-neutral-900"
                placeholder={t.students?.forms?.notesPlaceholder || 'Notas adicionales sobre el estudiante...'}
              />
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-4 pt-4 border-t border-olive-100">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 border border-olive-300 text-olive-700 rounded-lg hover:bg-olive-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={uploadingPhoto}
                className="px-6 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploadingPhoto ? 'Subiendo...' : (isEditMode ? 'Guardar' : 'Agregar')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
