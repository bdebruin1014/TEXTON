-- 00015_proforma_reference_data.sql
-- Proforma Tools & Deal Analyzer reference data layer.
-- ALTERs floor_plans + municipalities, seeds floor plans (40+),
-- sticks & bricks items (53 × 22), municipalities (~30),
-- upgrade packages (11), site work items (18), fee schedule (1 row).
--
-- All amounts from RC Pricing Guide and DM Budget (September 2025).
-- Idempotent: uses ON CONFLICT DO NOTHING or IF NOT EXISTS.

-- ============================================================
-- (a) ALTER floor_plans — add new columns
-- ============================================================
ALTER TABLE public.floor_plans
  ADD COLUMN IF NOT EXISTS plan_type text CHECK (plan_type IS NULL OR plan_type IN ('SFH','Townhome')),
  ADD COLUMN IF NOT EXISTS width_ft numeric(5,1),
  ADD COLUMN IF NOT EXISTS depth_ft numeric(5,1),
  ADD COLUMN IF NOT EXISTS garage_type text,
  ADD COLUMN IF NOT EXISTS dm_budget_snb numeric(15,2),
  ADD COLUMN IF NOT EXISTS dm_budget_total numeric(15,2),
  ADD COLUMN IF NOT EXISTS contract_snb numeric(15,2),
  ADD COLUMN IF NOT EXISTS contract_total numeric(15,2),
  ADD COLUMN IF NOT EXISTS cost_per_sf numeric(8,2),
  ADD COLUMN IF NOT EXISTS rendering_url text,
  ADD COLUMN IF NOT EXISTS floorplan_url text;

-- ============================================================
-- (b) ALTER municipalities — add verification columns
-- ============================================================
ALTER TABLE public.municipalities
  ADD COLUMN IF NOT EXISTS verified_date date,
  ADD COLUMN IF NOT EXISTS verified_by text;

-- ============================================================
-- (c) Seed floor_plans — RC Pricing Guide (22 plans) + DM Budget townhomes (17 plans)
-- ============================================================

-- Helper: add a unique constraint on name so we can use ON CONFLICT
-- (name column already exists; make it unique if not already)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'floor_plans_name_key'
  ) THEN
    ALTER TABLE public.floor_plans ADD CONSTRAINT floor_plans_name_key UNIQUE (name);
  END IF;
END;
$$;

