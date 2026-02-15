import { useEffect, useMemo, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import AdminNavbar from './AdminNavbar';
import { getAllStudents } from '../services/students-api';
import { calculateTotalDue } from '../services/payments-api';
import {
  ADMIN_TRANSLATIONS,
  ADMIN_DEFAULT_LOCALE,
  ADMIN_LOCALE_STORAGE_KEY,
} from '../i18n/adminTranslations';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const getInitialAdminLocale = () => {
  if (typeof window === 'undefined') {
    return ADMIN_DEFAULT_LOCALE;
  }
  return localStorage.getItem(ADMIN_LOCALE_STORAGE_KEY) || ADMIN_DEFAULT_LOCALE;
};

const hasSponsor = (student) =>
  Boolean(student?.sponsorId || student?.sponsor?.email || student?.sponsor?.firstName || student?.sponsor?.lastName);

const parseAmount = (value) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export default function FinanceDashboard() {
  const [locale, setLocale] = useState(() => getInitialAdminLocale());
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDetails, setShowDetails] = useState(true);
  const t = ADMIN_TRANSLATIONS[locale] || ADMIN_TRANSLATIONS[ADMIN_DEFAULT_LOCALE];

  useEffect(() => {
    let isMounted = true;

    const fetchStudents = async () => {
      try {
        setLoading(true);
        setError('');
        const data = await getAllStudents();
        if (isMounted) {
          setStudents(data);
        }
      } catch (err) {
        console.error('Error loading finance data:', err);
        if (isMounted) {
          setError(t.finance?.errors?.load || 'Error al cargar datos financieros.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchStudents();

    return () => {
      isMounted = false;
    };
  }, [t.finance?.errors?.load]);

  const activeSponsoredStudents = useMemo(
    () => students.filter((student) => student.status === 'active' && hasSponsor(student)),
    [students]
  );

  const noGradeLabel = t.finance?.labels?.noGrade || 'Sin curso';
  const noNameLabel = t.finance?.labels?.noName || 'Sin nombre';

  const formatStudentName = (student) => {
    const firstName = student?.firstName || '';
    const lastName = student?.lastName || '';
    const full = `${firstName} ${lastName}`.trim();
    return full || student?.fullName || noNameLabel;
  };

  const totals = useMemo(() => {
    const totalDue = activeSponsoredStudents.reduce((sum, student) => {
      const due = parseAmount(student.totalDue) || calculateTotalDue(student);
      return sum + due;
    }, 0);

    const totalPaid = activeSponsoredStudents.reduce((sum, student) => {
      return sum + parseAmount(student.totalPaid);
    }, 0);

    const remaining = Math.max(totalDue - totalPaid, 0);

    const statusCounts = activeSponsoredStudents.reduce(
      (acc, student) => {
        const status = student.paymentStatus || 'pending';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      },
      { paid: 0, current: 0, overdue: 0, pending: 0 }
    );

    return { totalDue, totalPaid, remaining, statusCounts };
  }, [activeSponsoredStudents]);

  const gradeBreakdown = useMemo(() => {
    const totalsByGrade = activeSponsoredStudents.reduce((acc, student) => {
      const grade = student.currentGrade || noGradeLabel;
      const due = parseAmount(student.totalDue) || calculateTotalDue(student);
      const paid = parseAmount(student.totalPaid);
      const remaining = Math.max(due - paid, 0);

      if (!acc[grade]) {
        acc[grade] = { due: 0, paid: 0, remaining: 0, count: 0 };
      }
      acc[grade].due += due;
      acc[grade].paid += paid;
      acc[grade].remaining += remaining;
      acc[grade].count += 1;
      return acc;
    }, {});

    const sortedGrades = Object.keys(totalsByGrade).sort((a, b) => a.localeCompare(b));

    return {
      labels: sortedGrades,
      paid: sortedGrades.map((grade) => totalsByGrade[grade].paid),
      remaining: sortedGrades.map((grade) => totalsByGrade[grade].remaining),
      counts: sortedGrades.map((grade) => totalsByGrade[grade].count),
    };
  }, [activeSponsoredStudents, noGradeLabel]);

  const topBalances = useMemo(() => {
    return [...activeSponsoredStudents]
      .map((student) => {
        const due = parseAmount(student.totalDue) || calculateTotalDue(student);
        const paid = parseAmount(student.totalPaid);
        return {
          id: student.id,
          name: formatStudentName(student),
          grade: student.currentGrade || noGradeLabel,
          paymentStatus: student.paymentStatus || 'pending',
          totalDue: due,
          totalPaid: paid,
          remaining: Math.max(due - paid, 0),
        };
      })
      .sort((a, b) => b.remaining - a.remaining)
      .slice(0, 8);
  }, [activeSponsoredStudents, noGradeLabel]);

  const currencyFormatter = useMemo(() => {
    const resolvedLocale = locale === 'pt' ? 'pt-BR' : locale === 'en' ? 'en-US' : 'es-ES';
    return new Intl.NumberFormat(resolvedLocale, {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    });
  }, [locale]);

  const amountChartData = useMemo(
    () => ({
      labels: [
        t.finance?.charts?.amounts?.paid || 'Recaudado',
        t.finance?.charts?.amounts?.remaining || 'Pendiente',
      ],
      datasets: [
        {
          label: t.finance?.charts?.amounts?.title || 'Totales',
          data: [totals.totalPaid, totals.remaining],
          backgroundColor: ['rgba(34, 197, 94, 0.7)', 'rgba(234, 88, 12, 0.7)'],
          borderColor: ['rgba(34, 197, 94, 1)', 'rgba(234, 88, 12, 1)'],
          borderWidth: 1,
          borderRadius: 8,
          isCurrency: true,
        },
      ],
    }),
    [t.finance?.charts?.amounts, totals.totalPaid, totals.remaining]
  );

  const statusChartData = useMemo(
    () => ({
      labels: [
        t.finance?.charts?.status?.paid || 'Pagado',
        t.finance?.charts?.status?.current || 'Al Día',
        t.finance?.charts?.status?.overdue || 'Atrasado',
        t.finance?.charts?.status?.pending || 'Pendiente',
      ],
      datasets: [
        {
          label: t.finance?.charts?.status?.title || 'Estado de Pago',
          data: [
            totals.statusCounts.paid,
            totals.statusCounts.current,
            totals.statusCounts.overdue,
            totals.statusCounts.pending,
          ],
          backgroundColor: [
            'rgba(34, 197, 94, 0.7)',
            'rgba(59, 130, 246, 0.7)',
            'rgba(239, 68, 68, 0.7)',
            'rgba(245, 158, 11, 0.7)',
          ],
          borderColor: [
            'rgba(34, 197, 94, 1)',
            'rgba(59, 130, 246, 1)',
            'rgba(239, 68, 68, 1)',
            'rgba(245, 158, 11, 1)',
          ],
          borderWidth: 1,
          borderRadius: 8,
        },
      ],
    }),
    [t.finance?.charts?.status, totals.statusCounts]
  );

  const gradePaidChartData = useMemo(
    () => ({
      labels: gradeBreakdown.labels,
      datasets: [
        {
          label: t.finance?.charts?.gradePaid?.title || 'Recaudado por curso',
          data: gradeBreakdown.paid,
          backgroundColor: 'rgba(59, 130, 246, 0.7)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 1,
          borderRadius: 8,
          isCurrency: true,
        },
      ],
    }),
    [gradeBreakdown, t.finance?.charts?.gradePaid?.title]
  );

  const gradeRemainingChartData = useMemo(
    () => ({
      labels: gradeBreakdown.labels,
      datasets: [
        {
          label: t.finance?.charts?.gradeRemaining?.title || 'Pendiente por curso',
          data: gradeBreakdown.remaining,
          backgroundColor: 'rgba(245, 158, 11, 0.7)',
          borderColor: 'rgba(245, 158, 11, 1)',
          borderWidth: 1,
          borderRadius: 8,
          isCurrency: true,
        },
      ],
    }),
    [gradeBreakdown, t.finance?.charts?.gradeRemaining?.title]
  );

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      plugins: {
        legend: { position: 'top' },
        tooltip: { callbacks: {
          label: (context) => {
            const value = context.parsed?.y ?? context.raw;
            if (context.dataset?.isCurrency) {
              return `${context.label}: ${currencyFormatter.format(value || 0)}`;
            }
            return `${context.label}: ${value ?? 0}`;
          },
        } },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (value) => {
              if (value >= 1000) {
                return `${Math.round(value / 1000)}k`;
              }
              return value;
            },
          },
        },
      },
    }),
    [currencyFormatter, t.finance?.charts?.amounts?.title]
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 to-olive-50">
      <AdminNavbar onLocaleChange={setLocale} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-10">
          <h2 className="text-4xl font-bold text-olive-800 mb-3">
            {t.finance?.title || 'Módulo de Finanzas'}
          </h2>
          <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
            {t.finance?.subtitle || 'Resumen de pagos y estado financiero de los estudiantes becados activos.'}
          </p>
        </div>

        {loading && (
          <div className="bg-white rounded-2xl shadow-sm border border-olive-100 p-10 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-olive-600 mx-auto mb-4"></div>
            <p className="text-neutral-600">{t.common?.loading || 'Cargando...'}</p>
          </div>
        )}

        {!loading && error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-6 text-center">
            {error}
          </div>
        )}

        {!loading && !error && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
              <div className="bg-white rounded-2xl border border-olive-100 p-6 shadow-sm">
                <p className="text-sm text-neutral-500 mb-1">{t.finance?.cards?.students || 'Becados activos'}</p>
                <p className="text-3xl font-bold text-olive-700">{activeSponsoredStudents.length}</p>
              </div>
              <div className="bg-white rounded-2xl border border-olive-100 p-6 shadow-sm">
                <p className="text-sm text-neutral-500 mb-1">{t.finance?.cards?.totalPaid || 'Recaudado'}</p>
                <p className="text-3xl font-bold text-green-600">{currencyFormatter.format(totals.totalPaid)}</p>
              </div>
              <div className="bg-white rounded-2xl border border-olive-100 p-6 shadow-sm">
                <p className="text-sm text-neutral-500 mb-1">{t.finance?.cards?.remaining || 'Pendiente'}</p>
                <p className="text-3xl font-bold text-orange-500">{currencyFormatter.format(totals.remaining)}</p>
              </div>
              <div className="bg-white rounded-2xl border border-olive-100 p-6 shadow-sm">
                <p className="text-sm text-neutral-500 mb-1">{t.finance?.cards?.totalDue || 'Total a cobrar'}</p>
                <p className="text-3xl font-bold text-olive-700">{currencyFormatter.format(totals.totalDue)}</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-olive-100 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5 border-b border-olive-100">
                <div>
                  <h3 className="text-xl font-semibold text-olive-800">
                    {t.finance?.details?.title || 'Detalle Financiero'}
                  </h3>
                  <p className="text-sm text-neutral-500 mt-1">
                    {t.finance?.details?.subtitle || 'Explora gráficos adicionales y el detalle por estudiante.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDetails((prev) => !prev)}
                  className="px-4 py-2 rounded-lg border border-olive-200 text-olive-700 hover:bg-olive-50 transition-colors font-semibold"
                >
                  {showDetails
                    ? t.finance?.details?.collapse || 'Ocultar detalle'
                    : t.finance?.details?.expand || 'Ver detalle'}
                </button>
              </div>

              {showDetails && (
                <div className="p-6 space-y-8">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-olive-50/40 rounded-2xl border border-olive-100 p-6">
                      <h4 className="text-lg font-semibold text-olive-800 mb-4">
                        {t.finance?.charts?.amounts?.title || 'Totales'}
                      </h4>
                      <Bar data={amountChartData} options={chartOptions} />
                    </div>
                    <div className="bg-olive-50/40 rounded-2xl border border-olive-100 p-6">
                      <h4 className="text-lg font-semibold text-olive-800 mb-4">
                        {t.finance?.charts?.status?.title || 'Estado de Pago'}
                      </h4>
                      <Bar data={statusChartData} options={chartOptions} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-white rounded-2xl border border-olive-100 p-6 shadow-sm">
                      <h4 className="text-lg font-semibold text-olive-800 mb-4">
                        {t.finance?.charts?.gradePaid?.title || 'Recaudado por curso'}
                      </h4>
                      {gradeBreakdown.labels.length > 0 ? (
                        <Bar data={gradePaidChartData} options={chartOptions} />
                      ) : (
                        <p className="text-sm text-neutral-500">{t.finance?.details?.noData || 'Sin datos disponibles.'}</p>
                      )}
                    </div>
                    <div className="bg-white rounded-2xl border border-olive-100 p-6 shadow-sm">
                      <h4 className="text-lg font-semibold text-olive-800 mb-4">
                        {t.finance?.charts?.gradeRemaining?.title || 'Pendiente por curso'}
                      </h4>
                      {gradeBreakdown.labels.length > 0 ? (
                        <Bar data={gradeRemainingChartData} options={chartOptions} />
                      ) : (
                        <p className="text-sm text-neutral-500">{t.finance?.details?.noData || 'Sin datos disponibles.'}</p>
                      )}
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-olive-100 p-6 shadow-sm">
                    <h4 className="text-lg font-semibold text-olive-800 mb-4">
                      {t.finance?.tables?.topBalances || 'Mayores saldos pendientes'}
                    </h4>
                    {topBalances.length === 0 ? (
                      <p className="text-sm text-neutral-500">{t.finance?.details?.noData || 'Sin datos disponibles.'}</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead className="bg-olive-50 text-olive-700">
                            <tr>
                              <th className="px-3 py-2 text-left font-semibold">{t.finance?.tables?.student || 'Estudiante'}</th>
                              <th className="px-3 py-2 text-left font-semibold">{t.finance?.tables?.grade || 'Curso'}</th>
                              <th className="px-3 py-2 text-left font-semibold">{t.finance?.tables?.status || 'Estado'}</th>
                              <th className="px-3 py-2 text-right font-semibold">{t.finance?.tables?.due || 'Total'}</th>
                              <th className="px-3 py-2 text-right font-semibold">{t.finance?.tables?.paid || 'Pagado'}</th>
                              <th className="px-3 py-2 text-right font-semibold">{t.finance?.tables?.remaining || 'Pendiente'}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {topBalances.map((item) => (
                              <tr key={item.id} className="border-b border-olive-100">
                                <td className="px-3 py-2 text-neutral-800">{item.name}</td>
                                <td className="px-3 py-2 text-neutral-600">{item.grade}</td>
                                <td className="px-3 py-2 text-neutral-600">{item.paymentStatus}</td>
                                <td className="px-3 py-2 text-right text-neutral-700">{currencyFormatter.format(item.totalDue)}</td>
                                <td className="px-3 py-2 text-right text-green-700">{currencyFormatter.format(item.totalPaid)}</td>
                                <td className="px-3 py-2 text-right text-orange-600 font-semibold">
                                  {currencyFormatter.format(item.remaining)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  <div className="bg-olive-50/60 border border-olive-100 rounded-2xl p-5 text-sm text-neutral-600">
                    {t.finance?.note || 'Los totales se calculan usando los pagos registrados en cada estudiante.'}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
