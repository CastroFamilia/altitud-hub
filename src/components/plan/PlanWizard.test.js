/**
 * Tests for PlanWizard.jsx — formatMoney and convertCurrency helpers
 */
import { formatMoney, convertCurrency } from './PlanWizard';

describe('PlanWizard Helpers', () => {

  // ─── formatMoney ───
  describe('formatMoney()', () => {
    it('formats CRC with ₡ symbol', () => {
      const result = formatMoney(1500000, 'CRC');
      expect(result).toMatch(/^₡/);
      expect(result).toContain('1');
    });

    it('formats USD with $ symbol', () => {
      const result = formatMoney(5000, 'USD');
      expect(result).toMatch(/^\$/);
      expect(result).toContain('5');
    });

    it('returns ₡0 for null/undefined CRC', () => {
      expect(formatMoney(null, 'CRC')).toBe('₡0');
      expect(formatMoney(undefined, 'CRC')).toBe('₡0');
    });

    it('returns $0 for null/undefined USD', () => {
      expect(formatMoney(null, 'USD')).toBe('$0');
      expect(formatMoney(undefined, 'USD')).toBe('$0');
    });

    it('handles zero correctly', () => {
      expect(formatMoney(0, 'CRC')).toMatch(/₡0/);
      expect(formatMoney(0, 'USD')).toMatch(/\$0/);
    });

    it('defaults to CRC if no currency provided', () => {
      const result = formatMoney(1000);
      expect(result).toMatch(/^₡/);
    });
  });

  // ─── convertCurrency ───
  describe('convertCurrency()', () => {
    it('converts CRC to USD (divides by exchange rate)', () => {
      const result = convertCurrency(530000, 'CRC', 530);
      expect(result).toBe(1000);
    });

    it('converts USD to CRC (multiplies by exchange rate)', () => {
      const result = convertCurrency(1000, 'USD', 530);
      expect(result).toBe(530000);
    });

    it('returns 0 when amount is 0', () => {
      expect(convertCurrency(0, 'CRC', 530)).toBe(0);
    });

    it('returns 0 when exchange rate is 0', () => {
      expect(convertCurrency(1000, 'CRC', 0)).toBe(0);
    });

    it('returns 0 when amount is null', () => {
      expect(convertCurrency(null, 'USD', 530)).toBe(0);
    });

    it('rounds to nearest integer', () => {
      const result = convertCurrency(1000, 'CRC', 530);
      expect(Number.isInteger(result)).toBe(true);
    });
  });
});