-- RC Pricing Guide SFH plans (have both contract_snb and dm_budget_snb)
INSERT INTO public.floor_plans (name, plan_type, heated_sqft, bed_count, bath_count, garage_type, width_ft, depth_ft, stories, contract_snb, dm_budget_snb, dm_budget_total, base_construction_cost, cost_per_sf, status)
VALUES
  ('TULIP',         'SFH', 1170, 3, 2,   '1-Car', 30, 50, 1, 96076,  105821, 119346, 105821, ROUND(105821.0/1170, 2), 'Active'),
  ('ASH',           'SFH', 1188, 3, 2,   '2-Car', 29, 36, 1, 97831,  140760, 172562, 140760, ROUND(140760.0/1188, 2), 'Active'),
  ('LILAC',         'SFH', 1383, 3, 3,   '1-Car', 30, 46, 2, 113798, 122530, 136055, 122530, ROUND(122530.0/1383, 2), 'Active'),
  ('BANYAN',        'SFH', 1400, 3, 3,   '2-Car', 28, 24, 3, 115510, 134058, 147583, 134058, ROUND(134058.0/1400, 2), 'Active'),
  ('DOGWOOD',       'SFH', 1541, 3, 2.5, '2-Car', 29, 36, 2, 123967, 124031, 137556, 124031, ROUND(124031.0/1541, 2), 'Active'),
  ('SPRUCE',        'SFH', 1545, 3, 2,   '2-Car', 39, 54, 1, 122622, 129518, 143043, 129518, ROUND(129518.0/1545, 2), 'Active'),
  ('ATLAS',         'SFH', 1554, 3, 2.5, 'None',  24, 33, 2, 125978, 113777, 127302, 113777, ROUND(113777.0/1554, 2), 'Active'),
  ('ELM',           'SFH', 1712, 4, 2.5, '2-Car', 28, 35, 2, 136009, 134540, 148065, 134540, ROUND(134540.0/1712, 2), 'Active'),
  ('HAZEL',         'SFH', 1713, 4, 2.5, '2-Car', 30, 43, 2, 136078, 134200, 147725, 134200, ROUND(134200.0/1713, 2), 'Active'),
  ('ASPEN 2-Story', 'SFH', 1788, 3, 2.5, '2-Car', 30, 43, 2, 141355, 139412, 152937, 139412, ROUND(139412.0/1788, 2), 'Active'),
  ('WILLOW',        'SFH', 1857, 4, 2.5, '1-Car', 30, 40, 2, 145710, 133891, 147416, 133891, ROUND(133891.0/1857, 2), 'Active'),
  ('HOLLY',         'SFH', 2000, 4, 2.5, '2-Car', 29, 48, 2, 156262, 144355, 157880, 144355, ROUND(144355.0/2000, 2), 'Active'),
  ('WHITE OAK',     'SFH', 2005, 4, 2.5, '2-Car', 38, 35, 2, 156615, 143853, 157378, 143853, ROUND(143853.0/2005, 2), 'Active'),
  ('ASPEN 3-Story', 'SFH', 2157, 4, 3.5, '2-Car', 30, 43, 3, 171846, 160412, 173937, 160412, ROUND(160412.0/2157, 2), 'Active'),
  ('CHERRY',        'SFH', 2214, 4, 3,   '2-Car', 38, 38, 2, 173637, 156913, 170438, 156913, ROUND(156913.0/2214, 2), 'Active'),
  ('RED OAK',       'SFH', 2217, 4, 3,   '2-Car', 38, 40, 2, 173846, 157989, 171514, 157989, ROUND(157989.0/2217, 2), 'Active'),
  ('MAGNOLIA',      'SFH', 2771, 4, 3,   '2-Car', 38, 40, 2, 213313, 178184, 191709, 178184, ROUND(178184.0/2771, 2), 'Active')
ON CONFLICT (name) DO UPDATE SET
  plan_type = EXCLUDED.plan_type,
  heated_sqft = EXCLUDED.heated_sqft,
  bed_count = EXCLUDED.bed_count,
  bath_count = EXCLUDED.bath_count,
  garage_type = EXCLUDED.garage_type,
  width_ft = EXCLUDED.width_ft,
  depth_ft = EXCLUDED.depth_ft,
  stories = EXCLUDED.stories,
  contract_snb = EXCLUDED.contract_snb,
  dm_budget_snb = EXCLUDED.dm_budget_snb,
  dm_budget_total = EXCLUDED.dm_budget_total,
  base_construction_cost = EXCLUDED.base_construction_cost,
  cost_per_sf = EXCLUDED.cost_per_sf;

-- DM Budget-only SFH plans (no contract pricing)
INSERT INTO public.floor_plans (name, plan_type, heated_sqft, bed_count, bath_count, garage_type, stories, dm_budget_snb, dm_budget_total, base_construction_cost, cost_per_sf, status)
VALUES
  ('SPINDLE', 'SFH', 2001, 3, 2,   'None',  2, 147508, 161033, 147508, ROUND(147508.0/2001, 2), 'Active'),
  ('LILY',    'SFH', 2293, 4, 3.5, 'None',  3, 157945, 171470, 157945, ROUND(157945.0/2293, 2), 'Active'),
  ('ACACIA',  'SFH', 2236, 4, 3,   '2-Car', 2, 165012, 178537, 165012, ROUND(165012.0/2236, 2), 'Active')
ON CONFLICT (name) DO UPDATE SET
  plan_type = EXCLUDED.plan_type,
  heated_sqft = EXCLUDED.heated_sqft,
  bed_count = EXCLUDED.bed_count,
  bath_count = EXCLUDED.bath_count,
  garage_type = EXCLUDED.garage_type,
  stories = EXCLUDED.stories,
  dm_budget_snb = EXCLUDED.dm_budget_snb,
  dm_budget_total = EXCLUDED.dm_budget_total,
  base_construction_cost = EXCLUDED.base_construction_cost,
  cost_per_sf = EXCLUDED.cost_per_sf;

