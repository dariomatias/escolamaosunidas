import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './config/firebase';
import EscolaMaosUnidasSite from './site.jsx';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import CandidatesCRUD from './components/CandidatesCRUD';
import StudentsCRUD from './components/StudentsCRUD';
import SponsorsCRUD from './components/SponsorsCRUD';
import FinanceDashboard from './components/FinanceDashboard';
import FinancialProjection from './components/FinancialProjection';

function ProtectedRoute({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

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

  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<EscolaMaosUnidasSite />} />
        <Route path="/login" element={<Login />} />
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/candidates" 
          element={
            <ProtectedRoute>
              <CandidatesCRUD />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/students" 
          element={
            <ProtectedRoute>
              <StudentsCRUD />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/sponsors" 
          element={
            <ProtectedRoute>
              <SponsorsCRUD />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/finance" 
          element={
            <ProtectedRoute>
              <FinanceDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/finance/projection" 
          element={
            <ProtectedRoute>
              <FinancialProjection />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </BrowserRouter>
  );
}

