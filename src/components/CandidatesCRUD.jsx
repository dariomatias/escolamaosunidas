import { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc, addDoc, query, orderBy } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { db, auth } from '../config/firebase';
import { useNavigate } from 'react-router-dom';
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
  const [editingCandidate, setEditingCandidate] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeTab, setActiveTab] = useState('list');
  const navigate = useNavigate();

  const fetchCandidates = async () => {
    try {
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
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, []);

  const handleEdit = (candidate) => {
    setEditingCandidate(candidate);
  };

  const handleSave = async (updatedData) => {
    try {
      const candidateRef = doc(db, 'candidates', updatedData.id);
      await updateDoc(candidateRef, {
        ...updatedData,
        updatedAt: new Date().toISOString(),
      });
      setEditingCandidate(null);
      fetchCandidates();
    } catch (error) {
      console.error('Error updating candidate:', error);
      alert('Error al actualizar candidato');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Estás seguro de eliminar este candidato?')) return;
    
    try {
      await deleteDoc(doc(db, 'candidates', id));
      fetchCandidates();
    } catch (error) {
      console.error('Error deleting candidate:', error);
      alert('Error al eliminar candidato');
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-olive-600 mx-auto mb-4"></div>
          <p className="text-neutral-600">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-olive-100 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-olive-800 mb-2">Administración de Candidatos</h1>
              <p className="text-neutral-600">Gestiona las solicitudes de becas</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowAddModal(true)}
                className="px-6 py-2 rounded-lg bg-gradient-to-r from-olive-600 to-olive-700 text-white font-semibold hover:from-olive-700 hover:to-olive-800 transition-colors"
              >
                + Agregar Candidato
              </button>
              <button
                onClick={handleLogout}
                className="px-6 py-2 rounded-lg border border-neutral-300 hover:bg-neutral-100 text-neutral-700 font-semibold transition-colors"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-xl border border-olive-100 p-6">
            <div className="text-sm text-neutral-600 mb-1">Total Candidatos</div>
            <div className="text-3xl font-bold text-olive-700">{candidates.length}</div>
          </div>
          <div className="bg-white rounded-xl border border-olive-100 p-6">
            <div className="text-sm text-neutral-600 mb-1">Pendientes</div>
            <div className="text-3xl font-bold text-blue-600">
              {candidates.filter(c => c.status === 'pending').length}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-olive-100 p-6">
            <div className="text-sm text-neutral-600 mb-1">Activos</div>
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
              Lista de Candidatos
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`px-6 py-4 font-semibold transition-colors ${
                activeTab === 'reports'
                  ? 'text-olive-700 border-b-2 border-olive-600'
                  : 'text-neutral-600 hover:text-olive-700'
              }`}
            >
              📊 Reportes
            </button>
          </div>
        </div>

        {/* Candidates Table */}
        {activeTab === 'list' && (
        <div className="bg-white rounded-2xl shadow-sm border border-olive-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-olive-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-olive-800">Nombre</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-olive-800">Nivel</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-olive-800">Periodo</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-olive-800">Estado</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-olive-800">Prioridad</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-olive-800">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-olive-100">
                {candidates.map((candidate) => (
                  <tr key={candidate.id} className="hover:bg-olive-50/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-neutral-900">{candidate.fullName}</div>
                      {candidate.birthDate && (
                        <div className="text-sm text-neutral-500">Nac: {new Date(candidate.birthDate).toLocaleDateString()}</div>
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
                        {candidate.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        candidate.application?.priority === 'alta' ? 'bg-red-100 text-red-800' :
                        candidate.application?.priority === 'media' ? 'bg-yellow-100 text-yellow-800' :
                        candidate.application?.priority === 'baja' ? 'bg-green-100 text-green-800' :
                        'bg-neutral-100 text-neutral-800'
                      }`}>
                        {candidate.application?.priority || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(candidate)}
                          className="px-3 py-1 text-sm bg-olive-600 text-white rounded hover:bg-olive-700 transition-colors"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(candidate.id)}
                          className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        )}

        {/* Reports Section */}
        {activeTab === 'reports' && (
          <ReportsSection candidates={candidates} />
        )}
      </div>

      {/* Edit Modal */}
      {editingCandidate && (
        <CandidateEditModal
          candidate={editingCandidate}
          onClose={() => setEditingCandidate(null)}
          onSave={handleSave}
        />
      )}

      {/* Add Modal */}
      {showAddModal && (
        <CandidateAddModal
          onClose={() => setShowAddModal(false)}
          onSave={async (newCandidate) => {
            try {
              await addDoc(collection(db, 'candidates'), {
                ...newCandidate,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              });
              setShowAddModal(false);
              fetchCandidates();
            } catch (error) {
              console.error('Error adding candidate:', error);
              alert('Error al agregar candidato');
            }
          }}
        />
      )}
    </div>
  );
}

// Edit Modal Component
function CandidateEditModal({ candidate, onClose, onSave }) {
  const [formData, setFormData] = useState({
    ...candidate,
    guardian: candidate.guardian || {},
    household: candidate.household || {},
    application: candidate.application || {},
    documents: candidate.documents || {},
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-olive-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-olive-800">Editar Candidato</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600">✕</button>
        </div>
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Información Básica */}
            <div className="border-b border-olive-100 pb-4">
              <h3 className="text-lg font-semibold text-olive-800 mb-4">Información Básica</h3>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Nombre Completo</label>
                  <input
                    type="text"
                    value={formData.fullName || ''}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:border-olive-400 focus:ring-2 focus:ring-olive-100"
                    required
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">Fecha de Nacimiento</label>
                    <input
                      type="date"
                      value={formData.birthDate || ''}
                      onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                      className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:border-olive-400 focus:ring-2 focus:ring-olive-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">Nivel</label>
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
                    <label className="block text-sm font-medium text-neutral-700 mb-2">Estado</label>
                    <select
                      value={formData.status || 'pending'}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:border-olive-400 focus:ring-2 focus:ring-olive-100"
                    >
                      <option value="pending">Pendiente</option>
                      <option value="active">Activo</option>
                      <option value="rejected">Rechazado</option>
                      <option value="archived">Archivado</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">Ciudad</label>
                    <input
                      type="text"
                      value={formData.city || ''}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:border-olive-400 focus:ring-2 focus:ring-olive-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">Provincia</label>
                    <input
                      type="text"
                      value={formData.province || ''}
                      onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                      className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:border-olive-400 focus:ring-2 focus:ring-olive-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">País</label>
                    <input
                      type="text"
                      value={formData.country || ''}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:border-olive-400 focus:ring-2 focus:ring-olive-100"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Periodo</label>
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
              <h3 className="text-lg font-semibold text-olive-800 mb-4">Información del Tutor/Encargado</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Nombre</label>
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
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Apellido</label>
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
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Relación</label>
                  <input
                    type="text"
                    value={formData.guardian?.relationship || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      guardian: { ...formData.guardian, relationship: e.target.value } 
                    })}
                    className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:border-olive-400 focus:ring-2 focus:ring-olive-100"
                    placeholder="Madre, Padre, Tío, etc."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Teléfono</label>
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
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Email</label>
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
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Contacto Alternativo</label>
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
              <h3 className="text-lg font-semibold text-olive-800 mb-4">Situación del Hogar</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Miembros de la Familia</label>
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
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Rango de Ingresos</label>
                  <select
                    value={formData.household?.incomeRange || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      household: { ...formData.household, incomeRange: e.target.value } 
                    })}
                    className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:border-olive-400 focus:ring-2 focus:ring-olive-100"
                  >
                    <option value="">Seleccionar</option>
                    <option value="bajo">Bajo</option>
                    <option value="medio-bajo">Medio-Bajo</option>
                    <option value="medio">Medio</option>
                    <option value="medio-alto">Medio-Alto</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Empleo del Tutor</label>
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
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Vivienda</label>
                  <input
                    type="text"
                    value={formData.household?.housing || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      household: { ...formData.household, housing: e.target.value } 
                    })}
                    className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:border-olive-400 focus:ring-2 focus:ring-olive-100"
                    placeholder="Propia, Alquilada, Familiar, etc."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Apoyo Anterior</label>
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
              <h3 className="text-lg font-semibold text-olive-800 mb-4">Solicitud de Beca</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Tipo de Beca</label>
                  <input
                    type="text"
                    value={formData.application?.scholarshipType || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      application: { ...formData.application, scholarshipType: e.target.value } 
                    })}
                    className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:border-olive-400 focus:ring-2 focus:ring-olive-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Prioridad</label>
                  <select
                    value={formData.application?.priority || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      application: { ...formData.application, priority: e.target.value } 
                    })}
                    className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:border-olive-400 focus:ring-2 focus:ring-olive-100"
                  >
                    <option value="alta">Alta</option>
                    <option value="media">Media</option>
                    <option value="baja">Baja</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Razón de la Solicitud</label>
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
              <label className="block text-sm font-medium text-neutral-700 mb-2">Notas Generales</label>
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
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700 font-semibold transition-colors"
              >
                Guardar Cambios
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Add Modal Component
function CandidateAddModal({ onClose, onSave }) {
  const [formData, setFormData] = useState({
    fullName: '',
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
      scholarshipType: '',
      reason: '',
      priority: 'media',
      state: 'pendiente',
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    // Generate candidate_id
    const candidateId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newCandidate = {
      ...formData,
      candidate_id: candidateId,
    };
    onSave(newCandidate);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-olive-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-olive-800">Agregar Candidato</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600">✕</button>
        </div>
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Información Básica */}
            <div className="border-b border-olive-100 pb-4">
              <h3 className="text-lg font-semibold text-olive-800 mb-4">Información Básica</h3>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Nombre Completo *</label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:border-olive-400 focus:ring-2 focus:ring-olive-100"
                    required
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">Fecha de Nacimiento</label>
                    <input
                      type="date"
                      value={formData.birthDate}
                      onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                      className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:border-olive-400 focus:ring-2 focus:ring-olive-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">Nivel</label>
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
                    <label className="block text-sm font-medium text-neutral-700 mb-2">Estado</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:border-olive-400 focus:ring-2 focus:ring-olive-100"
                    >
                      <option value="pending">Pendiente</option>
                      <option value="active">Activo</option>
                      <option value="rejected">Rechazado</option>
                      <option value="archived">Archivado</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">Ciudad</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:border-olive-400 focus:ring-2 focus:ring-olive-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">Provincia</label>
                    <input
                      type="text"
                      value={formData.province}
                      onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                      className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:border-olive-400 focus:ring-2 focus:ring-olive-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">País</label>
                    <input
                      type="text"
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:border-olive-400 focus:ring-2 focus:ring-olive-100"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Periodo</label>
                  <input
                    type="text"
                    value={formData.period}
                    onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                    className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:border-olive-400 focus:ring-2 focus:ring-olive-100"
                  />
                </div>
              </div>
            </div>

            {/* Información del Tutor */}
            <div className="border-b border-olive-100 pb-4">
              <h3 className="text-lg font-semibold text-olive-800 mb-4">Información del Tutor/Encargado</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Nombre</label>
                  <input
                    type="text"
                    value={formData.guardian.firstName}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      guardian: { ...formData.guardian, firstName: e.target.value } 
                    })}
                    className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:border-olive-400 focus:ring-2 focus:ring-olive-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Apellido</label>
                  <input
                    type="text"
                    value={formData.guardian.lastName}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      guardian: { ...formData.guardian, lastName: e.target.value } 
                    })}
                    className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:border-olive-400 focus:ring-2 focus:ring-olive-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Relación</label>
                  <input
                    type="text"
                    value={formData.guardian.relationship}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      guardian: { ...formData.guardian, relationship: e.target.value } 
                    })}
                    className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:border-olive-400 focus:ring-2 focus:ring-olive-100"
                    placeholder="Madre, Padre, Tío, etc."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Teléfono</label>
                  <input
                    type="tel"
                    value={formData.guardian.phone}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      guardian: { ...formData.guardian, phone: e.target.value } 
                    })}
                    className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:border-olive-400 focus:ring-2 focus:ring-olive-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={formData.guardian.email}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      guardian: { ...formData.guardian, email: e.target.value } 
                    })}
                    className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:border-olive-400 focus:ring-2 focus:ring-olive-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Contacto Alternativo</label>
                  <input
                    type="text"
                    value={formData.guardian.altContact}
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
              <h3 className="text-lg font-semibold text-olive-800 mb-4">Situación del Hogar</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Miembros de la Familia</label>
                  <input
                    type="number"
                    value={formData.household.members}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      household: { ...formData.household, members: e.target.value } 
                    })}
                    className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:border-olive-400 focus:ring-2 focus:ring-olive-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Rango de Ingresos</label>
                  <select
                    value={formData.household.incomeRange}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      household: { ...formData.household, incomeRange: e.target.value } 
                    })}
                    className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:border-olive-400 focus:ring-2 focus:ring-olive-100"
                  >
                    <option value="">Seleccionar</option>
                    <option value="bajo">Bajo</option>
                    <option value="medio-bajo">Medio-Bajo</option>
                    <option value="medio">Medio</option>
                    <option value="medio-alto">Medio-Alto</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Empleo del Tutor</label>
                  <input
                    type="text"
                    value={formData.household.guardianEmployment}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      household: { ...formData.household, guardianEmployment: e.target.value } 
                    })}
                    className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:border-olive-400 focus:ring-2 focus:ring-olive-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Vivienda</label>
                  <input
                    type="text"
                    value={formData.household.housing}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      household: { ...formData.household, housing: e.target.value } 
                    })}
                    className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:border-olive-400 focus:ring-2 focus:ring-olive-100"
                    placeholder="Propia, Alquilada, Familiar, etc."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Apoyo Anterior</label>
                  <input
                    type="text"
                    value={formData.household.previousSupport}
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
              <h3 className="text-lg font-semibold text-olive-800 mb-4">Solicitud de Beca</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Tipo de Beca</label>
                  <input
                    type="text"
                    value={formData.application.scholarshipType}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      application: { ...formData.application, scholarshipType: e.target.value } 
                    })}
                    className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:border-olive-400 focus:ring-2 focus:ring-olive-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Prioridad</label>
                  <select
                    value={formData.application.priority}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      application: { ...formData.application, priority: e.target.value } 
                    })}
                    className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:border-olive-400 focus:ring-2 focus:ring-olive-100"
                  >
                    <option value="alta">Alta</option>
                    <option value="media">Media</option>
                    <option value="baja">Baja</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Razón de la Solicitud</label>
                  <textarea
                    value={formData.application.reason}
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
              <label className="block text-sm font-medium text-neutral-700 mb-2">Notas Generales</label>
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
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700 font-semibold transition-colors"
              >
                Agregar Candidato
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}


// Reports Section Component
function ReportsSection({ candidates }) {
  const [chartType, setChartType] = useState('bars'); // 'bars' or 'pie'

  // Helper to calculate age
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

  // Statistics by Status
  const statsByStatus = candidates.reduce((acc, candidate) => {
    const status = candidate.status || 'unknown';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  // Statistics by Priority
  const statsByPriority = candidates.reduce((acc, candidate) => {
    const priority = candidate.application?.priority || 'sin-prioridad';
    acc[priority] = (acc[priority] || 0) + 1;
    return acc;
  }, {});

  // Statistics by Level
  const statsByLevel = candidates.reduce((acc, candidate) => {
    const level = candidate.level || 'sin-nivel';
    acc[level] = (acc[level] || 0) + 1;
    return acc;
  }, {});

  // Statistics by Age Group
  const statsByAgeGroup = candidates.reduce((acc, candidate) => {
    const age = calculateAge(candidate.birthDate);
    if (age === null) {
      acc['sin-fecha'] = (acc['sin-fecha'] || 0) + 1;
    } else if (age <= 3) {
      acc['0-3 años'] = (acc['0-3 años'] || 0) + 1;
    } else if (age <= 5) {
      acc['4-5 años'] = (acc['4-5 años'] || 0) + 1;
    } else if (age <= 7) {
      acc['6-7 años'] = (acc['6-7 años'] || 0) + 1;
    } else if (age <= 10) {
      acc['8-10 años'] = (acc['8-10 años'] || 0) + 1;
    } else if (age <= 13) {
      acc['11-13 años'] = (acc['11-13 años'] || 0) + 1;
    } else {
      acc['14+ años'] = (acc['14+ años'] || 0) + 1;
    }
    return acc;
  }, {});

  const getMaxCount = (stats) => {
    return Math.max(...Object.values(stats), 1);
  };

  // Helper function to create chart data
  const createChartData = (stats, colors) => {
    return {
      labels: Object.keys(stats).map(key => {
        if (key === 'pending') return 'Pendiente';
        if (key === 'active') return 'Activo';
        if (key === 'rejected') return 'Rechazado';
        if (key === 'archived') return 'Archivado';
        if (key === 'alta') return 'Alta';
        if (key === 'media') return 'Media';
        if (key === 'baja') return 'Baja';
        if (key === 'sin-nivel') return 'Sin nivel';
        if (key === 'sin-fecha') return 'Sin fecha';
        if (key === 'sin-prioridad') return 'Sin prioridad';
        return key;
      }),
      datasets: [{
        data: Object.values(stats),
        backgroundColor: colors,
        borderColor: colors.map(c => c.replace('opacity-80', 'opacity-100')),
        borderWidth: 2,
      }],
    };
  };

  return (
    <div className="space-y-6">
      {/* Chart Type Toggle */}
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
            📊 Barras
          </button>
          <button
            onClick={() => setChartType('pie')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              chartType === 'pie'
                ? 'bg-olive-600 text-white'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            🥧 Circular
          </button>
        </div>
      </div>

      {/* Status Report */}
      <div className="bg-white rounded-2xl shadow-sm border border-olive-100 p-6">
        <h3 className="text-xl font-bold text-olive-800 mb-4">📋 Por Estado de Beca</h3>
        {chartType === 'bars' ? (
          <div className="space-y-3">
            {Object.entries(statsByStatus).map(([status, count]) => (
              <div key={status} className="flex items-center gap-4">
                <div className="w-32 text-sm font-medium text-neutral-700 capitalize">
                  {status === 'pending' ? 'Pendiente' :
                   status === 'active' ? 'Activo' :
                   status === 'rejected' ? 'Rechazado' :
                   status === 'archived' ? 'Archivado' : status}
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
              data={createChartData(statsByStatus, [
                '#a855f7', '#f59e0b', '#10b981', '#ef4444', '#6366f1'
              ])}
              options={{
                plugins: {
                  legend: { position: 'bottom' },
                  tooltip: { enabled: true }
                }
              }}
            />
          </div>
        )}
      </div>

      {/* Priority Report */}
      <div className="bg-white rounded-2xl shadow-sm border border-olive-100 p-6">
        <h3 className="text-xl font-bold text-olive-800 mb-4">🎯 Por Prioridad</h3>
        {chartType === 'bars' ? (
          <div className="space-y-3">
            {Object.entries(statsByPriority).map(([priority, count]) => (
              <div key={priority} className="flex items-center gap-4">
                <div className="w-32 text-sm font-medium text-neutral-700 capitalize">
                  {priority === 'alta' ? 'Alta' :
                   priority === 'media' ? 'Media' :
                   priority === 'baja' ? 'Baja' : priority}
                </div>
                <div className="flex-1 bg-neutral-100 rounded-full h-8 relative">
                  <div
                    className={`h-full rounded-full flex items-center justify-end pr-4 transition-all duration-500 ${
                      priority === 'alta' ? 'bg-red-500' :
                      priority === 'media' ? 'bg-yellow-500' :
                      priority === 'baja' ? 'bg-green-500' : 'bg-neutral-400'
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
              data={createChartData(statsByPriority, [
                '#ef4444', '#f59e0b', '#10b981', '#94a3b8'
              ])}
              options={{
                plugins: {
                  legend: { position: 'bottom' },
                  tooltip: { enabled: true }
                }
              }}
            />
          </div>
        )}
      </div>

      {/* Level Report */}
      <div className="bg-white rounded-2xl shadow-sm border border-olive-100 p-6">
        <h3 className="text-xl font-bold text-olive-800 mb-4">📚 Por Nivel Educativo</h3>
        {chartType === 'bars' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(statsByLevel)
              .sort((a, b) => b[1] - a[1])
              .map(([level, count]) => (
                <div key={level} className="flex items-center gap-4">
                  <div className="w-24 text-sm font-medium text-neutral-700">
                    {level === 'sin-nivel' ? 'Sin nivel' : level}
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
              data={createChartData(statsByLevel, [
                '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#14b8a6', '#06b6d4'
              ])}
              options={{
                plugins: {
                  legend: { position: 'bottom', labels: { boxWidth: 12 } },
                  tooltip: { enabled: true }
                }
              }}
            />
          </div>
        )}
      </div>

      {/* Age Group Report */}
      <div className="bg-white rounded-2xl shadow-sm border border-olive-100 p-6">
        <h3 className="text-xl font-bold text-olive-800 mb-4">👶 Por Grupo de Edad</h3>
        {chartType === 'bars' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(statsByAgeGroup)
              .sort((a, b) => {
                const order = {
                  '0-3 años': 1,
                  '4-5 años': 2,
                  '6-7 años': 3,
                  '8-10 años': 4,
                  '11-13 años': 5,
                  '14+ años': 6,
                  'sin-fecha': 7
                };
                return (order[a[0]] || 999) - (order[b[0]] || 999);
              })
              .map(([ageGroup, count]) => (
                <div key={ageGroup} className="flex items-center gap-4">
                  <div className="w-32 text-sm font-medium text-neutral-700">
                    {ageGroup === 'sin-fecha' ? 'Sin fecha' : ageGroup}
                  </div>
                  <div className="flex-1 bg-neutral-100 rounded-full h-8 relative">
                    <div
                      className="bg-purple-500 h-full rounded-full flex items-center justify-end pr-4 transition-all duration-500"
                      style={{ width: `${(count / getMaxCount(statsByAgeGroup)) * 100}%` }}
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
              data={createChartData(statsByAgeGroup, [
                '#a855f7', '#ec4899', '#f472b6', '#fb7185', '#f87171', '#60a5fa', '#94a3b8'
              ])}
              options={{
                plugins: {
                  legend: { position: 'bottom', labels: { boxWidth: 12 } },
                  tooltip: { enabled: true }
                }
              }}
            />
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="bg-gradient-to-r from-olive-50 to-stone-50 rounded-2xl border border-olive-100 p-6">
        <h3 className="text-xl font-bold text-olive-800 mb-4">📊 Resumen General</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-olive-700">{candidates.length}</div>
            <div className="text-sm text-neutral-600">Total Candidatos</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">
              {Object.keys(statsByLevel).length}
            </div>
            <div className="text-sm text-neutral-600">Niveles Diferentes</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">
              {candidates.filter(c => c.birthDate).length}
            </div>
            <div className="text-sm text-neutral-600">Con Fecha Nacimiento</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-yellow-600">
              {statsByPriority['alta'] || 0}
            </div>
            <div className="text-sm text-neutral-600">Prioridad Alta</div>
          </div>
        </div>
      </div>
    </div>
  );
}