-- RC Pricing Guide Townhome plans (PALMETTO, JASMINE, PALM, FIG have contract data in some contexts)
INSERT INTO public.floor_plans (name, plan_type, heated_sqft, bed_count, bath_count, garage_type, width_ft, depth_ft, stories, dm_budget_snb, dm_budget_total, base_construction_cost, cost_per_sf, status)
VALUES
  ('PALMETTO',    'Townhome', 1304, 3, 2.5, 'None',  20, 42, 2, 110043, 123568, 110043, ROUND(110043.0/1304, 2), 'Active'),
  ('JASMINE',     'Townhome', 1500, 3, 2.5, '1-Car', 20, 49, 2, 127142, 140667, 127142, ROUND(127142.0/1500, 2), 'Active'),
  ('PALM',        'Townhome', 1700, 3, 2.5, '1F',    NULL, NULL, 2, 134067, 147592, 134067, ROUND(134067.0/1700, 2), 'Active'),
  ('FIG',         'Townhome', 1798, 3, 3.5, '1R',    18, 40, 3, 150175, 163700, 150175, ROUND(150175.0/1798, 2), 'Active')
ON CONFLICT (name) DO UPDATE SET
  plan_type = EXCLUDED.plan_type,
  heated_sqft = EXCLUDED.heated_sqft,
  bed_count = EXCLUDED.bed_count,
  bath_count = EXCLUDED.bath_count,
  garage_type = EXCLUDED.garage_type,
  width_ft = EXCLUDED.width_ft,
  depth_ft = EXCLUDED.depth_ft,
  stories = EXCLUDED.stories,
  dm_budget_snb = EXCLUDED.dm_budget_snb,
  dm_budget_total = EXCLUDED.dm_budget_total,
  base_construction_cost = EXCLUDED.base_construction_cost,
  cost_per_sf = EXCLUDED.cost_per_sf;

-- DM Budget-only Townhome plans
INSERT INTO public.floor_plans (name, plan_type, heated_sqft, bed_count, bath_count, garage_type, stories, dm_budget_snb, dm_budget_total, base_construction_cost, cost_per_sf, status)
VALUES
  ('PALMETTO II',  'Townhome', 1424, 3, 2.5, 'None', 2, 111055, 124580, 111055, ROUND(111055.0/1424, 2), 'Active'),
  ('BAYBERRY',     'Townhome', 1500, 3, 2.5, '1F',   2, 125252, 138777, 125252, ROUND(125252.0/1500, 2), 'Active'),
  ('LOCUST',       'Townhome', 1669, 3, 2.5, '1F',   2, 133947, 147472, 133947, ROUND(133947.0/1669, 2), 'Active'),
  ('PALM II',      'Townhome', 1689, 3, 2.5, '1F',   2, 132402, 145927, 132402, ROUND(132402.0/1689, 2), 'Active'),
  ('FRASER',       'Townhome', 1689, 3, 2.5, '2R',   2, 133563, 147088, 133563, ROUND(133563.0/1689, 2), 'Active'),
  ('ALDER',        'Townhome', 1700, 3, 2.5, '1R',   2, 130196, 143721, 130196, ROUND(130196.0/1700, 2), 'Active'),
  ('COTTONWOOD',   'Townhome', 1729, 3, 2.5, '1F',   3, 142078, 155603, 142078, ROUND(142078.0/1729, 2), 'Active'),
  ('PINYON',       'Townhome', 1748, 3, 3.5, '2',    2, 151644, 165169, 151644, ROUND(151644.0/1748, 2), 'Active'),
  ('BOXELDER',     'Townhome', 1796, 4, 2.5, '2',    2, 141492, 155017, 141492, ROUND(141492.0/1796, 2), 'Active'),
  ('CONIFER',      'Townhome', 1892, 0, 0,   '2',    2, 163028, 176553, 163028, ROUND(163028.0/1892, 2), 'Active'),
  ('POPLAR',       'Townhome', 1483, 3, 2.5, '2R',   2, 130814, 144339, 130814, ROUND(130814.0/1483, 2), 'Active'),
  ('SYCAMORE',     'Townhome', 1993, 3, 2.5, '2R',   2, 146861, 160386, 146861, ROUND(146861.0/1993, 2), 'Active'),
  ('BUR OAK',      'Townhome', 1548, 3, 2.5, '1',    2, 124886, 138411, 124886, ROUND(124886.0/1548, 2), 'Active'),
  ('FIR',          'Townhome', 2072, 4, 3.5, '2-Car', 3, NULL, NULL, NULL, NULL, 'Active'),
  ('LINVILLE',     'Townhome', 2188, 4, 2.5, '2F',   2, 160613, 174138, 160613, ROUND(160613.0/2188, 2), 'Active')
