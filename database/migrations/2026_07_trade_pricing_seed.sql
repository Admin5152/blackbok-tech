-- ============================================================
-- BlackBox: Trade-In Pricing Seed Data
--
-- Inserts initial data for iPhone models based on provided
-- actual pricing specs. Includes fixes for identified anomalies.
--
-- Idempotent (uses ON CONFLICT DO UPDATE).
-- ============================================================
BEGIN;

-- ------------------------------------------------------------
-- 1. Base Values (iPhones)
-- ------------------------------------------------------------
INSERT INTO public.trade_base_values (model, storage, sim_variant, base_value) VALUES
-- iPhone 17 Pro Max
('iPhone 17 Pro Max', '256GB', 'ps', 12300),
('iPhone 17 Pro Max', '512GB', 'ps', 12800),
('iPhone 17 Pro Max', '1TB', 'ps', 14000),
('iPhone 17 Pro Max', '2TB', 'ps', 15200),
('iPhone 17 Pro Max', '256GB', 'es', 12100),
('iPhone 17 Pro Max', '512GB', 'es', 12600),
('iPhone 17 Pro Max', '1TB', 'es', 13800),
('iPhone 17 Pro Max', '2TB', 'es', 14800), -- Fixed anomaly: was 14000
-- iPhone 17 Pro
('iPhone 17 Pro', '128GB', 'ps', 10500),
('iPhone 17 Pro', '256GB', 'ps', 11300),
('iPhone 17 Pro', '512GB', 'ps', 11800),
('iPhone 17 Pro', '1TB', 'ps', 13000),
('iPhone 17 Pro', '128GB', 'es', 10300),
('iPhone 17 Pro', '256GB', 'es', 11100),
('iPhone 17 Pro', '512GB', 'es', 11600),
('iPhone 17 Pro', '1TB', 'es', 12800),
-- iPhone 17
('iPhone 17', '128GB', 'ps', 7500),
('iPhone 17', '256GB', 'ps', 8100),
('iPhone 17', '512GB', 'ps', 8600),
('iPhone 17', '128GB', 'es', 7300),
('iPhone 17', '256GB', 'es', 7900),
('iPhone 17', '512GB', 'es', 8400),
-- iPhone 17 Air
('iPhone 17 Air', '128GB', 'single', 8200),
('iPhone 17 Air', '256GB', 'single', 9100),
('iPhone 17 Air', '512GB', 'single', 9700),
('iPhone 17 Air', '1TB', 'single', 10300),
-- iPhone 16 Pro Max
('iPhone 16 Pro Max', '256GB', 'ps', 10300),
('iPhone 16 Pro Max', '512GB', 'ps', 10800),
('iPhone 16 Pro Max', '1TB', 'ps', 12000),
('iPhone 16 Pro Max', '256GB', 'es', 10100),
('iPhone 16 Pro Max', '512GB', 'es', 10600),
('iPhone 16 Pro Max', '1TB', 'es', 11800),
-- iPhone 16 Pro
('iPhone 16 Pro', '128GB', 'ps', 8500),
('iPhone 16 Pro', '256GB', 'ps', 9300),
('iPhone 16 Pro', '512GB', 'ps', 9800),
('iPhone 16 Pro', '1TB', 'ps', 11000),
('iPhone 16 Pro', '128GB', 'es', 8300),
('iPhone 16 Pro', '256GB', 'es', 9100),
('iPhone 16 Pro', '512GB', 'es', 9600),
('iPhone 16 Pro', '1TB', 'es', 10800),
-- iPhone 16 Plus
('iPhone 16 Plus', '128GB', 'ps', 6100),
('iPhone 16 Plus', '256GB', 'ps', 6600),
('iPhone 16 Plus', '512GB', 'ps', 7300),
('iPhone 16 Plus', '128GB', 'es', 5900),
('iPhone 16 Plus', '256GB', 'es', 6400),
('iPhone 16 Plus', '512GB', 'es', 7100),
-- iPhone 16
('iPhone 16', '128GB', 'ps', 5500),
('iPhone 16', '256GB', 'ps', 6100),
('iPhone 16', '512GB', 'ps', 6600),
('iPhone 16', '128GB', 'es', 5300),
('iPhone 16', '256GB', 'es', 5900),
('iPhone 16', '512GB', 'es', 6400),
-- iPhone 16E
('iPhone 16E', '128GB', 'ps', 5200),
('iPhone 16E', '256GB', 'ps', 5700),
('iPhone 16E', '512GB', 'ps', 6200),
('iPhone 16E', '128GB', 'es', 5000),
('iPhone 16E', '256GB', 'es', 5500),
('iPhone 16E', '512GB', 'es', 6000),
-- iPhone 15 Pro Max
('iPhone 15 Pro Max', '256GB', 'ps', 7800),
('iPhone 15 Pro Max', '512GB', 'ps', 8300),
('iPhone 15 Pro Max', '1TB', 'ps', 8800),
('iPhone 15 Pro Max', '256GB', 'es', 7600),
('iPhone 15 Pro Max', '512GB', 'es', 8100),
('iPhone 15 Pro Max', '1TB', 'es', 8600),
-- iPhone 15 Pro
('iPhone 15 Pro', '128GB', 'ps', 6600),
('iPhone 15 Pro', '256GB', 'ps', 7000),
('iPhone 15 Pro', '512GB', 'ps', 7400),
('iPhone 15 Pro', '1TB', 'ps', 7800),
('iPhone 15 Pro', '128GB', 'es', 6400),
('iPhone 15 Pro', '256GB', 'es', 6800),
('iPhone 15 Pro', '512GB', 'es', 7200),
('iPhone 15 Pro', '1TB', 'es', 7600),
-- iPhone 15 Plus
('iPhone 15 Plus', '128GB', 'ps', 4800),
('iPhone 15 Plus', '256GB', 'ps', 5100),
('iPhone 15 Plus', '512GB', 'ps', 5500),
('iPhone 15 Plus', '128GB', 'es', 4600),
('iPhone 15 Plus', '256GB', 'es', 4900),
('iPhone 15 Plus', '512GB', 'es', 5300),
-- iPhone 15
('iPhone 15', '128GB', 'ps', 4200),
('iPhone 15', '256GB', 'ps', 4400),
('iPhone 15', '512GB', 'ps', 4550), -- Dropped 4650 per anomaly feedback
('iPhone 15', '128GB', 'es', 4000),
('iPhone 15', '256GB', 'es', 4200),
('iPhone 15', '512GB', 'es', 4350),
-- iPhone 14 Pro Max
('iPhone 14 Pro Max', '128GB', 'ps', 4300),
('iPhone 14 Pro Max', '256GB', 'ps', 4700),
('iPhone 14 Pro Max', '512GB', 'ps', 5200),
('iPhone 14 Pro Max', '1TB', 'ps', 5800),
('iPhone 14 Pro Max', '128GB', 'es', 4100),
('iPhone 14 Pro Max', '256GB', 'es', 4500),
('iPhone 14 Pro Max', '512GB', 'es', 5000),
('iPhone 14 Pro Max', '1TB', 'es', 5600),
-- iPhone 14 Pro
('iPhone 14 Pro', '128GB', 'ps', 4000),
('iPhone 14 Pro', '256GB', 'ps', 4300),
('iPhone 14 Pro', '512GB', 'ps', 4700),
('iPhone 14 Pro', '1TB', 'ps', 5100),
('iPhone 14 Pro', '128GB', 'es', 3800),
('iPhone 14 Pro', '256GB', 'es', 4100),
('iPhone 14 Pro', '512GB', 'es', 4500),
('iPhone 14 Pro', '1TB', 'es', 4900),
-- iPhone 14 Plus
('iPhone 14 Plus', '128GB', 'ps', 3500),
('iPhone 14 Plus', '256GB', 'ps', 3700),
('iPhone 14 Plus', '512GB', 'ps', 3900),
('iPhone 14 Plus', '128GB', 'es', 3300),
('iPhone 14 Plus', '256GB', 'es', 3500),
('iPhone 14 Plus', '512GB', 'es', 3700),
-- iPhone 14
('iPhone 14', '128GB', 'ps', 3000),
('iPhone 14', '256GB', 'ps', 3300),
('iPhone 14', '512GB', 'ps', 3500),
('iPhone 14', '128GB', 'es', 2800),
('iPhone 14', '256GB', 'es', 3100),
('iPhone 14', '512GB', 'es', 3300),
-- iPhone 13 Pro Max
('iPhone 13 Pro Max', '128GB', 'single', 3500),
('iPhone 13 Pro Max', '256GB', 'single', 4000),
('iPhone 13 Pro Max', '512GB', 'single', 4300),
('iPhone 13 Pro Max', '1TB', 'single', 4600),
-- iPhone 13 Pro
('iPhone 13 Pro', '128GB', 'single', 2700),
('iPhone 13 Pro', '256GB', 'single', 3050),
('iPhone 13 Pro', '512GB', 'single', 3350),
('iPhone 13 Pro', '1TB', 'single', 3600),
-- iPhone 13
('iPhone 13', '128GB', 'single', 2400),
('iPhone 13', '256GB', 'single', 2700),
('iPhone 13', '512GB', 'single', 2900),
-- iPhone 12 Pro Max
('iPhone 12 Pro Max', '128GB', 'single', 2550),
('iPhone 12 Pro Max', '256GB', 'single', 2850),
('iPhone 12 Pro Max', '512GB', 'single', 3150),
-- iPhone 12 Pro
('iPhone 12 Pro', '128GB', 'single', 2000),
('iPhone 12 Pro', '256GB', 'single', 2250),
('iPhone 12 Pro', '512GB', 'single', 2550),
-- iPhone 12
('iPhone 12', '64GB', 'single', 1300),
('iPhone 12', '128GB', 'single', 1600),
('iPhone 12', '256GB', 'single', 1900),
-- iPhone 11 Pro Max
('iPhone 11 Pro Max', '64GB', 'single', 1850),
('iPhone 11 Pro Max', '256GB', 'single', 2150),
('iPhone 11 Pro Max', '512GB', 'single', 2350),
-- iPhone 11 Pro
('iPhone 11 Pro', '64GB', 'single', 1500),
('iPhone 11 Pro', '256GB', 'single', 1800),
('iPhone 11 Pro', '512GB', 'single', 2100),
-- iPhone 11
('iPhone 11', '64GB', 'single', 1000),
('iPhone 11', '128GB', 'single', 1250),
('iPhone 11', '256GB', 'single', 1450),
-- iPhone XR
('iPhone XR', '64GB', 'single', 1000),
('iPhone XR', '128GB', 'single', 1250)
ON CONFLICT (model, storage, sim_variant) DO UPDATE
SET base_value = EXCLUDED.base_value,
    updated_at = NOW();


