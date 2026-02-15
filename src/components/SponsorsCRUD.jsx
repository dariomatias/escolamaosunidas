import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import AdminNavbar from './AdminNavbar';
import { 
  getAllSponsors, 
  createSponsor, 
  updateSponsor, 
  deleteSponsor as deleteSponsorApi 
} from '../services/sponsors-api';
import {
  ADMIN_TRANSLATIONS,
  ADMIN_DEFAULT_LOCALE,
  ADMIN_LOCALE_STORAGE_KEY,
} from '../i18n/adminTranslations';

const getInitialAdminLocale = () => {
  if (typeof window === 'undefined') {
    return ADMIN_DEFAULT_LOCALE;
  }
  return localStorage.getItem(ADMIN_LOCALE_STORAGE_KEY) || ADMIN_DEFAULT_LOCALE;
};

export default function SponsorsCRUD() {
  const [sponsors, setSponsors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [editingSponsor, setEditingSponsor] = useState(null);
  const [viewingSponsor, setViewingSponsor] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [locale, setLocale] = useState(() => getInitialAdminLocale());
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [searchText, setSearchText] = useState('');
  const [visibleItems, setVisibleItems] = useState(50); // Number of items to render initially

  const t = ADMIN_TRANSLATIONS[locale] || ADMIN_TRANSLATIONS[ADMIN_DEFAULT_LOCALE];

  const getSponsorDisplayName = (sponsor) => {
    const first = sponsor.firstName?.trim() || '';
    const last = sponsor.lastName?.trim() || '';
    const combined = `${first} ${last}`.replace(/\s+/g, ' ').trim();
    return combined || 'Sin nombre';
  };

  const fetchSponsors = async () => {
    try {
      setIsLoading(true);
      const sponsorsList = await getAllSponsors();
      setSponsors(sponsorsList);
    } catch (error) {
      console.error('Error fetching sponsors:', error);
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
    if (!confirm(t.sponsors?.confirm?.delete || '¿Estás seguro de eliminar este patrocinador?')) return;
    
    try {
      setIsLoading(true);
      await deleteSponsorApi(id);
      await fetchSponsors();
    } catch (error) {
      console.error('Error deleting sponsor:', error);
      alert(t.sponsors?.errors?.delete || 'Error al eliminar patrocinador');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (updatedData) => {
    try {
      setIsLoading(true);
      const { id, ...rest } = updatedData;
      await updateSponsor(id, rest);
      setEditingSponsor(null);
      await fetchSponsors();
    } catch (error) {
      console.error('Error updating sponsor:', error);
      alert(t.sponsors?.errors?.update || 'Error al actualizar patrocinador');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSponsors();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(ADMIN_LOCALE_STORAGE_KEY, locale);
    }
  }, [locale]);

  const handleClearFilters = () => {
    setSearchText('');
  };

  const sortedSponsors = useMemo(() => {
    // First, apply filters
    let filtered = sponsors.filter(sponsor => {
      // Search filter (name, last name, or email)
      if (searchText.trim()) {
        const searchLower = searchText.toLowerCase().trim();
        const fullName = getSponsorDisplayName(sponsor).toLowerCase();
        const firstName = (sponsor.firstName || '').toLowerCase();
        const lastName = (sponsor.lastName || '').toLowerCase();
        const email = (sponsor.email || '').toLowerCase();
        if (!fullName.includes(searchLower) && 
            !firstName.includes(searchLower) && 
            !lastName.includes(searchLower) &&
            !email.includes(searchLower)) {
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
          aValue = getSponsorDisplayName(a).toLowerCase();
          bValue = getSponsorDisplayName(b).toLowerCase();
          break;
        case 'email':
          aValue = (a.email || '').toLowerCase();
          bValue = (b.email || '').toLowerCase();
          break;
        case 'city':
          aValue = (a.city || '').toLowerCase();
          bValue = (b.city || '').toLowerCase();
          break;
        case 'country':
          aValue = (a.country || '').toLowerCase();
          bValue = (b.country || '').toLowerCase();
          break;
        default:
          aValue = '';
          bValue = '';
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [sponsors, sortField, sortDirection, searchText]);

  // Virtual scrolling - render items as you scroll
  const displayedSponsors = useMemo(() => {
    return sortedSponsors.slice(0, visibleItems);
  }, [sortedSponsors, visibleItems]);

  // Reset visible items when filters change
  useEffect(() => {
    setVisibleItems(50);
  }, [searchText]);

  // Infinite scroll handler - using window scroll for page-level scrolling
  useEffect(() => {
    const handleScroll = () => {
      const scrollBottom = window.innerHeight + window.scrollY;
      const documentHeight = document.documentElement.scrollHeight;
      
      // Load more when within 500px of bottom
      if (documentHeight - scrollBottom < 500 && visibleItems < sortedSponsors.length) {
        setVisibleItems(prev => Math.min(prev + 50, sortedSponsors.length));
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [visibleItems, sortedSponsors.length]);

  const SortIcon = ({ field }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 to-olive-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-olive-600 mx-auto mb-4"></div>
          <p className="text-neutral-600">Cargando patrocinadores...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 to-olive-50">
      <AdminNavbar onLocaleChange={setLocale} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-olive-800 mb-2">
            {t.sponsors?.header?.title || 'Gestión de Patrocinadores'}
          </h1>
          <p className="text-xl text-neutral-600">
            {t.sponsors?.header?.subtitle || 'Gestiona los patrocinadores'}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6 border border-olive-100">
            <div className="text-sm font-medium text-neutral-600 mb-1">
              {t.sponsors?.stats?.total || 'Total de Patrocinadores'}
            </div>
            <div className="text-3xl font-bold text-olive-700">{sponsors.length}</div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6 border border-olive-100">
            <div className="text-sm font-medium text-neutral-600 mb-1">
              {t.sponsors?.stats?.withEmail || 'Con Email'}
            </div>
            <div className="text-3xl font-bold text-blue-700">
              {sponsors.filter(s => s.email).length}
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6 border border-olive-100">
            <div className="text-sm font-medium text-neutral-600 mb-1">
              {t.sponsors?.stats?.withPhone || 'Con Teléfono'}
            </div>
            <div className="text-3xl font-bold text-green-700">
              {sponsors.filter(s => s.phone).length}
            </div>
          </div>
        </div>

        {/* Filters and Add Button */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6 border border-olive-100">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex-1 w-full md:w-auto">
              <input
                type="text"
                placeholder={t.sponsors?.filters?.searchPlaceholder || 'Buscar por nombre, apellido o email...'}
                value={searchText}
                onChange={(e) => {
                  setSearchText(e.target.value);
                }}
                className="w-full md:w-96 px-4 py-2 border border-olive-200 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500 text-neutral-900"
              />
            </div>
            <div className="flex gap-3">
              {searchText && (
                <button
                  onClick={handleClearFilters}
                  className="px-4 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-100 text-neutral-700 transition-colors"
                >
                  {t.sponsors?.filters?.clearFilters || 'Limpar filtros'}
                </button>
              )}
              <button
                onClick={() => setShowAddModal(true)}
                disabled={isLoading}
                className="px-4 py-2 bg-gradient-to-r from-olive-600 to-olive-700 text-white rounded-lg hover:from-olive-700 hover:to-olive-800 transition-colors font-semibold shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {t.sponsors?.buttons?.add || '+ Agregar Patrocinador'}
              </button>
            </div>
          </div>
        </div>

        {/* Results count */}
        {searchText && (
          <div className="mb-4 text-neutral-600">
            {sortedSponsors.length} {sortedSponsors.length === 1 
              ? (t.sponsors?.filters?.result || 'resultado') 
              : (t.sponsors?.filters?.results || 'resultados')}
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden border border-olive-100">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-olive-100">
              <thead className="bg-olive-50">
                <tr>
                  <th
                    onClick={() => handleSort('name')}
                    className="px-6 py-4 text-left text-xs font-medium text-olive-700 uppercase tracking-wider cursor-pointer hover:bg-olive-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {t.sponsors?.table?.name || 'Nombre'}
                      <SortIcon field="name" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('email')}
                    className="px-6 py-4 text-left text-xs font-medium text-olive-700 uppercase tracking-wider cursor-pointer hover:bg-olive-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {t.sponsors?.table?.email || 'Email'}
                      <SortIcon field="email" />
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-olive-700 uppercase tracking-wider">
                    {t.sponsors?.table?.phone || 'Teléfono'}
                  </th>
                  <th
                    onClick={() => handleSort('city')}
                    className="px-6 py-4 text-left text-xs font-medium text-olive-700 uppercase tracking-wider cursor-pointer hover:bg-olive-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {t.sponsors?.table?.city || 'Ciudad'}
                      <SortIcon field="city" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('country')}
                    className="px-6 py-4 text-left text-xs font-medium text-olive-700 uppercase tracking-wider cursor-pointer hover:bg-olive-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {t.sponsors?.table?.country || 'País'}
                      <SortIcon field="country" />
                    </div>
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-olive-700 uppercase tracking-wider">
                    {t.sponsors?.table?.actions || 'Acciones'}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-olive-100">
                {displayedSponsors.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-neutral-500">
                      {searchText 
                        ? (t.sponsors?.table?.noResults || 'No se encontraron patrocinadores')
                        : (t.sponsors?.table?.empty || 'No hay patrocinadores registrados')}
                    </td>
                  </tr>
                ) : (
                  displayedSponsors.map((sponsor) => (
                    <tr 
                      key={sponsor.id} 
                      onClick={() => setViewingSponsor(sponsor)}
                      className="hover:bg-olive-100/50 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-neutral-900">
                          {getSponsorDisplayName(sponsor)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-neutral-700">{sponsor.email || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-neutral-700">{sponsor.phone || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-neutral-700">{sponsor.city || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-neutral-700">{sponsor.country || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingSponsor(sponsor);
                            }}
                            className="px-3 py-1 text-sm bg-olive-600 text-white rounded hover:bg-olive-700 transition-colors"
                            title={t.sponsors?.table?.edit || 'Editar'}
                          >
                            {t.sponsors?.table?.edit || 'Editar'}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(sponsor.id);
                            }}
                            disabled={isLoading}
                            className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title={t.sponsors?.table?.delete || 'Eliminar'}
                          >
                            {t.sponsors?.table?.delete || 'Eliminar'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Results Count */}
          <div className="bg-olive-50 px-6 py-4 border-t border-olive-100">
            <div className="text-sm text-neutral-700">
              {t.sponsors?.pagination?.showing || 'Mostrando'} {displayedSponsors.length} {t.sponsors?.pagination?.of || 'de'} {sortedSponsors.length} {t.sponsors?.pagination?.results || 'resultados'}
              {visibleItems < sortedSponsors.length && (
                <span className="ml-2 text-olive-600">
                  ({t.sponsors?.pagination?.scrollForMore || 'Desplázate para ver más'})
                </span>
              )}
            </div>
          </div>
        </div>

        {/* View Details Modal */}
        {viewingSponsor && (
          <SponsorDetailModal
            sponsor={viewingSponsor}
            onClose={() => setViewingSponsor(null)}
            onEdit={() => {
              setViewingSponsor(null);
              setEditingSponsor(viewingSponsor);
            }}
            t={t}
          />
        )}

        {/* Add/Edit Modal */}
        {(showAddModal || editingSponsor) && (
          <SponsorFormModal
            sponsor={editingSponsor}
            onClose={() => {
              setShowAddModal(false);
              setEditingSponsor(null);
            }}
            onSave={async (sponsorData) => {
              try {
                setIsLoading(true);
                if (editingSponsor) {
                  await handleSave({ ...sponsorData, id: editingSponsor.id });
                } else {
                  await createSponsor(sponsorData);
                  setShowAddModal(false);
                  await fetchSponsors();
                }
              } catch (error) {
                console.error('Error saving sponsor:', error);
                alert(t.sponsors?.errors?.add || 'Error al guardar patrocinador');
              } finally {
                setIsLoading(false);
              }
            }}
            t={t}
          />
        )}
      </div>
    </div>
  );
}

// Sponsor Detail Modal Component
function SponsorDetailModal({ sponsor, onClose, onEdit, t }) {
  const getSponsorDisplayName = (sponsor) => {
    const first = sponsor.firstName?.trim() || '';
    const last = sponsor.lastName?.trim() || '';
    const combined = `${first} ${last}`.replace(/\s+/g, ' ').trim();
    return combined || 'Sin nombre';
  };

  const fullName = getSponsorDisplayName(sponsor);

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
          <h2 className="text-2xl font-bold text-olive-800">Detalle del Patrocinador</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 text-2xl" aria-label="Close">×</button>
        </div>
        
        <div className="p-6">
          {/* Header con nombre */}
          <div className="flex items-start gap-6 mb-8 pb-6 border-b-2 border-olive-200">
            <div className="flex-shrink-0">
              <div className="w-32 h-32 rounded-lg bg-olive-100 border-4 border-olive-200 flex items-center justify-center text-olive-600 font-bold text-4xl shadow-lg">
                {fullName.charAt(0).toUpperCase()}
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-3xl font-bold text-olive-800 mb-2">{fullName}</h3>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={onEdit}
                  className="px-4 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700 transition-colors font-semibold"
                >
                  ✏️ {t.sponsors?.table?.edit || 'Editar'}
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-100 text-neutral-700 transition-colors font-semibold"
                >
                  {t.sponsors?.buttons?.cancel || 'Cerrar'}
                </button>
              </div>
            </div>
          </div>

          {/* Información Básica */}
          <div className="mb-6">
            <h4 className="text-xl font-bold text-olive-800 mb-4 pb-2 border-b border-olive-200">
              {t.sponsors?.forms?.basicInfo || 'Información Básica'}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoField label={t.sponsors?.forms?.firstName || 'Nombre'} value={sponsor.firstName} />
              <InfoField label={t.sponsors?.forms?.lastName || 'Apellido'} value={sponsor.lastName} />
              <InfoField label={t.sponsors?.forms?.email || 'Email'} value={sponsor.email || '-'} />
              <InfoField label={t.sponsors?.forms?.phone || 'Teléfono'} value={sponsor.phone || '-'} />
              <InfoField label={t.sponsors?.forms?.address || 'Dirección'} value={sponsor.address || '-'} />
              <InfoField label={t.sponsors?.forms?.city || 'Ciudad'} value={sponsor.city || '-'} />
              <InfoField label={t.sponsors?.forms?.country || 'País'} value={sponsor.country || '-'} />
            </div>
          </div>

          {/* Información del Sistema */}
          <div className="mb-6">
            <h4 className="text-xl font-bold text-olive-800 mb-4 pb-2 border-b border-olive-200">
              Información del Sistema
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sponsor.createdAt && (
                <InfoField label="Fecha de Creación" value={formatDate(sponsor.createdAt)} className="text-xs" />
              )}
              {sponsor.updatedAt && (
                <InfoField label="Última Actualización" value={formatDate(sponsor.updatedAt)} className="text-xs" />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Sponsor Form Modal Component
function SponsorFormModal({ sponsor, onClose, onSave, t }) {
  const [formData, setFormData] = useState({
    firstName: sponsor?.firstName || '',
    lastName: sponsor?.lastName || '',
    email: sponsor?.email || '',
    phone: sponsor?.phone || '',
    address: sponsor?.address || '',
    city: sponsor?.city || '',
    country: sponsor?.country || '',
    notes: sponsor?.notes || '',
  });

  const [errors, setErrors] = useState({});
  const isEditMode = !!sponsor;

  const validate = () => {
    const newErrors = {};
    if (!formData.firstName.trim()) {
      newErrors.firstName = t.sponsors?.forms?.required || 'Este campo es requerido';
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = t.sponsors?.forms?.required || 'Este campo es requerido';
    }
    if (!formData.email.trim()) {
      newErrors.email = t.sponsors?.forms?.required || 'Este campo es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t.sponsors?.forms?.invalidEmail || 'Email inválido';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSave(formData);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-olive-100 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-2xl font-bold text-olive-800">
            {isEditMode 
              ? (t.sponsors?.modals?.editTitle || 'Editar Patrocinador')
              : (t.sponsors?.modals?.addTitle || 'Agregar Patrocinador')}
          </h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 text-2xl" aria-label="Close">×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="border-b border-olive-100 pb-4">
              <h3 className="text-lg font-semibold text-olive-800 mb-4">{t.sponsors?.forms?.basicInfo || 'Información Básica'}</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    {t.sponsors?.forms?.firstName || 'Nombre'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500 text-neutral-900 ${errors.firstName ? 'border-red-500' : 'border-olive-200'}`}
                    required
                  />
                  {errors.firstName && <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    {t.sponsors?.forms?.lastName || 'Apellido'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500 text-neutral-900 ${errors.lastName ? 'border-red-500' : 'border-olive-200'}`}
                    required
                  />
                  {errors.lastName && <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    {t.sponsors?.forms?.email || 'Email'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500 text-neutral-900 ${errors.email ? 'border-red-500' : 'border-olive-200'}`}
                    required
                  />
                  {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    {t.sponsors?.forms?.phone || 'Teléfono'}
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500 text-neutral-900"
                  />
                </div>
              </div>
            </div>

            {/* Address Information */}
            <div className="border-b border-olive-100 pb-4">
              <h3 className="text-lg font-semibold text-olive-800 mb-4">{t.sponsors?.forms?.addressInfo || 'Información de Dirección'}</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    {t.sponsors?.forms?.address || 'Dirección'}
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500 text-neutral-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    {t.sponsors?.forms?.city || 'Ciudad'}
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
                    {t.sponsors?.forms?.country || 'País'}
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

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                {t.sponsors?.forms?.notes || 'Notas'}
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={4}
                className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500 text-neutral-900"
                placeholder={t.sponsors?.forms?.notesPlaceholder || 'Notas adicionales sobre el patrocinador...'}
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-4 pt-6 border-t border-olive-100 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-100 text-neutral-700 font-semibold transition-colors"
            >
              {t.sponsors?.buttons?.cancel || 'Cancelar'}
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-gradient-to-r from-olive-600 to-olive-700 text-white rounded-lg hover:from-olive-700 hover:to-olive-800 transition-colors font-semibold shadow-md"
            >
              {t.sponsors?.buttons?.save || 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