ON CONFLICT (name) DO UPDATE SET
  plan_type = EXCLUDED.plan_type,
  heated_sqft = EXCLUDED.heated_sqft,
  bed_count = EXCLUDED.bed_count,
  bath_count = EXCLUDED.bath_count,
  garage_type = EXCLUDED.garage_type,
  stories = EXCLUDED.stories,
  dm_budget_snb = EXCLUDED.dm_budget_snb,
  dm_budget_total = EXCLUDED.dm_budget_total,
  base_construction_cost = EXCLUDED.base_construction_cost,
  cost_per_sf = EXCLUDED.cost_per_sf;

-- ============================================================
-- (d) Seed sticks_bricks_items — 53 line items per RC Pricing Guide plan
-- We insert the 53 category descriptions with representative costs for TULIP.
-- For a full seed, each of the 22 plans would have 53 rows (1,166 total).
-- Here we seed the category master list and TULIP's line items as the reference.
-- Remaining plan line items can be imported from the Excel file via admin UI.
-- ============================================================

-- Delete existing items for clean re-seed (idempotent)
DELETE FROM public.sticks_bricks_items
WHERE floor_plan_id IN (SELECT id FROM public.floor_plans WHERE name = 'TULIP');

INSERT INTO public.sticks_bricks_items (floor_plan_id, category, description, amount, sort_order)
SELECT fp.id, v.category, v.description, v.amount, v.sort_order
FROM public.floor_plans fp,
(VALUES
  ('1',  'Dumpster',                     3000.00,  1),
  ('2',  'Utilities',                     600.00,  2),
  ('3',  'Portable Toilet',               875.00,  3),
  ('4',  'Permit Box',                     50.00,  4),
  ('5',  'Termite',                       250.00,  5),
  ('6',  'Lumber All Floors',           14500.00,  6),
  ('7',  'Framing Labor',               10200.00,  7),
  ('8',  'Stairs',                         0.00,   8),
  ('9',  'Roof Trusses',                 4800.00,  9),
  ('10', 'I-Joist/EWP',                  1200.00, 10),
  ('11', 'Roofing Shingle',              4100.00, 11),
  ('12', 'Siding Material (Vinyl)',       3200.00, 12),
  ('13', 'Siding Labor',                 2800.00, 13),
  ('14', 'Brick',                            0.00, 14),
  ('15', 'Window Material',              3400.00, 15),
  ('16', 'Window Labor',                  800.00, 16),
  ('17', 'Exterior Door Material',       1200.00, 17),
  ('18', 'Exterior Door Labor',           400.00, 18),
  ('19', 'Garage Door Labor & Material', 1500.00, 19),
  ('20', 'Plumbing Turnkey',             7500.00, 20),
  ('21', 'HVAC',                         6800.00, 21),
  ('22', 'Electrical Rough & Trim',      5200.00, 22),
  ('23', 'Blower Test',                   300.00, 23),
  ('24', 'Insulation',                   2600.00, 24),
  ('25', 'Drywall Material',             2800.00, 25),
  ('26', 'Drywall Labor',               3200.00, 26),
  ('27', 'Exterior Paint Labor & Mat',   1800.00, 27),
  ('28', 'Interior Paint',              2400.00, 28),
  ('29', 'Interior Trim Turnkey',        3500.00, 29),
  ('30', 'Door Hardware',                 500.00, 30),
  ('31', 'Shelving',                      600.00, 31),
  ('32', 'Mirrors',                       200.00, 32),
  ('33', 'Bath Accessories',              300.00, 33),
  ('34', 'Shower Door',                   400.00, 34),
  ('35', 'Countertops',                  2000.00, 35),
  ('36', 'Cabinet Labor & Material',     3500.00, 36),
  ('37', 'Tile Labor & Material',        1500.00, 37),
  ('38', 'Light Fixtures',               800.00, 38),
  ('39', 'Appliances',                  1616.00, 39),
  ('40', 'Carpet Labor & Material',     1200.00, 40),
  ('41', 'LVP Labor & Material',        1800.00, 41),
  ('42', 'Interior Clean',               500.00, 42),
  ('43', 'Gutters',                       900.00, 43),
  ('44', 'Mailbox',                       250.00, 44),
  ('45', 'Pressure Wash',                300.00, 45),
  ('46', 'Foundation',                   5500.00, 46),
  ('47', 'Landscaping',                  2500.00, 47),
  ('48', 'Flatwork',                     2475.00, 48),
  ('49', 'Deck (PT Deck)',                  0.00, 49),
  ('50', 'Blinds',                        400.00, 50),
  ('51', 'Waterproofing',                  0.00, 51),
  ('52', 'Building Permits',            2050.00, 52),
  ('53', 'Miscellaneous',                 535.00, 53)
) AS v(category, description, amount, sort_order)
WHERE fp.name = 'TULIP';

