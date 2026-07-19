-- ============================================================================
-- BlackBox — PART 2 (CORRECTED): TRADE→PRODUCT RESOLUTION + REDUNDANCY
-- 2026_07_trade_product_resolution_v2.sql
--
-- ⚠️ REPLACES 2026_07_trade_product_resolution.sql — that version had two
--    FATAL ordering errors found in review. Do not run the earlier file.
--      • CREATE OR REPLACE VIEW cannot insert a column in the MIDDLE of an
--        existing view's column list (only append at the end) → hard error.
--      • fn_suggest_trade_targets referenced v_trade_targets.sim_type before
--        the view had that column; SQL functions are parse-checked at CREATE
--        time → hard error.
--    Both fixed by ordering: columns → view rebuild → functions → triggers.
--    Also: inventory logging is now introspection-guarded (the dump never
--    showed inventory_adjustments' columns, so we verify before wiring).
--
-- Run AFTER 2026_07_production_trade_and_products.sql. Idempotent.
-- ============================================================================


-- ============================================================================
-- 1. product_variants.sim_type — the shop can now sell what trade prices
--    (iPhone 14+ PS vs eSIM differ by up to GHS 1,000 in the trade matrix;
--     retail had no way to express the difference)
-- ============================================================================
BEGIN;

ALTER TABLE public.product_variants
  ADD COLUMN IF NOT EXISTS sim_type TEXT;

ALTER TABLE public.product_variants DROP CONSTRAINT IF EXISTS product_variants_sim_type_check;
ALTER TABLE public.product_variants
  ADD CONSTRAINT product_variants_sim_type_check
  CHECK (sim_type IS NULL OR sim_type IN ('ps','es','single','wifi','cell_ps','cell_es'));

COMMENT ON COLUMN public.product_variants.sim_type IS
  'ps=Physical SIM, es=eSIM only, single=no split (pre-iPhone 14). iPad: wifi|cell_ps|cell_es. Same vocabulary as trade_base_values.sim_variant so trade-in and retail match.';

UPDATE public.product_variants pv
   SET sim_type = CASE
     WHEN lower(btrim(COALESCE(p.sim_type,''))) IN ('physical','physical sim','ps') THEN 'ps'
     WHEN lower(btrim(COALESCE(p.sim_type,''))) IN ('esim','e-sim','es')            THEN 'es'
     WHEN lower(btrim(COALESCE(p.sim_type,''))) IN ('wifi','wi-fi')                 THEN 'wifi'
     WHEN lower(btrim(COALESCE(p.sim_type,''))) LIKE '%cellular%'                   THEN 'cell_ps'
     ELSE 'single' END
  FROM public.products p
 WHERE pv.product_id = p.id AND pv.sim_type IS NULL;

DROP INDEX IF EXISTS public.uq_variant_combo;
DO $$
BEGIN
  CREATE UNIQUE INDEX uq_variant_combo ON public.product_variants
    (product_id, COALESCE(color,''), COALESCE(storage,''),
     COALESCE(ram,''), COALESCE(sim_type,''));
EXCEPTION
  WHEN duplicate_table  THEN NULL;
  WHEN unique_violation THEN
    RAISE WARNING 'Duplicate variant rows exist — deduplicate (query 7d) then re-run this index.';
END $$;

COMMIT;


-- ============================================================================
-- 2. VIEW REBUILT FIRST (fixes BUG 1 + unblocks the functions in §3)
--    DROP then CREATE, because the new column sits mid-list.
-- ============================================================================
BEGIN;

DROP VIEW IF EXISTS public.v_trade_targets CASCADE;

CREATE VIEW public.v_trade_targets AS
SELECT p.id AS product_id, p.name, p.slug, p.category, p.condition, p.trade_model,
       p.image_url AS product_image,
       pv.id AS variant_id, pv.sku,
       pv.color, pv.storage, pv.ram, pv.sim_type,
       COALESCE(pv.price, p.price + COALESCE(pv.price_modifier,0)) AS effective_price,
       COALESCE(pv.stock,0) AS variant_stock,
       COALESCE(pv.image_url, p.image_url) AS display_image
  FROM public.products p
  JOIN public.product_variants pv ON pv.product_id = p.id
 WHERE p.status = 'active' AND pv.is_active
UNION ALL
SELECT p.id, p.name, p.slug, p.category, p.condition, p.trade_model, p.image_url,
       NULL::UUID, NULL, NULL, NULL, NULL, NULL,
       p.price, COALESCE(p.stock,0), p.image_url
  FROM public.products p
 WHERE p.status = 'active'
   AND NOT EXISTS (SELECT 1 FROM public.product_variants pv WHERE pv.product_id = p.id);

GRANT SELECT ON public.v_trade_targets TO anon, authenticated;

-- Which catalog products correspond to each tradeable device
CREATE OR REPLACE VIEW public.v_trade_device_products AS
SELECT td.model AS trade_model, td.device_type, td.series, td.product_line,
       p.id AS product_id, p.name AS product_name, p.slug, p.category,
       p.condition, p.status, p.price AS product_base_price, p.image_url
  FROM public.trade_devices td
  JOIN public.products p ON p.trade_model = td.model
 WHERE p.status = 'active';

GRANT SELECT ON public.v_trade_device_products TO anon, authenticated;

COMMIT;


-- ============================================================================
-- 3. RESOLVER FUNCTIONS (created AFTER the view — fixes BUG 2)
-- ============================================================================
BEGIN;

-- 3a. Exact configuration → sellable SKU, with an honest confidence label.
CREATE OR REPLACE FUNCTION public.fn_resolve_product_variant(
  p_trade_model TEXT,
  p_storage     TEXT DEFAULT NULL,
  p_sim         TEXT DEFAULT NULL,
  p_color       TEXT DEFAULT NULL
)
RETURNS TABLE (
  product_id UUID, variant_id UUID, product_name TEXT,
  color TEXT, storage TEXT, sim_type TEXT,
  effective_price NUMERIC, stock INTEGER, image_url TEXT, match_quality TEXT
)
LANGUAGE sql STABLE AS $$
  WITH base AS (
    SELECT p.id AS pid, p.name, p.price AS pprice, p.image_url AS pimg
      FROM public.products p
     WHERE p.trade_model = p_trade_model AND p.status = 'active'
  ), scored AS (
    SELECT b.pid, pv.id AS vid, b.name, pv.color, pv.storage, pv.sim_type,
           COALESCE(pv.price, b.pprice + COALESCE(pv.price_modifier,0)) AS eff_price,
           COALESCE(pv.stock,0) AS vstock,
           COALESCE(pv.image_url, b.pimg) AS img,
           (CASE WHEN p_storage IS NOT NULL
                  AND lower(btrim(COALESCE(pv.storage,''))) = lower(btrim(p_storage)) THEN 4 ELSE 0 END) +
           (CASE WHEN p_sim IS NOT NULL
                  AND lower(btrim(COALESCE(pv.sim_type,''))) = lower(btrim(p_sim))   THEN 2 ELSE 0 END) +
           (CASE WHEN p_color IS NOT NULL
                  AND lower(btrim(COALESCE(pv.color,'')))    = lower(btrim(p_color)) THEN 1 ELSE 0 END) AS score
      FROM base b
      JOIN public.product_variants pv ON pv.product_id = b.pid AND pv.is_active
  )
  SELECT pid, vid, name, color, storage, sim_type, eff_price, vstock, img,
         CASE score
           WHEN 7 THEN 'exact'          -- storage + sim + color
           WHEN 6 THEN 'storage_sim'
           WHEN 5 THEN 'storage_color'
           WHEN 4 THEN 'storage_only'
           WHEN 3 THEN 'sim_color'      -- BUG 4 fix: was falling through
           WHEN 2 THEN 'sim_only'
           WHEN 1 THEN 'color_only'     -- BUG 4 fix
           ELSE        'product_only'
         END
    FROM scored
   ORDER BY score DESC, vstock DESC, eff_price ASC
   LIMIT 1;
$$;

COMMENT ON FUNCTION public.fn_resolve_product_variant IS
  'Trade flow → shop lookup. Anything below match_quality=''exact'' must be shown to the customer as a choice, never auto-priced.';

-- 3b. Upgrade suggestions after they describe their device.
CREATE OR REPLACE FUNCTION public.fn_suggest_trade_targets(
  p_trade_model TEXT, p_limit INTEGER DEFAULT 6
)
RETURNS TABLE (
  product_id UUID, variant_id UUID, name TEXT, category TEXT,
  color TEXT, storage TEXT, sim_type TEXT,
  effective_price NUMERIC, variant_stock INTEGER, image TEXT
)
LANGUAGE sql STABLE AS $$
  WITH src AS (
    SELECT device_type, COALESCE(NULLIF(series,''),'0') AS series
      FROM public.trade_devices WHERE model = p_trade_model
  )
  SELECT t.product_id, t.variant_id, t.name, t.category, t.color, t.storage,
         t.sim_type, t.effective_price, t.variant_stock, t.display_image
    FROM public.v_trade_targets t
    LEFT JOIN public.trade_devices td ON td.model = t.trade_model
    LEFT JOIN src ON TRUE
   WHERE t.variant_stock > 0
     AND (
       (td.device_type = src.device_type
        AND td.series ~ '^[0-9]+$' AND src.series ~ '^[0-9]+$'
        AND td.series::INT >= src.series::INT)
       OR (td.model IS NULL AND t.category IN ('iPhone','iPad'))
       OR src.device_type IS NULL          -- unknown source model: show everything sellable
     )
   ORDER BY t.effective_price ASC
   LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.fn_resolve_product_variant(TEXT,TEXT,TEXT,TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_suggest_trade_targets(TEXT,INTEGER)          TO anon, authenticated;

COMMIT;


-- ============================================================================
-- 4. AUTO-RESOLVE TRIGGER (after the functions exist)
--    Fires BEFORE the price snapshot: Postgres runs BEFORE triggers in
--    alphabetical order, and 'trg_trade_autoresolve_target' sorts before
--    'trg_trade_snapshot_target_price'. ✔
-- ============================================================================
BEGIN;

CREATE OR REPLACE FUNCTION public.fn_trade_autoresolve_target()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r RECORD;
BEGIN
  IF NEW.target_variant_id IS NULL AND NEW.target_device IS NOT NULL THEN
    SELECT * INTO r FROM public.fn_resolve_product_variant(
      NEW.target_device, NEW.storage_tier, NEW.sim_variant, NEW.target_color);
    IF r.variant_id IS NOT NULL THEN
      NEW.target_variant_id := r.variant_id;
      NEW.target_product_id := COALESCE(NEW.target_product_id, r.product_id);
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_trade_autoresolve_target ON public.trade_in_requests;
CREATE TRIGGER trg_trade_autoresolve_target
  BEFORE INSERT ON public.trade_in_requests
  FOR EACH ROW EXECUTE FUNCTION public.fn_trade_autoresolve_target();

COMMIT;


-- ============================================================================
-- 5. REDUNDANCY — documented / resolved
-- ============================================================================
BEGIN;

-- 5a. products stores the same facts THREE ways: singular columns, arrays,
--     and variant rows. Arrays are now derived (Part 1); singular columns
--     are frozen. Not dropped — grep the app first, then drop in a later pass.
COMMENT ON COLUMN public.products.sku IS
  'DEPRECATED — real SKUs live on product_variants.sku. Legacy reads only; do not write.';
COMMENT ON COLUMN public.products.storage_capacity IS
  'DEPRECATED — use product_variants.storage (authoritative) or products.storage[] (derived chips).';
COMMENT ON COLUMN public.products.ram_capacity IS
  'DEPRECATED — use product_variants.ram / products.ram[].';
COMMENT ON COLUMN public.products.sim_type IS
  'DEPRECATED — moved to product_variants.sim_type (correct grain: one product sells PS and eSIM units at different prices).';
COMMENT ON COLUMN public.products.model IS
  'Free-text label. For trade-in matching use products.trade_model (FK to trade_devices).';

-- 5b. Three overlapping order-tracking views over the same two tables.
COMMENT ON VIEW public.order_tracking IS
  'Overlaps order_tracking_history / order_tracking_latest. Consolidate to one before adding new consumers.';

-- 5c. Denormalised order contact fields are CORRECT (purchase-time snapshot).
COMMENT ON COLUMN public.orders.customer_name IS
  'Snapshot at order time — intentionally denormalised. Do not replace with a join to customers/profiles.';

-- 5d. profiles.role mirrors user_roles.role; fn_is_staff() reads both so a
--     drift in either cannot lock staff out.
COMMENT ON COLUMN public.profiles.role IS
  'Mirrored into user_roles by trg_profiles_mirror_user_roles. fn_is_staff() checks both sources.';

-- 5e. Stray dev table — guarded (BUG 5 fix)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
              WHERE table_schema='public' AND table_name='test_table') THEN
    EXECUTE 'DROP TABLE public.test_table';
    RAISE NOTICE 'Dropped stray public.test_table';
  END IF;
END $$;

COMMIT;


-- ============================================================================
-- 6. INVENTORY INTAKE — introspection-guarded (BUG 3 fix)
--    Completed trades decremented the TARGET but never recorded the device
--    RECEIVED. We only wire this if inventory_adjustments has the expected
--    shape; otherwise we emit the exact column list so you can adapt it.
-- ============================================================================
BEGIN;

ALTER TABLE public.inventory_adjustments
  ADD COLUMN IF NOT EXISTS trade_request_id UUID REFERENCES public.trade_in_requests(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_inventory_adjustments_trade
  ON public.inventory_adjustments (trade_request_id);

COMMENT ON COLUMN public.inventory_adjustments.trade_request_id IS
  'Set when this row records a device RECEIVED from a completed trade-in.';

DO $$
DECLARE
  v_has_qty  BOOLEAN;
  v_has_type BOOLEAN;
  v_has_reason BOOLEAN;
  v_cols TEXT;
BEGIN
  SELECT
    bool_or(column_name IN ('quantity_change','quantity','qty_change')),
    bool_or(column_name IN ('adjustment_type','type','reason_code')),
    bool_or(column_name IN ('reason','notes','note'))
  INTO v_has_qty, v_has_type, v_has_reason
  FROM information_schema.columns
  WHERE table_schema='public' AND table_name='inventory_adjustments';

  IF COALESCE(v_has_qty,false) AND COALESCE(v_has_type,false) THEN
    RAISE NOTICE 'inventory_adjustments shape OK — wiring trade intake logger.';
  ELSE
    SELECT string_agg(column_name || ' ' || data_type, ', ' ORDER BY ordinal_position)
      INTO v_cols
      FROM information_schema.columns
     WHERE table_schema='public' AND table_name='inventory_adjustments';
    RAISE WARNING 'Trade intake logger NOT wired — inventory_adjustments columns are: %. Adapt fn_trade_log_incoming_device to this shape, then create the trigger manually.', v_cols;
  END IF;
END $$;

-- Logger writes a ZERO-quantity audit row: traded devices do NOT enter
-- sellable stock automatically (they need inspection/refurb first). Change
-- the quantity to 1 only if BlackBox decides otherwise — a business call.
CREATE OR REPLACE FUNCTION public.fn_trade_log_incoming_device()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_pid UUID;
BEGIN
  IF lower(btrim(COALESCE(NEW.status,''))) <> 'completed' THEN RETURN NEW; END IF;
  IF lower(btrim(COALESCE(OLD.status,''))) =  'completed' THEN RETURN NEW; END IF;

  SELECT p.id INTO v_pid FROM public.products p
   WHERE p.trade_model = NEW.device_name AND p.status='active' LIMIT 1;

  INSERT INTO public.inventory_adjustments
    (product_id, adjustment_type, quantity_change, reason, trade_request_id)
  VALUES
    (v_pid, 'trade_in_received', 0,
     format('Trade-in %s · %s %s %s · IMEI …%s · final GHS %s',
            COALESCE(NEW.display_id,'?'), COALESCE(NEW.device_name,'?'),
            COALESCE(NEW.storage_tier,''), COALESCE(NEW.sim_variant,''),
            COALESCE(right(NEW.imei_serial,4),'----'),
            COALESCE(NEW.final_value::TEXT,'?')),
     NEW.id);
  RETURN NEW;
EXCEPTION WHEN others THEN
  RAISE WARNING 'Trade intake log skipped (%): adapt fn_trade_log_incoming_device to your inventory_adjustments shape.', SQLERRM;
  RETURN NEW;
END $$;

-- Trigger created only when the shape check above passed.
DO $$
DECLARE v_ok BOOLEAN;
BEGIN
  SELECT bool_or(column_name='quantity_change') AND bool_or(column_name='adjustment_type')
    INTO v_ok FROM information_schema.columns
   WHERE table_schema='public' AND table_name='inventory_adjustments';

  IF COALESCE(v_ok,false) THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_trade_log_incoming_device ON public.trade_in_requests';
    EXECUTE 'CREATE TRIGGER trg_trade_log_incoming_device
             AFTER UPDATE OF status ON public.trade_in_requests
             FOR EACH ROW EXECUTE FUNCTION public.fn_trade_log_incoming_device()';
  END IF;
END $$;

COMMIT;

NOTIFY pgrst, 'reload schema';


-- ============================================================================
-- 7. VERIFICATION
-- ============================================================================
-- 7a. Tradeable devices we also sell:
--   SELECT trade_model, COUNT(*) FROM v_trade_device_products GROUP BY 1 ORDER BY 1;
--
-- 7b. Active Apple products not linked to the trade catalog (fix in admin):
--   SELECT id, name, category FROM products
--    WHERE category IN ('iPhone','iPad') AND status='active' AND trade_model IS NULL;
--
-- 7c. 🔴 iPhone 14+ variants still missing ps/es — until these are set the
--     resolver returns 'storage_only' instead of 'exact':
--   SELECT p.name, pv.storage, pv.color, pv.sim_type
--     FROM product_variants pv JOIN products p ON p.id=pv.product_id
--    WHERE p.category='iPhone' AND COALESCE(pv.sim_type,'single')='single'
--      AND p.trade_model ~ 'iPhone 1[4-7]';
--
-- 7d. Duplicate variants blocking uq_variant_combo:
--   SELECT product_id,color,storage,ram,sim_type,COUNT(*),SUM(stock)
--     FROM product_variants GROUP BY 1,2,3,4,5 HAVING COUNT(*)>1;
--
-- 7e. Resolver smoke test — expect match_quality='exact' once 7c is clean:
--   SELECT * FROM fn_resolve_product_variant('iPhone 16 Pro','256GB','es');
--
-- 7f. Suggestions smoke test:
--   SELECT * FROM fn_suggest_trade_targets('iPhone 13', 6);
--
-- 7g. Confirm the view actually rebuilt with sim_type:
--   SELECT column_name FROM information_schema.columns
--    WHERE table_name='v_trade_targets' ORDER BY ordinal_position;
--
-- 7h. Anything that depended on the OLD v_trade_targets was dropped by
--     CASCADE in §2 — check nothing else referenced it:
--   SELECT viewname FROM pg_views WHERE schemaname='public' ORDER BY 1;
-- ============================================================================