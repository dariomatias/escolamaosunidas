import { useState, useEffect } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../config/firebase';
import { useNavigate } from 'react-router-dom';
import {
  ADMIN_TRANSLATIONS,
  ADMIN_DEFAULT_LOCALE,
  ADMIN_LOCALE_OPTIONS,
  ADMIN_LOCALE_STORAGE_KEY,
} from '../i18n/adminTranslations';

const getInitialAdminLocale = () => {
  if (typeof window === 'undefined') {
    return ADMIN_DEFAULT_LOCALE;
  }
  return localStorage.getItem(ADMIN_LOCALE_STORAGE_KEY) || ADMIN_DEFAULT_LOCALE;
};

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [locale, setLocale] = useState(() => getInitialAdminLocale());
  const navigate = useNavigate();

  const translations = ADMIN_TRANSLATIONS[locale] || ADMIN_TRANSLATIONS[ADMIN_DEFAULT_LOCALE];
  const t = translations.login;
  const common = translations.common;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(ADMIN_LOCALE_STORAGE_KEY, locale);
    }
  }, [locale]);

  const handleLocaleChange = (newLocale) => {
    setLocale(newLocale);
  };

  const translateError = (code) => {
    if (!code) return t.errors.default;
    return t.errors[code] || t.errors.default;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/admin');
    } catch (err) {
      setError(translateError(err.code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-olive-50 via-stone-50 to-olive-50/30 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl border border-olive-100 p-8">
          <div className="flex justify-end mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase text-neutral-500">{common.languageLabel}</span>
              <div className="flex items-center gap-1 bg-olive-50 border border-olive-100 rounded-full p-1">
                {ADMIN_LOCALE_OPTIONS.map((option) => (
                  <button
                    key={option.code}
                    onClick={() => handleLocaleChange(option.code)}
                    className={`px-2 py-1 text-sm rounded-full transition-colors ${
                      locale === option.code
                        ? 'bg-olive-600 text-white shadow-sm'
                        : 'text-olive-700 hover:bg-olive-100'
                    }`}
                    aria-label={option.label}
                  >
                    <span className="text-lg leading-none">{option.flag}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="text-center mb-8">
            <img
              src="/assets/logo-escola-maos-unidas.png"
              alt="Logo"
              className="h-16 w-16 mx-auto mb-4 rounded-full"
            />
            <h1 className="text-3xl font-bold text-olive-800 mb-2">{t.title}</h1>
            <p className="text-neutral-600">{t.subtitle}</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-neutral-700 mb-2">
                {t.email}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg border border-olive-200 focus:border-olive-400 focus:ring-2 focus:ring-olive-100 transition-colors"
                placeholder={t.emailPlaceholder}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-neutral-700 mb-2">
                {t.password}
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg border border-olive-200 focus:border-olive-400 focus:ring-2 focus:ring-olive-100 transition-colors"
                placeholder={t.passwordPlaceholder}
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
              {loading ? t.loading : t.submit}
            </button>
          </form>
        </div>

        <div className="mt-6 text-center text-sm text-neutral-600">
          <a href="/" className="text-olive-600 hover:text-olive-700 underline">
            {common.backToSite}
          </a>
        </div>
      </div>
    </div>
  );
}