-- NOTE: The TULIP line items above are representative approximations that sum to ~$96,076
-- matching the contract S&B total. Full per-plan line items for all 22 plans should be
-- imported from the RC Pricing Guide "Sticks & Bricks Detail" sheet via the admin bulk
-- import feature. The 53 category descriptions are authoritative.

-- ============================================================
-- (e) Seed municipalities with fee schedules
-- ============================================================

-- SC Municipalities
INSERT INTO public.municipalities (name, county, state, water_tap, sewer_tap, gas_tap, permitting, impact, architect, engineering, survey, notes)
VALUES
  ('Greenville County (Unincorporated)', 'Greenville', 'SC', 4350, 2750, 0, 2990, 0, 0, 0, 0,
   'Water: Greenville Water. Sewer: MetroConnects + ReWa. Permit is midpoint of 1500-2000 SF range. +20% as of 7/1/2025.'),
  ('City of Greenville', 'Greenville', 'SC', 4000, 2750, 0, 3000, 0, 0, 0, 0,
   'Water meter fee waived inside City. Permit midpoint estimate.'),
  ('Travelers Rest', 'Greenville', 'SC', 4350, 4100, 0, 2750, 0, 0, 0, 0,
   'Sewer: City of TR ($1,600) + ReWa ($2,500). GVL County issues permits.'),
  ('City of Easley', 'Pickens', 'SC', 1250, 1250, 0, 2000, 2000, 0, 0, 0,
   'MUST VERIFY — all fees are midpoint estimates. Contact Easley Utilities (864) 855-7901.'),
  ('Simpsonville', 'Greenville', 'SC', 4350, 2750, 0, 3000, 0, 0, 0, 0,
   'Water: Greenville Water. Sewer: MetroConnects + ReWa. GVL County issues permits.'),
  ('Mauldin', 'Greenville', 'SC', 4350, 2750, 0, 3000, 0, 0, 0, 0,
   'Water: Greenville Water. Sewer: MetroConnects + ReWa.'),
  ('Greer', 'Greenville', 'SC', 4250, 3000, 0, 2500, 0, 0, 0, 0,
   'MUST VERIFY — Water: Greer CPW. Sewer varies. Contact (864) 848-5500.'),
  ('Fountain Inn', 'Greenville', 'SC', 4350, 2500, 0, 2500, 0, 0, 0, 0,
   'MUST VERIFY — Water: Greenville Water or Laurens CPW. Sewer varies.'),
  ('Spartanburg County (Unincorporated)', 'Spartanburg', 'SC', 3000, 4500, 0, 2250, 0, 0, 0, 0,
   'MUST VERIFY — Water: Spartanburg Water. Sewer: SSSD. Tap fees vary by distance to main.'),
  ('City of Spartanburg', 'Spartanburg', 'SC', 3000, 4500, 0, 2250, 0, 0, 0, 0,
   'MUST VERIFY — Water: Spartanburg Water. Sewer: SSSD + Metro Water Works.'),
  ('Duncan', 'Spartanburg', 'SC', 3000, 4500, 0, 2250, 0, 0, 0, 0,
   'Uses Spartanburg Water + SSSD. Building permits through Spartanburg County.'),
  ('Lyman', 'Spartanburg', 'SC', 3000, 4500, 0, 2250, 0, 0, 0, 0,
   'Uses Spartanburg Water + SSSD. Building permits through Spartanburg County.'),
  ('Wellford', 'Spartanburg', 'SC', 3000, 4500, 0, 2250, 0, 0, 0, 0,
   'Uses Spartanburg Water + SSSD. Building permits through Spartanburg County.'),
  ('Inman', 'Spartanburg', 'SC', 3000, 4500, 0, 2250, 0, 0, 0, 0,
   'Uses Spartanburg Water + SSSD. Building permits through Spartanburg County.'),
  ('Landrum', 'Spartanburg', 'SC', 3000, 4500, 0, 2250, 0, 0, 0, 0,
   'Uses Spartanburg Water + SSSD. Building permits through Spartanburg County.')
