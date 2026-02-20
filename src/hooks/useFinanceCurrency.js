import { useState, useEffect, useCallback } from 'react';
import { fetchUsdToMzn, FINANCE_CURRENCY_STORAGE_KEY } from '../services/currency-api';

const DEFAULT_CURRENCY = 'USD';

export function useFinanceCurrency(locale = 'es') {
  const [currency, setCurrencyState] = useState(() => {
    try {
      const saved = localStorage.getItem(FINANCE_CURRENCY_STORAGE_KEY);
      return saved === 'MZN' ? 'MZN' : 'USD';
    } catch {
      return DEFAULT_CURRENCY;
    }
  });
  const [usdToMzn, setUsdToMzn] = useState(null);
  const [rateError, setRateError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchUsdToMzn().then(({ rate, error }) => {
      if (!cancelled) {
        setUsdToMzn(rate);
        setRateError(error || null);
      }
    });
    return () => { cancelled = true; };
  }, []);

  const setCurrency = useCallback((value) => {
    const next = value === 'MZN' ? 'MZN' : 'USD';
    setCurrencyState(next);
    try {
      localStorage.setItem(FINANCE_CURRENCY_STORAGE_KEY, next);
    } catch (_) {}
  }, []);

  const localeTag = locale === 'pt' ? 'pt-MZ' : locale === 'en' ? 'en-US' : 'es-ES';
  const formatCurrency = useCallback(
    (amountUsd) => {
      if (amountUsd == null || !Number.isFinite(amountUsd)) amountUsd = 0;
      if (currency === 'MZN' && usdToMzn != null) {
        const amountMzn = amountUsd * usdToMzn;
        return new Intl.NumberFormat(localeTag, {
          style: 'currency',
          currency: 'MZN',
          maximumFractionDigits: 0,
        }).format(amountMzn);
      }
      return new Intl.NumberFormat(localeTag, {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }).format(amountUsd);
    },
    [currency, usdToMzn, localeTag]
  );

  /** Formatea un valor que ya está en la moneda actual (para gráficos). */
  const formatInCurrentCurrency = useCallback(
    (amount) => {
      if (amount == null || !Number.isFinite(amount)) amount = 0;
      const curr = currency === 'MZN' ? 'MZN' : 'USD';
      return new Intl.NumberFormat(localeTag, {
        style: 'currency',
        currency: curr,
        maximumFractionDigits: 0,
      }).format(amount);
    },
    [currency, localeTag]
  );

  const convertToDisplay = useCallback(
    (amountUsd) => {
      if (amountUsd == null || !Number.isFinite(amountUsd)) return 0;
      if (currency === 'MZN' && usdToMzn != null) return amountUsd * usdToMzn;
      return amountUsd;
    },
    [currency, usdToMzn]
  );

  const currencyCode = currency;
  const currencyLabel = currency === 'MZN' ? 'MZN (Metical)' : 'USD';

  return {
    currency,
    setCurrency,
    usdToMzn,
    rateError,
    formatCurrency,
    formatInCurrentCurrency,
    convertToDisplay,
    currencyCode,
    currencyLabel,
  };
}
