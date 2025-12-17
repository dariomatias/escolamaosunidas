import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc, addDoc, query, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage, auth } from '../config/firebase';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { searchSponsors, createSponsor, getSponsorById } from '../services/sponsors-api';
import { createOrUpdateStudentFromCandidate, updateStudentStatusByCandidateId } from '../services/students-api';
import AdminNavbar from './AdminNavbar';
import {
  ADMIN_TRANSLATIONS,
  ADMIN_DEFAULT_LOCALE,
  ADMIN_LOCALE_STORAGE_KEY,
} from '../i18n/adminTranslations';

const STATUS_OPTIONS = ['pending', 'active', 'rejected', 'archived'];
const PRIORITY_OPTIONS = ['alta', 'media', 'baja'];

const getInitialAdminLocale = () => {
  if (typeof window === 'undefined') {
    return ADMIN_DEFAULT_LOCALE;
  }
  return localStorage.getItem(ADMIN_LOCALE_STORAGE_KEY) || ADMIN_DEFAULT_LOCALE;
};

import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Pie } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function CandidatesCRUD() {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState(null);
  const [viewingCandidate, setViewingCandidate] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeTab, setActiveTab] = useState('list');
  const [locale, setLocale] = useState(() => getInitialAdminLocale());
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [showSponsorModal, setShowSponsorModal] = useState(false);
  const [pendingCandidateUpdate, setPendingCandidateUpdate] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [filterPeriod, setFilterPeriod] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(25);
  const navigate = useNavigate();
  const t = ADMIN_TRANSLATIONS[locale] || ADMIN_TRANSLATIONS[ADMIN_DEFAULT_LOCALE];
  const statusLabels = t.statuses;
  const priorityLabels = t.priorities;

  const getCandidateDisplayName = (candidate) => {
    const first = candidate.firstName?.trim() || '';
    const last = candidate.lastName?.trim() || '';
    const combined = `${first} ${last}`.replace(/\s+/g, ' ').trim();
    if (combined.length > 0) return combined;
    return candidate.fullName || 'Sin nombre';
  };

  // Helper functions for date formatting (dd/mm/yyyy)
  const formatDateToDDMMYYYY = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return '';
    }
  };

  const parseDDMMYYYYToISO = (dateString) => {
    if (!dateString) return '';
    // Remove any spaces
    const cleaned = dateString.trim();
    // Check if it's already in ISO format (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
      return cleaned;
    }
    // Try to parse dd/mm/yyyy format
    const match = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (match) {
      const day = String(match[1]).padStart(2, '0');
      const month = String(match[2]).padStart(2, '0');
      const year = match[3];
      // Validate date
      const date = new Date(`${year}-${month}-${day}`);
      if (!isNaN(date.getTime()) && 
          date.getDate() == parseInt(day) && 
          date.getMonth() + 1 == parseInt(month)) {
        return `${year}-${month}-${day}`;
      }
    }
    return '';
  };


  const fetchCandidates = async () => {
    try {
      setIsLoading(true);
      const candidatesRef = collection(db, 'candidates');
      const q = query(candidatesRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const candidatesList = [];
      querySnapshot.forEach((doc) => {
        candidatesList.push({ id: doc.id, ...doc.data() });
      });
      
      setCandidates(candidatesList);
    } catch (error) {
      console.error('Error fetching candidates:', error);
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

  // Get unique values for filter dropdowns
  const uniqueLevels = useMemo(() => {
    const levels = candidates.map(c => c.level).filter(Boolean);
    return [...new Set(levels)].sort();
  }, [candidates]);

  const uniquePeriods = useMemo(() => {
    const periods = candidates.map(c => c.period).filter(Boolean);
    return [...new Set(periods)].sort();
  }, [candidates]);

  const handleClearFilters = () => {
    setSearchText('');
    setFilterLevel('');
    setFilterPeriod('');
    setFilterStatus('');
  };

  const sortedCandidates = useMemo(() => {
    // First, apply filters
    let filtered = candidates.filter(candidate => {
      // Search filter (name and last name)
      if (searchText.trim()) {
        const searchLower = searchText.toLowerCase().trim();
        const fullName = getCandidateDisplayName(candidate).toLowerCase();
        const firstName = (candidate.firstName || '').toLowerCase();
        const lastName = (candidate.lastName || '').toLowerCase();
        if (!fullName.includes(searchLower) && 
            !firstName.includes(searchLower) && 
            !lastName.includes(searchLower)) {
          return false;
        }
      }

      // Level filter
      if (filterLevel && candidate.level !== filterLevel) {
        return false;
      }

      // Period filter
      if (filterPeriod && candidate.period !== filterPeriod) {
        return false;
      }

      // Status filter
      if (filterStatus && candidate.status !== filterStatus) {
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
          aValue = getCandidateDisplayName(a).toLowerCase();
          bValue = getCandidateDisplayName(b).toLowerCase();
          break;
        case 'level':
          aValue = (a.level || '').toLowerCase();
          bValue = (b.level || '').toLowerCase();
          break;
        case 'period':
          aValue = (a.period || '').toLowerCase();
          bValue = (b.period || '').toLowerCase();
          break;
        case 'status':
          aValue = (statusLabels[a.status] || a.status || '').toLowerCase();
          bValue = (statusLabels[b.status] || b.status || '').toLowerCase();
          break;
        case 'priority':
          const aPriority = a.application?.priority || 'sin-prioridad';
          const bPriority = b.application?.priority || 'sin-prioridad';
          aValue = (priorityLabels[aPriority] || aPriority).toLowerCase();
          bValue = (priorityLabels[bPriority] || bPriority).toLowerCase();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [candidates, sortField, sortDirection, statusLabels, priorityLabels, searchText, filterLevel, filterPeriod, filterStatus]);

  // Pagination logic
  const totalRecords = sortedCandidates.length;
  const totalPages = recordsPerPage === 'all' ? 1 : Math.ceil(totalRecords / recordsPerPage);
  const startIndex = recordsPerPage === 'all' ? 0 : (currentPage - 1) * recordsPerPage;
  const endIndex = recordsPerPage === 'all' ? totalRecords : startIndex + recordsPerPage;
  const paginatedCandidates = recordsPerPage === 'all' ? sortedCandidates : sortedCandidates.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchText, filterLevel, filterPeriod, filterStatus, recordsPerPage]);

  useEffect(() => {
    fetchCandidates();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(ADMIN_LOCALE_STORAGE_KEY, locale);
    }
  }, [locale]);

  const handleEdit = (candidate) => {
    setEditingCandidate(candidate);
  };

  const handleSave = async (updatedData) => {
    try {
      setIsLoading(true);
      const { id, firstName, lastName, fullName, ...rest } = updatedData;
      
      // Get current candidate state
      const currentCandidate = candidates.find(c => c.id === id);
      // Check if status is changing from "pending" to "active" (approved)
      const isStatusChangingFromPendingToActive = currentCandidate?.status === 'pending' && rest.status === 'active';
      // Check if status is changing from "active" to another status
      const isStatusChangingFromActive = currentCandidate?.status === 'active' && rest.status !== 'active';
      // Check if status is changing to "active" from another status (not pending)
      const isStatusChangingToActive = currentCandidate?.status !== 'active' && rest.status === 'active' && currentCandidate?.status !== 'pending';
      const hasSponsorId = currentCandidate?.sponsorId;
      
      // If changing FROM pending TO active (approved) and no sponsor, prompt for sponsor
      if (isStatusChangingFromPendingToActive && !hasSponsorId) {
        // Store the update data and show sponsor modal
        setPendingCandidateUpdate({ id, firstName, lastName, fullName, ...rest });
        setShowSponsorModal(true);
        return; // Don't save yet, wait for sponsor info
      }
      
      // If changing FROM active to another status, clear sponsor assignment and update student to inactive
      const updateData = { ...rest };
      if (isStatusChangingFromActive) {
        updateData.sponsorId = null;
        updateData.sponsorAssignedDate = null;
        // Optionally show a confirmation
        if (hasSponsorId && !confirm(t.sponsor.clearSponsorConfirm || 'El candidato ya no está activo. ¿Deseas eliminar la asignación del patrocinador?')) {
          setIsLoading(false);
          return; // User cancelled
        }
        
        // Update associated student status to inactive
        try {
          await updateStudentStatusByCandidateId(id, 'inactive');
        } catch (studentError) {
          console.error('Error updating student status to inactive:', studentError);
          // Don't block the candidate update if student update fails
          alert('Candidato actualizado, pero hubo un error al actualizar el estado del estudiante. Por favor verifica.');
        }
      }
      
      const candidateRef = doc(db, 'candidates', id);
      const computedFullName = `${(firstName || '').trim()} ${(lastName || '').trim()}`
        .replace(/\s+/g, ' ')
        .trim() || (fullName || '');
      await updateDoc(candidateRef, {
        ...updateData,
        firstName: firstName || '',
        lastName: lastName || '',
        fullName: computedFullName,
        updatedAt: new Date().toISOString(),
      });
      
      // If candidate status changed to active (from pending or another status), create/update student
      if ((isStatusChangingFromPendingToActive || isStatusChangingToActive) && currentCandidate) {
        try {
          let sponsorData = null;
          if (updateData.sponsorId || currentCandidate.sponsorId) {
            const sponsorId = updateData.sponsorId || currentCandidate.sponsorId;
            try {
              sponsorData = await getSponsorById(sponsorId);
            } catch (sponsorError) {
              console.error('Error fetching sponsor data:', sponsorError);
              // Continue without sponsor data
            }
          }
          
          await createOrUpdateStudentFromCandidate(
            { ...currentCandidate, ...updateData, firstName, lastName, fullName: computedFullName },
            sponsorData
          );
        } catch (studentError) {
          console.error('Error creating/updating student from candidate:', studentError);
          // Don't block the candidate update if student creation fails
          alert('Candidato actualizado, pero hubo un error al crear/actualizar el estudiante. Por favor verifica.');
        }
      }
      
      setEditingCandidate(null);
      await fetchCandidates();
    } catch (error) {
      console.error('Error updating candidate:', error);
      alert(t.errors.update);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSponsorSave = async (sponsorId) => {
    try {
      setIsLoading(true);
      if (!pendingCandidateUpdate) return;
      
      const { id, firstName, lastName, fullName, ...rest } = pendingCandidateUpdate;
      const candidateRef = doc(db, 'candidates', id);
      const computedFullName = `${(firstName || '').trim()} ${(lastName || '').trim()}`
        .replace(/\s+/g, ' ')
        .trim() || (fullName || '');
      
      const sponsorAssignedDate = new Date().toISOString();
      await updateDoc(candidateRef, {
        ...rest,
        firstName: firstName || '',
        lastName: lastName || '',
        fullName: computedFullName,
        sponsorId: sponsorId,
        sponsorAssignedDate: sponsorAssignedDate,
        status: 'active', // Ensure status is active when sponsor is assigned
        updatedAt: new Date().toISOString(),
      });
      
      // Create/update student from approved candidate
      try {
        const sponsorData = await getSponsorById(sponsorId);
        await createOrUpdateStudentFromCandidate(
          { 
            id, 
            firstName, 
            lastName, 
            fullName: computedFullName, 
            ...rest,
            sponsorId,
            sponsorAssignedDate,
            status: 'active'
          },
          sponsorData
        );
      } catch (studentError) {
        console.error('Error creating/updating student from candidate:', studentError);
        // Don't block the candidate update if student creation fails
        alert('Candidato actualizado con patrocinador, pero hubo un error al crear/actualizar el estudiante. Por favor verifica.');
      }
      
      setShowSponsorModal(false);
      setPendingCandidateUpdate(null);
      setEditingCandidate(null);
      await fetchCandidates();
    } catch (error) {
      console.error('Error updating candidate with sponsor:', error);
      alert(t.errors.update);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm(t.confirm.delete)) return;
    
    try {
      setIsLoading(true);
      await deleteDoc(doc(db, 'candidates', id));
      await fetchCandidates();
    } catch (error) {
      console.error('Error deleting candidate:', error);
      alert(t.errors.delete);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportPDF = async (candidate) => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const marginLeft = 20;
      const marginRight = 20;
      const marginTop = 50;
      let yPosition = marginTop;

      // Configuración de colores
      const primaryColor = [139, 195, 74]; // Verde oliva
      const textColor = [51, 51, 51];
      const labelColor = [100, 100, 100];

      // Encabezado con logo/escuela
      doc.setFillColor(...primaryColor);
      doc.rect(0, 0, pageWidth, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('ESCOLA MÃOS UNIDAS', pageWidth / 2, 20, { align: 'center' });
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('Ficha del Candidato', pageWidth / 2, 30, { align: 'center' });

      // Foto del candidato en el margen superior derecho
      const photoSize = 35;
      const photoX = pageWidth - marginRight - photoSize;
      const photoY = marginTop;
      
      if (candidate.photoURL) {
        try {
          let imgData = null;
          
          // Método 1: Buscar si la imagen ya está cargada en el DOM
          const existingImg = document.querySelector(`img[src="${candidate.photoURL}"]`);
          if (existingImg && existingImg.complete && existingImg.naturalWidth > 0) {
            try {
              const canvas = document.createElement('canvas');
              canvas.width = existingImg.naturalWidth;
              canvas.height = existingImg.naturalHeight;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(existingImg, 0, 0);
              imgData = canvas.toDataURL('image/jpeg', 0.9);
              console.log('Usando imagen del DOM');
            } catch (error) {
              console.log('Error al usar imagen del DOM, intentando otros métodos');
            }
          }
          
          // Método 2: Intentar obtener nueva URL de Firebase Storage
          if (!imgData && candidate.photoPath) {
            try {
              const photoRef = ref(storage, candidate.photoPath);
              const newUrl = await getDownloadURL(photoRef);
              
              const img = new Image();
              img.crossOrigin = 'anonymous';
              
              imgData = await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error('Timeout')), 5000);
                img.onload = () => {
                  clearTimeout(timeout);
                  try {
                    const canvas = document.createElement('canvas');
                    const maxSize = 300;
                    let width = img.width;
                    let height = img.height;
                    
                    if (width > maxSize || height > maxSize) {
                      const ratio = Math.min(maxSize / width, maxSize / height);
                      width = width * ratio;
                      height = height * ratio;
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', 0.9));
                  } catch (error) {
                    reject(error);
                  }
                };
                img.onerror = () => {
                  clearTimeout(timeout);
                  reject(new Error('Image load failed'));
                };
                img.src = newUrl;
              });
              console.log('Usando nueva URL de Firebase Storage');
            } catch (error) {
              console.log('No se pudo obtener nueva URL de Storage');
            }
          }
          
          // Método 3: Intentar cargar directamente desde photoURL
          if (!imgData) {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            imgData = await new Promise((resolve, reject) => {
              const timeout = setTimeout(() => reject(new Error('Timeout')), 5000);
              img.onload = () => {
                clearTimeout(timeout);
                try {
                  const canvas = document.createElement('canvas');
                  const maxSize = 300;
                  let width = img.width;
                  let height = img.height;
                  
                  if (width > maxSize || height > maxSize) {
                    const ratio = Math.min(maxSize / width, maxSize / height);
                    width = width * ratio;
                    height = height * ratio;
                  }
                  
                  canvas.width = width;
                  canvas.height = height;
                  const ctx = canvas.getContext('2d');
                  ctx.drawImage(img, 0, 0, width, height);
                  resolve(canvas.toDataURL('image/jpeg', 0.9));
                } catch (error) {
                  reject(error);
                }
              };
              img.onerror = () => {
                clearTimeout(timeout);
                reject(new Error('Image load failed'));
              };
              img.src = candidate.photoURL;
            });
            console.log('Usando URL directa');
          }
          
          // Agregar imagen al PDF si la tenemos
          if (imgData) {
            doc.addImage(imgData, 'JPEG', photoX, photoY, photoSize, photoSize);
            console.log('✅ Foto agregada al PDF exitosamente');
          } else {
            console.log('⚠️ No se pudo cargar la foto para el PDF');
          }
        } catch (error) {
          console.error('Error al cargar foto para PDF:', error);
          // Continuar sin foto - el PDF se generará igual
        }
      }

      // Función helper para agregar un campo de formulario
      const addFormField = (label, value, startY) => {
        const labelWidth = 70;
        const valueX = marginLeft + labelWidth + 5;
        const lineHeight = 7;
        
        // Verificar si necesitamos nueva página
        if (startY > pageHeight - 20) {
          doc.addPage();
          return marginTop;
        }
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...labelColor);
        doc.text(label + ':', marginLeft, startY);
        
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...textColor);
        const displayValue = value || '(No especificado)';
        const valueLines = doc.splitTextToSize(displayValue, pageWidth - valueX - marginRight);
        doc.text(valueLines, valueX, startY);
        
        return startY + Math.max(lineHeight, valueLines.length * lineHeight) + 2;
      };

      // Título principal
      doc.setTextColor(...textColor);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      const fullName = getCandidateDisplayName(candidate);
      doc.text(fullName, marginLeft, yPosition);
      yPosition += 12;

      // Línea separadora
      doc.setDrawColor(...primaryColor);
      doc.setLineWidth(0.5);
      doc.line(marginLeft, yPosition, pageWidth - marginRight, yPosition);
      yPosition += 8;

      // INFORMACIÓN BÁSICA
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...primaryColor);
      doc.text('INFORMACIÓN BÁSICA', marginLeft, yPosition);
      yPosition += 8;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...textColor);

      yPosition = addFormField('Nombres', candidate.firstName || '', yPosition);
      yPosition = addFormField('Apellidos', candidate.lastName || '', yPosition);
      yPosition = addFormField('Documento de Identidad', candidate.documentId || '', yPosition);
      yPosition = addFormField('Nombre Completo', candidate.fullName || fullName, yPosition);
      
      if (candidate.birthDate) {
        const birthDate = new Date(candidate.birthDate);
        yPosition = addFormField('Fecha de Nacimiento', birthDate.toLocaleDateString('es-ES'), yPosition);
      } else {
        yPosition = addFormField('Fecha de Nacimiento', '', yPosition);
      }
      
      yPosition = addFormField('Nivel', candidate.level || '', yPosition);
      yPosition = addFormField('Periodo', candidate.period || '', yPosition);
      yPosition = addFormField('Estado', statusLabels[candidate.status] || candidate.status || '', yPosition);
      yPosition = addFormField('Ciudad', candidate.city || '', yPosition);
      yPosition = addFormField('Provincia', candidate.province || '', yPosition);
      yPosition = addFormField('País', candidate.country || '', yPosition);

      yPosition += 5;

      // Línea separadora
      doc.setDrawColor(200, 200, 200);
      doc.line(marginLeft, yPosition, pageWidth - marginRight, yPosition);
      yPosition += 8;

      // INFORMACIÓN DEL TUTOR/ENCARGADO
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...primaryColor);
      doc.text('INFORMACIÓN DEL TUTOR/ENCARGADO', marginLeft, yPosition);
      yPosition += 8;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...textColor);

      const guardian = candidate.guardian || {};
      yPosition = addFormField('Nombre del Tutor', `${guardian.firstName || ''} ${guardian.lastName || ''}`.trim() || '', yPosition);
      yPosition = addFormField('Relación', guardian.relationship || '', yPosition);
      yPosition = addFormField('Teléfono', guardian.phone || '', yPosition);
      yPosition = addFormField('Email', guardian.email || '', yPosition);
      yPosition = addFormField('Contacto Alternativo', guardian.altContact || '', yPosition);
      yPosition = addFormField('Documento de Identidad', guardian.idDocument || '', yPosition);

      yPosition += 5;

      // Línea separadora
      doc.setDrawColor(200, 200, 200);
      doc.line(marginLeft, yPosition, pageWidth - marginRight, yPosition);
      yPosition += 8;

      // SITUACIÓN DEL HOGAR
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...primaryColor);
      doc.text('SITUACIÓN DEL HOGAR', marginLeft, yPosition);
      yPosition += 8;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...textColor);

      const household = candidate.household || {};
      yPosition = addFormField('Miembros de la Familia', household.members ? String(household.members) : '', yPosition);
      yPosition = addFormField('Rango de Ingresos', household.incomeRange || '', yPosition);
      yPosition = addFormField('Empleo del Tutor', household.guardianEmployment || '', yPosition);
      yPosition = addFormField('Vivienda', household.housing || '', yPosition);
      yPosition = addFormField('Apoyo Anterior', household.previousSupport || '', yPosition);
      
      if (household.vulnerabilities && Array.isArray(household.vulnerabilities) && household.vulnerabilities.length > 0) {
        yPosition = addFormField('Vulnerabilidades', household.vulnerabilities.join(', '), yPosition);
      } else {
        yPosition = addFormField('Vulnerabilidades', '', yPosition);
      }

      yPosition += 5;

      // Línea separadora
      doc.setDrawColor(200, 200, 200);
      doc.line(marginLeft, yPosition, pageWidth - marginRight, yPosition);
      yPosition += 8;

      // SOLICITUD DE BECA
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...primaryColor);
      doc.text('SOLICITUD DE BECA', marginLeft, yPosition);
      yPosition += 8;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...textColor);

      const application = candidate.application || {};
      yPosition = addFormField('Tipo de Beca', application.scholarshipType || '', yPosition);
      yPosition = addFormField('Prioridad', priorityLabels[application.priority] || application.priority || '', yPosition);
      yPosition = addFormField('Estado de la Solicitud', application.state || '', yPosition);
      yPosition = addFormField('Evaluador', application.evaluator || '', yPosition);
      
      if (application.reason) {
        const reasonLines = doc.splitTextToSize(application.reason, pageWidth - marginLeft - marginRight);
        yPosition = addFormField('Razón de la Solicitud', application.reason, yPosition);
      } else {
        yPosition = addFormField('Razón de la Solicitud', '', yPosition);
      }

      if (application.createdOn) {
        yPosition = addFormField('Fecha de Creación', application.createdOn, yPosition);
      } else {
        yPosition = addFormField('Fecha de Creación', '', yPosition);
      }

      if (application.updatedOn) {
        yPosition = addFormField('Fecha de Actualización', application.updatedOn, yPosition);
      } else {
        yPosition = addFormField('Fecha de Actualización', '', yPosition);
      }

      yPosition += 5;

      // Línea separadora
      doc.setDrawColor(200, 200, 200);
      doc.line(marginLeft, yPosition, pageWidth - marginRight, yPosition);
      yPosition += 8;

      // NOTAS GENERALES
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...primaryColor);
      doc.text('NOTAS GENERALES', marginLeft, yPosition);
      yPosition += 8;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...textColor);
      
      if (candidate.notes) {
        const notesLines = doc.splitTextToSize(candidate.notes, pageWidth - marginLeft - marginRight);
        doc.text(notesLines, marginLeft, yPosition);
        yPosition += notesLines.length * 5 + 5;
      } else {
        doc.setTextColor(...labelColor);
        doc.text('(Sin notas)', marginLeft, yPosition);
        yPosition += 7;
      }

      // Pie de página en todas las páginas
      const totalPages = doc.internal.pages.length - 1;
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(
          `Escola Mãos Unidas - Página ${i} de ${totalPages}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      }

      // Guardar PDF
      const fileName = `${fullName.replace(/[^a-z0-9]/gi, '_')}_${candidate.period || 'candidato'}.pdf`;
      doc.save(fileName);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error al generar el PDF. Por favor, intenta nuevamente.');
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-olive-600 mx-auto mb-4"></div>
          <p className="text-neutral-600">{t.common.loading}</p>
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
                <h1 className="text-3xl font-bold text-olive-800 mb-2">{t.header.title}</h1>
                <p className="text-neutral-600">{t.header.subtitle}</p>
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-6 py-2 rounded-lg bg-gradient-to-r from-olive-600 to-olive-700 text-white font-semibold hover:from-olive-700 hover:to-olive-800 transition-colors"
              >
                {t.buttons.addCandidate}
              </button>
            </div>
          </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-xl border border-olive-100 p-6">
            <div className="text-sm text-neutral-600 mb-1">{t.stats.total}</div>
            <div className="text-3xl font-bold text-olive-700">{candidates.length}</div>
          </div>
          <div className="bg-white rounded-xl border border-olive-100 p-6">
            <div className="text-sm text-neutral-600 mb-1">{t.stats.pending}</div>
            <div className="text-3xl font-bold text-blue-600">
              {candidates.filter(c => c.status === 'pending').length}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-olive-100 p-6">
            <div className="text-sm text-neutral-600 mb-1">{t.stats.active}</div>
            <div className="text-3xl font-bold text-green-600">
              {candidates.filter(c => c.status === 'active').length}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-sm border border-olive-100 mb-6">
          <div className="flex border-b border-olive-100">
            <button
              onClick={() => setActiveTab('list')}
              className={`px-6 py-4 font-semibold transition-colors ${
                activeTab === 'list'
                  ? 'text-olive-700 border-b-2 border-olive-600'
                  : 'text-neutral-600 hover:text-olive-700'
              }`}
            >
              {t.tabs.list}
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`px-6 py-4 font-semibold transition-colors ${
                activeTab === 'reports'
                  ? 'text-olive-700 border-b-2 border-olive-600'
                  : 'text-neutral-600 hover:text-olive-700'
              }`}
            >
              {t.tabs.reports}
            </button>
          </div>
        </div>

        {/* Candidates Table */}
        {activeTab === 'list' && (
        <>
        {/* Filters Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-olive-100 p-6 mb-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-olive-800 mb-4">{t.filters?.filterBy || 'Filtrar por'}</h2>
            
            {/* Search and Filters Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Search Input */}
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  {t.filters?.search || 'Buscar'}
                </label>
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder={t.filters?.searchPlaceholder || 'Buscar por nombre o apellido...'}
                  className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500 text-neutral-900"
                />
              </div>

              {/* Level Filter */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  {t.filters?.level || 'Nivel'}
                </label>
                <select
                  value={filterLevel}
                  onChange={(e) => setFilterLevel(e.target.value)}
                  className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500 text-neutral-900 bg-white"
                >
                  <option value="">{t.filters?.allLevels || 'Todos los niveles'}</option>
                  {uniqueLevels.map(level => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
              </div>

              {/* Period Filter */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  {t.filters?.period || 'Periodo'}
                </label>
                <select
                  value={filterPeriod}
                  onChange={(e) => setFilterPeriod(e.target.value)}
                  className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500 text-neutral-900 bg-white"
                >
                  <option value="">{t.filters?.allPeriods || 'Todos los periodos'}</option>
                  {uniquePeriods.map(period => (
                    <option key={period} value={period}>{period}</option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  {t.filters?.status || 'Estado'}
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500 text-neutral-900 bg-white"
                >
                  <option value="">{t.filters?.allStatuses || 'Todos los estados'}</option>
                  {STATUS_OPTIONS.map(status => {
                    const label = statusLabels[status] || status;
                    const capitalizedLabel = label.charAt(0).toUpperCase() + label.slice(1);
                    return (
                      <option key={status} value={status}>{capitalizedLabel}</option>
                    );
                  })}
                </select>
              </div>
            </div>

            {/* Clear Filters Button */}
            {(searchText || filterLevel || filterPeriod || filterStatus) && (
              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleClearFilters}
                  className="px-4 py-2 text-sm font-medium text-olive-700 hover:text-olive-800 hover:bg-olive-50 rounded-lg border border-olive-200 transition-colors"
                >
                  {t.filters?.clearFilters || 'Limpiar filtros'}
                </button>
              </div>
            )}

            {/* Results Count */}
            <div className="mt-4 text-sm text-neutral-600">
              {sortedCandidates.length} {sortedCandidates.length === 1 ? (t.filters?.result || 'resultado') : (t.filters?.results || 'resultados')}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-olive-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-olive-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-olive-800 w-16"></th>
                  <th 
                    className="px-6 py-4 text-left text-sm font-semibold text-olive-800 cursor-pointer hover:bg-olive-100 transition-colors select-none"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-2">
                      <span>{t.table.name}</span>
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
                    onClick={() => handleSort('level')}
                  >
                    <div className="flex items-center gap-2">
                      <span>{t.table.level}</span>
                      <div className="flex flex-col">
                        <svg 
                          className={`w-3 h-3 ${sortField === 'level' && sortDirection === 'asc' ? 'text-olive-600' : 'text-olive-300'}`}
                          fill="currentColor" 
                          viewBox="0 0 20 20"
                        >
                          <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                        </svg>
                        <svg 
                          className={`w-3 h-3 -mt-1 ${sortField === 'level' && sortDirection === 'desc' ? 'text-olive-600' : 'text-olive-300'}`}
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
                    onClick={() => handleSort('period')}
                  >
                    <div className="flex items-center gap-2">
                      <span>{t.table.period}</span>
                      <div className="flex flex-col">
                        <svg 
                          className={`w-3 h-3 ${sortField === 'period' && sortDirection === 'asc' ? 'text-olive-600' : 'text-olive-300'}`}
                          fill="currentColor" 
                          viewBox="0 0 20 20"
                        >
                          <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                        </svg>
                        <svg 
                          className={`w-3 h-3 -mt-1 ${sortField === 'period' && sortDirection === 'desc' ? 'text-olive-600' : 'text-olive-300'}`}
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
                      <span>{t.table.status}</span>
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
                    onClick={() => handleSort('priority')}
                  >
                    <div className="flex items-center gap-2">
                      <span>{t.table.priority}</span>
                      <div className="flex flex-col">
                        <svg 
                          className={`w-3 h-3 ${sortField === 'priority' && sortDirection === 'asc' ? 'text-olive-600' : 'text-olive-300'}`}
                          fill="currentColor" 
                          viewBox="0 0 20 20"
                        >
                          <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                        </svg>
                        <svg 
                          className={`w-3 h-3 -mt-1 ${sortField === 'priority' && sortDirection === 'desc' ? 'text-olive-600' : 'text-olive-300'}`}
                          fill="currentColor" 
                          viewBox="0 0 20 20"
                        >
                          <path d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" />
                        </svg>
                      </div>
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-olive-800">{t.table.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-olive-100">
                {paginatedCandidates.map((candidate) => (
                  <tr key={candidate.id} className="hover:bg-olive-50/30 transition-colors">
                    <td className="px-6 py-4">
                      <div 
                        className="relative flex-shrink-0 overflow-hidden rounded-lg border-2 border-olive-200 bg-olive-50 flex items-center justify-center"
                        style={{ width: '48px', height: '48px', minWidth: '48px', minHeight: '48px' }}
                      >
                        {candidate.gender === 'femenino' || candidate.gender === 'female' ? (
                          <svg className="w-8 h-8 text-pink-500" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                          </svg>
                        ) : candidate.gender === 'masculino' || candidate.gender === 'male' ? (
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
                      <div className="font-medium text-neutral-900">{getCandidateDisplayName(candidate)}</div>
                      {candidate.birthDate && (
                        <div className="text-sm text-neutral-500">
                          {t.table.birthDatePrefix} {new Date(candidate.birthDate).toLocaleDateString()}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-neutral-700">{candidate.level}</td>
                    <td className="px-6 py-4 text-neutral-700">{candidate.period}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        candidate.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        candidate.status === 'active' ? 'bg-green-100 text-green-800' :
                        candidate.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-neutral-100 text-neutral-800'
                      }`}>
                        {statusLabels[candidate.status] || candidate.status || statusLabels.unknown}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        candidate.application?.priority === 'alta' ? 'bg-red-100 text-red-800' :
                        candidate.application?.priority === 'media' ? 'bg-yellow-100 text-yellow-800' :
                        candidate.application?.priority === 'baja' ? 'bg-green-100 text-green-800' :
                        'bg-neutral-100 text-neutral-800'
                      }`}>
                        {priorityLabels[candidate.application?.priority || 'sin-prioridad'] || priorityLabels['sin-prioridad']}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => setViewingCandidate(candidate)}
                          className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                          title={t.table.viewDetails}
                        >
                          👁️ {t.table.viewDetails}
                        </button>
                        <button
                          onClick={() => handleEdit(candidate)}
                          className="px-3 py-1 text-sm bg-olive-600 text-white rounded hover:bg-olive-700 transition-colors"
                        >
                          {t.table.edit}
                        </button>
                        <button
                          onClick={() => handleExportPDF(candidate)}
                          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-1"
                          title="Exportar a PDF"
                        >
                          📄 {t.table.exportPDF}
                        </button>
                        <button
                          onClick={() => handleDelete(candidate.id)}
                          className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                        >
                          {t.table.delete}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination and Count */}
          <div className="px-6 py-4 bg-white border-t border-olive-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-neutral-600">
              {t.filters?.showing || 'Mostrando'} {totalRecords > 0 ? startIndex + 1 : 0} - {Math.min(endIndex, totalRecords)} {t.filters?.of || 'de'} {totalRecords} {t.filters?.results || 'resultados'}
            </div>
            
            <div className="flex items-center gap-4">
              {/* Records per page selector */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-neutral-600">{t.table?.recordsPerPage || 'Registros por página'}:</label>
                <select
                  value={recordsPerPage}
                  onChange={(e) => {
                    setRecordsPerPage(e.target.value === 'all' ? 'all' : parseInt(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-3 py-1.5 border border-olive-200 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500 text-neutral-900 bg-white text-sm"
                >
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                  <option value="all">{t.table?.all || 'TODOS'}</option>
                </select>
              </div>
              
              {/* Pagination controls */}
              {recordsPerPage !== 'all' && totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 text-sm border border-olive-200 rounded-lg hover:bg-olive-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {t.common?.previous || 'Anterior'}
                  </button>
                  
                  <span className="text-sm text-neutral-600">
                    {t.common?.page || 'Página'} {currentPage} {t.common?.of || 'de'} {totalPages}
                  </span>
                  
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 text-sm border border-olive-200 rounded-lg hover:bg-olive-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {t.common?.next || 'Siguiente'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        </>
        )}

        {/* Reports Section */}
        {activeTab === 'reports' && (
          <ReportsSection candidates={candidates} t={t} statusLabels={statusLabels} priorityLabels={priorityLabels} />
        )}
        </div>
      </div>

      {/* View Details Modal */}
      {viewingCandidate && (
        <CandidateDetailModal
          candidate={viewingCandidate}
          onClose={() => setViewingCandidate(null)}
          onEdit={() => {
            setViewingCandidate(null);
            setEditingCandidate(viewingCandidate);
          }}
          onExportPDF={() => handleExportPDF(viewingCandidate)}
          t={t}
          statusLabels={statusLabels}
          priorityLabels={priorityLabels}
        />
      )}

      {/* Edit Modal */}
      {editingCandidate && (
        <CandidateEditModal
          candidate={editingCandidate}
          onClose={() => setEditingCandidate(null)}
          onSave={handleSave}
          t={t}
          statusOptions={STATUS_OPTIONS}
          priorityOptions={PRIORITY_OPTIONS}
        />
      )}

      {/* Sponsor Info Modal */}
      {showSponsorModal && pendingCandidateUpdate && (
        <SponsorInfoModal
          candidate={pendingCandidateUpdate}
          onClose={() => {
            setShowSponsorModal(false);
            setPendingCandidateUpdate(null);
          }}
          onSave={handleSponsorSave}
          t={t}
        />
      )}

      {/* Add Modal */}
      {showAddModal && (
        <CandidateAddModal
          onClose={() => setShowAddModal(false)}
          onSave={async (newCandidate) => {
            try {
              setIsLoading(true);
              await addDoc(collection(db, 'candidates'), {
                ...newCandidate,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              });
              setShowAddModal(false);
              await fetchCandidates();
            } catch (error) {
              console.error('Error adding candidate:', error);
              alert(t.errors.add);
            } finally {
              setIsLoading(false);
            }
          }}
          t={t}
          statusOptions={STATUS_OPTIONS}
          priorityOptions={PRIORITY_OPTIONS}
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
            <p className="text-lg font-semibold text-neutral-700">{t.common.loading}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// Sponsor Info Modal Component
function SponsorInfoModal({ candidate, onClose, onSave, t }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedSponsor, setSelectedSponsor] = useState(null);
  const [sponsorData, setSponsorData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    country: '',
    notes: '',
  });
  const [errors, setErrors] = useState({});
  const [isCreating, setIsCreating] = useState(false);

  // Search for sponsors
  useEffect(() => {
    const performSearch = async () => {
      if (searchTerm.trim().length < 2) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const results = await searchSponsors(searchTerm);
        setSearchResults(results);
      } catch (error) {
        console.error('Error searching sponsors:', error);
        alert('Error al buscar patrocinadores');
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(performSearch, 300); // Debounce search
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const validate = () => {
    const newErrors = {};
    if (!sponsorData.firstName.trim()) {
      newErrors.firstName = t.sponsor.required;
    }
    if (!sponsorData.lastName.trim()) {
      newErrors.lastName = t.sponsor.required;
    }
    if (!sponsorData.email.trim()) {
      newErrors.email = t.sponsor.required;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sponsorData.email)) {
      newErrors.email = 'Email inválido';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSelectSponsor = (sponsor) => {
    setSelectedSponsor(sponsor);
    setSearchTerm('');
    setSearchResults([]);
  };

  const handleCreateSponsor = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsCreating(true);
    try {
      const sponsorId = await createSponsor(sponsorData);
      onSave(sponsorId);
    } catch (error) {
      console.error('Error creating sponsor:', error);
      alert('Error al crear patrocinador');
    } finally {
      setIsCreating(false);
    }
  };

  const handleUseSelectedSponsor = () => {
    if (selectedSponsor) {
      onSave(selectedSponsor.id);
    }
  };

  const candidateName = candidate.firstName && candidate.lastName
    ? `${candidate.firstName} ${candidate.lastName}`
    : candidate.fullName || 'Candidato';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-olive-100 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-olive-800">{t.sponsor.title}</h2>
            <p className="text-sm text-neutral-600 mt-1">
              {t.sponsor.description} - <span className="font-semibold">{candidateName}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 text-2xl font-bold"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          {!selectedSponsor && !showCreateForm && (
            <div className="space-y-4">
              {/* Search Section */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  {t.sponsor.searchLabel || 'Buscar Patrocinador'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={t.sponsor.searchPlaceholder || 'Buscar por nombre o apellido...'}
                    className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:border-olive-400 focus:ring-2 focus:ring-olive-100"
                  />
                  {isSearching && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="w-5 h-5 border-2 border-olive-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="border border-olive-200 rounded-lg max-h-60 overflow-y-auto">
                  <div className="p-2 bg-olive-50 text-sm font-semibold text-olive-800">
                    {t.sponsor.searchResults || 'Resultados de búsqueda'}
                  </div>
                  {searchResults.map((sponsor) => (
                    <button
                      key={sponsor.id}
                      onClick={() => handleSelectSponsor(sponsor)}
                      className="w-full text-left px-4 py-3 hover:bg-olive-50 border-b border-olive-100 last:border-b-0 transition-colors"
                    >
                      <div className="font-semibold text-neutral-800">
                        {sponsor.firstName} {sponsor.lastName}
                      </div>
                      {sponsor.email && (
                        <div className="text-sm text-neutral-600">{sponsor.email}</div>
                      )}
                      {sponsor.phone && (
                        <div className="text-sm text-neutral-600">{sponsor.phone}</div>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {searchTerm.length >= 2 && !isSearching && searchResults.length === 0 && (
                <div className="text-center py-4 text-neutral-500">
                  {t.sponsor.noResults || 'No se encontraron patrocinadores'}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-olive-100">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(true)}
                  className="flex-1 px-4 py-2 border border-olive-300 rounded-lg hover:bg-olive-50 text-olive-700 font-semibold transition-colors"
                >
                  {t.sponsor.createNew || 'Crear Nuevo Patrocinador'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-100 text-neutral-700 font-semibold transition-colors"
                >
                  {t.sponsor.cancel}
                </button>
              </div>
            </div>
          )}

          {/* Selected Sponsor Display */}
          {selectedSponsor && !showCreateForm && (
            <div className="space-y-4">
              <div className="bg-olive-50 border border-olive-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-olive-800">
                    {t.sponsor.selectedSponsor || 'Patrocinador Seleccionado'}
                  </h3>
                  <button
                    onClick={() => setSelectedSponsor(null)}
                    className="text-sm text-olive-600 hover:text-olive-800"
                  >
                    {t.sponsor.change || 'Cambiar'}
                  </button>
                </div>
                <div className="space-y-1">
                  <div className="font-semibold text-neutral-800">
                    {selectedSponsor.firstName} {selectedSponsor.lastName}
                  </div>
                  {selectedSponsor.email && (
                    <div className="text-sm text-neutral-600">📧 {selectedSponsor.email}</div>
                  )}
                  {selectedSponsor.phone && (
                    <div className="text-sm text-neutral-600">📞 {selectedSponsor.phone}</div>
                  )}
                  {selectedSponsor.city && (
                    <div className="text-sm text-neutral-600">📍 {selectedSponsor.city}{selectedSponsor.country ? `, ${selectedSponsor.country}` : ''}</div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-olive-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-100 text-neutral-700 font-semibold transition-colors"
                >
                  {t.sponsor.cancel}
                </button>
                <button
                  type="button"
                  onClick={handleUseSelectedSponsor}
                  className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-olive-600 to-olive-700 text-white font-semibold hover:from-olive-700 hover:to-olive-800 transition-colors shadow-md"
                >
                  {t.sponsor.useSelected || 'Usar este Patrocinador'}
                </button>
              </div>
            </div>
          )}

          {/* Create New Sponsor Form */}
          {showCreateForm && (
            <form onSubmit={handleCreateSponsor} className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-olive-800">
                  {t.sponsor.createNew || 'Crear Nuevo Patrocinador'}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setSponsorData({
                      firstName: '',
                      lastName: '',
                      email: '',
                      phone: '',
                      address: '',
                      city: '',
                      country: '',
                      notes: '',
                    });
                    setErrors({});
                  }}
                  className="text-sm text-olive-600 hover:text-olive-800"
                >
                  {t.sponsor.cancel || 'Cancelar'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    {t.sponsor.firstName} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={sponsorData.firstName}
                    onChange={(e) => setSponsorData({ ...sponsorData, firstName: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-olive-100 ${
                      errors.firstName ? 'border-red-300' : 'border-olive-200 focus:border-olive-400'
                    }`}
                    required
                  />
                  {errors.firstName && (
                    <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    {t.sponsor.lastName} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={sponsorData.lastName}
                    onChange={(e) => setSponsorData({ ...sponsorData, lastName: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-olive-100 ${
                      errors.lastName ? 'border-red-300' : 'border-olive-200 focus:border-olive-400'
                    }`}
                    required
                  />
                  {errors.lastName && (
                    <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    {t.sponsor.email} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={sponsorData.email}
                    onChange={(e) => setSponsorData({ ...sponsorData, email: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-olive-100 ${
                      errors.email ? 'border-red-300' : 'border-olive-200 focus:border-olive-400'
                    }`}
                    required
                  />
                  {errors.email && (
                    <p className="text-red-500 text-xs mt-1">{errors.email}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    {t.sponsor.phone}
                  </label>
                  <input
                    type="tel"
                    value={sponsorData.phone}
                    onChange={(e) => setSponsorData({ ...sponsorData, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:border-olive-400 focus:ring-2 focus:ring-olive-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  {t.sponsor.address}
                </label>
                <input
                  type="text"
                  value={sponsorData.address}
                  onChange={(e) => setSponsorData({ ...sponsorData, address: e.target.value })}
                  className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:border-olive-400 focus:ring-2 focus:ring-olive-100"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    {t.sponsor.city}
                  </label>
                  <input
                    type="text"
                    value={sponsorData.city}
                    onChange={(e) => setSponsorData({ ...sponsorData, city: e.target.value })}
                    className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:border-olive-400 focus:ring-2 focus:ring-olive-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    {t.sponsor.country}
                  </label>
                  <input
                    type="text"
                    value={sponsorData.country}
                    onChange={(e) => setSponsorData({ ...sponsorData, country: e.target.value })}
                    className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:border-olive-400 focus:ring-2 focus:ring-olive-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  {t.sponsor.notes}
                </label>
                <textarea
                  value={sponsorData.notes}
                  onChange={(e) => setSponsorData({ ...sponsorData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:border-olive-400 focus:ring-2 focus:ring-olive-100"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-olive-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setSponsorData({
                      firstName: '',
                      lastName: '',
                      email: '',
                      phone: '',
                      address: '',
                      city: '',
                      country: '',
                      notes: '',
                    });
                    setErrors({});
                  }}
                  className="flex-1 px-4 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-100 text-neutral-700 font-semibold transition-colors"
                >
                  {t.sponsor.cancel}
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-olive-600 to-olive-700 text-white font-semibold hover:from-olive-700 hover:to-olive-800 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreating ? (t.common.loading || 'Guardando...') : (t.sponsor.create || 'Crear Patrocinador')}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// Detail View Modal Component
function CandidateDetailModal({ candidate, onClose, onEdit, onExportPDF, t, statusLabels, priorityLabels }) {
  const getCandidateDisplayName = (candidate) => {
    const first = candidate.firstName?.trim() || '';
    const last = candidate.lastName?.trim() || '';
    const combined = `${first} ${last}`.replace(/\s+/g, ' ').trim();
    if (combined.length > 0) return combined;
    return candidate.fullName || 'Sin nombre';
  };

  const fullName = getCandidateDisplayName(candidate);
  const guardian = candidate.guardian || {};
  const household = candidate.household || {};
  const application = candidate.application || {};
  const [sponsor, setSponsor] = useState(null);
  const [loadingSponsor, setLoadingSponsor] = useState(false);

  // Load sponsor if candidate has sponsorId
  useEffect(() => {
    const loadSponsor = async () => {
      if (candidate.sponsorId) {
        setLoadingSponsor(true);
        try {
          const sponsorData = await getSponsorById(candidate.sponsorId);
          setSponsor(sponsorData);
        } catch (error) {
          console.error('Error loading sponsor:', error);
        } finally {
          setLoadingSponsor(false);
        }
      } else {
        setSponsor(null);
      }
    };
    loadSponsor();
  }, [candidate.sponsorId]);

  const formatDate = (dateString) => {
    if (!dateString) return '(No especificado)';
    try {
      return new Date(dateString).toLocaleDateString('es-ES');
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-olive-100 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-2xl font-bold text-olive-800">Detalle del Candidato</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 text-2xl" aria-label="Close">×</button>
        </div>
        
        <div className="p-6">
          {/* Header con foto y nombre */}
          <div className="flex items-start gap-6 mb-8 pb-6 border-b-2 border-olive-200">
            <div className="flex-shrink-0">
              {candidate.photoURL ? (
                <img 
                  src={candidate.photoURL} 
                  alt={fullName}
                  className="w-32 h-32 rounded-lg object-cover border-4 border-olive-200 shadow-lg"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div 
                className={`w-32 h-32 rounded-lg bg-olive-100 border-4 border-olive-200 flex items-center justify-center text-olive-600 font-bold text-4xl shadow-lg ${candidate.photoURL ? 'hidden' : 'flex'}`}
              >
                {fullName.charAt(0).toUpperCase()}
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-3xl font-bold text-olive-800 mb-2">{fullName}</h3>
              <div className="flex flex-wrap gap-2 mb-3">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                  candidate.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  candidate.status === 'active' ? 'bg-green-100 text-green-800' :
                  candidate.status === 'rejected' ? 'bg-red-100 text-red-800' :
                  'bg-neutral-100 text-neutral-800'
                }`}>
                  {statusLabels[candidate.status] || candidate.status || statusLabels.unknown}
                </span>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                  application.priority === 'alta' ? 'bg-red-100 text-red-800' :
                  application.priority === 'media' ? 'bg-yellow-100 text-yellow-800' :
                  application.priority === 'baja' ? 'bg-green-100 text-green-800' :
                  'bg-neutral-100 text-neutral-800'
                }`}>
                  {priorityLabels[application.priority || 'sin-prioridad'] || priorityLabels['sin-prioridad']}
                </span>
              </div>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={onEdit}
                  className="px-4 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700 transition-colors font-semibold"
                >
                  ✏️ {t.table.edit}
                </button>
                <button
                  onClick={onExportPDF}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                >
                  📄 {t.table.exportPDF}
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-100 text-neutral-700 transition-colors font-semibold"
                >
                  {t.buttons.cancel}
                </button>
              </div>
            </div>
          </div>

          {/* Información Básica */}
          <div className="mb-6">
            <h4 className="text-xl font-bold text-olive-800 mb-4 pb-2 border-b border-olive-200">
              {t.forms.basicInfo}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoField label={t.forms.firstName} value={candidate.firstName} />
              <InfoField label={t.forms.lastName} value={candidate.lastName} />
              <InfoField label={t.forms.documentId || 'Documento de Identidad'} value={candidate.documentId || '-'} />
              <InfoField label="Nombre Completo" value={candidate.fullName || fullName} />
              <InfoField label={t.forms.birthDate} value={formatDate(candidate.birthDate)} />
              <InfoField label={t.forms.level} value={candidate.level} />
              <InfoField label={t.forms.period} value={candidate.period} />
              <InfoField label={t.forms.status} value={statusLabels[candidate.status] || candidate.status} />
              <InfoField label={t.forms.city} value={candidate.city} />
              <InfoField label={t.forms.province} value={candidate.province} />
              <InfoField label={t.forms.country} value={candidate.country} />
            </div>
          </div>

          {/* Información del Tutor */}
          <div className="mb-6">
            <h4 className="text-xl font-bold text-olive-800 mb-4 pb-2 border-b border-olive-200">
              {t.guardian.heading}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoField label={t.guardian.firstName} value={guardian.firstName} />
              <InfoField label={t.guardian.lastName} value={guardian.lastName} />
              <InfoField label={t.guardian.relationship} value={guardian.relationship} />
              <InfoField label={t.guardian.phone} value={guardian.phone} />
              <InfoField label={t.guardian.email} value={guardian.email} />
              <InfoField label={t.guardian.altContact} value={guardian.altContact} />
              <InfoField label="Documento de Identidad" value={guardian.idDocument} />
            </div>
          </div>

          {/* Situación del Hogar */}
          <div className="mb-6">
            <h4 className="text-xl font-bold text-olive-800 mb-4 pb-2 border-b border-olive-200">
              {t.household.heading}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoField label={t.household.members} value={household.members ? String(household.members) : ''} />
              <InfoField label={t.household.incomeRange} value={household.incomeRange} />
              <InfoField label={t.household.guardianEmployment} value={household.guardianEmployment} />
              <InfoField label={t.household.housing} value={household.housing} />
              <InfoField label={t.household.previousSupport} value={household.previousSupport} />
              <InfoField 
                label="Vulnerabilidades" 
                value={household.vulnerabilities && Array.isArray(household.vulnerabilities) 
                  ? household.vulnerabilities.join(', ') 
                  : ''} 
              />
            </div>
          </div>

          {/* Solicitud de Beca */}
          <div className="mb-6">
            <h4 className="text-xl font-bold text-olive-800 mb-4 pb-2 border-b border-olive-200">
              {t.application.heading}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoField label={t.application.scholarshipType} value={application.scholarshipType} />
              <InfoField label={t.application.priority} value={priorityLabels[application.priority] || application.priority} />
              <InfoField label="Estado de la Solicitud" value={application.state} />
              <InfoField label="Evaluador" value={application.evaluator} />
              <InfoField label="Fecha de Creación" value={formatDate(application.createdOn)} />
              <InfoField label="Fecha de Actualización" value={formatDate(application.updatedOn)} />
              {application.reason && (
                <div className="md:col-span-2 py-3 border-b border-olive-100">
                  <div className="text-sm font-semibold text-olive-700 mb-1">{t.application.reason}</div>
                  <div className="text-base text-neutral-800 whitespace-pre-wrap">{application.reason}</div>
                </div>
              )}
            </div>
          </div>

          {/* Información del Patrocinador */}
          {loadingSponsor && (
            <div className="mb-6">
              <h4 className="text-xl font-bold text-olive-800 mb-4 pb-2 border-b border-olive-200">
                {t.sponsor.heading}
              </h4>
              <div className="text-neutral-500">Cargando información del patrocinador...</div>
            </div>
          )}
          {!loadingSponsor && sponsor && (
            <div className="mb-6">
              <h4 className="text-xl font-bold text-olive-800 mb-4 pb-2 border-b border-olive-200">
                {t.sponsor.heading}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoField label={t.sponsor.firstName} value={sponsor.firstName} />
                <InfoField label={t.sponsor.lastName} value={sponsor.lastName} />
                <InfoField label={t.sponsor.email} value={sponsor.email} />
                <InfoField label={t.sponsor.phone} value={sponsor.phone} />
                <InfoField label={t.sponsor.address} value={sponsor.address} />
                <InfoField label={t.sponsor.city} value={sponsor.city} />
                <InfoField label={t.sponsor.country} value={sponsor.country} />
                <InfoField label="Fecha de Asignación" value={formatDate(candidate.sponsorAssignedDate)} />
                {sponsor.notes && (
                  <div className="md:col-span-2 py-3 border-b border-olive-100">
                    <div className="text-sm font-semibold text-olive-700 mb-1">{t.sponsor.notes}</div>
                    <div className="text-base text-neutral-800 whitespace-pre-wrap">{sponsor.notes}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notas Generales */}
          {candidate.notes && (
            <div className="mb-6">
              <h4 className="text-xl font-bold text-olive-800 mb-4 pb-2 border-b border-olive-200">
                {t.forms.notes}
              </h4>
              <div className="py-3">
                <div className="text-base text-neutral-800 whitespace-pre-wrap">{candidate.notes}</div>
              </div>
            </div>
          )}

          {/* Información de Auditoría */}
          <div className="mt-6 pt-6 border-t-2 border-olive-200">
            <h4 className="text-lg font-semibold text-neutral-600 mb-3">Información del Sistema</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <InfoField label="ID del Candidato" value={candidate.candidate_id || candidate.id} className="text-xs" />
              <InfoField label="Fecha de Creación" value={formatDate(candidate.createdAt)} className="text-xs" />
              <InfoField label="Última Actualización" value={formatDate(candidate.updatedAt)} className="text-xs" />
              <InfoField label="Creado por" value={candidate.createdBy || '(Sistema)'} className="text-xs" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Edit Modal Component
function CandidateEditModal({ candidate, onClose, onSave, t, statusOptions = STATUS_OPTIONS, priorityOptions = PRIORITY_OPTIONS }) {
  // Helper functions for date formatting (dd/mm/yyyy)
  const formatDateToDDMMYYYY = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return '';
    }
  };

  const parseDDMMYYYYToISO = (dateString) => {
    if (!dateString) return '';
    // Remove any spaces
    const cleaned = dateString.trim();
    // Check if it's already in ISO format (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
      return cleaned;
    }
    // Try to parse dd/mm/yyyy format
    const match = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (match) {
      const day = String(match[1]).padStart(2, '0');
      const month = String(match[2]).padStart(2, '0');
      const year = match[3];
      // Validate date
      const date = new Date(`${year}-${month}-${day}`);
      if (!isNaN(date.getTime()) && 
          date.getDate() == parseInt(day) && 
          date.getMonth() + 1 == parseInt(month)) {
        return `${year}-${month}-${day}`;
      }
    }
    return '';
  };

  const deriveNames = (source) => {
    if (source.firstName || source.lastName) {
      return {
        firstName: source.firstName || '',
        lastName: source.lastName || '',
        documentId: source.documentId || '',
      };
    }
    const full = (source.fullName || '').trim();
    if (!full) {
      return { firstName: '', lastName: '' };
    }
    const parts = full.split(' ').filter(Boolean);
    if (parts.length === 1) {
      return { firstName: parts[0], lastName: '' };
    }
    return {
      firstName: parts.slice(0, -1).join(' '),
      lastName: parts.slice(-1).join(' '),
    };
  };

  const initialNames = deriveNames(candidate);

  const [formData, setFormData] = useState({
    ...candidate,
    firstName: initialNames.firstName,
    lastName: initialNames.lastName,
    documentId: candidate.documentId || initialNames.documentId || '',
    guardian: candidate.guardian || {},
    household: candidate.household || {},
    application: {
      ...candidate.application,
      scholarshipType: candidate.application?.scholarshipType || 'Completa',
    },
    documents: candidate.documents || {},
  });

  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(candidate.photoURL || null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const statusLabels = t.statuses;
  const priorityLabels = t.priorities;

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
    setFormData({ ...formData, photoURL: null, photoPath: null });
  };

  const uploadPhoto = async (candidateId) => {
    if (!photoFile) return null;

    // Verificar autenticación
    if (!auth.currentUser) {
      alert('Debes estar autenticado para subir fotos');
      return null;
    }

    try {
      setUploadingPhoto(true);
      const fileExtension = photoFile.name.split('.').pop();
      const photoPath = `candidates/${candidateId}/profile.${fileExtension}`;
      const storageRef = ref(storage, photoPath);
      
      await uploadBytes(storageRef, photoFile);
      const downloadURL = await getDownloadURL(storageRef);
      
      return { photoURL: downloadURL, photoPath };
    } catch (error) {
      console.error('Error uploading photo:', error);
      let errorMessage = t.forms.photoError;
      if (error.code === 'storage/unauthorized') {
        errorMessage = 'No tienes permisos para subir fotos. Verifica que estés autenticado.';
      } else if (error.code === 'storage/canceled') {
        errorMessage = 'La subida fue cancelada.';
      } else if (error.code === 'storage/unknown') {
        errorMessage = 'Error desconocido. Verifica tu conexión y las reglas de Storage.';
      }
      alert(errorMessage);
      return null;
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.documentId || !formData.documentId.trim()) {
      alert(t.forms.documentId ? `${t.forms.documentId} es requerido` : 'Documento de Identidad es requerido');
      return;
    }
    
    const trimmedFirstName = (formData.firstName || '').trim();
    const trimmedLastName = (formData.lastName || '').trim();
    
    let photoData = {};
    if (photoFile) {
      const uploaded = await uploadPhoto(candidate.id || candidate.candidate_id);
      if (uploaded) {
        photoData = uploaded;
      }
    } else if (photoPreview === null && formData.photoURL) {
      // Photo was removed, delete from storage
      if (formData.photoPath) {
        try {
          const photoRef = ref(storage, formData.photoPath);
          await deleteObject(photoRef);
        } catch (error) {
          console.error('Error deleting photo:', error);
        }
      }
      photoData = { photoURL: null, photoPath: null };
    }

    onSave({
      ...formData,
      firstName: trimmedFirstName,
      lastName: trimmedLastName,
      ...photoData,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-olive-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-olive-800">{t.modals.editTitle}</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600" aria-label="Close">✕</button>
        </div>
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Información Básica */}
            <div className="border-b border-olive-100 pb-4">
              <h3 className="text-lg font-semibold text-olive-800 mb-4">{t.forms.basicInfo}</h3>
              
              {/* Foto de Perfil */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-neutral-700 mb-2">{t.forms.photo}</label>
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
                        title={t.forms.photoRemove}
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-lg bg-olive-100 border-2 border-olive-200 flex items-center justify-center text-olive-400">
                      <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="hidden"
                      id="photo-upload-edit"
                      disabled={uploadingPhoto}
                    />
                    <label
                      htmlFor="photo-upload-edit"
                      className={`inline-block px-4 py-2 rounded-lg border border-olive-300 text-olive-700 hover:bg-olive-50 cursor-pointer transition-colors ${uploadingPhoto ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {uploadingPhoto ? t.forms.photoUploading : t.forms.photoUpload}
                    </label>
                    <p className="text-xs text-neutral-500 mt-1">Max 5MB, formatos: JPG, PNG</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">{t.forms.firstName}</label>
                    <input
                      type="text"
                      value={formData.firstName || ''}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:border-olive-400 focus:ring-2 focus:ring-olive-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">{t.forms.lastName}</label>
                    <input
                      type="text"
                      value={formData.lastName || ''}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:border-olive-400 focus:ring-2 focus:ring-olive-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      {t.forms.documentId || 'Documento de Identidad'} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.documentId || ''}
                      onChange={(e) => setFormData({ ...formData, documentId: e.target.value })}
                      className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:border-olive-400 focus:ring-2 focus:ring-olive-100"
                      placeholder={t.forms.documentIdPlaceholder || 'Número de documento'}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">{t.forms.gender}</label>
                  <select
                    value={formData.gender || ''}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:border-olive-400 focus:ring-2 focus:ring-olive-100"
                  >
                    <option value="">{t.forms.selectPlaceholder}</option>
                    <option value="masculino">{t.forms.genderMale}</option>
                    <option value="femenino">{t.forms.genderFemale}</option>
                  </select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">{t.forms.birthDate}</label>
                    <input
                      type="date"
                      value={formData.birthDate || ''}
                      onChange={(e) => {
                        setFormData({ ...formData, birthDate: e.target.value });
                      }}
                      className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:border-olive-400 focus:ring-2 focus:ring-olive-100"
                      style={{ 
                        colorScheme: 'light',
                        // Force locale to Spanish/Portuguese for dd/mm/yyyy format
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">{t.forms.level}</label>
                    <select
                      value={formData.level || ''}
                      onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                      className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:border-olive-400 focus:ring-2 focus:ring-olive-100"
                    >
                      <option value="Jardín">Jardín</option>
                      <option value="1° grado">1° grado</option>
                      <option value="2do grado">2do grado</option>
                      <option value="3º Grado">3º Grado</option>
                      <option value="4º Grado">4º Grado</option>
                      <option value="5º Grado">5º Grado</option>
                      <option value="6º Grado">6º Grado</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">{t.forms.status}</label>
                    <select
                      value={formData.status || 'pending'}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:border-olive-400 focus:ring-2 focus:ring-olive-100"
                    >
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {statusLabels[status] || statusLabels.unknown}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">{t.forms.city}</label>
                    <input
                      type="text"
                      value={formData.city || ''}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:border-olive-400 focus:ring-2 focus:ring-olive-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">{t.forms.province}</label>
                    <input
                      type="text"
                      value={formData.province || ''}
                      onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                      className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:border-olive-400 focus:ring-2 focus:ring-olive-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">{t.forms.country}</label>
                    <input
                      type="text"
                      value={formData.country || ''}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:border-olive-400 focus:ring-2 focus:ring-olive-100"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">{t.forms.period}</label>
                  <input
                    type="text"
                    value={formData.period || ''}
                    onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                    className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:border-olive-400 focus:ring-2 focus:ring-olive-100"
                  />
                </div>
              </div>
            </div>

            {/* Información del Tutor */}
            <div className="border-b border-olive-100 pb-4">
              <h3 className="text-lg font-semibold text-olive-800 mb-4">{t.guardian.heading}</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">{t.guardian.firstName}</label>
                  <input
                    type="text"
                    value={formData.guardian?.firstName || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      guardian: { ...formData.guardian, firstName: e.target.value } 
                    })}
                    className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:border-olive-400 focus:ring-2 focus:ring-olive-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">{t.guardian.lastName}</label>
                  <input
                    type="text"
                    value={formData.guardian?.lastName || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      guardian: { ...formData.guardian, lastName: e.target.value } 
                    })}
                    className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:border-olive-400 focus:ring-2 focus:ring-olive-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">{t.guardian.relationship}</label>
                  <input
                    type="text"
                    value={formData.guardian?.relationship || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      guardian: { ...formData.guardian, relationship: e.target.value } 
                    })}
                    className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:border-olive-400 focus:ring-2 focus:ring-olive-100"
                    placeholder={t.guardian.relationshipPlaceholder}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">{t.guardian.phone}</label>
                  <input
                    type="tel"
                    value={formData.guardian?.phone || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      guardian: { ...formData.guardian, phone: e.target.value } 
                    })}
                    className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:border-olive-400 focus:ring-2 focus:ring-olive-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">{t.guardian.email}</label>
                  <input
                    type="email"
                    value={formData.guardian?.email || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      guardian: { ...formData.guardian, email: e.target.value } 
                    })}
                    className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:border-olive-400 focus:ring-2 focus:ring-olive-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">{t.guardian.altContact}</label>
                  <input
                    type="text"
                    value={formData.guardian?.altContact || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      guardian: { ...formData.guardian, altContact: e.target.value } 
                    })}
                    className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:border-olive-400 focus:ring-2 focus:ring-olive-100"
                  />
                </div>
              </div>
            </div>

            {/* Información del Hogar */}
            <div className="border-b border-olive-100 pb-4">
              <h3 className="text-lg font-semibold text-olive-800 mb-4">{t.household.heading}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">{t.household.members}</label>
                  <input
                    type="number"
                    value={formData.household?.members || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      household: { ...formData.household, members: e.target.value } 
                    })}
                    className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:border-olive-400 focus:ring-2 focus:ring-olive-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">{t.household.incomeRange}</label>
                  <select
                    value={formData.household?.incomeRange || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      household: { ...formData.household, incomeRange: e.target.value } 
                    })}
                    className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:border-olive-400 focus:ring-2 focus:ring-olive-100"
                  >
                    <option value="">{t.forms.selectPlaceholder}</option>
                    <option value="bajo">Bajo</option>
                    <option value="medio-bajo">Medio-Bajo</option>
                    <option value="medio">Medio</option>
                    <option value="medio-alto">Medio-Alto</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">{t.household.guardianEmployment}</label>
                  <input
                    type="text"
                    value={formData.household?.guardianEmployment || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      household: { ...formData.household, guardianEmployment: e.target.value } 
                    })}
                    className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:border-olive-400 focus:ring-2 focus:ring-olive-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">{t.household.housing}</label>
                  <input
                    type="text"
                    value={formData.household?.housing || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      household: { ...formData.household, housing: e.target.value } 
                    })}
                    className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:border-olive-400 focus:ring-2 focus:ring-olive-100"
                    placeholder={t.household.housingPlaceholder}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">{t.household.previousSupport}</label>
                  <input
                    type="text"
                    value={formData.household?.previousSupport || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      household: { ...formData.household, previousSupport: e.target.value } 
                    })}
                    className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:border-olive-400 focus:ring-2 focus:ring-olive-100"
                  />
                </div>
              </div>
            </div>

            {/* Información de la Solicitud */}
            <div className="border-b border-olive-100 pb-4">
              <h3 className="text-lg font-semibold text-olive-800 mb-4">{t.application.heading}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">{t.application.scholarshipType}</label>
                  <select
                    value={formData.application?.scholarshipType || 'Completa'}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      application: { ...formData.application, scholarshipType: e.target.value } 
                    })}
                    className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:border-olive-400 focus:ring-2 focus:ring-olive-100"
                  >
                    <option value="Completa">{t.application.scholarshipTypeOption}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">{t.application.priority}</label>
                  <select
                    value={formData.application?.priority || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      application: { ...formData.application, priority: e.target.value } 
                    })}
                    className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:border-olive-400 focus:ring-2 focus:ring-olive-100"
                  >
                    {priorityOptions.map((priority) => (
                      <option key={priority} value={priority}>
                        {priorityLabels[priority] || priority}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-neutral-700 mb-2">{t.application.reason}</label>
                  <textarea
                    value={formData.application?.reason || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      application: { ...formData.application, reason: e.target.value } 
                    })}
                    className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:border-olive-400 focus:ring-2 focus:ring-olive-100"
                    rows="3"
                  />
                </div>
              </div>
            </div>

            {/* Notas Generales */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">{t.forms.notes}</label>
              <textarea
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:border-olive-400 focus:ring-2 focus:ring-olive-100"
                rows="3"
              />
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-olive-100">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-100 text-neutral-700 font-semibold transition-colors"
                disabled={uploadingPhoto}
              >
                {t.buttons.cancel}
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={uploadingPhoto}
              >
                {uploadingPhoto ? t.forms.photoUploading : t.buttons.saveChanges}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Add Modal Component
function CandidateAddModal({ onClose, onSave, t, statusOptions = STATUS_OPTIONS, priorityOptions = PRIORITY_OPTIONS }) {
  // Helper functions for date formatting (dd/mm/yyyy)
  const formatDateToDDMMYYYY = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return '';
    }
  };

  const parseDDMMYYYYToISO = (dateString) => {
    if (!dateString) return '';
    // Remove any spaces
    const cleaned = dateString.trim();
    // Check if it's already in ISO format (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
      return cleaned;
    }
    // Try to parse dd/mm/yyyy format
    const match = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (match) {
      const day = String(match[1]).padStart(2, '0');
      const month = String(match[2]).padStart(2, '0');
      const year = match[3];
      // Validate date
      const date = new Date(`${year}-${month}-${day}`);
      if (!isNaN(date.getTime()) && 
          date.getDate() == parseInt(day) && 
          date.getMonth() + 1 == parseInt(month)) {
        return `${year}-${month}-${day}`;
      }
    }
    return '';
  };

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    documentId: '',
    gender: '',
    birthDate: '',
    level: 'Jardín',
    status: 'pending',
    period: '2025',
    notes: '',
    city: 'Lichinga',
    province: 'Niassa',
    country: 'Mozambique',
    guardian: {
      firstName: '',
      lastName: '',
      relationship: '',
      phone: '',
      email: '',
      altContact: '',
    },
    household: {
      members: '',
      incomeRange: '',
      guardianEmployment: '',
      housing: '',
      previousSupport: '',
    },
    application: {
      scholarshipType: 'Completa',
      reason: '',
      priority: 'media',
      state: 'pendiente',
    },
  });

  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const statusLabels = t.statuses;
  const priorityLabels = t.priorities;

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
  };

  const uploadPhoto = async (candidateId) => {
    if (!photoFile) return null;

    // Verificar autenticación
    if (!auth.currentUser) {
      alert('Debes estar autenticado para subir fotos');
      return null;
    }

    try {
      setUploadingPhoto(true);
      const fileExtension = photoFile.name.split('.').pop();
      const photoPath = `candidates/${candidateId}/profile.${fileExtension}`;
      const storageRef = ref(storage, photoPath);
      
      await uploadBytes(storageRef, photoFile);
      const downloadURL = await getDownloadURL(storageRef);
      
      return { photoURL: downloadURL, photoPath };
    } catch (error) {
      console.error('Error uploading photo:', error);
      let errorMessage = t.forms.photoError;
      if (error.code === 'storage/unauthorized') {
        errorMessage = 'No tienes permisos para subir fotos. Verifica que estés autenticado.';
      } else if (error.code === 'storage/canceled') {
        errorMessage = 'La subida fue cancelada.';
      } else if (error.code === 'storage/unknown') {
        errorMessage = 'Error desconocido. Verifica tu conexión y las reglas de Storage.';
      }
      alert(errorMessage);
      return null;
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.documentId || !formData.documentId.trim()) {
      alert(t.forms.documentId ? `${t.forms.documentId} es requerido` : 'Documento de Identidad es requerido');
      return;
    }
    
    const trimmedFirstName = (formData.firstName || '').trim();
    const trimmedLastName = (formData.lastName || '').trim();
    const fullName = `${trimmedFirstName} ${trimmedLastName}`.replace(/\s+/g, ' ').trim();
    const candidateId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    let photoData = {};
    if (photoFile) {
      const uploaded = await uploadPhoto(candidateId);
      if (uploaded) {
        photoData = uploaded;
      }
    }

    const newCandidate = {
      ...formData,
      firstName: trimmedFirstName,
      lastName: trimmedLastName,
      fullName,
      candidate_id: candidateId,
      ...photoData,
    };

    onSave(newCandidate);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-olive-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-olive-800">{t.modals.addTitle}</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600" aria-label="Close">✕</button>
        </div>
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="border-b border-olive-100 pb-4">
              <h3 className="text-lg font-semibold text-olive-800 mb-4">{t.forms.basicInfo}</h3>
              
              {/* Foto de Perfil */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-neutral-700 mb-2">{t.forms.photo}</label>
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
                        title={t.forms.photoRemove}
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-lg bg-olive-100 border-2 border-olive-200 flex items-center justify-center text-olive-400">
                      <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="hidden"
                      id="photo-upload-add"
                      disabled={uploadingPhoto}
                    />
                    <label
                      htmlFor="photo-upload-add"
                      className={`inline-block px-4 py-2 rounded-lg border border-olive-300 text-olive-700 hover:bg-olive-50 cursor-pointer transition-colors ${uploadingPhoto ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {uploadingPhoto ? t.forms.photoUploading : t.forms.photoUpload}
                    </label>
                    <p className="text-xs text-neutral-500 mt-1">Max 5MB, formatos: JPG, PNG</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">{t.forms.firstName}</label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:border-olive-400 focus:ring-2 focus:ring-olive-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">{t.forms.lastName}</label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:border-olive-400 focus:ring-2 focus:ring-olive-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">{t.forms.documentId || 'Documento de Identidad'}</label>
                    <input
                      type="text"
                      value={formData.documentId || ''}
                      onChange={(e) => setFormData({ ...formData, documentId: e.target.value })}
                      className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:border-olive-400 focus:ring-2 focus:ring-olive-100"
                      placeholder={t.forms.documentIdPlaceholder || 'Número de documento'}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">{t.forms.gender}</label>
                  <select
                    value={formData.gender || ''}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:border-olive-400 focus:ring-2 focus:ring-olive-100"
                  >
                    <option value="">{t.forms.selectPlaceholder}</option>
                    <option value="masculino">{t.forms.genderMale}</option>
                    <option value="femenino">{t.forms.genderFemale}</option>
                  </select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">{t.forms.birthDate}</label>
                    <input
                      type="date"
                      value={formData.birthDate || ''}
                      onChange={(e) => {
                        setFormData({ ...formData, birthDate: e.target.value });
                      }}
                      className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:border-olive-400 focus:ring-2 focus:ring-olive-100"
                      style={{ 
                        colorScheme: 'light',
                        // Force locale to Spanish/Portuguese for dd/mm/yyyy format
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">{t.forms.level}</label>
                    <select
                      value={formData.level}
                      onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                      className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:border-olive-400 focus:ring-2 focus:ring-olive-100"
                    >
                      <option value="Jardín">Jardín</option>
                      <option value="1° grado">1° grado</option>
                      <option value="2do grado">2do grado</option>
                      <option value="3º Grado">3º Grado</option>
                      <option value="4º Grado">4º Grado</option>
                      <option value="5º Grado">5º Grado</option>
                      <option value="6º Grado">6º Grado</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">{t.forms.status}</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:border-olive-400 focus:ring-2 focus:ring-olive-100"
                    >
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {statusLabels[status] || statusLabels.unknown}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">{t.forms.city}</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:border-olive-400 focus:ring-2 focus:ring-olive-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">{t.forms.province}</label>
                    <input
                      type="text"
                      value={formData.province}
                      onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                      className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:border-olive-400 focus:ring-2 focus:ring-olive-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">{t.forms.country}</label>
                    <input
                      type="text"
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:border-olive-400 focus:ring-2 focus:ring-olive-100"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">{t.forms.period}</label>
                  <input
                    type="text"
                    value={formData.period}
                    onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                    className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:border-olive-400 focus:ring-2 focus:ring-olive-100"
                  />
                </div>
              </div>
            </div>

            <div className="border-b border-olive-100 pb-4">
              <h3 className="text-lg font-semibold text-olive-800 mb-4">{t.guardian.heading}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">{t.guardian.firstName}</label>
                  <input
                    type="text"
                    value={formData.guardian.firstName}
                    onChange={(e) => setFormData({
                      ...formData,
                      guardian: { ...formData.guardian, firstName: e.target.value },
                    })}
                    className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:border-olive-400 focus:ring-2 focus:ring-olive-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">{t.guardian.lastName}</label>
                  <input
                    type="text"
                    value={formData.guardian.lastName}
                    onChange={(e) => setFormData({
                      ...formData,
                      guardian: { ...formData.guardian, lastName: e.target.value },
                    })}
                    className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:border-olive-400 focus:ring-2 focus:ring-olive-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">{t.guardian.relationship}</label>
                  <input
                    type="text"
                    value={formData.guardian.relationship}
                    onChange={(e) => setFormData({
                      ...formData,
                      guardian: { ...formData.guardian, relationship: e.target.value },
                    })}
                    placeholder={t.guardian.relationshipPlaceholder}
                    className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:border-olive-400 focus:ring-2 focus:ring-olive-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">{t.guardian.phone}</label>
                  <input
                    type="tel"
                    value={formData.guardian.phone}
                    onChange={(e) => setFormData({
                      ...formData,
                      guardian: { ...formData.guardian, phone: e.target.value },
                    })}
                    className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:border-olive-400 focus:ring-2 focus:ring-olive-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">{t.guardian.email}</label>
                  <input
                    type="email"
                    value={formData.guardian.email}
                    onChange={(e) => setFormData({
                      ...formData,
                      guardian: { ...formData.guardian, email: e.target.value },
                    })}
                    className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:border-olive-400 focus:ring-2 focus:ring-olive-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">{t.guardian.altContact}</label>
                  <input
                    type="text"
                    value={formData.guardian.altContact}
                    onChange={(e) => setFormData({
                      ...formData,
                      guardian: { ...formData.guardian, altContact: e.target.value },
                    })}
                    className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:border-olive-400 focus:ring-2 focus:ring-olive-100"
                  />
                </div>
              </div>
            </div>

            <div className="border-b border-olive-100 pb-4">
              <h3 className="text-lg font-semibold text-olive-800 mb-4">{t.household.heading}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">{t.household.members}</label>
                  <input
                    type="number"
                    value={formData.household.members}
                    onChange={(e) => setFormData({
                      ...formData,
                      household: { ...formData.household, members: e.target.value },
                    })}
                    className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:border-olive-400 focus:ring-2 focus:ring-olive-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">{t.household.incomeRange}</label>
                  <select
                    value={formData.household.incomeRange}
                    onChange={(e) => setFormData({
                      ...formData,
                      household: { ...formData.household, incomeRange: e.target.value },
                    })}
                    className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:border-olive-400 focus:ring-2 focus:ring-olive-100"
                  >
                    <option value="">{t.forms.selectPlaceholder}</option>
                    <option value="bajo">Bajo</option>
                    <option value="medio-bajo">Medio-Bajo</option>
                    <option value="medio">Medio</option>
                    <option value="medio-alto">Medio-Alto</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">{t.household.guardianEmployment}</label>
                  <input
                    type="text"
                    value={formData.household.guardianEmployment}
                    onChange={(e) => setFormData({
                      ...formData,
                      household: { ...formData.household, guardianEmployment: e.target.value },
                    })}
                    className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:border-olive-400 focus:ring-2 focus:ring-olive-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">{t.household.housing}</label>
                  <input
                    type="text"
                    value={formData.household.housing}
                    onChange={(e) => setFormData({
                      ...formData,
                      household: { ...formData.household, housing: e.target.value },
                    })}
                    placeholder={t.household.housingPlaceholder}
                    className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:border-olive-400 focus:ring-2 focus:ring-olive-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">{t.household.previousSupport}</label>
                  <input
                    type="text"
                    value={formData.household.previousSupport}
                    onChange={(e) => setFormData({
                      ...formData,
                      household: { ...formData.household, previousSupport: e.target.value },
                    })}
                    className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:border-olive-400 focus:ring-2 focus:ring-olive-100"
                  />
                </div>
              </div>
            </div>

            <div className="border-b border-olive-100 pb-4">
              <h3 className="text-lg font-semibold text-olive-800 mb-4">{t.application.heading}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">{t.application.scholarshipType}</label>
                  <select
                    value={formData.application.scholarshipType}
                    onChange={(e) => setFormData({
                      ...formData,
                      application: { ...formData.application, scholarshipType: e.target.value },
                    })}
                    className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:border-olive-400 focus:ring-2 focus:ring-olive-100"
                  >
                    <option value="Completa">{t.application.scholarshipTypeOption}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">{t.application.priority}</label>
                  <select
                    value={formData.application.priority}
                    onChange={(e) => setFormData({
                      ...formData,
                      application: { ...formData.application, priority: e.target.value },
                    })}
                    className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:border-olive-400 focus:ring-2 focus:ring-olive-100"
                  >
                    {priorityOptions.map((priority) => (
                      <option key={priority} value={priority}>
                        {priorityLabels[priority] || priority}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-neutral-700 mb-2">{t.application.reason}</label>
                  <textarea
                    value={formData.application.reason}
                    onChange={(e) => setFormData({
                      ...formData,
                      application: { ...formData.application, reason: e.target.value },
                    })}
                    className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:border-olive-400 focus:ring-2 focus:ring-olive-100"
                    rows="3"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">{t.forms.notes}</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:border-olive-400 focus:ring-2 focus:ring-olive-100"
                rows="3"
              />
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-olive-100">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-100 text-neutral-700 font-semibold transition-colors"
                disabled={uploadingPhoto}
              >
                {t.buttons.cancel}
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={uploadingPhoto}
              >
                {uploadingPhoto ? t.forms.photoUploading : t.buttons.add}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}


// Reports Section Component
function ReportsSection({ candidates, t, statusLabels, priorityLabels }) {
  const [chartType, setChartType] = useState('bars');

  const calculateAge = (birthDate) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const statsByStatus = candidates.reduce((acc, candidate) => {
    const status = candidate.status || 'unknown';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  const statsByPriority = candidates.reduce((acc, candidate) => {
    const priority = candidate.application?.priority || 'sin-prioridad';
    acc[priority] = (acc[priority] || 0) + 1;
    return acc;
  }, {});

  const statsByLevel = candidates.reduce((acc, candidate) => {
    const level = candidate.level || 'sin-nivel';
    acc[level] = (acc[level] || 0) + 1;
    return acc;
  }, {});

  const statsByAgeGroup = candidates.reduce((acc, candidate) => {
    const age = calculateAge(candidate.birthDate);
    const groupKey =
      age === null ? 'noDate'
        : age <= 3 ? '0_3'
        : age <= 5 ? '4_5'
        : age <= 7 ? '6_7'
        : age <= 10 ? '8_10'
        : age <= 13 ? '11_13'
        : '14_plus';
    acc[groupKey] = (acc[groupKey] || 0) + 1;
    return acc;
  }, {});

  const getMaxCount = (stats) => Math.max(...Object.values(stats), 1);

  const createChartData = (stats, colors, labelMap = {}) => ({
    labels: Object.keys(stats).map((key) => labelMap[key] || key),
    datasets: [
      {
        data: Object.values(stats),
        backgroundColor: colors,
        borderColor: colors,
        borderWidth: 2,
      },
    ],
  });

  const AGE_GROUP_ORDER = ['0_3', '4_5', '6_7', '8_10', '11_13', '14_plus', 'noDate'];
  const ageGroupLabels = t.reports.ageGroups || {};

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-olive-100 p-4 flex justify-end">
        <div className="flex gap-2">
          <button
            onClick={() => setChartType('bars')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              chartType === 'bars'
                ? 'bg-olive-600 text-white'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            {t.reports.chartToggle.bars}
          </button>
          <button
            onClick={() => setChartType('pie')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              chartType === 'pie'
                ? 'bg-olive-600 text-white'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            {t.reports.chartToggle.pie}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-olive-100 p-6">
        <h3 className="text-xl font-bold text-olive-800 mb-4">{t.reports.statusTitle}</h3>
        {chartType === 'bars' ? (
          <div className="space-y-3">
            {Object.entries(statsByStatus).map(([status, count]) => (
              <div key={status} className="flex items-center gap-4">
                <div className="w-32 text-sm font-semibold text-neutral-700 capitalize">
                  {statusLabels[status] || statusLabels.unknown}
                </div>
                <div className="flex-1 bg-neutral-100 rounded-full h-8 relative">
                  <div
                    className="bg-olive-600 h-full rounded-full flex items-center justify-end pr-4 transition-all duration-500"
                    style={{ width: `${(count / getMaxCount(statsByStatus)) * 100}%` }}
                  >
                    <span className="text-white text-sm font-semibold">{count}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="max-w-md mx-auto">
            <Pie
              data={createChartData(
                statsByStatus,
                ['#a855f7', '#f59e0b', '#10b981', '#ef4444', '#6366f1'],
                statusLabels
              )}
              options={{
                plugins: {
                  legend: { position: 'bottom' },
                  tooltip: { enabled: true },
                },
              }}
            />
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-olive-100 p-6">
        <h3 className="text-xl font-bold text-olive-800 mb-4">{t.reports.priorityTitle}</h3>
        {chartType === 'bars' ? (
          <div className="space-y-3">
            {Object.entries(statsByPriority).map(([priority, count]) => (
              <div key={priority} className="flex items-center gap-4">
                <div className="w-32 text-sm font-semibold text-neutral-700 capitalize">
                  {priorityLabels[priority] || priorityLabels['sin-prioridad']}
                </div>
                <div className="flex-1 bg-neutral-100 rounded-full h-8 relative">
                  <div
                    className={`h-full rounded-full flex items-center justify-end pr-4 transition-all duration-500 ${
                      priority === 'alta'
                        ? 'bg-red-500'
                        : priority === 'media'
                        ? 'bg-yellow-500'
                        : priority === 'baja'
                        ? 'bg-green-500'
                        : 'bg-neutral-400'
                    }`}
                    style={{ width: `${(count / getMaxCount(statsByPriority)) * 100}%` }}
                  >
                    <span className="text-white text-sm font-semibold">{count}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="max-w-md mx-auto">
            <Pie
              data={createChartData(
                statsByPriority,
                ['#ef4444', '#f59e0b', '#10b981', '#94a3b8'],
                priorityLabels
              )}
              options={{
                plugins: {
                  legend: { position: 'bottom' },
                  tooltip: { enabled: true },
                },
              }}
            />
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-olive-100 p-6">
        <h3 className="text-xl font-bold text-olive-800 mb-4">{t.reports.levelTitle}</h3>
        {chartType === 'bars' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(statsByLevel)
              .sort((a, b) => b[1] - a[1])
              .map(([level, count]) => (
                <div key={level} className="flex items-center gap-4">
                  <div className="w-24 text-sm font-semibold text-neutral-700">
                    {level === 'sin-nivel' ? t.reports.noLevel : level}
                  </div>
                  <div className="flex-1 bg-neutral-100 rounded-full h-8 relative">
                    <div
                      className="bg-blue-500 h-full rounded-full flex items-center justify-end pr-4 transition-all duration-500"
                      style={{ width: `${(count / getMaxCount(statsByLevel)) * 100}%` }}
                    >
                      <span className="text-white text-sm font-semibold">{count}</span>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <div className="max-w-md mx-auto">
            <Pie
              data={createChartData(
                statsByLevel,
                ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#14b8a6', '#0ea5e9'],
                { 'sin-nivel': t.reports.noLevel }
              )}
              options={{
                plugins: {
                  legend: { position: 'bottom', labels: { boxWidth: 12 } },
                  tooltip: { enabled: true },
                },
              }}
            />
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-olive-100 p-6">
        <h3 className="text-xl font-bold text-olive-800 mb-4">{t.reports.ageTitle}</h3>
        {chartType === 'bars' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {AGE_GROUP_ORDER.filter((group) => statsByAgeGroup[group])
              .map((group) => (
                <div key={group} className="flex items-center gap-4">
                  <div className="w-32 text-sm font-semibold text-neutral-700">
                    {ageGroupLabels[group] || group}
                  </div>
                  <div className="flex-1 bg-neutral-100 rounded-full h-8 relative">
                    <div
                      className="bg-purple-500 h-full rounded-full flex items-center justify-end pr-4 transition-all duration-500"
                      style={{ width: `${(statsByAgeGroup[group] / getMaxCount(statsByAgeGroup)) * 100}%` }}
                    >
                      <span className="text-white text-sm font-semibold">{statsByAgeGroup[group]}</span>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <div className="max-w-md mx-auto">
            <Pie
              data={createChartData(
                statsByAgeGroup,
                ['#a855f7', '#ec4899', '#f472b6', '#fb7185', '#f87171', '#60a5fa', '#94a3b8'],
                ageGroupLabels
              )}
              options={{
                plugins: {
                  legend: { position: 'bottom', labels: { boxWidth: 12 } },
                  tooltip: { enabled: true },
                },
              }}
            />
          </div>
        )}
      </div>

      <div className="bg-gradient-to-r from-olive-50 to-stone-50 rounded-2xl border border-olive-100 p-6">
        <h3 className="text-xl font-bold text-olive-800 mb-4">{t.reports.summaryTitle}</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-olive-700">{candidates.length}</div>
            <div className="text-sm text-neutral-600">{t.reports.summary.total}</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">
              {Object.keys(statsByLevel).length}
            </div>
            <div className="text-sm text-neutral-600">{t.reports.summary.levels}</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">
              {candidates.filter((c) => c.birthDate).length}
            </div>
            <div className="text-sm text-neutral-600">{t.reports.summary.birthdates}</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-yellow-600">
              {statsByPriority['alta'] || 0}
            </div>
            <div className="text-sm text-neutral-600">{t.reports.summary.highPriority}</div>
          </div>
        </div>
      </div>
    </div>
  );
}


