import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../config/firebase';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/admin');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-olive-50 via-stone-50 to-olive-50/30 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl border border-olive-100 p-8">
          <div className="text-center mb-8">
            <img 
              src="/assets/logo-escola-maos-unidas.png" 
              alt="Logo" 
              className="h-16 w-16 mx-auto mb-4 rounded-full"
            />
            <h1 className="text-3xl font-bold text-olive-800 mb-2">Admin Login</h1>
            <p className="text-neutral-600">Escola Mãos Unidas</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-neutral-700 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg border border-olive-200 focus:border-olive-400 focus:ring-2 focus:ring-olive-100 transition-colors"
                placeholder="admin@escolamaosunidas.org"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-neutral-700 mb-2">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg border border-olive-200 focus:border-olive-400 focus:ring-2 focus:ring-olive-100 transition-colors"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 rounded-lg bg-gradient-to-r from-olive-600 to-olive-700 text-white font-semibold hover:from-olive-700 hover:to-olive-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </button>
          </form>
        </div>

        <div className="mt-6 text-center text-sm text-neutral-600">
          <a href="/" className="text-olive-600 hover:text-olive-700 underline">
            ← Volver al sitio principal
          </a>
        </div>
      </div>
    </div>
  );
}

