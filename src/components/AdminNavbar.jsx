import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebase';
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

export default function AdminNavbar({ onLocaleChange: externalLocaleChange }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [locale, setLocale] = useState(() => getInitialAdminLocale());
  const [currentUser, setCurrentUser] = useState(() => auth.currentUser);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(ADMIN_LOCALE_STORAGE_KEY, locale);
      if (externalLocaleChange) {
        externalLocaleChange(locale);
      }
    }
  }, [locale, externalLocaleChange]);

  const handleLocaleChange = (newLocale) => {
    setLocale(newLocale);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const t = ADMIN_TRANSLATIONS[locale] || ADMIN_TRANSLATIONS[ADMIN_DEFAULT_LOCALE];

  const adminDisplayName = currentUser?.displayName?.trim() || '';
  const adminEmail = currentUser?.email || '';
  const adminName = adminDisplayName || adminEmail || t.header?.adminFallback || 'Administrador';
  const adminInitials = (() => {
    if (adminDisplayName) {
      const parts = adminDisplayName.split(' ').filter(Boolean);
      if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
      return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
    }
    if (adminEmail) return adminEmail.charAt(0).toUpperCase();
    return 'A';
  })();

  const navItems = [
    {
      path: '/admin',
      label: locale === 'es' ? 'Dashboard' : locale === 'pt' ? 'Painel' : 'Dashboard',
      icon: '🏠',
      exact: true,
    },
    {
      path: '/admin/candidates',
      label: locale === 'es' ? 'Módulo Becas' : locale === 'pt' ? 'Módulo Bolsas' : 'Scholarships',
      icon: '🎓',
    },
    {
      path: '/admin/students',
      label: locale === 'es' ? 'Módulo Estudiantes' : locale === 'pt' ? 'Módulo Estudantes' : 'Students',
      icon: '📚',
    },
  ];

  const isActive = (path, exact = false) => {
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="sticky top-0 z-50 bg-white shadow-md border-b border-olive-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo / Title */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/admin')}
              className="flex items-center gap-2 text-xl font-bold text-olive-800 hover:text-olive-900 transition-colors"
            >
              <span>🎓</span>
              <span className="hidden sm:inline">
                {locale === 'es' ? 'Escola Mãos Unidas' : locale === 'pt' ? 'Escola Mãos Unidas' : 'Escola Mãos Unidas'}
              </span>
            </button>

            {/* Navigation Links */}
            <div className="hidden md:flex items-center gap-1 ml-6">
              {navItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                    isActive(item.path, item.exact)
                      ? 'bg-olive-600 text-white shadow-sm'
                      : 'text-neutral-700 hover:bg-olive-50 hover:text-olive-700'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Right side: Language + User */}
          <div className="flex items-center gap-4">
            {/* Language Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase text-neutral-500 hidden lg:inline">
                {t.common?.languageLabel || 'Idioma'}
              </span>
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

            {/* User Info & Logout */}
            {currentUser && (
              <div className="flex items-center gap-3 px-3 py-2 border border-olive-100 rounded-xl bg-olive-50/40">
                <div className="w-8 h-8 rounded-full bg-olive-600 text-white flex items-center justify-center text-xs font-semibold">
                  {adminInitials}
                </div>
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-semibold text-olive-800">{adminName}</div>
                  {adminEmail && (
                    <div className="text-xs text-neutral-500 truncate max-w-[150px]">{adminEmail}</div>
                  )}
                </div>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1 rounded-lg text-xs font-semibold text-olive-700 hover:bg-olive-100 transition-colors whitespace-nowrap"
                >
                  {t.buttons?.logoutShort || t.buttons?.logout || 'Salir'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden border-t border-olive-100 py-2">
          <div className="flex items-center gap-1 overflow-x-auto pb-2">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1 whitespace-nowrap flex-shrink-0 ${
                  isActive(item.path, item.exact)
                    ? 'bg-olive-600 text-white shadow-sm'
                    : 'text-neutral-700 hover:bg-olive-50 hover:text-olive-700'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}

