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
  const [viewingStudent, setViewingStudent] = useState(null);
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
  const [filterSponsor, setFilterSponsor] = useState('');
  const [visibleItems, setVisibleItems] = useState(50); // Number of items to render initially
  const [showSponsorColumn, setShowSponsorColumn] = useState(false);

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

  // Helper function for date formatting (dd/mm/yyyy) - handles timezone issues
  const formatDateToDDMMYYYY = (dateString) => {
    if (!dateString) return '';
    try {
      // Handle ISO date strings (YYYY-MM-DD) without timezone issues
      let date;
      if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        // If it's YYYY-MM-DD format, parse it as local date to avoid timezone issues
        const [year, month, day] = dateString.split('-').map(Number);
        date = new Date(year, month - 1, day);
      } else if (typeof dateString === 'string' && dateString.includes('T')) {
        // If it's an ISO string with time, parse it carefully
        date = new Date(dateString);
      } else {
        date = new Date(dateString);
      }
      
      if (isNaN(date.getTime())) return '';
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return '';
    }
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
      
      // Get current student state to check if status is changing
      const currentStudent = students.find(s => s.id === id);
      const isStatusChangingToInactive = currentStudent?.status !== 'inactive' && rest.status === 'inactive';
      const hasSponsorId = currentStudent?.sponsorId || currentStudent?.sponsor;
      
      // Prepare update data
      const updateData = { ...rest };
      
      // If changing status to inactive, clear sponsor information
      if (isStatusChangingToInactive && hasSponsorId) {
        if (!confirm(t.students?.confirm?.clearSponsor || 'El estudiante será marcado como inactivo. ¿Deseas eliminar la información del patrocinador?')) {
          setIsLoading(false);
          return; // User cancelled
        }
        
        updateData.sponsorId = deleteField();
        updateData.sponsor = deleteField();
        updateData.sponsorAssignedDate = deleteField();
      }
      
      const studentRef = doc(db, 'students', id);
      const computedFullName = `${(firstName || '').trim()} ${(lastName || '').trim()}`
        .replace(/\s+/g, ' ')
        .trim() || '';
      
      const finalStudentData = {
        ...updateData,
        firstName: firstName || '',
        lastName: lastName || '',
        fullName: computedFullName,
        updatedAt: new Date().toISOString(),
      };
      
      await updateDoc(studentRef, finalStudentData);
      
      // Sync student data to associated candidate (if exists)
      const candidateId = currentStudent?.candidateId;
      if (candidateId) {
        try {
          const { updateCandidateFromStudent } = await import('../services/candidates-api');
          // Use the final updated student data for synchronization
          await updateCandidateFromStudent(candidateId, {
            firstName: finalStudentData.firstName,
            lastName: finalStudentData.lastName,
            fullName: finalStudentData.fullName,
            documentId: finalStudentData.documentId || '',
            gender: finalStudentData.gender || '',
            birthDate: finalStudentData.birthDate || '',
            currentGrade: finalStudentData.currentGrade || '',
            academicYear: finalStudentData.academicYear || '',
            city: finalStudentData.city || '',
            province: finalStudentData.province || '',
            country: finalStudentData.country || '',
            notes: finalStudentData.notes || '',
            // Use the photo data from the final update (includes newly uploaded photos)
            photoURL: finalStudentData.photoURL || '',
            photoPath: finalStudentData.photoPath || '',
          });
        } catch (candidateError) {
          console.error('Error syncing student to candidate:', candidateError);
          // Don't block the student update if candidate sync fails
        }
      }
      
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

  // Get unique sponsors for filter dropdown
  const uniqueSponsors = useMemo(() => {
    const sponsors = students
      .filter(s => s.sponsor && (s.sponsor.firstName || s.sponsor.lastName))
      .map(s => {
        const fullName = `${s.sponsor.firstName || ''} ${s.sponsor.lastName || ''}`.trim();
        return { id: s.sponsorId || fullName, name: fullName };
      })
      .filter(sponsor => sponsor.name);
    
    // Remove duplicates by name
    const unique = [];
    const seen = new Set();
    sponsors.forEach(sponsor => {
      if (!seen.has(sponsor.name)) {
        seen.add(sponsor.name);
        unique.push(sponsor);
      }
    });
    
    return unique.sort((a, b) => a.name.localeCompare(b.name));
  }, [students]);

  const handleClearFilters = () => {
    setSearchText('');
    setFilterGrade('');
    setFilterAcademicYear('');
    setFilterStatus('');
    setFilterPaymentStatus('');
    setFilterSponsor('');
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

      // Sponsor filter
      if (filterSponsor) {
        if (!student.sponsor) return false;
        const sponsorFullName = `${student.sponsor.firstName || ''} ${student.sponsor.lastName || ''}`.trim();
        if (sponsorFullName !== filterSponsor) {
          return false;
        }
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
        case 'sponsor':
          const aSponsorName = a.sponsor ? `${a.sponsor.firstName || ''} ${a.sponsor.lastName || ''}`.trim() : '';
          const bSponsorName = b.sponsor ? `${b.sponsor.firstName || ''} ${b.sponsor.lastName || ''}`.trim() : '';
          aValue = aSponsorName.toLowerCase();
          bValue = bSponsorName.toLowerCase();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [students, sortField, sortDirection, statusLabels, paymentStatusLabels, searchText, filterGrade, filterAcademicYear, filterStatus, filterPaymentStatus, filterSponsor]);

  // Virtual scrolling - render items as you scroll
  const displayedStudents = useMemo(() => {
    return sortedStudents.slice(0, visibleItems);
  }, [sortedStudents, visibleItems]);

  // Reset visible items when filters change
  useEffect(() => {
    setVisibleItems(50);
  }, [searchText, filterGrade, filterAcademicYear, filterStatus, filterPaymentStatus, filterSponsor]);

  // Infinite scroll handler - using window scroll for page-level scrolling
  useEffect(() => {
    const handleScroll = () => {
      const scrollBottom = window.innerHeight + window.scrollY;
      const documentHeight = document.documentElement.scrollHeight;
      
      // Load more when within 500px of bottom
      if (documentHeight - scrollBottom < 500 && visibleItems < sortedStudents.length) {
        setVisibleItems(prev => Math.min(prev + 50, sortedStudents.length));
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [visibleItems, sortedStudents.length]);

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

                {/* Sponsor Filter - Only show when column is visible */}
                {showSponsorColumn && (
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      {t.students?.filters?.sponsor || 'Padrino'}
                    </label>
                    <select
                      value={filterSponsor}
                      onChange={(e) => setFilterSponsor(e.target.value)}
                      className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500 text-neutral-900 bg-white"
                    >
                      <option value="">{t.students?.filters?.allSponsors || 'Todos los padrinos'}</option>
                      {uniqueSponsors.map(sponsor => (
                        <option key={sponsor.id} value={sponsor.name}>{sponsor.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Clear Filters Button */}
              {(searchText || filterGrade || filterAcademicYear || filterStatus || filterPaymentStatus || filterSponsor) && (
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
            {/* Toggle for Sponsor Column */}
            <div className="px-6 py-4 border-b border-olive-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-olive-800">{t.students?.table?.title || 'Lista de Estudiantes'}</h3>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-sm text-neutral-700">{t.students?.table?.showSponsor || 'Mostrar Padrino'}</span>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={showSponsorColumn}
                    onChange={(e) => setShowSponsorColumn(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`w-11 h-6 rounded-full transition-colors ${showSponsorColumn ? 'bg-olive-600' : 'bg-neutral-300'}`}>
                    <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${showSponsorColumn ? 'translate-x-5' : 'translate-x-0.5'} mt-0.5`}></div>
                  </div>
                </div>
              </label>
            </div>
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
                    {showSponsorColumn && (
                      <th 
                        className="px-6 py-4 text-left text-sm font-semibold text-olive-800 cursor-pointer hover:bg-olive-100 transition-colors select-none"
                        onClick={() => handleSort('sponsor')}
                      >
                        <div className="flex items-center gap-2">
                          <span>{t.students?.table?.sponsor || 'Padrino'}</span>
                          <div className="flex flex-col">
                            <svg 
                              className={`w-3 h-3 ${sortField === 'sponsor' && sortDirection === 'asc' ? 'text-olive-600' : 'text-olive-300'}`}
                              fill="currentColor" 
                              viewBox="0 0 20 20"
                            >
                              <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                            </svg>
                            <svg 
                              className={`w-3 h-3 -mt-1 ${sortField === 'sponsor' && sortDirection === 'desc' ? 'text-olive-600' : 'text-olive-300'}`}
                              fill="currentColor" 
                              viewBox="0 0 20 20"
                            >
                              <path d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" />
                            </svg>
                          </div>
                        </div>
                      </th>
                    )}
                    <th className="px-6 py-4 text-left text-sm font-semibold text-olive-800">{t.students?.table?.actions || 'Acciones'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-olive-100">
                  {displayedStudents.length === 0 ? (
                    <tr>
                      <td colSpan={showSponsorColumn ? 8 : 7} className="px-6 py-12 text-center text-neutral-500">
                        {t.students?.table?.noResults || 'No hay estudiantes que coincidan con los filtros'}
                      </td>
                    </tr>
                  ) : (
                    displayedStudents.map((student) => (
                      <tr 
                        key={student.id} 
                        onClick={() => setViewingStudent(student)}
                        className="hover:bg-olive-100/50 cursor-pointer transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div 
                            className="relative flex-shrink-0 overflow-hidden rounded-lg border-2 border-olive-200 bg-olive-50 flex items-center justify-center"
                            style={{ width: '48px', height: '48px', minWidth: '48px', minHeight: '48px' }}
                          >
                            {student.photoURL ? (
                              <img 
                                src={student.photoURL} 
                                alt={getStudentDisplayName(student)}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  // Si la imagen falla al cargar, ocultarla y mostrar el icono
                                  e.target.style.display = 'none';
                                  const parent = e.target.parentElement;
                                  const icon = parent.querySelector('.fallback-icon');
                                  if (icon) icon.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div 
                              className={`fallback-icon ${student.photoURL ? 'hidden' : 'flex'} items-center justify-center w-full h-full`}
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
                              {formatDateToDDMMYYYY(student.birthDate)}
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
                        {showSponsorColumn && (
                          <td className="px-6 py-4">
                            {student.sponsor ? (
                              <div className="text-sm">
                                <div className="font-medium text-neutral-900">
                                  {`${student.sponsor.firstName || ''} ${student.sponsor.lastName || ''}`.trim() || '-'}
                                </div>
                                {student.sponsor.email && (
                                  <div className="text-xs text-neutral-500 mt-1">{student.sponsor.email}</div>
                                )}
                              </div>
                            ) : (
                              <span className="text-neutral-400">-</span>
                            )}
                          </td>
                        )}
                        <td className="px-6 py-4">
                          <div className="flex gap-2 flex-wrap">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingStudent(student);
                              }}
                              className="px-3 py-1 text-sm bg-olive-600 text-white rounded hover:bg-olive-700 transition-colors"
                            >
                              {t.students?.table?.edit || 'Editar'}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(student.id);
                              }}
                              className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                            >
                              {t.students?.table?.delete || 'Eliminar'}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedStudentForPayments(student);
                                setShowPaymentsModal(true);
                              }}
                              className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors flex items-center gap-1"
                              title={t.students?.payments?.addPayment || 'Agregar Pago'}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                              {t.students?.buttons?.addPayment || 'Pago'}
                            </button>
                            {(student.sponsorId || student.sponsor?.email) && student.paymentStatus !== 'paid' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSendPaymentReminder(student);
                                }}
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
            
            {/* Results Count */}
            <div className="px-6 py-4 bg-white border-t border-olive-100">
              <div className="text-sm text-neutral-600">
                {t.students?.table?.showing || 'Mostrando'} {displayedStudents.length} {t.students?.table?.of || 'de'} {sortedStudents.length} {t.students?.table?.results || 'resultados'}
                {visibleItems < sortedStudents.length && (
                  <span className="ml-2 text-olive-600">
                    ({t.students?.table?.scrollForMore || 'Desplázate para ver más'})
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* View Details Modal */}
          {viewingStudent && (
            <StudentDetailModal
              student={viewingStudent}
              onClose={() => setViewingStudent(null)}
              onEdit={() => {
                setViewingStudent(null);
                setEditingStudent(viewingStudent);
              }}
              t={t}
              statusLabels={statusLabels}
              paymentStatusLabels={paymentStatusLabels}
            />
          )}

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

// Student Detail Modal Component
function StudentDetailModal({ student, onClose, onEdit, t, statusLabels, paymentStatusLabels }) {
  const getStudentDisplayName = (student) => {
    const first = student.firstName?.trim() || '';
    const last = student.lastName?.trim() || '';
    const combined = `${first} ${last}`.replace(/\s+/g, ' ').trim();
    if (combined.length > 0) return combined;
    return student.fullName || 'Sin nombre';
  };

  const fullName = getStudentDisplayName(student);
  const sponsor = student.sponsor || {};

  const formatDate = (dateString) => {
    if (!dateString) return '(No especificado)';
    try {
      // Handle ISO date strings (YYYY-MM-DD) without timezone issues
      let date;
      if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        const [year, month, day] = dateString.split('-').map(Number);
        date = new Date(year, month - 1, day);
      } else if (typeof dateString === 'string' && dateString.includes('T')) {
        date = new Date(dateString);
      } else {
        date = new Date(dateString);
      }
      
      if (isNaN(date.getTime())) return dateString;
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return dateString;
    }
  };

  const InfoField = ({ label, value, className = '' }) => (
    <div className={`py-3 border-b border-olive-100 ${className}`}>
      <div className="text-sm font-semibold text-olive-700 mb-1">{label}</div>
      <div className="text-base text-neutral-800">{value || '(No especificado)'}</div>
    </div>
  );

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-olive-100 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-2xl font-bold text-olive-800">Detalle del Estudiante</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 text-2xl" aria-label="Close">×</button>
        </div>
        
        <div className="p-6">
          {/* Header con foto y nombre */}
          <div className="flex items-start gap-6 mb-8 pb-6 border-b-2 border-olive-200">
            <div className="flex-shrink-0">
              {student.photoURL ? (
                <img 
                  src={student.photoURL} 
                  alt={fullName}
                  className="w-32 h-32 rounded-lg object-cover border-4 border-olive-200 shadow-lg"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div 
                className={`w-32 h-32 rounded-lg bg-olive-100 border-4 border-olive-200 flex items-center justify-center text-olive-600 font-bold text-4xl shadow-lg ${student.photoURL ? 'hidden' : 'flex'}`}
              >
                {fullName.charAt(0).toUpperCase()}
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-3xl font-bold text-olive-800 mb-2">{fullName}</h3>
              <div className="flex flex-wrap gap-2 mb-3">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                  student.status === 'active' ? 'bg-green-100 text-green-800' :
                  student.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                  student.status === 'graduated' ? 'bg-blue-100 text-blue-800' :
                  student.status === 'suspended' ? 'bg-red-100 text-red-800' :
                  'bg-neutral-100 text-neutral-800'
                }`}>
                  {statusLabels[student.status] || student.status || 'Desconocido'}
                </span>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                  student.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' :
                  student.paymentStatus === 'current' ? 'bg-blue-100 text-blue-800' :
                  student.paymentStatus === 'overdue' ? 'bg-red-100 text-red-800' :
                  student.paymentStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-neutral-100 text-neutral-800'
                }`}>
                  {paymentStatusLabels[student.paymentStatus] || student.paymentStatus || 'Pendiente'}
                </span>
              </div>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={onEdit}
                  className="px-4 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700 transition-colors font-semibold"
                >
                  ✏️ {t.students?.table?.edit || 'Editar'}
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-100 text-neutral-700 transition-colors font-semibold"
                >
                  {t.students?.buttons?.cancel || 'Cerrar'}
                </button>
              </div>
            </div>
          </div>

          {/* Información Básica */}
          <div className="mb-6">
            <h4 className="text-xl font-bold text-olive-800 mb-4 pb-2 border-b border-olive-200">
              {t.students?.forms?.basicInfo || 'Información Básica'}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoField label={t.students?.forms?.firstName || 'Nombre'} value={student.firstName} />
              <InfoField label={t.students?.forms?.lastName || 'Apellido'} value={student.lastName} />
              <InfoField label={t.students?.forms?.documentId || 'Documento de Identidad'} value={student.documentId || '-'} />
              <InfoField label={t.students?.forms?.matriculationNumber || 'Número de Matrícula'} value={student.matriculationNumber || '-'} />
              <InfoField label={t.students?.forms?.birthDate || 'Fecha de Nacimiento'} value={formatDate(student.birthDate)} />
              <InfoField label={t.students?.forms?.gender || 'Género'} value={student.gender || '-'} />
              <InfoField label={t.students?.forms?.currentGrade || 'Grado Actual'} value={student.currentGrade || '-'} />
              <InfoField label={t.students?.forms?.academicYear || 'Año Académico'} value={student.academicYear || '-'} />
              <InfoField label={t.students?.forms?.enrollmentDate || 'Fecha de Matriculación'} value={formatDate(student.enrollmentDate)} />
              <InfoField label={t.students?.forms?.city || 'Ciudad'} value={student.city || '-'} />
              <InfoField label={t.students?.forms?.province || 'Provincia'} value={student.province || '-'} />
              <InfoField label={t.students?.forms?.country || 'País'} value={student.country || '-'} />
            </div>
          </div>

          {/* Información del Patrocinador */}
          {student.sponsorId || sponsor.firstName ? (
            <div className="mb-6">
              <h4 className="text-xl font-bold text-olive-800 mb-4 pb-2 border-b border-olive-200">
                {t.students?.forms?.sponsor || 'Patrocinador'}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoField label={t.sponsors?.forms?.firstName || 'Nombre'} value={sponsor.firstName} />
                <InfoField label={t.sponsors?.forms?.lastName || 'Apellido'} value={sponsor.lastName} />
                <InfoField label={t.sponsors?.forms?.email || 'Email'} value={sponsor.email || '-'} />
                <InfoField label={t.sponsors?.forms?.phone || 'Teléfono'} value={sponsor.phone || '-'} />
                <InfoField label={t.sponsors?.forms?.address || 'Dirección'} value={sponsor.address || '-'} />
                <InfoField label={t.sponsors?.forms?.city || 'Ciudad'} value={sponsor.city || '-'} />
                <InfoField label={t.sponsors?.forms?.country || 'País'} value={sponsor.country || '-'} />
                {student.sponsorAssignedDate && (
                  <InfoField label="Fecha de Asignación" value={formatDate(student.sponsorAssignedDate)} />
                )}
              </div>
            </div>
          ) : (
            <div className="mb-6">
              <h4 className="text-xl font-bold text-olive-800 mb-4 pb-2 border-b border-olive-200">
                {t.students?.forms?.sponsor || 'Patrocinador'}
              </h4>
              <p className="text-neutral-600">No tiene patrocinador asignado</p>
            </div>
          )}

          {/* Notas */}
          {student.notes && (
            <div className="mb-6">
              <h4 className="text-xl font-bold text-olive-800 mb-4 pb-2 border-b border-olive-200">
                {t.students?.forms?.notes || 'Notas'}
              </h4>
              <p className="text-neutral-800 whitespace-pre-wrap">{student.notes}</p>
            </div>
          )}

          {/* Información del Sistema */}
          <div className="mb-6">
            <h4 className="text-xl font-bold text-olive-800 mb-4 pb-2 border-b border-olive-200">
              Información del Sistema
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoField label="Fecha de Creación" value={formatDate(student.createdAt)} className="text-xs" />
              <InfoField label="Última Actualización" value={formatDate(student.updatedAt)} className="text-xs" />
              {student.candidateId && (
                <InfoField label="ID del Candidato" value={student.candidateId} className="text-xs" />
              )}
            </div>
          </div>
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
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
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

            {/* Sponsor Information (Read-only) */}
            {formData.sponsorId || formData.sponsor ? (
              <div className="border-b border-olive-100 pb-4">
                <h3 className="text-lg font-semibold text-olive-800 mb-4">{t.students?.forms?.sponsorInfo || 'Información del Patrocinador'}</h3>
                <div className="bg-olive-50 border border-olive-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-neutral-600 mb-2">
                    {t.students?.forms?.sponsorReadOnly || 'La información del patrocinador se gestiona en el módulo de Patrocinadores. Edita el patrocinador desde allí.'}
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      {t.students?.forms?.sponsorFirstName || 'Nombre del Patrocinador'}
                    </label>
                    <input
                      type="text"
                      value={formData.sponsor?.firstName || ''}
                      disabled
                      className="w-full px-4 py-2 border border-olive-200 rounded-lg bg-neutral-100 text-neutral-600 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      {t.students?.forms?.sponsorLastName || 'Apellido del Patrocinador'}
                    </label>
                    <input
                      type="text"
                      value={formData.sponsor?.lastName || ''}
                      disabled
                      className="w-full px-4 py-2 border border-olive-200 rounded-lg bg-neutral-100 text-neutral-600 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      {t.students?.forms?.sponsorEmail || 'Email del Patrocinador'}
                    </label>
                    <input
                      type="email"
                      value={formData.sponsor?.email || ''}
                      disabled
                      className="w-full px-4 py-2 border border-olive-200 rounded-lg bg-neutral-100 text-neutral-600 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      {t.students?.forms?.sponsorPhone || 'Teléfono del Patrocinador'}
                    </label>
                    <input
                      type="text"
                      value={formData.sponsor?.phone || ''}
                      disabled
                      className="w-full px-4 py-2 border border-olive-200 rounded-lg bg-neutral-100 text-neutral-600 cursor-not-allowed"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      {t.students?.forms?.sponsorAddress || 'Dirección del Patrocinador'}
                    </label>
                    <input
                      type="text"
                      value={formData.sponsor?.address || ''}
                      disabled
                      className="w-full px-4 py-2 border border-olive-200 rounded-lg bg-neutral-100 text-neutral-600 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      {t.students?.forms?.sponsorCity || 'Ciudad del Patrocinador'}
                    </label>
                    <input
                      type="text"
                      value={formData.sponsor?.city || ''}
                      disabled
                      className="w-full px-4 py-2 border border-olive-200 rounded-lg bg-neutral-100 text-neutral-600 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      {t.students?.forms?.sponsorCountry || 'País del Patrocinador'}
                    </label>
                    <input
                      type="text"
                      value={formData.sponsor?.country || ''}
                      disabled
                      className="w-full px-4 py-2 border border-olive-200 rounded-lg bg-neutral-100 text-neutral-600 cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>
            ) : null}

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

// Payments Modal Component
function PaymentsModal({ student, onClose, t }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddPaymentForm, setShowAddPaymentForm] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [totalPaid, setTotalPaid] = useState(0);
  const [totalDue, setTotalDue] = useState(0);
  
  const [paymentForm, setPaymentForm] = useState({
    type: PAYMENT_TYPES.MONTHLY,
    amount: '',
    date: new Date().toISOString().split('T')[0],
    month: '',
    receiptNumber: '',
    notes: '',
    status: PAYMENT_STATUSES.PAID,
  });
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);

  const getStudentDisplayName = (student) => {
    const first = student.firstName?.trim() || '';
    const last = student.lastName?.trim() || '';
    const combined = `${first} ${last}`.replace(/\s+/g, ' ').trim();
    if (combined.length > 0) return combined;
    return student.fullName || 'Sin nombre';
  };

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const paymentsList = await getStudentPayments(student.id);
      setPayments(paymentsList);
      
      const paid = await getTotalPaid(student.id);
      const due = await calculateTotalDue(student);
      setTotalPaid(paid);
      setTotalDue(due);
    } catch (error) {
      console.error('Error fetching payments:', error);
      alert(t.students?.payments?.errorAdd || 'Error al cargar pagos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [student.id]);

  const handleReceiptChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('El comprobante debe ser menor a 10MB');
        return;
      }
      setReceiptFile(file);
      // Preview para imágenes
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setReceiptPreview(reader.result);
        };
        reader.readAsDataURL(file);
      } else {
        setReceiptPreview(null);
      }
    }
  };

  const removeReceipt = () => {
    setReceiptFile(null);
    setReceiptPreview(null);
  };

  const uploadReceipt = async () => {
    if (!receiptFile) return null;

    if (!auth.currentUser) {
      alert('Debes estar autenticado para subir comprobantes');
      return null;
    }

    try {
      setUploadingReceipt(true);
      const timestamp = Date.now();
      const fileExtension = receiptFile.name.split('.').pop();
      const fileName = `payment-receipts/${student.id}/${timestamp}.${fileExtension}`;
      const storageRef = ref(storage, fileName);
      
      await uploadBytes(storageRef, receiptFile);
      const downloadURL = await getDownloadURL(storageRef);
      
      return { receiptURL: downloadURL, receiptPath: fileName };
    } catch (error) {
      console.error('Error uploading receipt:', error);
      let errorMessage = 'Error al subir el comprobante';
      
      // Provide more specific error messages
      if (error.code === 'storage/unauthorized') {
        errorMessage = 'No tienes permisos para subir archivos. Contacta al administrador.';
      } else if (error.code === 'storage/canceled') {
        errorMessage = 'La subida fue cancelada.';
      } else if (error.code === 'storage/unknown') {
        errorMessage = 'Error desconocido al subir el archivo. Verifica tu conexión.';
      } else if (error.message) {
        errorMessage = `Error: ${error.message}`;
      }
      
      alert(errorMessage);
      return null;
    } finally {
      setUploadingReceipt(false);
    }
  };

  const handleAddPayment = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      // Upload receipt if there's a new file
      let receiptData = null;
      if (receiptFile) {
        receiptData = await uploadReceipt();
        if (!receiptData) {
          setLoading(false);
          return; // Stop if upload failed
        }
      }
      
      const paymentData = {
        ...paymentForm,
        ...(receiptData || {}),
      };
      
      await addPayment(student.id, paymentData);
      setShowAddPaymentForm(false);
      setPaymentForm({
        type: PAYMENT_TYPES.MONTHLY,
        amount: '',
        date: new Date().toISOString().split('T')[0],
        month: '',
        receiptNumber: '',
        notes: '',
        status: PAYMENT_STATUSES.PAID,
      });
      setReceiptFile(null);
      setReceiptPreview(null);
      await fetchPayments();
    } catch (error) {
      console.error('Error adding payment:', error);
      alert(t.students?.payments?.errorAdd || 'Error al agregar pago');
    } finally {
      setLoading(false);
    }
  };

  const handleEditPayment = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      // Upload receipt if there's a new file
      let receiptData = {};
      if (receiptFile) {
        // New file uploaded
        const uploaded = await uploadReceipt();
        if (!uploaded) {
          setLoading(false);
          return; // Stop if upload failed
        }
        receiptData = uploaded;
      } else if (editingPayment.receiptURL) {
        // Keep existing receipt if no new file
        receiptData = {
          receiptURL: editingPayment.receiptURL,
          receiptPath: editingPayment.receiptPath,
        };
      }
      
      const paymentData = {
        ...paymentForm,
        ...receiptData,
      };
      
      await updatePayment(student.id, editingPayment.id, paymentData);
      setEditingPayment(null);
      setShowAddPaymentForm(false);
      setPaymentForm({
        type: PAYMENT_TYPES.MONTHLY,
        amount: '',
        date: new Date().toISOString().split('T')[0],
        month: '',
        receiptNumber: '',
        notes: '',
        status: PAYMENT_STATUSES.PAID,
      });
      setReceiptFile(null);
      setReceiptPreview(null);
      await fetchPayments();
    } catch (error) {
      console.error('Error updating payment:', error);
      alert(t.students?.payments?.errorUpdate || 'Error al actualizar pago');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePayment = async (paymentId) => {
    if (!confirm(t.students?.payments?.confirmDelete || '¿Estás seguro de eliminar este pago?')) return;
    
    try {
      setLoading(true);
      await deletePayment(student.id, paymentId);
      await fetchPayments();
    } catch (error) {
      console.error('Error deleting payment:', error);
      alert(t.students?.payments?.errorDelete || 'Error al eliminar pago');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (payment) => {
    setEditingPayment(payment);
    setShowAddPaymentForm(true);
    setPaymentForm({
      type: payment.type || PAYMENT_TYPES.MONTHLY,
      amount: payment.amount || '',
      date: payment.date ? new Date(payment.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      month: payment.month || '',
      receiptNumber: payment.receiptNumber || '',
      notes: payment.notes || '',
      status: payment.status || PAYMENT_STATUSES.PAID,
    });
    // Set receipt preview if exists
    if (payment.receiptURL) {
      setReceiptPreview(payment.receiptURL);
      setReceiptFile(null); // No file selected, just showing existing
    } else {
      setReceiptPreview(null);
      setReceiptFile(null);
    }
  };

  const handleCancelForm = () => {
    setShowAddPaymentForm(false);
    setEditingPayment(null);
    setPaymentForm({
      type: PAYMENT_TYPES.MONTHLY,
      amount: '',
      date: new Date().toISOString().split('T')[0],
      month: '',
      receiptNumber: '',
      notes: '',
      status: PAYMENT_STATUSES.PAID,
    });
    setReceiptFile(null);
    setReceiptPreview(null);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      // Use the same format as the table for consistency
      return formatDateToDDMMYYYY(dateString) || dateString;
    } catch {
      return dateString;
    }
  };
  
  // Helper function for date formatting (dd/mm/yyyy) - handles timezone issues
  const formatDateToDDMMYYYY = (dateString) => {
    if (!dateString) return '';
    try {
      // Handle ISO date strings (YYYY-MM-DD) without timezone issues
      let date;
      if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        // If it's YYYY-MM-DD format, parse it as local date to avoid timezone issues
        const [year, month, day] = dateString.split('-').map(Number);
        date = new Date(year, month - 1, day);
      } else if (typeof dateString === 'string' && dateString.includes('T')) {
        // If it's an ISO string with time, parse it carefully
        date = new Date(dateString);
      } else {
        date = new Date(dateString);
      }
      
      if (isNaN(date.getTime())) return '';
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return '';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount || 0);
  };

  const paymentTypeLabels = {
    [PAYMENT_TYPES.ENROLLMENT]: t.students?.payments?.paymentTypeEnrollment || 'Matrícula',
    [PAYMENT_TYPES.MONTHLY]: t.students?.payments?.paymentTypeMonthly || 'Cuota Mensual',
    [PAYMENT_TYPES.FULL]: t.students?.payments?.paymentTypeFull || 'Pago Completo',
    [PAYMENT_TYPES.BALANCE]: t.students?.payments?.paymentTypeBalance || 'Saldo Total',
    [PAYMENT_TYPES.OTHER]: t.students?.payments?.paymentTypeOther || 'Otro',
  };

  const paymentStatusLabels = {
    [PAYMENT_STATUSES.PAID]: t.students?.payments?.paymentStatusPaid || 'Pagado',
    [PAYMENT_STATUSES.PENDING]: t.students?.payments?.paymentStatusPending || 'Pendiente',
    [PAYMENT_STATUSES.CANCELLED]: t.students?.payments?.paymentStatusCancelled || 'Cancelado',
  };

  const monthsOptions = MONTHS.map((month, index) => ({
    value: index + 1,
    label: month,
  }));

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-olive-100 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold text-olive-800">
              {t.students?.payments?.title || 'Gestión de Pagos'}
            </h2>
            <p className="text-sm text-neutral-600 mt-1">
              {getStudentDisplayName(student)} - {student.matriculationNumber || ''}
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="text-neutral-400 hover:text-neutral-600 text-3xl font-bold leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-olive-50 rounded-xl p-4 border border-olive-200">
              <div className="text-sm text-neutral-600 mb-1">
                {t.students?.payments?.totalDue || 'Total Adeudado'}
              </div>
              <div className="text-2xl font-bold text-olive-800">
                {formatCurrency(totalDue)}
              </div>
            </div>
            <div className="bg-green-50 rounded-xl p-4 border border-green-200">
              <div className="text-sm text-neutral-600 mb-1">
                {t.students?.payments?.totalPaid || 'Total Pagado'}
              </div>
              <div className="text-2xl font-bold text-green-700">
                {formatCurrency(totalPaid)}
              </div>
            </div>
            <div className={`rounded-xl p-4 border ${
              (totalDue - totalPaid) > 0 
                ? 'bg-red-50 border-red-200' 
                : 'bg-blue-50 border-blue-200'
            }`}>
              <div className="text-sm text-neutral-600 mb-1">
                {t.students?.payments?.balance || 'Saldo'}
              </div>
              <div className={`text-2xl font-bold ${
                (totalDue - totalPaid) > 0 ? 'text-red-700' : 'text-blue-700'
              }`}>
                {formatCurrency(totalDue - totalPaid)}
              </div>
            </div>
          </div>

          {/* Add Payment Button */}
          {!showAddPaymentForm && (
            <div className="mb-6">
              <button
                onClick={() => setShowAddPaymentForm(true)}
                className="px-4 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700 transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {t.students?.payments?.addPayment || 'Agregar Pago'}
              </button>
            </div>
          )}

          {/* Add/Edit Payment Form */}
          {showAddPaymentForm && (
            <div className="bg-olive-50 rounded-xl p-6 mb-6 border border-olive-200">
              <h3 className="text-lg font-semibold text-olive-800 mb-4">
                {editingPayment 
                  ? (t.students?.payments?.editPayment || 'Editar Pago')
                  : (t.students?.payments?.addPayment || 'Agregar Pago')
                }
              </h3>
              <form onSubmit={editingPayment ? handleEditPayment : handleAddPayment} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      {t.students?.payments?.paymentType || 'Tipo de Pago'} <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={paymentForm.type}
                      onChange={(e) => setPaymentForm(prev => ({ ...prev, type: e.target.value }))}
                      className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500 text-neutral-900 bg-white"
                      required
                    >
                      {Object.entries(paymentTypeLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      {t.students?.payments?.amount || 'Monto'} (USD) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={paymentForm.amount}
                        onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                        placeholder="0.00"
                        className="w-full pl-8 pr-4 py-2 border border-olive-200 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500 text-neutral-900"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      {t.students?.payments?.date || 'Fecha'} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={paymentForm.date}
                      onChange={(e) => setPaymentForm(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500 text-neutral-900"
                      required
                    />
                  </div>

                  {paymentForm.type === PAYMENT_TYPES.MONTHLY && (
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        {t.students?.payments?.month || 'Mes'}
                      </label>
                      <select
                        value={paymentForm.month}
                        onChange={(e) => setPaymentForm(prev => ({ ...prev, month: e.target.value }))}
                        className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500 text-neutral-900 bg-white"
                      >
                        <option value="">{t.students?.payments?.monthSelect || 'Seleccionar mes'}</option>
                        {monthsOptions.map(month => (
                          <option key={month.value} value={month.value}>{month.label}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      {t.students?.payments?.receiptNumber || 'Número de Recibo'}
                    </label>
                    <input
                      type="text"
                      value={paymentForm.receiptNumber}
                      onChange={(e) => setPaymentForm(prev => ({ ...prev, receiptNumber: e.target.value }))}
                      className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500 text-neutral-900"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      {t.students?.payments?.paymentStatus || 'Estado'}
                    </label>
                    <select
                      value={paymentForm.status}
                      onChange={(e) => setPaymentForm(prev => ({ ...prev, status: e.target.value }))}
                      className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500 text-neutral-900 bg-white"
                    >
                      {Object.entries(paymentStatusLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    {t.students?.payments?.notes || 'Notas'}
                  </label>
                  <textarea
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500 text-neutral-900"
                  />
                </div>

                {/* Receipt Upload */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    {t.students?.payments?.receipt || 'Comprobante de Pago'}
                  </label>
                  <div className="space-y-3">
                    {receiptPreview && (
                      <div className="relative">
                        {receiptPreview.startsWith('data:image') || receiptPreview.startsWith('http') ? (
                          <div className="border border-olive-200 rounded-lg p-4 bg-olive-50">
                            <img 
                              src={receiptPreview} 
                              alt="Vista previa del comprobante" 
                              className="max-w-full h-auto max-h-48 rounded-lg"
                            />
                            <button
                              type="button"
                              onClick={removeReceipt}
                              className="mt-2 text-sm text-red-600 hover:text-red-800"
                            >
                              {t.students?.payments?.removeReceipt || 'Eliminar comprobante'}
                            </button>
                          </div>
                        ) : (
                          <div className="border border-olive-200 rounded-lg p-4 bg-olive-50">
                            <div className="flex items-center gap-2">
                              <svg className="w-6 h-6 text-olive-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                              </svg>
                              <a 
                                href={receiptPreview} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-olive-700 hover:text-olive-800 underline"
                              >
                                {t.students?.payments?.viewReceipt || 'Ver comprobante'}
                              </a>
                              <button
                                type="button"
                                onClick={removeReceipt}
                                className="ml-auto text-sm text-red-600 hover:text-red-800"
                              >
                                {t.students?.payments?.removeReceipt || 'Eliminar'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    <div>
                      <input
                        type="file"
                        id="receipt-upload"
                        accept="image/*,.pdf"
                        onChange={handleReceiptChange}
                        className="hidden"
                      />
                      <label
                        htmlFor="receipt-upload"
                        className="inline-block px-4 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700 cursor-pointer transition-colors"
                      >
                        {receiptPreview 
                          ? (t.students?.payments?.changeReceipt || 'Cambiar Comprobante')
                          : (t.students?.payments?.uploadReceipt || 'Subir Comprobante')
                        }
                      </label>
                      <p className="text-xs text-neutral-500 mt-1">
                        {t.students?.payments?.receiptHelp || 'Formatos permitidos: Imágenes (JPG, PNG) o PDF. Tamaño máximo: 10MB'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-4 pt-4">
                  <button
                    type="button"
                    onClick={handleCancelForm}
                    className="px-6 py-2 border border-olive-300 text-olive-700 rounded-lg hover:bg-olive-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading || uploadingReceipt}
                    className="px-6 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading || uploadingReceipt 
                      ? (t.common?.loading || 'Guardando...') 
                      : 'Guardar'
                    }
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Payments History */}
          <div>
            <h3 className="text-lg font-semibold text-olive-800 mb-4">
              {t.students?.payments?.paymentsHistory || 'Historial de Pagos'}
            </h3>
            
            {loading && payments.length === 0 ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-olive-600 mx-auto mb-4"></div>
                <p className="text-neutral-600">{t.common?.loading || 'Cargando...'}</p>
              </div>
            ) : payments.length === 0 ? (
              <div className="text-center py-8 text-neutral-500">
                {t.students?.payments?.noPayments || 'No hay pagos registrados'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-olive-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-olive-800">
                        {t.students?.payments?.date || 'Fecha'}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-olive-800">
                        {t.students?.payments?.paymentType || 'Tipo'}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-olive-800">
                        {t.students?.payments?.amount || 'Monto'}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-olive-800">
                        {t.students?.payments?.receiptNumber || 'Recibo'}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-olive-800">
                        {t.students?.payments?.receipt || 'Comprobante'}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-olive-800">
                        {t.students?.payments?.paymentStatus || 'Estado'}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-olive-800">
                        {t.students?.table?.actions || 'Acciones'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-olive-100">
                    {payments.map((payment) => (
                      <tr key={payment.id} className="hover:bg-olive-50/30">
                        <td className="px-4 py-3 text-neutral-700">
                          {formatDate(payment.date)}
                        </td>
                        <td className="px-4 py-3 text-neutral-700">
                          {paymentTypeLabels[payment.type] || payment.type}
                          {payment.month && ` - ${MONTHS[parseInt(payment.month) - 1]}`}
                        </td>
                        <td className="px-4 py-3 font-medium text-neutral-900">
                          {formatCurrency(payment.amount)}
                        </td>
                        <td className="px-4 py-3 text-neutral-700">
                          {payment.receiptNumber || '-'}
                        </td>
                        <td className="px-4 py-3">
                          {payment.receiptURL ? (
                            <a
                              href={payment.receiptURL}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-olive-600 hover:text-olive-800 underline text-sm"
                              title={t.students?.payments?.viewReceipt || 'Ver comprobante'}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              {t.students?.payments?.viewReceipt || 'Ver'}
                            </a>
                          ) : (
                            <span className="text-neutral-400 text-sm">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            payment.status === PAYMENT_STATUSES.PAID ? 'bg-green-100 text-green-800' :
                            payment.status === PAYMENT_STATUSES.PENDING ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {paymentStatusLabels[payment.status] || payment.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditClick(payment)}
                              className="px-3 py-1 text-sm bg-olive-600 text-white rounded hover:bg-olive-700 transition-colors"
                            >
                              {t.students?.table?.edit || 'Editar'}
                            </button>
                            <button
                              onClick={() => handleDeletePayment(payment.id)}
                              className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                            >
                              {t.students?.table?.delete || 'Eliminar'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
