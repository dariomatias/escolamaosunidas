import es from './locales/admin/es.js';
import pt from './locales/admin/pt.js';
import en from './locales/admin/en.js';

export const ADMIN_LOCALE_STORAGE_KEY = 'adminLocale';
export const ADMIN_DEFAULT_LOCALE = 'es';

export const ADMIN_LOCALE_OPTIONS = [
  { code: 'es', label: 'ES', flag: '🇪🇸' },
  { code: 'pt', label: 'PT', flag: '🇧🇷' },
  { code: 'en', label: 'EN', flag: '🇺🇸' },
];

export const ADMIN_TRANSLATIONS = {
  es,
  pt,
  en,
};

export function getAdminTranslations(locale = ADMIN_DEFAULT_LOCALE) {
  return ADMIN_TRANSLATIONS[locale] || ADMIN_TRANSLATIONS[ADMIN_DEFAULT_LOCALE];
}