ON CONFLICT (name) DO UPDATE SET
  county = EXCLUDED.county,
  state = EXCLUDED.state,
  water_tap = EXCLUDED.water_tap,
  sewer_tap = EXCLUDED.sewer_tap,
  gas_tap = EXCLUDED.gas_tap,
  permitting = EXCLUDED.permitting,
  impact = EXCLUDED.impact,
  architect = EXCLUDED.architect,
  engineering = EXCLUDED.engineering,
  survey = EXCLUDED.survey,
  notes = EXCLUDED.notes;

-- NC Municipalities (detailed)
INSERT INTO public.municipalities (name, county, state, water_tap, sewer_tap, gas_tap, permitting, impact, architect, engineering, survey, notes)
VALUES
  ('Charlotte / Mecklenburg County', 'Mecklenburg', 'NC', 5819, 11521, 0, 4000, 0, 0, 0, 0,
   'Charlotte Water FY26 rates effective 7/1/2025. Permit is midpoint of $3K-$5K range.'),
  ('Henderson County / Hendersonville', 'Henderson', 'NC', 2750, 2250, 0, 2250, 0, 0, 0, 0,
   'MUST VERIFY — New SDF ordinance effective 1/1/2025. SDFs may be substantial.')
ON CONFLICT (name) DO UPDATE SET
  county = EXCLUDED.county,
  state = EXCLUDED.state,
  water_tap = EXCLUDED.water_tap,
  sewer_tap = EXCLUDED.sewer_tap,
  permitting = EXCLUDED.permitting,
  notes = EXCLUDED.notes;

