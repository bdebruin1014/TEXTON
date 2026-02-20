/**
 * SL Deal Analyzer — Formatting Utilities
 */

import type { NPMRating, LandCostRating } from '../types/sl-deal.types';

// ---------------------------------------------------------------------------
// Currency
// ---------------------------------------------------------------------------

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatCurrencyDetailed(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

// ---------------------------------------------------------------------------
// Percentages
// ---------------------------------------------------------------------------

export function formatPercent(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

export function formatPercentInput(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

// ---------------------------------------------------------------------------
// Rating colors (Tailwind classes)
// ---------------------------------------------------------------------------

export const NPM_COLORS: Record<NPMRating, { bg: string; text: string; label: string }> = {
  STRONG:   { bg: 'bg-emerald-100', text: 'text-emerald-800', label: 'Strong (>10%)' },
  GOOD:     { bg: 'bg-green-100',   text: 'text-green-800',   label: 'Good (7–10%)' },
  MARGINAL: { bg: 'bg-amber-100',   text: 'text-amber-800',   label: 'Marginal (5–7%)' },
  NO_GO:    { bg: 'bg-red-100',     text: 'text-red-800',     label: 'No Go (<5%)' },
};

export const LAND_COST_COLORS: Record<LandCostRating, { bg: string; text: string; label: string }> = {
  STRONG:     { bg: 'bg-emerald-100', text: 'text-emerald-800', label: 'Strong (<20%)' },
  ACCEPTABLE: { bg: 'bg-green-100',   text: 'text-green-800',   label: 'Acceptable (20–25%)' },
  CAUTION:    { bg: 'bg-amber-100',   text: 'text-amber-800',   label: 'Caution (25–30%)' },
  OVERPAYING: { bg: 'bg-red-100',     text: 'text-red-800',     label: 'Overpaying (>30%)' },
};

// ---------------------------------------------------------------------------
// Cost vintage disclaimer
// ---------------------------------------------------------------------------

export const COST_VINTAGE_DISCLAIMER =
  'Construction costs based on DM Budget September 2025 vendor pricing. ' +
  'Municipality soft costs are estimates and MUST be verified before closing.';
