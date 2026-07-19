-- ============================================================
-- BlackBox: Trade-In Pricing Seed v2 — EXACT GHS VALUES
--
-- Replaces the approximate values in 2026_07_trade_pricing_seed.sql
-- with the exact figures from the approved pricing spec.
--
-- Anomalies surfaced (per spec):
--   1. iPhone 15 PS: spec has 4 values (4200/4400/4550/4650) for 3 tiers.
--      4650 is unseeded — NEEDS_CONFIRMATION (possible missing 1TB tier).
--   2. iPhone 14 Pro Max PS 256GB: source read "47OO" -> interpreted 4700.
--   3. iPhone 17 Pro Max ES 2TB = 14000 (only +200 above 1TB ES=13800,
--      vs typical +800-1000 jump). Seeded as written but flagged.
--   4. "Screen (iCloud)" label: implemented as 'Screen'. Same deduction
--      applies regardless of iCloud-lock -- flagged for future review.
--   5. iPhone 17 Air: eSIM-only model; seed uses sim_variant='single'.
--      UI filters out 'single' from the SIM picker display.
--
-- Idempotent (ON CONFLICT DO UPDATE).
-- ============================================================
BEGIN;

-- ============================================================
-- PART 1: BASE VALUES
-- Exact GHS per model/storage/sim_variant.
-- sim_variant: 'ps' = Physical SIM, 'es' = eSIM Only, 'single' = no variant
-- ============================================================
INSERT INTO public.trade_base_values (model, storage, sim_variant, base_value) VALUES

-- iPhone XR (no SIM split)
('iPhone XR', '64GB',  'single', 1000),
('iPhone XR', '128GB', 'single', 1200),
('iPhone XR', '256GB', 'single', 1300),

-- iPhone 11 (no SIM split)
('iPhone 11', '64GB',  'single', 1350),
('iPhone 11', '128GB', 'single', 1550),
('iPhone 11', '256GB', 'single', 1650),

-- iPhone 11 Pro (no SIM split)
('iPhone 11 Pro', '64GB',  'single', 1600),
('iPhone 11 Pro', '256GB', 'single', 1700),
('iPhone 11 Pro', '512GB', 'single', 1800),

-- iPhone 11 Pro Max (no SIM split)
('iPhone 11 Pro Max', '64GB',  'single', 1800),
('iPhone 11 Pro Max', '256GB', 'single', 1950),
('iPhone 11 Pro Max', '512GB', 'single', 2050),

-- iPhone 12 (no SIM split)
('iPhone 12', '64GB',  'single', 1700),
('iPhone 12', '128GB', 'single', 1800),
('iPhone 12', '256GB', 'single', 1900),

-- iPhone 12 Pro (no SIM split)
('iPhone 12 Pro', '128GB', 'single', 2000),
('iPhone 12 Pro', '256GB', 'single', 2200),
('iPhone 12 Pro', '512GB', 'single', 2300),

-- iPhone 12 Pro Max (no SIM split)
('iPhone 12 Pro Max', '128GB', 'single', 2400),
('iPhone 12 Pro Max', '256GB', 'single', 2600),
('iPhone 12 Pro Max', '512GB', 'single', 2700),

-- iPhone 13 (no SIM split)
('iPhone 13', '128GB', 'single', 2500),
('iPhone 13', '256GB', 'single', 2650),
('iPhone 13', '512GB', 'single', 2750),

-- iPhone 13 Pro (no SIM split)
('iPhone 13 Pro', '128GB', 'single', 2850),
('iPhone 13 Pro', '256GB', 'single', 3050),
('iPhone 13 Pro', '512GB', 'single', 3200),
('iPhone 13 Pro', '1TB',   'single', 3400),

-- iPhone 13 Pro Max (no SIM split)
('iPhone 13 Pro Max', '128GB', 'single', 3500),
('iPhone 13 Pro Max', '256GB', 'single', 3650),
('iPhone 13 Pro Max', '512GB', 'single', 3750),
('iPhone 13 Pro Max', '1TB',   'single', 4000),

-- iPhone 14 (PS / ES split)
('iPhone 14', '128GB', 'ps', 3100),
('iPhone 14', '256GB', 'ps', 3250),
('iPhone 14', '512GB', 'ps', 3350),
('iPhone 14', '128GB', 'es', 2850),
('iPhone 14', '256GB', 'es', 3000),
('iPhone 14', '512GB', 'es', 3100),

