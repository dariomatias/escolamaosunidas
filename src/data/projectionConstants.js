// Proyección financiera: solo ingresos por cuotas (desde marzo)
export const ALUMNOS_COLEGIO = 49;
export const BECADOS_CHACARRONES = 60;
export const TOTAL_PAGANTES = ALUMNOS_COLEGIO + BECADOS_CHACARRONES;

// Cuota alumnos regulares: metical (Mozambique)
export const CUOTA_ALUMNOS_MZN = 1_800;
// Cuota becados: USD
export const CUOTA_BECADOS_USD = 40;

// Gastos fijos mensuales del colegio (en meticales, Mozambique)
export const GASTOS_FIJOS_MZN = 144_000;

export function getProjectionMonths() {
  const months = [];
  const monthNames = [
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
  ];
  const now = new Date();
  const startMonth = 2; // marzo = índice 2
  const startYear = now.getMonth() >= startMonth ? now.getFullYear() : now.getFullYear() - 1;
  for (let i = 0; i < 12; i++) {
    const m = (startMonth + i) % 12;
    const y = startYear + Math.floor((startMonth + i) / 12);
    months.push({ label: `${monthNames[m]} ${y}`, month: m, year: y });
  }
  return months;
}