-- ------------------------------------------------------------
-- 2. Fault Deductions (iPhones)
-- ------------------------------------------------------------
INSERT INTO public.trade_fault_deductions (model, fault_code, fault_label, deduction) VALUES
-- iPhone 17 Pro Max
('iPhone 17 Pro Max', 'screen', 'Screen', 4000),
('iPhone 17 Pro Max', 'battery', 'Battery', 1200),
('iPhone 17 Pro Max', 'backglass', 'Backglass', 1000),
('iPhone 17 Pro Max', 'charging', 'Charging System', 500),
('iPhone 17 Pro Max', 'front_camera', 'Front Camera', 700),
('iPhone 17 Pro Max', 'back_camera', 'Back Camera', 1000),
('iPhone 17 Pro Max', 'face_id', 'Face ID', 2000),
-- iPhone 17 Pro
('iPhone 17 Pro', 'screen', 'Screen', 3500),
('iPhone 17 Pro', 'battery', 'Battery', 1200),
('iPhone 17 Pro', 'backglass', 'Backglass', 1000),
('iPhone 17 Pro', 'charging', 'Charging System', 500),
('iPhone 17 Pro', 'front_camera', 'Front Camera', 700),
('iPhone 17 Pro', 'back_camera', 'Back Camera', 1000),
('iPhone 17 Pro', 'face_id', 'Face ID', 1700),
-- iPhone 17
('iPhone 17', 'screen', 'Screen', 3000),
('iPhone 17', 'battery', 'Battery', 1200),
('iPhone 17', 'backglass', 'Backglass', 1000),
('iPhone 17', 'charging', 'Charging System', 500),
('iPhone 17', 'front_camera', 'Front Camera', 700),
('iPhone 17', 'back_camera', 'Back Camera', 1000),
('iPhone 17', 'face_id', 'Face ID', 1500),
-- iPhone 17 Air
('iPhone 17 Air', 'screen', 'Screen', 3100),
('iPhone 17 Air', 'battery', 'Battery', 1200),
('iPhone 17 Air', 'backglass', 'Backglass', 1000),
('iPhone 17 Air', 'charging', 'Charging System', 500),
('iPhone 17 Air', 'front_camera', 'Front Camera', 700),
('iPhone 17 Air', 'back_camera', 'Back Camera', 1000),
('iPhone 17 Air', 'face_id', 'Face ID', 1550),
('iPhone 17 Air', 'screen', 'Screen', 3200),
('iPhone 17 Air', 'battery', 'Battery', 1200),
('iPhone 17 Air', 'backglass', 'Backglass', 1000),
('iPhone 17 Air', 'charging', 'Charging System', 500),
('iPhone 17 Air', 'front_camera', 'Front Camera', 700),
('iPhone 17 Air', 'back_camera', 'Back Camera', 1000),
('iPhone 17 Air', 'face_id', 'Face ID', 1600),
-- iPhone 16 Pro Max
('iPhone 16 Pro Max', 'screen', 'Screen', 3500),
('iPhone 16 Pro Max', 'battery', 'Battery', 1000),
('iPhone 16 Pro Max', 'backglass', 'Backglass', 800),
('iPhone 16 Pro Max', 'charging', 'Charging System', 450),
('iPhone 16 Pro Max', 'front_camera', 'Front Camera', 600),
('iPhone 16 Pro Max', 'back_camera', 'Back Camera', 900),
('iPhone 16 Pro Max', 'face_id', 'Face ID', 1500),
-- iPhone 16 Pro
('iPhone 16 Pro', 'screen', 'Screen', 3000),
('iPhone 16 Pro', 'battery', 'Battery', 1000),
('iPhone 16 Pro', 'backglass', 'Backglass', 800),
('iPhone 16 Pro', 'charging', 'Charging System', 450),
('iPhone 16 Pro', 'front_camera', 'Front Camera', 600),
('iPhone 16 Pro', 'back_camera', 'Back Camera', 900),
('iPhone 16 Pro', 'face_id', 'Face ID', 1300),
-- iPhone 16 Plus
('iPhone 16 Plus', 'screen', 'Screen', 2700),
('iPhone 16 Plus', 'battery', 'Battery', 1000),
('iPhone 16 Plus', 'backglass', 'Backglass', 800),
('iPhone 16 Plus', 'charging', 'Charging System', 450),
('iPhone 16 Plus', 'front_camera', 'Front Camera', 600),
('iPhone 16 Plus', 'back_camera', 'Back Camera', 900),
('iPhone 16 Plus', 'face_id', 'Face ID', 1200),
-- iPhone 16
('iPhone 16', 'screen', 'Screen', 2500),
('iPhone 16', 'battery', 'Battery', 1000),
('iPhone 16', 'backglass', 'Backglass', 800),
('iPhone 16', 'charging', 'Charging System', 450),
('iPhone 16', 'front_camera', 'Front Camera', 600),
('iPhone 16', 'back_camera', 'Back Camera', 900),
('iPhone 16', 'face_id', 'Face ID', 1000),
-- iPhone 15 Pro Max
('iPhone 15 Pro Max', 'screen', 'Screen', 2500),
('iPhone 15 Pro Max', 'battery', 'Battery', 850),
('iPhone 15 Pro Max', 'backglass', 'Backglass', 600),
('iPhone 15 Pro Max', 'charging', 'Charging System', 450),
('iPhone 15 Pro Max', 'front_camera', 'Front Camera', 500),
('iPhone 15 Pro Max', 'back_camera', 'Back Camera', 800),
('iPhone 15 Pro Max', 'face_id', 'Face ID', 1000),
-- iPhone 15 Pro
('iPhone 15 Pro', 'screen', 'Screen', 2100),
('iPhone 15 Pro', 'battery', 'Battery', 850),
('iPhone 15 Pro', 'backglass', 'Backglass', 600),
('iPhone 15 Pro', 'charging', 'Charging System', 450),
('iPhone 15 Pro', 'front_camera', 'Front Camera', 500),
('iPhone 15 Pro', 'back_camera', 'Back Camera', 800),
('iPhone 15 Pro', 'face_id', 'Face ID', 1000),
-- iPhone 15 Plus
('iPhone 15 Plus', 'screen', 'Screen', 1800),
('iPhone 15 Plus', 'battery', 'Battery', 850),
('iPhone 15 Plus', 'backglass', 'Backglass', 600),
('iPhone 15 Plus', 'charging', 'Charging System', 450),
('iPhone 15 Plus', 'front_camera', 'Front Camera', 500),
('iPhone 15 Plus', 'back_camera', 'Back Camera', 800),
('iPhone 15 Plus', 'face_id', 'Face ID', 850),
-- iPhone 15
('iPhone 15', 'screen', 'Screen', 1600),
('iPhone 15', 'battery', 'Battery', 850),
('iPhone 15', 'backglass', 'Backglass', 600),
('iPhone 15', 'charging', 'Charging System', 450),
('iPhone 15', 'front_camera', 'Front Camera', 500),
('iPhone 15', 'back_camera', 'Back Camera', 800),
('iPhone 15', 'face_id', 'Face ID', 800),
-- iPhone 14 Pro Max
('iPhone 14 Pro Max', 'screen', 'Screen', 2200),
('iPhone 14 Pro Max', 'battery', 'Battery', 750),
('iPhone 14 Pro Max', 'backglass', 'Backglass', 500),
('iPhone 14 Pro Max', 'charging', 'Charging System', 400),
('iPhone 14 Pro Max', 'front_camera', 'Front Camera', 450),
('iPhone 14 Pro Max', 'back_camera', 'Back Camera', 650),
('iPhone 14 Pro Max', 'face_id', 'Face ID', 950),
-- iPhone 14 Pro
('iPhone 14 Pro', 'screen', 'Screen', 1800),
('iPhone 14 Pro', 'battery', 'Battery', 750),
('iPhone 14 Pro', 'backglass', 'Backglass', 500),
('iPhone 14 Pro', 'charging', 'Charging System', 400),
('iPhone 14 Pro', 'front_camera', 'Front Camera', 450),
('iPhone 14 Pro', 'back_camera', 'Back Camera', 650),
('iPhone 14 Pro', 'face_id', 'Face ID', 900),
-- iPhone 14 Plus
('iPhone 14 Plus', 'screen', 'Screen', 1400),
('iPhone 14 Plus', 'battery', 'Battery', 750),
('iPhone 14 Plus', 'backglass', 'Backglass', 500),
('iPhone 14 Plus', 'charging', 'Charging System', 400),
('iPhone 14 Plus', 'front_camera', 'Front Camera', 450),
('iPhone 14 Plus', 'back_camera', 'Back Camera', 650),
('iPhone 14 Plus', 'face_id', 'Face ID', 800),
-- iPhone 14
('iPhone 14', 'screen', 'Screen', 1200),
('iPhone 14', 'battery', 'Battery', 750),
('iPhone 14', 'backglass', 'Backglass', 500),
('iPhone 14', 'charging', 'Charging System', 400),
('iPhone 14', 'front_camera', 'Front Camera', 450),
('iPhone 14', 'back_camera', 'Back Camera', 650),
('iPhone 14', 'face_id', 'Face ID', 700),
-- iPhone 13 Pro Max
('iPhone 13 Pro Max', 'screen', 'Screen', 1500),
('iPhone 13 Pro Max', 'battery', 'Battery', 500),
('iPhone 13 Pro Max', 'backglass', 'Backglass', 350),
('iPhone 13 Pro Max', 'charging', 'Charging System', 300),
('iPhone 13 Pro Max', 'front_camera', 'Front Camera', 400),
('iPhone 13 Pro Max', 'back_camera', 'Back Camera', 550),
('iPhone 13 Pro Max', 'face_id', 'Face ID', 750),
-- iPhone 13 Pro
('iPhone 13 Pro', 'screen', 'Screen', 1300),
('iPhone 13 Pro', 'battery', 'Battery', 490),
('iPhone 13 Pro', 'backglass', 'Backglass', 350),
('iPhone 13 Pro', 'charging', 'Charging System', 300),
('iPhone 13 Pro', 'front_camera', 'Front Camera', 400),
('iPhone 13 Pro', 'back_camera', 'Back Camera', 550),
('iPhone 13 Pro', 'face_id', 'Face ID', 700),
-- iPhone 13
('iPhone 13', 'screen', 'Screen', 950),
('iPhone 13', 'battery', 'Battery', 450),
('iPhone 13', 'backglass', 'Backglass', 350),
('iPhone 13', 'charging', 'Charging System', 300),
('iPhone 13', 'front_camera', 'Front Camera', 400),
('iPhone 13', 'back_camera', 'Back Camera', 550),
('iPhone 13', 'face_id', 'Face ID', 600),
-- iPhone 12 Pro Max
('iPhone 12 Pro Max', 'screen', 'Screen', 1200),
('iPhone 12 Pro Max', 'battery', 'Battery', 400),
('iPhone 12 Pro Max', 'backglass', 'Backglass', 300),
('iPhone 12 Pro Max', 'charging', 'Charging System', 280),
('iPhone 12 Pro Max', 'front_camera', 'Front Camera', 350),
('iPhone 12 Pro Max', 'back_camera', 'Back Camera', 450),
('iPhone 12 Pro Max', 'face_id', 'Face ID', 600),
-- iPhone 12 Pro
('iPhone 12 Pro', 'screen', 'Screen', 1000),
('iPhone 12 Pro', 'battery', 'Battery', 400),
('iPhone 12 Pro', 'backglass', 'Backglass', 300),
('iPhone 12 Pro', 'charging', 'Charging System', 280),
('iPhone 12 Pro', 'front_camera', 'Front Camera', 350),
('iPhone 12 Pro', 'back_camera', 'Back Camera', 450),
('iPhone 12 Pro', 'face_id', 'Face ID', 550),
-- iPhone 12
('iPhone 12', 'screen', 'Screen', 800),
('iPhone 12', 'battery', 'Battery', 350),
('iPhone 12', 'backglass', 'Backglass', 300),
('iPhone 12', 'charging', 'Charging System', 280),
('iPhone 12', 'front_camera', 'Front Camera', 350),
('iPhone 12', 'back_camera', 'Back Camera', 450),
('iPhone 12', 'face_id', 'Face ID', 500),
-- iPhone 11 Pro Max
('iPhone 11 Pro Max', 'screen', 'Screen', 1100),
('iPhone 11 Pro Max', 'battery', 'Battery', 350),
('iPhone 11 Pro Max', 'backglass', 'Backglass', 250),
('iPhone 11 Pro Max', 'charging', 'Charging System', 250),
('iPhone 11 Pro Max', 'front_camera', 'Front Camera', 300),
('iPhone 11 Pro Max', 'back_camera', 'Back Camera', 400),
('iPhone 11 Pro Max', 'face_id', 'Face ID', 550),
-- iPhone 11 Pro
('iPhone 11 Pro', 'screen', 'Screen', 950),
('iPhone 11 Pro', 'battery', 'Battery', 350),
('iPhone 11 Pro', 'backglass', 'Backglass', 250),
('iPhone 11 Pro', 'charging', 'Charging System', 250),
('iPhone 11 Pro', 'front_camera', 'Front Camera', 300),
('iPhone 11 Pro', 'back_camera', 'Back Camera', 400),
('iPhone 11 Pro', 'face_id', 'Face ID', 500),
-- iPhone 11
('iPhone 11', 'screen', 'Screen', 600),
('iPhone 11', 'battery', 'Battery', 250),
('iPhone 11', 'backglass', 'Backglass', 250),
('iPhone 11', 'charging', 'Charging System', 250),
('iPhone 11', 'front_camera', 'Front Camera', 300),
('iPhone 11', 'back_camera', 'Back Camera', 400),
('iPhone 11', 'face_id', 'Face ID', 450),
-- iPhone XR
('iPhone XR', 'screen', 'Screen', 400),
('iPhone XR', 'battery', 'Battery', 200),
('iPhone XR', 'backglass', 'Backglass', 200),
('iPhone XR', 'charging', 'Charging System', 200),
('iPhone XR', 'front_camera', 'Front Camera', 220),
('iPhone XR', 'back_camera', 'Back Camera', 270),
('iPhone XR', 'face_id', 'Face ID', 400)
ON CONFLICT (model, fault_code) DO UPDATE
SET deduction = EXCLUDED.deduction,
    updated_at = NOW();

COMMIT;