-- iPhone 14 Plus
('iPhone 14 Plus', '128GB', 'ps', 3400),
('iPhone 14 Plus', '256GB', 'ps', 3550),
('iPhone 14 Plus', '512GB', 'ps', 3650),
('iPhone 14 Plus', '128GB', 'es', 3100),
('iPhone 14 Plus', '256GB', 'es', 3250),
('iPhone 14 Plus', '512GB', 'es', 3350),

-- iPhone 14 Pro
('iPhone 14 Pro', '128GB', 'ps', 4000),
('iPhone 14 Pro', '256GB', 'ps', 4200),
('iPhone 14 Pro', '512GB', 'ps', 4350),
('iPhone 14 Pro', '1TB',   'ps', 4450),
('iPhone 14 Pro', '128GB', 'es', 3750),
('iPhone 14 Pro', '256GB', 'es', 3950),
('iPhone 14 Pro', '512GB', 'es', 4100),
('iPhone 14 Pro', '1TB',   'es', 4200),

-- iPhone 14 Pro Max
-- ANOMALY 2: source had "47OO" for PS 256GB -> interpreted as 4700
('iPhone 14 Pro Max', '128GB', 'ps', 4500),
('iPhone 14 Pro Max', '256GB', 'ps', 4700),
('iPhone 14 Pro Max', '512GB', 'ps', 4850),
('iPhone 14 Pro Max', '1TB',   'ps', 4950),
('iPhone 14 Pro Max', '128GB', 'es', 4100),
('iPhone 14 Pro Max', '256GB', 'es', 4300),
('iPhone 14 Pro Max', '512GB', 'es', 4450),
('iPhone 14 Pro Max', '1TB',   'es', 4550),

-- iPhone 15
-- ANOMALY 1: 4 values in source (4200/4400/4550/4650) for only 3 tiers.
--            Mapping first 3; 4650 = NEEDS_CONFIRMATION (possible 1TB PS)
('iPhone 15', '128GB', 'ps', 4200),
('iPhone 15', '256GB', 'ps', 4400),
('iPhone 15', '512GB', 'ps', 4550),
-- NEEDS_CONFIRMATION: 4650 not seeded (possible iPhone 15 1TB PS)
('iPhone 15', '128GB', 'es', 3950),
('iPhone 15', '256GB', 'es', 4100),
('iPhone 15', '512GB', 'es', 4200),

-- iPhone 15 Plus
('iPhone 15 Plus', '128GB', 'ps', 4550),
('iPhone 15 Plus', '256GB', 'ps', 4750),
('iPhone 15 Plus', '512GB', 'ps', 4850),
('iPhone 15 Plus', '128GB', 'es', 4200),
('iPhone 15 Plus', '256GB', 'es', 4400),
('iPhone 15 Plus', '512GB', 'es', 4500),

-- iPhone 15 Pro
('iPhone 15 Pro', '128GB', 'ps', 6000),
('iPhone 15 Pro', '256GB', 'ps', 6250),
('iPhone 15 Pro', '512GB', 'ps', 6400),
('iPhone 15 Pro', '1TB',   'ps', 6550),
('iPhone 15 Pro', '128GB', 'es', 5500),
('iPhone 15 Pro', '256GB', 'es', 5750),
('iPhone 15 Pro', '512GB', 'es', 5950),
('iPhone 15 Pro', '1TB',   'es', 6100),

-- iPhone 15 Pro Max
('iPhone 15 Pro Max', '256GB', 'ps', 6800),
('iPhone 15 Pro Max', '512GB', 'ps', 7050),
('iPhone 15 Pro Max', '1TB',   'ps', 7200),
('iPhone 15 Pro Max', '256GB', 'es', 6300),
('iPhone 15 Pro Max', '512GB', 'es', 6550),
('iPhone 15 Pro Max', '1TB',   'es', 6700),

-- iPhone 16
('iPhone 16', '128GB', 'ps', 6000),
('iPhone 16', '256GB', 'ps', 6200),
('iPhone 16', '512GB', 'ps', 6350),
('iPhone 16', '128GB', 'es', 5700),
('iPhone 16', '256GB', 'es', 5900),
('iPhone 16', '512GB', 'es', 6050),

