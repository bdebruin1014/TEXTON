/**
 * Municipality Soft Cost Fee Schedules
 *
 * Estimates based on published schedules as of 2025.
 * ALWAYS flag in memo that municipality fees must be verified before closing.
 *
 * Uses midpoint of ranges for default estimates.
 * Call before relying on any figure.
 */

export interface MunicipalityData {
  name: string;
  county: string;
  state: "SC" | "NC";
  total_water: number;
  total_sewer: number;
  building_permit_low: number;
  building_permit_high: number;
  trade_permits_low: number;
  trade_permits_high: number;
  estimated_total_low: number;
  estimated_total_high: number;
  must_verify: boolean;
  notes?: string;
  contacts?: string[];
}

// ---------------------------------------------------------------------------
// South Carolina
// ---------------------------------------------------------------------------

export const SC_MUNICIPALITIES: MunicipalityData[] = [
  {
    name: "Greenville County (Unincorporated)",
    county: "Greenville",
    state: "SC",
    total_water: 4_350,
    total_sewer: 2_750,
    building_permit_low: 2_640,
    building_permit_high: 3_340,
    trade_permits_low: 400,
    trade_permits_high: 470,
    estimated_total_low: 10_280,
    estimated_total_high: 10_980,
    must_verify: false,
    notes: "Water: Greenville Water. Sewer: MetroConnects + ReWa. Building permit +20% as of 7/1/2025.",
    contacts: [
      "Greenville Water: (864) 241-6000",
      "ReWa: (864) 299-4000",
      "GVL County Building Safety: (864) 467-7060",
    ],
  },
  {
    name: "City of Greenville",
    county: "Greenville",
    state: "SC",
    total_water: 4_000,
    total_sewer: 2_750,
    building_permit_low: 2_500,
    building_permit_high: 3_500,
    trade_permits_low: 400,
    trade_permits_high: 500,
    estimated_total_low: 9_900,
    estimated_total_high: 10_750,
    must_verify: false,
    notes: "Water meter fee waived inside City. Otherwise same as county.",
  },
  {
    name: "Travelers Rest",
    county: "Greenville",
    state: "SC",
    total_water: 4_350,
    total_sewer: 4_100,
    building_permit_low: 2_500,
    building_permit_high: 3_000,
    trade_permits_low: 400,
    trade_permits_high: 500,
    estimated_total_low: 11_350,
    estimated_total_high: 11_950,
    must_verify: false,
    notes: "Sewer: City of TR ($1,600) + ReWa ($2,500). GVL County issues permits.",
    contacts: ["Travelers Rest Building: (864) 834-8740"],
  },
  {
    name: "City of Easley",
    county: "Pickens",
    state: "SC",
    total_water: 2_250,
    total_sewer: 3_750,
    building_permit_low: 1_500,
    building_permit_high: 2_500,
    trade_permits_low: 300,
    trade_permits_high: 500,
    estimated_total_low: 5_300,
    estimated_total_high: 8_500,
    must_verify: true,
    notes: "Water and sewer: City of Easley Utilities.",
    contacts: ["City of Easley Utilities: (864) 855-7901"],
  },
  {
    name: "Simpsonville",
    county: "Greenville",
    state: "SC",
    total_water: 4_350,
    total_sewer: 2_750,
    building_permit_low: 2_500,
    building_permit_high: 3_500,
    trade_permits_low: 400,
    trade_permits_high: 500,
    estimated_total_low: 10_000,
    estimated_total_high: 11_100,
    must_verify: false,
    notes: "Water: Greenville Water. Sewer: MetroConnects + ReWa. GVL County issues permits.",
  },
  {
    name: "Mauldin",
    county: "Greenville",
    state: "SC",
    total_water: 4_350,
    total_sewer: 2_750,
    building_permit_low: 2_500,
    building_permit_high: 3_500,
    trade_permits_low: 400,
    trade_permits_high: 500,
    estimated_total_low: 10_000,
    estimated_total_high: 11_100,
    must_verify: false,
  },
  {
    name: "Greer",
    county: "Greenville/Spartanburg",
    state: "SC",
    total_water: 4_250,
    total_sewer: 3_000,
    building_permit_low: 2_000,
    building_permit_high: 3_000,
    trade_permits_low: 300,
    trade_permits_high: 500,
    estimated_total_low: 8_000,
    estimated_total_high: 11_500,
    must_verify: true,
    notes: "Water: Greer CPW. Sewer varies by provider.",
    contacts: ["Greer CPW: (864) 848-5500"],
  },
  {
    name: "Fountain Inn",
    county: "Greenville/Laurens",
    state: "SC",
    total_water: 4_350,
    total_sewer: 2_500,
    building_permit_low: 2_000,
    building_permit_high: 3_000,
    trade_permits_low: 300,
    trade_permits_high: 500,
    estimated_total_low: 8_350,
    estimated_total_high: 10_350,
    must_verify: true,
  },
  {
    name: "Spartanburg County (Unincorporated)",
    county: "Spartanburg",
    state: "SC",
    total_water: 3_000,
    total_sewer: 4_500,
    building_permit_low: 1_500,
    building_permit_high: 3_000,
    trade_permits_low: 300,
    trade_permits_high: 500,
    estimated_total_low: 7_800,
    estimated_total_high: 12_500,
    must_verify: true,
    notes: "Water: Spartanburg Water. Sewer: SSSD. Tap fees vary by distance to main.",
    contacts: ["Spartanburg Water: (864) 582-6375", "Spartanburg County Building Codes: (864) 596-2596"],
  },
  {
    name: "City of Spartanburg",
    county: "Spartanburg",
    state: "SC",
    total_water: 3_000,
    total_sewer: 4_500,
    building_permit_low: 1_500,
    building_permit_high: 3_000,
    trade_permits_low: 300,
    trade_permits_high: 500,
    estimated_total_low: 8_000,
    estimated_total_high: 12_000,
    must_verify: true,
    notes: "Water: Spartanburg Water. Sewer: SSSD + Metro Water Works.",
  },
];

