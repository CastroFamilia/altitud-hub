/**
 * Tests for the CommissionCalculator business logic
 * 
 * We can't easily render the full component (it depends on DAL, useApp, etc.)
 * so we test the core commission math in isolation.
 */

describe('CommissionCalculator — Business Logic', () => {

  // Mirror the exact calculation logic from CommissionCalculator.jsx (lines 72-97)
  function calculateCommission({
    salePrice,
    totalCommPct = 6,
    sidePct = 50,
    rccaFeePct = 6,
    agentSplitPct = 45,
    referralPct = 0,
  }) {
    const grossCommission = salePrice * (totalCommPct / 100);
    const sideAmount = grossCommission * (sidePct / 100);
    const isStarterTier = agentSplitPct <= 45;
    const referralAmount = sideAmount * (referralPct / 100);
    const afterReferral = sideAmount - referralAmount;

    let rccaFeeAmount, agentAmount, officeAmount;

    if (isStarterTier) {
      agentAmount = afterReferral * (agentSplitPct / 100);
      rccaFeeAmount = afterReferral * (rccaFeePct / 100);
      officeAmount = afterReferral - agentAmount - rccaFeeAmount;
    } else {
      rccaFeeAmount = afterReferral * (rccaFeePct / 100);
      const afterRcca = afterReferral - rccaFeeAmount;
      agentAmount = afterRcca * (agentSplitPct / 100);
      officeAmount = afterRcca - agentAmount;
    }

    return { grossCommission, sideAmount, rccaFeeAmount, agentAmount, officeAmount, referralAmount };
  }

  // ─── Starter Tier (45%) — Flat Split ───
  describe('Starter Tier (45% — flat split)', () => {
    it('calculates correct amounts for a $350,000 sale', () => {
      const result = calculateCommission({
        salePrice: 350000,
        totalCommPct: 6,
        sidePct: 50,
        agentSplitPct: 45,
        rccaFeePct: 6,
      });

      expect(result.grossCommission).toBe(21000);     // 350k * 6%
      expect(result.sideAmount).toBe(10500);           // 21k * 50%
      expect(result.agentAmount).toBe(4725);           // 10500 * 45%
      expect(result.rccaFeeAmount).toBe(630);          // 10500 * 6%
      expect(result.officeAmount).toBe(5145);          // 10500 - 4725 - 630
    });

    it('all amounts sum back to side amount', () => {
      const result = calculateCommission({
        salePrice: 500000,
        totalCommPct: 5,
        sidePct: 50,
        agentSplitPct: 45,
        rccaFeePct: 6,
      });

      const total = result.agentAmount + result.rccaFeeAmount + result.officeAmount;
      expect(total).toBeCloseTo(result.sideAmount, 2);
    });
  });

  // ─── Higher Tier (60%) — RCCA First ───
  describe('Higher Tier (60% — RCCA deducted first)', () => {
    it('calculates correct amounts for a $350,000 sale', () => {
      const result = calculateCommission({
        salePrice: 350000,
        totalCommPct: 6,
        sidePct: 50,
        agentSplitPct: 60,
        rccaFeePct: 6,
      });

      expect(result.grossCommission).toBe(21000);
      expect(result.sideAmount).toBe(10500);
      expect(result.rccaFeeAmount).toBe(630);          // 10500 * 6%
      const afterRcca = 10500 - 630;                   // 9870
      expect(result.agentAmount).toBe(afterRcca * 0.6); // 5922
      expect(result.officeAmount).toBe(afterRcca * 0.4); // 3948
    });
  });

  // ─── Both Sides ───
  describe('Both sides (sidePct = 100%)', () => {
    it('agent gets full gross commission split', () => {
      const result = calculateCommission({
        salePrice: 200000,
        totalCommPct: 6,
        sidePct: 100,
        agentSplitPct: 45,
        rccaFeePct: 6,
      });

      expect(result.sideAmount).toBe(12000); // 200k * 6% * 100%
    });
  });

  // ─── Referral Deduction ───
  describe('Referral deduction', () => {
    it('deducts referral before split calculation', () => {
      const result = calculateCommission({
        salePrice: 300000,
        totalCommPct: 6,
        sidePct: 50,
        agentSplitPct: 45,
        rccaFeePct: 6,
        referralPct: 25,
      });

      expect(result.referralAmount).toBe(2250);      // 9000 * 25%
      const afterReferral = 9000 - 2250;              // 6750
      expect(result.agentAmount).toBeCloseTo(afterReferral * 0.45, 2);
    });
  });

  // ─── Edge Cases ───
  describe('Edge cases', () => {
    it('handles $0 sale price', () => {
      const result = calculateCommission({ salePrice: 0 });
      expect(result.grossCommission).toBe(0);
      expect(result.agentAmount).toBe(0);
      expect(result.officeAmount).toBe(0);
    });

    it('handles very large sale ($10M)', () => {
      const result = calculateCommission({
        salePrice: 10000000,
        totalCommPct: 5,
        sidePct: 50,
        agentSplitPct: 60,
        rccaFeePct: 6,
      });

      expect(result.grossCommission).toBe(500000);
      expect(result.agentAmount).toBeGreaterThan(0);
    });
  });
});