-- iPhone 16 Plus
('iPhone 16 Plus', '128GB', 'ps', 6500),
('iPhone 16 Plus', '256GB', 'ps', 6700),
('iPhone 16 Plus', '512GB', 'ps', 6850),
('iPhone 16 Plus', '128GB', 'es', 6200),
('iPhone 16 Plus', '256GB', 'es', 6400),
('iPhone 16 Plus', '512GB', 'es', 6550),

-- iPhone 16 Pro
('iPhone 16 Pro', '128GB', 'ps', 7000),
('iPhone 16 Pro', '256GB', 'ps', 7300),
('iPhone 16 Pro', '512GB', 'ps', 7500),
('iPhone 16 Pro', '1TB',   'ps', 7700),
('iPhone 16 Pro', '128GB', 'es', 6600),
('iPhone 16 Pro', '256GB', 'es', 6900),
('iPhone 16 Pro', '512GB', 'es', 7100),
('iPhone 16 Pro', '1TB',   'es', 7300),

-- iPhone 16 Pro Max
('iPhone 16 Pro Max', '256GB', 'ps', 8500),
('iPhone 16 Pro Max', '512GB', 'ps', 8800),
('iPhone 16 Pro Max', '1TB',   'ps', 9000),
('iPhone 16 Pro Max', '256GB', 'es', 7500),
('iPhone 16 Pro Max', '512GB', 'es', 7800),
('iPhone 16 Pro Max', '1TB',   'es', 8000),

-- iPhone 17
('iPhone 17', '256GB', 'ps', 7500),
('iPhone 17', '512GB', 'ps', 7800),
('iPhone 17', '256GB', 'es', 7000),
('iPhone 17', '512GB', 'es', 7300),

-- iPhone 17 Air (eSIM-only; use sim_variant='single' so no SIM picker shown)
-- ANOMALY 5: no PS variant; 'single' sentinel used
('iPhone 17 Air', '256GB', 'single', 7700),
('iPhone 17 Air', '512GB', 'single', 8000),
('iPhone 17 Air', '1TB',   'single', 8300),

-- iPhone 17 Pro
('iPhone 17 Pro', '256GB', 'ps', 11000),
('iPhone 17 Pro', '512GB', 'ps', 11800),
('iPhone 17 Pro', '1TB',   'ps', 12800),
('iPhone 17 Pro', '256GB', 'es', 10000),
('iPhone 17 Pro', '512GB', 'es', 10800),
('iPhone 17 Pro', '1TB',   'es', 11800),

-- iPhone 17 Pro Max
-- ANOMALY 3: ES 2TB = 14000 (only +200 above 1TB ES=13800 vs typical +800-1000)
('iPhone 17 Pro Max', '256GB', 'ps', 13000),
('iPhone 17 Pro Max', '512GB', 'ps', 13800),
('iPhone 17 Pro Max', '1TB',   'ps', 14800),
('iPhone 17 Pro Max', '2TB',   'ps', 15800),
('iPhone 17 Pro Max', '256GB', 'es', 12000),
('iPhone 17 Pro Max', '512GB', 'es', 12800),
('iPhone 17 Pro Max', '1TB',   'es', 13800),
('iPhone 17 Pro Max', '2TB',   'es', 14000) -- NEEDS_CONFIRMATION: +200 vs typical +800-1000

ON CONFLICT (model, storage, sim_variant) DO UPDATE
  SET base_value = EXCLUDED.base_value,
      updated_at = NOW();


-- ============================================================
-- PART 2: FAULT DEDUCTIONS -- EXACT GHS FROM SPEC
-- ANOMALY 4: "Screen (iCloud)" stored as 'screen'/'Screen'.
--            Same amount for screen damage regardless of iCloud-lock state.
-- ============================================================
INSERT INTO public.trade_fault_deductions (model, fault_code, fault_label, deduction) VALUES

('iPhone XR', 'screen',       'Screen',           400),
('iPhone XR', 'battery',      'Battery',           200),
('iPhone XR', 'backglass',    'Backglass',         200),
('iPhone XR', 'charging',     'Charging System',   200),
('iPhone XR', 'front_camera', 'Front Camera',      220),
('iPhone XR', 'back_camera',  'Back Camera',       270),
('iPhone XR', 'face_id',      'Face ID',           400),