// ---------------------------------------------------------------------------
// North Carolina
// ---------------------------------------------------------------------------

export const NC_MUNICIPALITIES: MunicipalityData[] = [
  {
    name: "Charlotte / Mecklenburg County",
    county: "Mecklenburg",
    state: "NC",
    total_water: 5_819,
    total_sewer: 11_521,
    building_permit_low: 3_000,
    building_permit_high: 5_000,
    trade_permits_low: 500,
    trade_permits_high: 800,
    estimated_total_low: 20_840,
    estimated_total_high: 23_140,
    must_verify: false,
    notes: "Charlotte Water FY26 rates effective 7/1/2025. DM Budget estimates $16,639 combined water/sewer.",
    contacts: ["Charlotte Water: (704) 336-3535"],
  },
  {
    name: "Henderson County / Hendersonville",
    county: "Henderson",
    state: "NC",
    total_water: 2_750,
    total_sewer: 2_250,
    building_permit_low: 1_500,
    building_permit_high: 3_000,
    trade_permits_low: 300,
    trade_permits_high: 500,
    estimated_total_low: 7_800,
    estimated_total_high: 15_500,
    must_verify: true,
    notes: "New SDF ordinance effective 1/1/2025. SDFs may be substantial.",
    contacts: ["Hendersonville Water: (828) 697-3000", "Henderson County Permits: (828) 697-4830"],
  },
];

// ---------------------------------------------------------------------------
// NC County Water/Sewer Quick Reference (from DM Budget)
// ---------------------------------------------------------------------------

export const NC_COUNTY_WATER_SEWER: Record<string, { water: number; sewer: number; combined: number }> = {
  Mecklenburg: { water: 5_630, sewer: 11_009, combined: 16_639 },
  Union: { water: 3_418, sewer: 9_492, combined: 12_910 },
  Iredell: { water: 3_452, sewer: 4_805, combined: 8_257 },
  Lincoln: { water: 4_382, sewer: 4_621, combined: 9_003 },
  Gaston: { water: 4_363, sewer: 3_640, combined: 8_003 },
  York: { water: 2_975, sewer: 3_500, combined: 6_475 },
  Catawba: { water: 1_660, sewer: 5_691, combined: 7_351 },
  Cabarrus: { water: 2_968, sewer: 0, combined: 2_968 },
  Forsyth: { water: 816, sewer: 2_861, combined: 3_677 },
  Rowan: { water: 2_675, sewer: 1_975, combined: 4_650 },
  Lancaster: { water: 2_400, sewer: 3_800, combined: 6_200 },
  Stanly: { water: 1_300, sewer: 1_250, combined: 2_550 },
  Guilford: { water: 1_782, sewer: 1_516, combined: 3_298 },
  Davidson: { water: 2_150, sewer: 0, combined: 2_150 },
  Alexander: { water: 3_995, sewer: 0, combined: 3_995 },
};

// ---------------------------------------------------------------------------
// Combined lookup
// ---------------------------------------------------------------------------

export const ALL_MUNICIPALITIES: MunicipalityData[] = [...SC_MUNICIPALITIES, ...NC_MUNICIPALITIES];

/** Look up a municipality by name (case-insensitive partial match) */
export function findMunicipality(name: string): MunicipalityData | undefined {
  const lower = name.toLowerCase();
  return ALL_MUNICIPALITIES.find((m) => m.name.toLowerCase().includes(lower));
}

/** Get midpoint estimate for a municipality */
export function getMidpointEstimate(m: MunicipalityData): number {
  return Math.round((m.estimated_total_low + m.estimated_total_high) / 2);
}