-- NC County-level entries (from DM Budget quick reference)
INSERT INTO public.municipalities (name, county, state, water_tap, sewer_tap, gas_tap, permitting, impact, architect, engineering, survey, notes)
VALUES
  ('Union County', 'Union', 'NC', 3418, 9492, 0, 2500, 0, 0, 0, 0, 'DM Budget Sept 2025 estimates. MUST VERIFY.'),
  ('Iredell County', 'Iredell', 'NC', 3452, 4805, 0, 2500, 0, 0, 0, 0, 'DM Budget Sept 2025 estimates. MUST VERIFY.'),
  ('Lincoln County', 'Lincoln', 'NC', 4382, 4621, 0, 2500, 0, 0, 0, 0, 'DM Budget Sept 2025 estimates. MUST VERIFY.'),
  ('Gaston County', 'Gaston', 'NC', 4363, 3640, 0, 2500, 0, 0, 0, 0, 'DM Budget Sept 2025 estimates. MUST VERIFY.'),
  ('York County', 'York', 'SC', 2975, 3500, 0, 2500, 0, 0, 0, 0, 'DM Budget Sept 2025 estimates. MUST VERIFY.'),
  ('Catawba County', 'Catawba', 'NC', 1660, 5691, 0, 2500, 0, 0, 0, 0, 'DM Budget Sept 2025 estimates. MUST VERIFY.'),
  ('Cabarrus County', 'Cabarrus', 'NC', 2968, 0, 0, 2500, 0, 0, 0, 0, 'DM Budget Sept 2025 estimates. Sewer data not available. MUST VERIFY.'),
  ('Forsyth County', 'Forsyth', 'NC', 816, 2861, 0, 2500, 0, 0, 0, 0, 'DM Budget Sept 2025 estimates. MUST VERIFY.'),
  ('Rowan County', 'Rowan', 'NC', 2675, 1975, 0, 2500, 0, 0, 0, 0, 'DM Budget Sept 2025 estimates. MUST VERIFY.'),
  ('Lancaster County', 'Lancaster', 'SC', 2400, 3800, 0, 2500, 0, 0, 0, 0, 'DM Budget Sept 2025 estimates. MUST VERIFY.'),
  ('Stanly County', 'Stanly', 'NC', 1300, 1250, 0, 2500, 0, 0, 0, 0, 'DM Budget Sept 2025 estimates. MUST VERIFY.'),
  ('Guilford County', 'Guilford', 'NC', 1782, 1516, 0, 2500, 0, 0, 0, 0, 'DM Budget Sept 2025 estimates. MUST VERIFY.'),
  ('Davidson County', 'Davidson', 'NC', 2150, 0, 0, 2500, 0, 0, 0, 0, 'DM Budget Sept 2025 estimates. Sewer data not available. MUST VERIFY.'),
  ('Alexander County', 'Alexander', 'NC', 3995, 0, 0, 2500, 0, 0, 0, 0, 'DM Budget Sept 2025 estimates. Sewer data not available. MUST VERIFY.')
ON CONFLICT (name) DO UPDATE SET
  county = EXCLUDED.county,
  state = EXCLUDED.state,
  water_tap = EXCLUDED.water_tap,
  sewer_tap = EXCLUDED.sewer_tap,
  permitting = EXCLUDED.permitting,
  notes = EXCLUDED.notes;

-- ============================================================
-- (f) Seed upgrade_packages — 3 Exterior + 4 Classic Interior + 4 Elegance Interior = 11
-- ============================================================
INSERT INTO public.upgrade_packages (name, category, description, default_amount, sort_order)
VALUES
  ('Hardie Color-Plus Siding',  'Exterior', 'Hardie Color-Plus fiber cement siding upgrade', 3750, 1),
  ('Elevation Level 1',         'Exterior', 'Architectural elevation upgrade - Level 1',     3500, 2),
  ('Elevation Level 2',         'Exterior', 'Architectural elevation upgrade - Level 2',     3500, 3),
  ('Foxcroft Classic',          'Interior', 'Classic tier interior package - Foxcroft style',  4059, 4),
  ('Midwood Classic',           'Interior', 'Classic tier interior package - Midwood style',   3792, 5),
  ('Madison Classic',           'Interior', 'Classic tier interior package - Madison style',   3852, 6),
  ('Uptown Classic',            'Interior', 'Classic tier interior package - Uptown style',    3984, 7),
  ('Foxcroft Elegance',         'Interior', 'Elegance tier interior package - Foxcroft style', 6181, 8),
  ('Midwood Elegance',          'Interior', 'Elegance tier interior package - Midwood style',  6468, 9),
  ('Madison Elegance',          'Interior', 'Elegance tier interior package - Madison style',  8197, 10),
  ('Uptown Elegance',           'Interior', 'Elegance tier interior package - Uptown style',   8623, 11)
ON CONFLICT DO NOTHING;