('iPhone 11', 'screen',       'Screen',            600),
('iPhone 11', 'battery',      'Battery',           300),
('iPhone 11', 'backglass',    'Backglass',         300),
('iPhone 11', 'charging',     'Charging System',   300),
('iPhone 11', 'front_camera', 'Front Camera',      250),
('iPhone 11', 'back_camera',  'Back Camera',       300),
('iPhone 11', 'face_id',      'Face ID',           550),

('iPhone 11 Pro', 'screen',       'Screen',          750),
('iPhone 11 Pro', 'battery',      'Battery',         300),
('iPhone 11 Pro', 'backglass',    'Backglass',       300),
('iPhone 11 Pro', 'charging',     'Charging System', 300),
('iPhone 11 Pro', 'front_camera', 'Front Camera',    300),
('iPhone 11 Pro', 'back_camera',  'Back Camera',     400),
('iPhone 11 Pro', 'face_id',      'Face ID',         550),

('iPhone 11 Pro Max', 'screen',       'Screen',          850),
('iPhone 11 Pro Max', 'battery',      'Battery',         400),
('iPhone 11 Pro Max', 'backglass',    'Backglass',       400),
('iPhone 11 Pro Max', 'charging',     'Charging System', 300),
('iPhone 11 Pro Max', 'front_camera', 'Front Camera',    300),
('iPhone 11 Pro Max', 'back_camera',  'Back Camera',     400),
('iPhone 11 Pro Max', 'face_id',      'Face ID',         550),

('iPhone 12', 'screen',       'Screen',           750),
('iPhone 12', 'battery',      'Battery',          400),
('iPhone 12', 'backglass',    'Backglass',        350),
('iPhone 12', 'charging',     'Charging System',  290),
('iPhone 12', 'front_camera', 'Front Camera',     250),
('iPhone 12', 'back_camera',  'Back Camera',      400),
('iPhone 12', 'face_id',      'Face ID',          550),

('iPhone 12 Pro', 'screen',       'Screen',           750),
('iPhone 12 Pro', 'battery',      'Battery',          450),
('iPhone 12 Pro', 'backglass',    'Backglass',        400),
('iPhone 12 Pro', 'charging',     'Charging System',  340),
('iPhone 12 Pro', 'front_camera', 'Front Camera',     380),
('iPhone 12 Pro', 'back_camera',  'Back Camera',      500),
('iPhone 12 Pro', 'face_id',      'Face ID',          550),

('iPhone 12 Pro Max', 'screen',       'Screen',          1000),
('iPhone 12 Pro Max', 'battery',      'Battery',          490),
('iPhone 12 Pro Max', 'backglass',    'Backglass',        450),
('iPhone 12 Pro Max', 'charging',     'Charging System',  380),
('iPhone 12 Pro Max', 'front_camera', 'Front Camera',     380),
('iPhone 12 Pro Max', 'back_camera',  'Back Camera',      500),
('iPhone 12 Pro Max', 'face_id',      'Face ID',          550),

('iPhone 13', 'screen',       'Screen',          1000),
('iPhone 13', 'battery',      'Battery',          470),
('iPhone 13', 'backglass',    'Backglass',        440),
('iPhone 13', 'charging',     'Charging System',  380),
('iPhone 13', 'front_camera', 'Front Camera',     350),
('iPhone 13', 'back_camera',  'Back Camera',      500),
('iPhone 13', 'face_id',      'Face ID',          550),

('iPhone 13 Pro', 'screen',       'Screen',          1300),
('iPhone 13 Pro', 'battery',      'Battery',          490),
('iPhone 13 Pro', 'backglass',    'Backglass',        450),
('iPhone 13 Pro', 'charging',     'Charging System',  500),
('iPhone 13 Pro', 'front_camera', 'Front Camera',     400),
('iPhone 13 Pro', 'back_camera',  'Back Camera',      650),
('iPhone 13 Pro', 'face_id',      'Face ID',          550),

('iPhone 13 Pro Max', 'screen',       'Screen',          1700),
('iPhone 13 Pro Max', 'battery',      'Battery',          550),
('iPhone 13 Pro Max', 'backglass',    'Backglass',        490),
('iPhone 13 Pro Max', 'charging',     'Charging System',  550),
('iPhone 13 Pro Max', 'front_camera', 'Front Camera',     400),
('iPhone 13 Pro Max', 'back_camera',  'Back Camera',      650),
('iPhone 13 Pro Max', 'face_id',      'Face ID',          700),

