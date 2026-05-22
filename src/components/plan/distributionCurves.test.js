/**
 * Tests for distributionCurves.js — Progressive 12-month target distribution
 */
import {
  CURVES,
  generateProgressiveTargets,
  getPhaseForMonth,
  getPhaseColor,
} from './distributionCurves';

describe('distributionCurves.js', () => {

  // ─── CURVES data integrity ───
  describe('CURVES constant', () => {
    it('has all expected activity keys', () => {
      const expectedKeys = [
        'captaciones', 'cierres', 'reservas', 'transacciones',
        'llamadas', 'prelistings', 'acm', 'listings',
        'consultas', 'muestras',
      ];
      expectedKeys.forEach(key => {
        expect(CURVES).toHaveProperty(key);
      });
    });

    it('each curve has exactly 12 months of data', () => {
      Object.entries(CURVES).forEach(([key, curve]) => {
        expect(curve).toHaveLength(12);
      });
    });

    it('all curve values are non-negative', () => {
      Object.entries(CURVES).forEach(([key, curve]) => {
        curve.forEach(val => {
          expect(val).toBeGreaterThanOrEqual(0);
        });
      });
    });

    it('cierres starts with zeros (learning phase)', () => {
      expect(CURVES.cierres[0]).toBe(0);
      expect(CURVES.cierres[1]).toBe(0);
      expect(CURVES.cierres[2]).toBe(0);
    });
  });

  // ─── generateProgressiveTargets ───
  describe('generateProgressiveTargets()', () => {
    it('returns an array of 12 monthly target objects', () => {
      const avgMonthly = { captaciones: 5, cierres: 2 };
      const result = generateProgressiveTargets(avgMonthly);
      expect(result).toHaveLength(12);
    });

    it('distributes targets so annual sum approximates 12 × avgMonthly', () => {
      const avgMonthly = { cierres: 2 };
      const result = generateProgressiveTargets(avgMonthly, 0);
      const totalCierres = result.reduce((sum, m) => sum + (m.cierres || 0), 0);
      // Should be roughly 24 (2 × 12), allowing for rounding
      expect(totalCierres).toBeGreaterThanOrEqual(20);
      expect(totalCierres).toBeLessThanOrEqual(28);
    });

    it('assigns zero cierres in first months (ramp-up phase)', () => {
      const avgMonthly = { cierres: 3 };
      const result = generateProgressiveTargets(avgMonthly, 0);
      expect(result[0].cierres).toBe(0);
      expect(result[1].cierres).toBe(0);
    });

    it('uses flat distribution for keys without a defined curve', () => {
      const avgMonthly = { custom_metric: 10 };
      const result = generateProgressiveTargets(avgMonthly, 0);
      result.forEach(m => {
        expect(m.custom_metric).toBe(10);
      });
    });

    it('handles zero avgMonthly gracefully', () => {
      const avgMonthly = { captaciones: 0, cierres: 0 };
      const result = generateProgressiveTargets(avgMonthly, 0);
      result.forEach(m => {
        expect(m.captaciones).toBe(0);
        expect(m.cierres).toBe(0);
      });
    });

    it('caps captaciones once portfolio target is reached', () => {
      const avgMonthly = { captaciones: 10 };
      const result = generateProgressiveTargets(avgMonthly, 5); // very small portfolio
      const totalCap = result.reduce((sum, m) => sum + (m.captaciones || 0), 0);
      // Should be smaller than unrestricted (10 × 12 = 120)
      expect(totalCap).toBeLessThan(120);
    });
  });

  // ─── getPhaseForMonth ───
  describe('getPhaseForMonth()', () => {
    it('returns "learning" for months 0-2', () => {
      expect(getPhaseForMonth(0)).toBe('learning');
      expect(getPhaseForMonth(1)).toBe('learning');
      expect(getPhaseForMonth(2)).toBe('learning');
    });

    it('returns "building" for months 3-5', () => {
      expect(getPhaseForMonth(3)).toBe('building');
      expect(getPhaseForMonth(5)).toBe('building');
    });

    it('returns "producing" for months 6-8', () => {
      expect(getPhaseForMonth(6)).toBe('producing');
      expect(getPhaseForMonth(8)).toBe('producing');
    });

    it('returns "mastery" for months 9-11', () => {
      expect(getPhaseForMonth(9)).toBe('mastery');
      expect(getPhaseForMonth(11)).toBe('mastery');
    });
  });

  // ─── getPhaseColor ───
  describe('getPhaseColor()', () => {
    it('returns color object with bg, text, border, dot keys', () => {
      const color = getPhaseColor('learning');
      expect(color).toHaveProperty('bg');
      expect(color).toHaveProperty('text');
      expect(color).toHaveProperty('border');
      expect(color).toHaveProperty('dot');
    });

    it('returns different colors for each phase', () => {
      const phases = ['learning', 'building', 'producing', 'mastery'];
      const colors = phases.map(p => getPhaseColor(p).dot);
      const unique = new Set(colors);
      expect(unique.size).toBe(4);
    });

    it('falls back to "learning" colors for unknown phase', () => {
      const unknown = getPhaseColor('unknown_phase');
      const learning = getPhaseColor('learning');
      expect(unknown).toEqual(learning);
    });
  });
});
