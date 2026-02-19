import { describe, expect, it } from "vitest";

/**
 * JE balance validation logic extracted from journal-entries.tsx.
 * A journal entry is considered balanced when total debits ≈ total credits
 * within a $0.01 tolerance (floating point safety).
 */
function isBalanced(debits: number, credits: number): boolean {
  return Math.abs(debits - credits) < 0.01;
}

function computeLineTotals(lines: Array<{ debit: number | null; credit: number | null }>) {
  const totalDebits = lines.reduce((sum, line) => sum + (line.debit ?? 0), 0);
  const totalCredits = lines.reduce((sum, line) => sum + (line.credit ?? 0), 0);
  return { totalDebits, totalCredits, isBalanced: isBalanced(totalDebits, totalCredits) };
}

describe("JE Balance Validation", () => {
  describe("isBalanced", () => {
    it("considers equal debits and credits as balanced", () => {
      expect(isBalanced(1000, 1000)).toBe(true);
    });

    it("considers tiny difference (<0.01) as balanced", () => {
      expect(isBalanced(1000.005, 1000.001)).toBe(true);
      expect(isBalanced(100.009, 100.001)).toBe(true);
    });

    it("considers difference >= 0.01 as unbalanced", () => {
      expect(isBalanced(1000, 999)).toBe(false);
      expect(isBalanced(100, 100.01)).toBe(false);
      expect(isBalanced(100.02, 100)).toBe(false);
    });

    it("handles zero values", () => {
      expect(isBalanced(0, 0)).toBe(true);
    });

    it("handles large numbers", () => {
      expect(isBalanced(999999.99, 999999.99)).toBe(true);
      expect(isBalanced(1000000, 999999)).toBe(false);
    });
  });

  describe("computeLineTotals", () => {
    it("computes balanced multi-line entry", () => {
      const lines = [
        { debit: 500, credit: null },
        { debit: 300, credit: null },
        { debit: null, credit: 500 },
        { debit: null, credit: 300 },
      ];
      const result = computeLineTotals(lines);
      expect(result.totalDebits).toBe(800);
      expect(result.totalCredits).toBe(800);
      expect(result.isBalanced).toBe(true);
    });

    it("detects unbalanced entry", () => {
      const lines = [
        { debit: 1000, credit: null },
        { debit: null, credit: 500 },
      ];
      const result = computeLineTotals(lines);
      expect(result.totalDebits).toBe(1000);
      expect(result.totalCredits).toBe(500);
      expect(result.isBalanced).toBe(false);
    });

    it("handles all-null lines", () => {
      const lines = [
        { debit: null, credit: null },
        { debit: null, credit: null },
      ];
      const result = computeLineTotals(lines);
      expect(result.totalDebits).toBe(0);
      expect(result.totalCredits).toBe(0);
      expect(result.isBalanced).toBe(true);
    });

    it("handles empty array", () => {
      const result = computeLineTotals([]);
      expect(result.totalDebits).toBe(0);
      expect(result.totalCredits).toBe(0);
      expect(result.isBalanced).toBe(true);
    });

    it("handles floating point precision with thirds", () => {
      const lines = [
        { debit: 33.33, credit: null },
        { debit: 33.33, credit: null },
        { debit: 33.34, credit: null },
        { debit: null, credit: 100 },
      ];
      const result = computeLineTotals(lines);
      expect(result.totalDebits).toBeCloseTo(100, 2);
      expect(result.totalCredits).toBe(100);
      expect(result.isBalanced).toBe(true);
    });

    it("handles single-line debit-only entry (unbalanced)", () => {
      const lines = [{ debit: 500, credit: null }];
      const result = computeLineTotals(lines);
      expect(result.totalDebits).toBe(500);
      expect(result.totalCredits).toBe(0);
      expect(result.isBalanced).toBe(false);
    });

    it("handles complex multi-account entry", () => {
      // Typical JE: pay vendor from bank
      const lines = [
        { debit: 2500, credit: null }, // Expense account
        { debit: 375, credit: null }, // Sales tax
        { debit: null, credit: 2875 }, // Bank account (AP)
      ];
      const result = computeLineTotals(lines);
      expect(result.totalDebits).toBe(2875);
      expect(result.totalCredits).toBe(2875);
      expect(result.isBalanced).toBe(true);
    });
  });
});