('iPhone 14', 'screen',       'Screen',          1500),
('iPhone 14', 'battery',      'Battery',          490),
('iPhone 14', 'backglass',    'Backglass',        470),
('iPhone 14', 'charging',     'Charging System',  500),
('iPhone 14', 'front_camera', 'Front Camera',     370),
('iPhone 14', 'back_camera',  'Back Camera',      600),
('iPhone 14', 'face_id',      'Face ID',          600),

('iPhone 14 Plus', 'screen',       'Screen',          1700),
('iPhone 14 Plus', 'battery',      'Battery',          550),
('iPhone 14 Plus', 'backglass',    'Backglass',        500),
('iPhone 14 Plus', 'charging',     'Charging System',  550),
('iPhone 14 Plus', 'front_camera', 'Front Camera',     370),
('iPhone 14 Plus', 'back_camera',  'Back Camera',      600),
('iPhone 14 Plus', 'face_id',      'Face ID',          600),

('iPhone 14 Pro', 'screen',       'Screen',          2200),
('iPhone 14 Pro', 'battery',      'Battery',          590),
('iPhone 14 Pro', 'backglass',    'Backglass',        550),
('iPhone 14 Pro', 'charging',     'Charging System',  550),
('iPhone 14 Pro', 'front_camera', 'Front Camera',     600),
('iPhone 14 Pro', 'back_camera',  'Back Camera',      850),
('iPhone 14 Pro', 'face_id',      'Face ID',          800),

('iPhone 14 Pro Max', 'screen',       'Screen',          2500),
('iPhone 14 Pro Max', 'battery',      'Battery',          650),
('iPhone 14 Pro Max', 'backglass',    'Backglass',        590),
('iPhone 14 Pro Max', 'charging',     'Charging System',  600),
('iPhone 14 Pro Max', 'front_camera', 'Front Camera',     600),
('iPhone 14 Pro Max', 'back_camera',  'Back Camera',      850),
('iPhone 14 Pro Max', 'face_id',      'Face ID',          800),

('iPhone 15', 'screen',       'Screen',          2200),
('iPhone 15', 'battery',      'Battery',          600),
('iPhone 15', 'backglass',    'Backglass',        520),
('iPhone 15', 'charging',     'Charging System',  600),
('iPhone 15', 'front_camera', 'Front Camera',     520),
('iPhone 15', 'back_camera',  'Back Camera',      700),
('iPhone 15', 'face_id',      'Face ID',          800),

('iPhone 15 Plus', 'screen',       'Screen',          2500),
('iPhone 15 Plus', 'battery',      'Battery',          670),
('iPhone 15 Plus', 'backglass',    'Backglass',        590),
('iPhone 15 Plus', 'charging',     'Charging System',  650),
('iPhone 15 Plus', 'front_camera', 'Front Camera',     520),
('iPhone 15 Plus', 'back_camera',  'Back Camera',      700),
('iPhone 15 Plus', 'face_id',      'Face ID',          800),

('iPhone 15 Pro', 'screen',       'Screen',          3500),
('iPhone 15 Pro', 'battery',      'Battery',          700),
('iPhone 15 Pro', 'backglass',    'Backglass',        650),
('iPhone 15 Pro', 'charging',     'Charging System',  650),
('iPhone 15 Pro', 'front_camera', 'Front Camera',     770),
('iPhone 15 Pro', 'back_camera',  'Back Camera',     1000),
('iPhone 15 Pro', 'face_id',      'Face ID',         1200),

('iPhone 15 Pro Max', 'screen',       'Screen',          4000),
('iPhone 15 Pro Max', 'battery',      'Battery',          800),
('iPhone 15 Pro Max', 'backglass',    'Backglass',        700),
('iPhone 15 Pro Max', 'charging',     'Charging System',  700),
('iPhone 15 Pro Max', 'front_camera', 'Front Camera',     770),
('iPhone 15 Pro Max', 'back_camera',  'Back Camera',     1000),
('iPhone 15 Pro Max', 'face_id',      'Face ID',         1200),

