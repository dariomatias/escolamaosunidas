import {
  ADMIN_DEFAULT_LOCALE,
  ADMIN_TRANSLATIONS,
} from '../src/i18n/adminTranslations.js';

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function collectPaths(value, prefix = '') {
  if (!isPlainObject(value)) return [prefix];

  return Object.entries(value).flatMap(([key, child]) => {
    const nextPrefix = prefix ? `${prefix}.${key}` : key;
    return collectPaths(child, nextPrefix);
  });
}

function getValueByPath(value, path) {
  return path.split('.').reduce((current, key) => current?.[key], value);
}

const locales = Object.keys(ADMIN_TRANSLATIONS);
const allPaths = new Set();

for (const locale of locales) {
  for (const path of collectPaths(ADMIN_TRANSLATIONS[locale])) {
    allPaths.add(path);
  }
}

let hasMissingTranslations = false;

for (const locale of locales) {
  const missingPaths = [...allPaths].filter((path) =>
    getValueByPath(ADMIN_TRANSLATIONS[locale], path) === undefined
  );

  if (missingPaths.length > 0) {
    hasMissingTranslations = true;
    console.error(`\n${locale} is missing ${missingPaths.length} translation keys:`);
    for (const path of missingPaths) {
      console.error(`  - ${path}`);
    }
  }
}

if (hasMissingTranslations) {
  console.error(`\nDefault locale: ${ADMIN_DEFAULT_LOCALE}`);
  process.exit(1);
}

console.log(`Admin translations are complete across ${locales.join(', ')}.`);
