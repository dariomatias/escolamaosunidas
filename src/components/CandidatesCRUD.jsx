import { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc, addDoc, query, orderBy } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { db, auth } from '../config/firebase';
import { useNavigate } from 'react-router-dom';

export default function CandidatesCRUD() {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingCandidate, setEditingCandidate] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
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

        {/* Candidates Table */}
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
  const [formData, setFormData] = useState(candidate);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-olive-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-olive-800">Editar Candidato</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600">✕</button>
        </div>
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Nombre Completo</label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:border-olive-400 focus:ring-2 focus:ring-olive-100"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
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
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Notas</label>
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
                Guardar
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
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
        <div className="border-b border-olive-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-olive-800">Agregar Candidato</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600">✕</button>
        </div>
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Nombre Completo</label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full px-4 py-2 border border-olive-200 rounded-lg focus:border-olive-400 focus:ring-2 focus:ring-olive-100"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
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
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Notas</label>
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
                Agregar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

