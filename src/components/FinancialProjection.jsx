import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarController,
  LineController,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import AdminNavbar from './AdminNavbar';
import CurrencyToggle from './CurrencyToggle';
import { useFinanceCurrency } from '../hooks/useFinanceCurrency';
import {
  ADMIN_TRANSLATIONS,
  ADMIN_DEFAULT_LOCALE,
  ADMIN_LOCALE_STORAGE_KEY,
} from '../i18n/adminTranslations';
import {
  ALUMNOS_COLEGIO,
  BECADOS_CHACARRONES,
  CUOTA_ALUMNOS_MZN,
  CUOTA_BECADOS_USD,
  GASTOS_FIJOS_MZN,
  getProjectionMonths,
} from '../data/projectionConstants';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarController,
  LineController,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

const getInitialAdminLocale = () => {
  if (typeof window === 'undefined') return ADMIN_DEFAULT_LOCALE;
  return localStorage.getItem(ADMIN_LOCALE_STORAGE_KEY) || ADMIN_DEFAULT_LOCALE;
};

function formatChartValue(value, currencyCode) {
  return currencyCode === 'MZN'
    ? new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN', maximumFractionDigits: 0 }).format(value)
    : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

function buildStackedChartOptions(t, currencyCode) {
  return {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const v = ctx.parsed?.y ?? ctx.raw;
            return `${ctx.dataset.label}: ${formatChartValue(v, currencyCode)}`;
          },
        },
      },
    },
    scales: {
      x: { stacked: true },
      y: {
        stacked: true,
        type: 'linear',
        display: true,
        position: 'left',
        beginAtZero: true,
        title: { display: true, text: (t.finance?.projection?.axisMonthly || 'Ingreso') + (currencyCode === 'MZN' ? ' (MZN)' : ' (USD)') },
        ticks: { callback: (v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v) },
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        beginAtZero: true,
        grid: { drawOnChartArea: false },
        title: { display: true, text: (t.finance?.projection?.axisAccumulated || 'Acumulado') + (currencyCode === 'MZN' ? ' (MZN)' : ' (USD)') },
        ticks: { callback: (v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v) },
      },
    },
  };
}

function buildBarChartOptions(t, currencyCode) {
  return {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const v = ctx.parsed?.y ?? ctx.raw;
            return `${ctx.dataset.label}: ${formatChartValue(v, currencyCode)}`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: { display: true, text: (t.finance?.projection?.axisAccumulated || 'Acumulado') + (currencyCode === 'MZN' ? ' (MZN)' : ' (USD)') },
        ticks: { callback: (v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v) },
      },
    },
  };
}

