import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminNavbar from './AdminNavbar';
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

export default function AdminDashboard() {
  const [locale, setLocale] = useState(() => getInitialAdminLocale());
  const navigate = useNavigate();
  const t = ADMIN_TRANSLATIONS[locale] || ADMIN_TRANSLATIONS[ADMIN_DEFAULT_LOCALE];

  const modules = [
    {
      id: 'scholarships',
      title: locale === 'es' ? 'Módulo de Becas' : locale === 'pt' ? 'Módulo de Bolsas' : 'Scholarship Module',
      description: locale === 'es' 
        ? 'Gestiona las solicitudes de becas, candidatos y patrocinadores'
        : locale === 'pt'
        ? 'Gerencie as solicitações de bolsas, candidatos e patrocinadores'
        : 'Manage scholarship applications, candidates and sponsors',
      icon: '🎓',
      path: '/admin/candidates',
      color: 'from-blue-500 to-blue-600',
      hoverColor: 'hover:from-blue-600 hover:to-blue-700',
      features: locale === 'es' 
        ? ['Gestión de candidatos', 'Asignación de patrocinadores', 'Reportes y estadísticas']
        : locale === 'pt'
        ? ['Gestão de candidatos', 'Atribuição de patrocinadores', 'Relatórios e estatísticas']
        : ['Candidate management', 'Sponsor assignment', 'Reports and statistics'],
    },
    {
      id: 'students',
      title: locale === 'es' ? 'Módulo de Estudiantes' : locale === 'pt' ? 'Módulo de Estudantes' : 'Student Module',
      description: locale === 'es'
        ? 'Gestiona estudiantes regulares, matrículas y sistema de pagos'
        : locale === 'pt'
        ? 'Gerencie estudantes regulares, matrículas e sistema de pagamentos'
        : 'Manage regular students, enrollments and payment system',
      icon: '📚',
      path: '/admin/students',
      color: 'from-green-500 to-green-600',
      hoverColor: 'hover:from-green-600 hover:to-green-700',
      features: locale === 'es'
        ? ['Registro de estudiantes', 'Gestión de pagos', 'Historial académico']
        : locale === 'pt'
        ? ['Registro de estudantes', 'Gestão de pagamentos', 'Histórico acadêmico']
        : ['Student registration', 'Payment management', 'Academic history'],
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 to-olive-50">
      <AdminNavbar onLocaleChange={setLocale} />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Welcome Section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-olive-800 mb-4">
            {locale === 'es' 
              ? 'Bienvenido al Panel de Administración'
              : locale === 'pt'
              ? 'Bem-vindo ao Painel de Administração'
              : 'Welcome to Admin Panel'}
          </h2>
          <p className="text-xl text-neutral-600 max-w-2xl mx-auto">
            {locale === 'es'
              ? 'Selecciona el módulo que deseas gestionar'
              : locale === 'pt'
              ? 'Selecione o módulo que deseja gerenciar'
              : 'Select the module you want to manage'}
          </p>
        </div>

        {/* Module Tiles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {modules.map((module) => (
            <button
              key={module.id}
              onClick={() => navigate(module.path)}
              className={`bg-white rounded-2xl shadow-lg border-2 border-transparent hover:border-olive-200 transition-all duration-300 hover:shadow-xl transform hover:-translate-y-1 text-left p-8 group`}
            >
              <div className="flex items-start gap-6">
                {/* Icon */}
                <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${module.color} ${module.hoverColor} flex items-center justify-center text-4xl transform group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                  {module.icon}
                </div>

                {/* Content */}
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-olive-800 mb-3 group-hover:text-olive-900 transition-colors">
                    {module.title}
                  </h3>
                  <p className="text-neutral-600 mb-6 leading-relaxed">
                    {module.description}
                  </p>
                  
                  {/* Features */}
                  <ul className="space-y-2 mb-6">
                    {module.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm text-neutral-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-olive-500"></span>
                        {feature}
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <div className="flex items-center gap-2 text-olive-600 font-semibold group-hover:text-olive-700 transition-colors">
                    <span>
                      {locale === 'es' ? 'Abrir módulo' : locale === 'pt' ? 'Abrir módulo' : 'Open module'}
                    </span>
                    <svg 
                      className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>

      </div>
    </div>
  );
}