('iPhone 16', 'screen',       'Screen',          3800),
('iPhone 16', 'battery',      'Battery',          800),
('iPhone 16', 'backglass',    'Backglass',        700),
('iPhone 16', 'charging',     'Charging System',  770),
('iPhone 16', 'front_camera', 'Front Camera',     900),
('iPhone 16', 'back_camera',  'Back Camera',     1300),
('iPhone 16', 'face_id',      'Face ID',         1200),

('iPhone 16 Plus', 'screen',       'Screen',          4300),
('iPhone 16 Plus', 'battery',      'Battery',         1000),
('iPhone 16 Plus', 'backglass',    'Backglass',        800),
('iPhone 16 Plus', 'charging',     'Charging System',  800),
('iPhone 16 Plus', 'front_camera', 'Front Camera',     950),
('iPhone 16 Plus', 'back_camera',  'Back Camera',     1400),
('iPhone 16 Plus', 'face_id',      'Face ID',         1200),

('iPhone 16 Pro', 'screen',       'Screen',          4500),
('iPhone 16 Pro', 'battery',      'Battery',         1050),
('iPhone 16 Pro', 'backglass',    'Backglass',        800),
('iPhone 16 Pro', 'charging',     'Charging System',  900),
('iPhone 16 Pro', 'front_camera', 'Front Camera',    1100),
('iPhone 16 Pro', 'back_camera',  'Back Camera',     1600),
('iPhone 16 Pro', 'face_id',      'Face ID',         1500),

('iPhone 16 Pro Max', 'screen',       'Screen',          5500),
('iPhone 16 Pro Max', 'battery',      'Battery',         1200),
('iPhone 16 Pro Max', 'backglass',    'Backglass',        900),
('iPhone 16 Pro Max', 'charging',     'Charging System', 1000),
('iPhone 16 Pro Max', 'front_camera', 'Front Camera',    1300),
('iPhone 16 Pro Max', 'back_camera',  'Back Camera',     1900),
('iPhone 16 Pro Max', 'face_id',      'Face ID',         1500),

('iPhone 17', 'screen',       'Screen',          5000),
('iPhone 17', 'battery',      'Battery',         1400),
('iPhone 17', 'backglass',    'Backglass',        900),
('iPhone 17', 'charging',     'Charging System',  850),
('iPhone 17', 'front_camera', 'Front Camera',    1050),
('iPhone 17', 'back_camera',  'Back Camera',     1500),
('iPhone 17', 'face_id',      'Face ID',         2000),

('iPhone 17 Air', 'screen',       'Screen',          5500),
('iPhone 17 Air', 'battery',      'Battery',         1400),
('iPhone 17 Air', 'backglass',    'Backglass',       1050),
('iPhone 17 Air', 'charging',     'Charging System',  850),
('iPhone 17 Air', 'front_camera', 'Front Camera',    1050),
('iPhone 17 Air', 'back_camera',  'Back Camera',     1500),
('iPhone 17 Air', 'face_id',      'Face ID',         2000),

('iPhone 17 Pro', 'screen',       'Screen',          6500),
('iPhone 17 Pro', 'battery',      'Battery',         1800),
('iPhone 17 Pro', 'backglass',    'Backglass',       1200),
('iPhone 17 Pro', 'charging',     'Charging System', 1200),
('iPhone 17 Pro', 'front_camera', 'Front Camera',    1450),
('iPhone 17 Pro', 'back_camera',  'Back Camera',     2000),
('iPhone 17 Pro', 'face_id',      'Face ID',         2500),

('iPhone 17 Pro Max', 'screen',       'Screen',          7500),
('iPhone 17 Pro Max', 'battery',      'Battery',         2200),
('iPhone 17 Pro Max', 'backglass',    'Backglass',       1500),
('iPhone 17 Pro Max', 'charging',     'Charging System', 1200),
('iPhone 17 Pro Max', 'front_camera', 'Front Camera',    1450),
('iPhone 17 Pro Max', 'back_camera',  'Back Camera',     2000),
('iPhone 17 Pro Max', 'face_id',      'Face ID',         2500)

ON CONFLICT (model, fault_code) DO UPDATE
  SET deduction   = EXCLUDED.deduction,
      fault_label = EXCLUDED.fault_label,
      updated_at  = NOW();

COMMIT;
