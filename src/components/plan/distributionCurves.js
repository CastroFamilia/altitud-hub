/* ═══════════════════════════════════════════════════════
   PROGRESSIVE 12-MONTH DISTRIBUTION CURVES
   
   Captaciones: 2→4→6 ramp (learning), then taper
   Cierres: 0 first 3-4 months, then ramp
   Reservas: 0 first 3 months, then ramp (before cierres)
   Transacciones: follows cierres × ~1.5
   ═══════════════════════════════════════════════════════ */

// Raw distribution weights (will be normalized to match annual total)
const CURVES = {
  captaciones:    [2, 4, 6, 4, 3, 2, 1, 1, 1, 1, 1, 1],  // total weight: 27
  cierres:        [0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2],  // total weight: 12
  reservas:       [0, 0, 0, 1, 1, 2, 2, 2, 2, 3, 3, 3],  // total weight: 19
  transacciones:  [0, 0, 0, 0, 1, 2, 2, 2, 3, 3, 3, 3],  // total weight: 19
  llamadas:       [6, 8, 10, 10, 9, 8, 8, 8, 7, 7, 7, 7],
  prelistings:    [3, 5, 8, 8, 7, 6, 6, 6, 5, 5, 5, 5],
  acm:            [2, 4, 6, 6, 5, 5, 5, 5, 4, 4, 4, 4],
  listings:       [2, 3, 5, 5, 4, 4, 4, 4, 3, 3, 3, 3],
  consultas:      [2, 4, 6, 8, 10, 10, 10, 10, 10, 10, 10, 10],
  muestras:       [1, 2, 4, 5, 6, 7, 7, 7, 7, 7, 7, 7],
};

/**
 * Generate 12-month targets using progressive distribution
 * @param {Object} avgMonthly - flat monthly targets (from funnel calc)
 * @param {number} portfolioTarget - ideal portfolio size (default 25)
 * @returns {Array<Object>} 12 objects with per-month targets
 */
export function generateProgressiveTargets(avgMonthly, portfolioTarget = 25) {
  const result = [];

  for (let m = 0; m < 12; m++) {
    const monthTargets = {};

    Object.keys(avgMonthly).forEach(key => {
      const annualTotal = (avgMonthly[key] || 0) * 12;
      const curve = CURVES[key];

      if (curve) {
        const curveSum = curve.reduce((s, v) => s + v, 0);
        if (curveSum > 0 && annualTotal > 0) {
          monthTargets[key] = Math.max(0, Math.round((curve[m] / curveSum) * annualTotal));
        } else {
          monthTargets[key] = 0;
        }
      } else {
        // No curve defined — use flat distribution
        monthTargets[key] = avgMonthly[key] || 0;
      }
    });

    result.push(monthTargets);
  }

  // Adjust captaciones to hit portfolio target
  if (portfolioTarget > 0) {
    let cumCap = 0;
    const capCurve = CURVES.captaciones;
    const capSum = capCurve.reduce((s, v) => s + v, 0);

    for (let m = 0; m < 12; m++) {
      const remaining = Math.max(0, portfolioTarget - cumCap);
      // Don't exceed what's needed, but keep at least 1 after portfolio reached
      const curveVal = result[m].captaciones;
      if (cumCap >= portfolioTarget) {
        result[m].captaciones = Math.min(curveVal, 1); // maintenance mode
      }
      cumCap += result[m].captaciones;
    }
  }

  return result;
}

/**
 * Get the phase label for a given month (0-indexed)
 */
export function getPhaseForMonth(monthIndex) {
  if (monthIndex < 3) return 'learning';   // M1-M3
  if (monthIndex < 6) return 'building';   // M4-M6
  if (monthIndex < 9) return 'producing';  // M7-M9
  return 'mastery';                         // M10-M12
}

/**
 * Get phase color classes
 */
export function getPhaseColor(phase) {
  const colors = {
    learning:  { bg: 'bg-violet-100 dark:bg-violet-500/10', text: 'text-violet-600 dark:text-violet-400', border: 'border-violet-300 dark:border-violet-700', dot: 'bg-violet-500' },
    building:  { bg: 'bg-blue-100 dark:bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-300 dark:border-blue-700', dot: 'bg-blue-500' },
    producing: { bg: 'bg-teal-100 dark:bg-teal-500/10', text: 'text-teal-600 dark:text-teal-400', border: 'border-teal-300 dark:border-teal-700', dot: 'bg-teal-500' },
    mastery:   { bg: 'bg-emerald-100 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-300 dark:border-emerald-700', dot: 'bg-emerald-500' },
  };
  return colors[phase] || colors.learning;
}

export { CURVES };
