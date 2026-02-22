-- 20260222_seed_reference_data.sql
-- Seeds reference data for municipalities, site_work_items, and upgrade_packages.
-- All inserts use ON CONFLICT DO NOTHING to ensure idempotency.

-- ============================================================
-- Add unique constraints needed for idempotent upserts
-- ============================================================
create unique index if not exists site_work_items_code_key
  on public.site_work_items (code);

create unique index if not exists upgrade_packages_name_category_key
  on public.upgrade_packages (name, category);

-- ============================================================
-- 1. municipalities (15 SC corridor cities)
--    Unique constraint on: name (defined in 00014)
-- ============================================================
insert into public.municipalities
  (name, county, state, water_tap, sewer_tap, gas_tap, permitting, impact, architect, engineering, survey)
values
  ('Greenville',      'Greenville',   'SC', 3500, 4500, 800, 2500, 3000, 2500, 1800, 1200),
  ('Spartanburg',     'Spartanburg',  'SC', 3000, 4000, 750, 2200, 2500, 2500, 1800, 1200),
  ('Greer',           'Greenville',   'SC', 3200, 4200, 800, 2400, 2800, 2500, 1800, 1200),
  ('Simpsonville',    'Greenville',   'SC', 3400, 4400, 800, 2300, 2700, 2500, 1800, 1200),
  ('Mauldin',         'Greenville',   'SC', 3300, 4300, 800, 2200, 2600, 2500, 1800, 1200),
  ('Easley',          'Pickens',      'SC', 2800, 3800, 700, 2000, 2200, 2500, 1800, 1200),
  ('Anderson',        'Anderson',     'SC', 2700, 3600, 700, 1900, 2100, 2500, 1800, 1200),
  ('Boiling Springs', 'Spartanburg',  'SC', 2900, 3900, 750, 2100, 2400, 2500, 1800, 1200),
  ('Duncan',          'Spartanburg',  'SC', 2800, 3700, 700, 2000, 2300, 2500, 1800, 1200),
  ('Travelers Rest',  'Greenville',   'SC', 3100, 4100, 800, 2300, 2700, 2500, 1800, 1200),
  ('Taylors',         'Greenville',   'SC', 3200, 4200, 800, 2300, 2600, 2500, 1800, 1200),
  ('Woodruff',        'Spartanburg',  'SC', 2600, 3400, 650, 1800, 2000, 2500, 1800, 1200),
  ('Fort Mill',       'York',         'SC', 3800, 5000, 900, 3000, 4000, 2500, 1800, 1200),
  ('Rock Hill',       'York',         'SC', 3500, 4600, 850, 2800, 3500, 2500, 1800, 1200),
  ('Indian Land',     'Lancaster',    'SC', 3600, 4800, 850, 2900, 3800, 2500, 1800, 1200)
on conflict (name) do nothing;

-- ============================================================
-- 2. site_work_items (18-line standard residential site work)
--    Unique constraint on: code (created above)
-- ============================================================
insert into public.site_work_items
  (code, description, default_amount, sort_order)
values
  ('SW-01', 'Clearing & Grubbing',      2500,  1),
  ('SW-02', 'Rough Grade',              3500,  2),
  ('SW-03', 'Erosion Control',          1200,  3),
  ('SW-04', 'Foundation Excavation',    2000,  4),
  ('SW-05', 'Foundation Backfill',      1500,  5),
  ('SW-06', 'Underslab Plumbing',       3000,  6),
  ('SW-07', 'Termite Treatment',         800,  7),
  ('SW-08', 'Waterproofing',            1200,  8),
  ('SW-09', 'Driveway',                 4500,  9),
  ('SW-10', 'Sidewalk',                 2000, 10),
  ('SW-11', 'Final Grade',              2500, 11),
  ('SW-12', 'Sod / Seed / Landscape',   3500, 12),
  ('SW-13', 'Retaining Wall',              0, 13),
  ('SW-14', 'Storm Drainage',           1500, 14),
  ('SW-15', 'Water Line',               1800, 15),
  ('SW-16', 'Sewer Line',               2200, 16),
  ('SW-17', 'Gas Line',                  800, 17),
  ('SW-18', 'Miscellaneous Site',          0, 18)
on conflict (code) do nothing;

-- ============================================================
-- 3. upgrade_packages (3 exterior + 8 interior)
--    Unique constraint on: (name, category) (created above)
-- ============================================================
insert into public.upgrade_packages
  (name, category, description, default_amount, sort_order)
values
  -- Exterior packages
  ('Exterior Package A', 'Exterior', 'Standard hardy plank, architectural shingles',             0,  1),
  ('Exterior Package B', 'Exterior', 'Upgraded stone/brick accent, metal roof accent',        8500,  2),
  ('Exterior Package C', 'Exterior', 'Full stone/brick, premium roofing, enhanced trim',     18000,  3),
  -- Interior packages
  ('Flooring Upgrade',    'Interior', 'LVP to hardwood main level',                           6500,  4),
  ('Cabinet Upgrade',     'Interior', 'Builder grade to soft-close, dovetail, 42" uppers',    8000,  5),
  ('Countertop Upgrade',  'Interior', 'Laminate to quartz',                                   5500,  6),
  ('Lighting Upgrade',    'Interior', 'Standard to LED recessed + pendant fixtures',          3500,  7),
  ('Appliance Upgrade',   'Interior', 'Standard to stainless steel package',                  4000,  8),
  ('Tile Upgrade',        'Interior', 'Fiberglass surround to ceramic tile shower',           3000,  9),
  ('Trim Upgrade',        'Interior', 'Standard to craftsman-style trim package',             4500, 10),
  ('Smart Home Package',  'Interior', 'Smart thermostat, locks, doorbell, hub',               3500, 11)
on conflict (name, category) do nothing;