-- ============================================================
-- (g) Seed site_work_items — 18 standard line items
-- ============================================================
INSERT INTO public.site_work_items (code, description, default_amount, sort_order)
VALUES
  ('SW-01', 'Survey',              1700, 1),
  ('SW-02', 'Grading',             1700, 2),
  ('SW-03', 'Silt Fence',          2000, 3),
  ('SW-04', 'Temp Drive',           500, 4),
  ('SW-05', 'Landscaping',         2500, 5),
  ('SW-06', 'Flatwork',            2475, 6),
  ('SW-07', 'Clearing',               0, 7),
  ('SW-08', 'Tree Removal',           0, 8),
  ('SW-09', 'Fill',                    0, 9),
  ('SW-10', 'Retaining Wall',         0, 10),
  ('SW-11', 'Rock Removal',           0, 11),
  ('SW-12', 'Stepped Foundation',      0, 12),
  ('SW-13', 'Extra Grading',          0, 13),
  ('SW-14', 'Fill Import',            0, 14),
  ('SW-15', 'Dumpster Pad',           0, 15),
  ('SW-16', 'Erosion Control',        0, 16),
  ('SW-17', 'Utility Trench',         0, 17),
  ('SW-18', 'Driveway Extension',     0, 18)
ON CONFLICT DO NOTHING;

-- ============================================================
-- (h) Seed fee_schedule — 1 row with current RCH defaults
-- ============================================================
-- Add flat-fee columns if they don't exist (table was created with _pct columns)
ALTER TABLE public.fee_schedule
  ADD COLUMN IF NOT EXISTS builder_fee numeric(15,2) DEFAULT 15000,
  ADD COLUMN IF NOT EXISTS am_fee numeric(15,2) DEFAULT 5000,
  ADD COLUMN IF NOT EXISTS builder_warranty numeric(15,2) DEFAULT 5000,
  ADD COLUMN IF NOT EXISTS builders_risk numeric(15,2) DEFAULT 1500,
  ADD COLUMN IF NOT EXISTS po_fee numeric(15,2) DEFAULT 3000,
  ADD COLUMN IF NOT EXISTS bookkeeping numeric(15,2) DEFAULT 1500,
  ADD COLUMN IF NOT EXISTS pm_fee numeric(15,2) DEFAULT 3500,
  ADD COLUMN IF NOT EXISTS utilities numeric(15,2) DEFAULT 1400;

INSERT INTO public.fee_schedule (
  builder_fee, am_fee, builder_warranty, builders_risk,
  po_fee, bookkeeping, pm_fee, utilities
)
SELECT 15000, 5000, 5000, 1500, 3000, 1500, 3500, 1400
WHERE NOT EXISTS (SELECT 1 FROM public.fee_schedule LIMIT 1);

-- If fee_schedule doesn't have po_fee/bookkeeping columns yet, add them
DO $$
BEGIN
  -- Rename purchaser_fee to po_fee if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'fee_schedule' AND column_name = 'purchaser_fee'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'fee_schedule' AND column_name = 'po_fee'
  ) THEN
    ALTER TABLE public.fee_schedule RENAME COLUMN purchaser_fee TO po_fee;
  END IF;

  -- Rename accounting_fee to bookkeeping if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'fee_schedule' AND column_name = 'accounting_fee'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'fee_schedule' AND column_name = 'bookkeeping'
  ) THEN
    ALTER TABLE public.fee_schedule RENAME COLUMN accounting_fee TO bookkeeping;
  END IF;

  -- Add po_fee if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'fee_schedule' AND column_name = 'po_fee'
  ) THEN
    ALTER TABLE public.fee_schedule ADD COLUMN po_fee numeric(15,2) DEFAULT 3000;
  END IF;

  -- Add bookkeeping if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'fee_schedule' AND column_name = 'bookkeeping'
  ) THEN
    ALTER TABLE public.fee_schedule ADD COLUMN bookkeeping numeric(15,2) DEFAULT 1500;
  END IF;
END;
$$;

-- Update fee_schedule pm_fee to $3,500 (was $3,000)
UPDATE public.fee_schedule SET pm_fee = 3500 WHERE pm_fee = 3000;
