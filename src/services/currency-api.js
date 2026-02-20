/**
 * Tipo de cambio USD -> MZN (metical, Mozambique).
 * Usa API gratuita y cache por día.
 */

const CACHE_KEY = 'finance_usd_mzn_rate';
const CACHE_DATE_KEY = 'finance_usd_mzn_date';
const API_URL = 'https://open.er-api.com/v6/latest/USD';
const FALLBACK_RATE = 63.6;

function getTodayKey() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function getCachedRate() {
  try {
    const date = localStorage.getItem(CACHE_DATE_KEY);
    if (date !== getTodayKey()) return null;
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const rate = Number.parseFloat(raw);
    return Number.isFinite(rate) && rate > 0 ? rate : null;
  } catch {
    return null;
  }
}

function setCachedRate(rate) {
  try {
    localStorage.setItem(CACHE_KEY, String(rate));
    localStorage.setItem(CACHE_DATE_KEY, getTodayKey());
  } catch (_) {}
}

/**
 * Obtiene el cambio USD -> MZN del día (cacheado por día).
 * @returns {Promise<{ rate: number, error: string | null }>}
 */
export async function fetchUsdToMzn() {
  const cached = getCachedRate();
  if (cached != null) return { rate: cached, error: null };

  try {
    const res = await fetch(API_URL, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const rate = data?.rates?.MZN;
    if (rate == null || !Number.isFinite(rate) || rate <= 0) {
      setCachedRate(FALLBACK_RATE);
      return { rate: FALLBACK_RATE, error: 'MZN no disponible, usando tasa de respaldo' };
    }
    setCachedRate(rate);
    return { rate, error: null };
  } catch (err) {
    const fallback = getCachedRate();
    if (fallback != null) return { rate: fallback, error: null };
    setCachedRate(FALLBACK_RATE);
    return {
      rate: FALLBACK_RATE,
      error: err?.message || 'Error al cargar tipo de cambio',
    };
  }
}

export const FINANCE_CURRENCY_STORAGE_KEY = 'financeCurrency';
