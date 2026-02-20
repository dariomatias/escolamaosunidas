export default function CurrencyToggle({ currency, setCurrency, rateError, t }) {
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2 bg-olive-50 border border-olive-100 rounded-xl p-1">
        <span className="text-xs text-neutral-500 px-2">{t?.finance?.currency?.label ?? 'Moneda'}</span>
        <button
          type="button"
          onClick={() => setCurrency('USD')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            currency === 'USD' ? 'bg-olive-600 text-white' : 'text-olive-700 hover:bg-olive-100'
          }`}
        >
          USD
        </button>
        <button
          type="button"
          onClick={() => setCurrency('MZN')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            currency === 'MZN' ? 'bg-olive-600 text-white' : 'text-olive-700 hover:bg-olive-100'
          }`}
        >
          MZN
        </button>
      </div>
      {rateError && (
        <span className="text-xs text-amber-600">{t?.finance?.currency?.rateError ?? 'Tasa de cambio aproximada'}</span>
      )}
    </div>
  );
}