export default function FinancialProjection() {
  const navigate = useNavigate();
  const [locale] = useState(() => getInitialAdminLocale());
  const t = ADMIN_TRANSLATIONS[locale] || ADMIN_TRANSLATIONS[ADMIN_DEFAULT_LOCALE];
  const { currency, setCurrency, formatCurrency, convertToDisplay, usdToMzn, rateError, currencyCode } =
    useFinanceCurrency(locale);

  const projectionMonths = useMemo(() => getProjectionMonths(), []);

  // Sección 1: 49 alumnos - cuota en MZN
  const [cuotaAlumnosMzn, setCuotaAlumnosMzn] = useState(CUOTA_ALUMNOS_MZN);
  const [countAlumnos, setCountAlumnos] = useState(ALUMNOS_COLEGIO);
  const [draftCuotaAlumnos, setDraftCuotaAlumnos] = useState(String(CUOTA_ALUMNOS_MZN));
  const [draftCountAlumnos, setDraftCountAlumnos] = useState(String(ALUMNOS_COLEGIO));

  // Sección 2: 60 becados - cuota en USD
  const [cuotaBecadosUsd, setCuotaBecadosUsd] = useState(CUOTA_BECADOS_USD);
  const [countBecados, setCountBecados] = useState(BECADOS_CHACARRONES);
  const [draftCuotaBecados, setDraftCuotaBecados] = useState(String(CUOTA_BECADOS_USD));
  const [draftCountBecados, setDraftCountBecados] = useState(String(BECADOS_CHACARRONES));

  // Gastos fijos (MZN) - para sección 3
  const [gastosFijosMzn, setGastosFijosMzn] = useState(GASTOS_FIJOS_MZN);
  const [draftGastos, setDraftGastos] = useState(String(GASTOS_FIJOS_MZN));

  const displayedCuotaAlumnos = useMemo(
    () => (currencyCode === 'MZN' ? cuotaAlumnosMzn : usdToMzn > 0 ? cuotaAlumnosMzn / usdToMzn : 0),
    [currencyCode, cuotaAlumnosMzn, usdToMzn]
  );
  const displayedCuotaBecados = useMemo(
    () => (currencyCode === 'USD' ? cuotaBecadosUsd : usdToMzn > 0 ? cuotaBecadosUsd * usdToMzn : 0),
    [currencyCode, cuotaBecadosUsd, usdToMzn]
  );
  const displayedGastos = useMemo(
    () => (currencyCode === 'MZN' ? gastosFijosMzn : usdToMzn > 0 ? gastosFijosMzn / usdToMzn : 0),
    [currencyCode, gastosFijosMzn, usdToMzn]
  );

  useEffect(() => {
    const fmt = (v) => (v >= 1000 ? String(Math.round(v)) : String(Math.round(v * 100) / 100));
    setDraftCuotaAlumnos(fmt(displayedCuotaAlumnos));
  }, [displayedCuotaAlumnos]);
  useEffect(() => {
    const fmt = (v) => (v >= 1000 ? String(Math.round(v)) : String(Math.round(v * 100) / 100));
    setDraftCuotaBecados(fmt(displayedCuotaBecados));
  }, [displayedCuotaBecados]);
  useEffect(() => {
    setDraftGastos(String(Math.round(displayedGastos)));
  }, [displayedGastos]);
  useEffect(() => {
    setDraftCountAlumnos(String(countAlumnos));
  }, [countAlumnos]);
  useEffect(() => {
    setDraftCountBecados(String(countBecados));
  }, [countBecados]);

  const recalcAlumnos = () => {
    const cuota = parseFloat(String(draftCuotaAlumnos).replace(',', '.'));
    const cnt = parseInt(String(draftCountAlumnos), 10);
    if (Number.isFinite(cuota) && cuota >= 0) {
      const newMzn = currencyCode === 'MZN' ? cuota : cuota * (usdToMzn || 1);
      setCuotaAlumnosMzn(newMzn);
    }
    if (Number.isFinite(cnt) && cnt >= 0) setCountAlumnos(cnt);
  };
  const recalcBecados = () => {
    const cuota = parseFloat(String(draftCuotaBecados).replace(',', '.'));
    const cnt = parseInt(String(draftCountBecados), 10);
    if (Number.isFinite(cuota) && cuota >= 0) {
      const newUsd = currencyCode === 'USD' ? cuota : cuota / (usdToMzn || 1);
      setCuotaBecadosUsd(newUsd);
    }
    if (Number.isFinite(cnt) && cnt >= 0) setCountBecados(cnt);
  };
  const recalcGastos = () => {
    const g = parseFloat(String(draftGastos).replace(',', '.'));
    if (Number.isFinite(g) && g >= 0) {
      const newMzn = currencyCode === 'MZN' ? g : g * (usdToMzn || 1);
      setGastosFijosMzn(newMzn);
    }
  };

  // Ingresos USD por sección
  const cuotaAlumnosUsd = useMemo(
    () => (usdToMzn > 0 ? cuotaAlumnosMzn / usdToMzn : 0),
    [usdToMzn, cuotaAlumnosMzn]
  );
  const ingresoAlumnosUsd = useMemo(() => countAlumnos * cuotaAlumnosUsd, [countAlumnos, cuotaAlumnosUsd]);
  const ingresoBecadosUsd = useMemo(() => countBecados * cuotaBecadosUsd, [countBecados, cuotaBecadosUsd]);
  const gastosFijosUsd = useMemo(
    () => (usdToMzn > 0 ? gastosFijosMzn / usdToMzn : 0),
    [usdToMzn, gastosFijosMzn]
  );

  const monthlyIncomeAlumnosUsd = useMemo(() => projectionMonths.map(() => ingresoAlumnosUsd), [projectionMonths, ingresoAlumnosUsd]);
  const monthlyIncomeBecadosUsd = useMemo(() => projectionMonths.map(() => ingresoBecadosUsd), [projectionMonths, ingresoBecadosUsd]);

  const accumulatedAlumnosUsd = useMemo(() => {
    let acc = 0;
    return monthlyIncomeAlumnosUsd.map((v) => { acc += v; return acc; });
  }, [monthlyIncomeAlumnosUsd]);
  const accumulatedBecadosUsd = useMemo(() => {
    let acc = 0;
    return monthlyIncomeBecadosUsd.map((v) => { acc += v; return acc; });
  }, [monthlyIncomeBecadosUsd]);

  const monthlyTotalIncomeUsd = useMemo(
    () => monthlyIncomeAlumnosUsd.map((a, i) => a + monthlyIncomeBecadosUsd[i]),
    [monthlyIncomeAlumnosUsd, monthlyIncomeBecadosUsd]
  );
  const monthlyExpensesUsd = useMemo(() => projectionMonths.map(() => gastosFijosUsd), [projectionMonths, gastosFijosUsd]);
  const monthlyBalanceUsd = useMemo(
    () => monthlyTotalIncomeUsd.map((ing, i) => Math.max(0, ing - monthlyExpensesUsd[i])),
    [monthlyTotalIncomeUsd, monthlyExpensesUsd]
  );
  const accumulatedNetUsd = useMemo(() => {
    let acc = 0;
    return monthlyBalanceUsd.map((b) => { acc += b; return acc; });
  }, [monthlyBalanceUsd]);

  const suffix = currencyCode === 'MZN' ? ' (MZN)' : ' (USD)';

  const chartOptionsStacked = useMemo(() => buildStackedChartOptions(t, currencyCode), [t, currencyCode]);
  const chartOptionsBar = useMemo(() => buildBarChartOptions(t, currencyCode), [t, currencyCode]);

  const alumnosChartData = useMemo(() => ({
    labels: projectionMonths.map((m) => m.label),
    datasets: [
      {
        type: 'bar',
        label: (t.finance?.projection?.monthlyIncome || 'Ingreso mensual') + suffix,
        data: monthlyIncomeAlumnosUsd.map(convertToDisplay),
        backgroundColor: 'rgba(59, 130, 246, 0.7)',
        borderColor: 'rgba(37, 99, 235, 1)',
        borderRadius: 6,
        yAxisID: 'y',
        order: 2,
      },
      {
        type: 'line',
        label: (t.finance?.projection?.accumulatedNet || 'Acumulado') + suffix,
        data: accumulatedAlumnosUsd.map(convertToDisplay),
        borderColor: 'rgba(34, 197, 94, 1)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.2,
        pointRadius: 4,
        yAxisID: 'y1',
        order: 1,
      },
    ],
  }), [projectionMonths, monthlyIncomeAlumnosUsd, accumulatedAlumnosUsd, convertToDisplay, currencyCode, t.finance?.projection]);

  const becadosChartData = useMemo(() => ({
    labels: projectionMonths.map((m) => m.label),
    datasets: [
      {
        type: 'bar',
        label: (t.finance?.projection?.monthlyIncome || 'Ingreso mensual') + suffix,
        data: monthlyIncomeBecadosUsd.map(convertToDisplay),
        backgroundColor: 'rgba(168, 85, 247, 0.7)',
        borderColor: 'rgba(126, 34, 206, 1)',
        borderRadius: 6,
        yAxisID: 'y',
        order: 2,
      },
      {
        type: 'line',
        label: (t.finance?.projection?.accumulatedNet || 'Acumulado') + suffix,
        data: accumulatedBecadosUsd.map(convertToDisplay),
        borderColor: 'rgba(34, 197, 94, 1)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.2,
        pointRadius: 4,
        yAxisID: 'y1',
        order: 1,
      },
    ],
  }), [projectionMonths, monthlyIncomeBecadosUsd, accumulatedBecadosUsd, convertToDisplay, currencyCode, t.finance?.projection]);

  const combinedChartData = useMemo(() => ({
    labels: projectionMonths.map((m) => m.label),
    datasets: [
      {
        type: 'bar',
        label: (t.finance?.projection?.fixedExpenses || 'Gastos fijos') + suffix,
        data: monthlyExpensesUsd.map(convertToDisplay),
        backgroundColor: 'rgba(239, 68, 68, 0.85)',
        borderColor: 'rgba(185, 28, 28, 1)',
        borderRadius: { topLeft: 0, topRight: 0 },
        stack: 'combined',
        yAxisID: 'y',
        order: 3,
      },
      {
        type: 'bar',
        label: (t.finance?.projection?.balance || 'Saldo') + suffix,
        data: monthlyBalanceUsd.map(convertToDisplay),
        backgroundColor: 'rgba(56, 189, 248, 0.7)',
        borderColor: 'rgba(14, 165, 233, 1)',
        borderRadius: 6,
        stack: 'combined',
        yAxisID: 'y',
        order: 2,
      },
      {
        type: 'line',
        label: (t.finance?.projection?.accumulatedNet || 'Saldo acumulado') + suffix,
        data: accumulatedNetUsd.map(convertToDisplay),
        borderColor: 'rgba(34, 197, 94, 1)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.2,
        pointRadius: 4,
        yAxisID: 'y1',
        order: 1,
      },
    ],
  }), [
    projectionMonths,
    monthlyExpensesUsd,
    monthlyBalanceUsd,
    accumulatedNetUsd,
    convertToDisplay,
    currencyCode,
    t.finance?.projection,
  ]);

  const combinedAccumulatedData = useMemo(() => ({
    labels: projectionMonths.map((m) => m.label),
    datasets: [{
      label: (t.finance?.projection?.accumulatedNet || 'Saldo acumulado') + suffix,
      data: accumulatedNetUsd.map(convertToDisplay),
      backgroundColor: 'rgba(34, 197, 94, 0.65)',
      borderColor: 'rgba(22, 163, 74, 1)',
      borderRadius: 6,
    }],
  }), [projectionMonths, accumulatedNetUsd, convertToDisplay, currencyCode, t.finance?.projection]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 to-olive-50">
      <AdminNavbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => navigate('/admin/finance')}
              className="text-olive-700 hover:text-olive-900 font-medium flex items-center gap-1"
            >
              ← {t.finance?.projection?.backToFinance ?? 'Volver a Finanzas'}
            </button>
            <h2 className="text-3xl font-bold text-olive-800">
              {t.finance?.projection?.title || 'Proyección Financiera'}
            </h2>
          </div>
          <CurrencyToggle currency={currency} setCurrency={setCurrency} rateError={rateError} t={t} />
        </div>

        {/* Sección 1: 49 alumnos - cuota MZN */}
        <div className="bg-white rounded-2xl border border-olive-100 shadow-sm mb-8">
          <div className="px-6 py-5 border-b border-olive-100">
            <h3 className="text-xl font-semibold text-olive-800">
              {t.finance?.projection?.sectionAlumnosTitle || '49 alumnos'}
            </h3>
            <p className="text-sm text-neutral-500 mt-1">
              {t.finance?.projection?.sectionAlumnosDesc || 'Ingresos por cuotas (1.800 MZN/mes por alumno).'}
            </p>
            <div className="flex flex-wrap items-end gap-4 mt-4 p-4 bg-blue-50/60 rounded-xl border border-blue-100">
              <div>
                <label className="text-xs font-semibold text-olive-700">
                  {t.finance?.projection?.feeLabel || 'Cuota mensual'} <span className="text-neutral-500">(MZN)</span>
                </label>
                <input
                  type="number"
                  min={0}
                  step={100}
                  value={draftCuotaAlumnos}
                  onChange={(e) => setDraftCuotaAlumnos(e.target.value)}
                  className="ml-2 w-28 px-2 py-1.5 rounded border border-olive-200 text-olive-900"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-olive-700">
                  {t.finance?.projection?.studentsLabel || 'Alumnos'}
                </label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={draftCountAlumnos}
                  onChange={(e) => setDraftCountAlumnos(e.target.value)}
                  className="ml-2 w-20 px-2 py-1.5 rounded border border-olive-200 text-olive-900"
                />
              </div>
              <button
                type="button"
                onClick={recalcAlumnos}
                className="px-4 py-2 rounded-lg bg-olive-600 text-white font-semibold hover:bg-olive-700"
              >
                {t.finance?.projection?.recalculate || 'Recalcular'}
              </button>
            </div>
            <p className="text-sm text-neutral-600 mt-2">
              <strong>{countAlumnos}</strong> {t.finance?.projection?.paying || 'pagantes'} ×{' '}
              <strong>{formatCurrency(cuotaAlumnosUsd)}</strong> {t.finance?.projection?.perMonth || 'por mes'} ={' '}
              <strong>{formatCurrency(ingresoAlumnosUsd)}</strong> {t.finance?.projection?.monthlyTotal || 'ingreso mensual'}
            </p>
          </div>
          <div className="p-6">
            <div className="h-[300px]">
              <Bar data={alumnosChartData} options={chartOptionsStacked} />
            </div>
          </div>
        </div>

        {/* Sección 2: 60 becados - cuota USD */}
        <div className="bg-white rounded-2xl border border-olive-100 shadow-sm mb-8">
          <div className="px-6 py-5 border-b border-olive-100">
            <h3 className="text-xl font-semibold text-olive-800">
              {t.finance?.projection?.sectionBecadosTitle || '60 becados'}
            </h3>
            <p className="text-sm text-neutral-500 mt-1">
              {t.finance?.projection?.sectionBecadosDesc || 'Ingresos por cuotas ($40 USD/mes por becado).'}
            </p>
            <div className="flex flex-wrap items-end gap-4 mt-4 p-4 bg-purple-50/60 rounded-xl border border-purple-100">
              <div>
                <label className="text-xs font-semibold text-olive-700">
                  {t.finance?.projection?.feeLabel || 'Cuota mensual'} <span className="text-neutral-500">(USD)</span>
                </label>
                <input
                  type="number"
                  min={0}
                  step={5}
                  value={draftCuotaBecados}
                  onChange={(e) => setDraftCuotaBecados(e.target.value)}
                  className="ml-2 w-24 px-2 py-1.5 rounded border border-olive-200 text-olive-900"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-olive-700">
                  {t.finance?.projection?.studentsLabel || 'Becados'}
                </label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={draftCountBecados}
                  onChange={(e) => setDraftCountBecados(e.target.value)}
                  className="ml-2 w-20 px-2 py-1.5 rounded border border-olive-200 text-olive-900"
                />
              </div>
              <button
                type="button"
                onClick={recalcBecados}
                className="px-4 py-2 rounded-lg bg-olive-600 text-white font-semibold hover:bg-olive-700"
              >
                {t.finance?.projection?.recalculate || 'Recalcular'}
              </button>
            </div>
            <p className="text-sm text-neutral-600 mt-2">
              <strong>{countBecados}</strong> {t.finance?.projection?.paying || 'pagantes'} ×{' '}
              <strong>{formatCurrency(cuotaBecadosUsd)}</strong> {t.finance?.projection?.perMonth || 'por mes'} ={' '}
              <strong>{formatCurrency(ingresoBecadosUsd)}</strong> {t.finance?.projection?.monthlyTotal || 'ingreso mensual'}
            </p>
          </div>
          <div className="p-6">
            <div className="h-[300px]">
              <Bar data={becadosChartData} options={chartOptionsStacked} />
            </div>
          </div>
        </div>

        {/* Sección 3: Sumatoria - ingresos totales − gastos fijos */}
        <div className="bg-white rounded-2xl border border-olive-100 shadow-sm mb-8">
          <div className="px-6 py-5 border-b border-olive-100">
            <h3 className="text-xl font-semibold text-olive-800">
              {t.finance?.projection?.sectionCombinedTitle || 'Sumatoria total'}
            </h3>
            <p className="text-sm text-neutral-500 mt-1">
              {t.finance?.projection?.sectionCombinedDesc || 'Ingresos (alumnos + becados) − gastos fijos. Saldo acumulado mes a mes.'}
            </p>
            <div className="flex flex-wrap items-end gap-4 mt-4 p-4 bg-amber-50/60 rounded-xl border border-amber-100">
              <div>
                <label className="text-xs font-semibold text-olive-700">
                  {t.finance?.projection?.fixedExpensesInputLabel || 'Gastos fijos mensuales'}{' '}
                  <span className="text-neutral-500">({currencyCode})</span>
                </label>
                <input
                  type="number"
                  min={0}
                  step={currencyCode === 'MZN' ? 1000 : 5}
                  value={draftGastos}
                  onChange={(e) => setDraftGastos(e.target.value)}
                  className="ml-2 w-32 px-2 py-1.5 rounded border border-olive-200 text-olive-900"
                />
              </div>
              <button
                type="button"
                onClick={recalcGastos}
                className="px-4 py-2 rounded-lg bg-olive-600 text-white font-semibold hover:bg-olive-700"
              >
                {t.finance?.projection?.recalculate || 'Recalcular'}
              </button>
            </div>
            <p className="text-sm text-neutral-600 mt-2">
              <strong>{formatCurrency(ingresoAlumnosUsd + ingresoBecadosUsd)}</strong> {t.finance?.projection?.monthlyTotal || 'ingreso'} −{' '}
              <strong className="text-red-700">{formatCurrency(gastosFijosUsd)}</strong> {t.finance?.projection?.fixedExpensesLabel || 'gastos'} ={' '}
              <strong>{formatCurrency(Math.max(0, ingresoAlumnosUsd + ingresoBecadosUsd - gastosFijosUsd))}</strong> {t.finance?.projection?.balance || 'saldo'}/mes
            </p>
          </div>
          <div className="p-6">
            <div className="h-[340px] mb-6">
              <Bar data={combinedChartData} options={chartOptionsStacked} />
            </div>
            <h4 className="text-base font-semibold text-olive-800 mb-3">
              {t.finance?.projection?.accumulatedBalanceChartTitle || 'Saldo acumulado mes a mes'}
            </h4>
            <div className="h-[280px]">
              <Bar data={combinedAccumulatedData} options={chartOptionsBar} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
