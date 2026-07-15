-- ============================================================
-- BlackBox: Trade-In Requests table + display_id generator
--
-- Fixes TRD-14 ("could not find the table 'public.trade_requests'
-- in the schema cache"). The codebase writes to
-- `public.trade_in_requests` via lib/api.ts:createTradeRequest, but
-- the table was never created by any prior migration. This file
-- creates it idempotently with every column the client writes and
-- adds the TRD00001-style display_id generator + RLS + Realtime.
--
-- Safe to re-run.
-- ============================================================
BEGIN;

-- ------------------------------------------------------------
-- 1. Base table
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trade_in_requests (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_id         TEXT UNIQUE,

  user_id            UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_id        UUID,
  user_name          TEXT,
  user_email         TEXT,
  user_description   TEXT,

  device_brand       TEXT,
  device_name        TEXT,
  device_type        TEXT,
  condition          TEXT,
  accessories        TEXT[] DEFAULT '{}'::TEXT[],

  pricing_mode       TEXT,
  storage_tier       TEXT,
  sim_variant        TEXT,
  base_trade_value   NUMERIC(10,2),
  deduction_breakdown JSONB,
  component_flags    TEXT[],
  estimated_value    NUMERIC(10,2) DEFAULT 0,
  offered_price      NUMERIC(10,2),
  final_value        NUMERIC(10,2),

  target_device      TEXT,
  target_product_id  TEXT,
  target_variant_id  TEXT,
  target_product_price NUMERIC(10,2),
  top_up_amount      NUMERIC(10,2),

  preferred_date     DATE,
  preferred_time     TEXT,
  fulfillment_method TEXT,

  contact_name       TEXT,
  contact_phone      TEXT,
  contact_email      TEXT,

  admin_notes        TEXT,

  status             TEXT NOT NULL DEFAULT 'submitted',

  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 2. Reassert every column in case an older variant of the table
--    exists (e.g. created via the Supabase UI with a partial set).
-- ------------------------------------------------------------
ALTER TABLE public.trade_in_requests
  ADD COLUMN IF NOT EXISTS display_id         TEXT,
  ADD COLUMN IF NOT EXISTS customer_id        UUID,
  ADD COLUMN IF NOT EXISTS user_name          TEXT,
  ADD COLUMN IF NOT EXISTS user_email         TEXT,
  ADD COLUMN IF NOT EXISTS user_description   TEXT,
  ADD COLUMN IF NOT EXISTS device_brand       TEXT,
  ADD COLUMN IF NOT EXISTS device_name        TEXT,
  ADD COLUMN IF NOT EXISTS device_type        TEXT,
  ADD COLUMN IF NOT EXISTS condition          TEXT,
  ADD COLUMN IF NOT EXISTS accessories        TEXT[] DEFAULT '{}'::TEXT[],
  ADD COLUMN IF NOT EXISTS pricing_mode       TEXT,
  ADD COLUMN IF NOT EXISTS storage_tier       TEXT,
  ADD COLUMN IF NOT EXISTS sim_variant        TEXT,
  ADD COLUMN IF NOT EXISTS base_trade_value   NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS deduction_breakdown JSONB,
  ADD COLUMN IF NOT EXISTS component_flags    TEXT[],
  ADD COLUMN IF NOT EXISTS target_device      TEXT,
  ADD COLUMN IF NOT EXISTS target_product_id  TEXT,
  ADD COLUMN IF NOT EXISTS target_variant_id  TEXT,
  ADD COLUMN IF NOT EXISTS target_product_price NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS top_up_amount      NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS estimated_value    NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS offered_price      NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS final_value        NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS preferred_date     DATE,
  ADD COLUMN IF NOT EXISTS preferred_time     TEXT,
  ADD COLUMN IF NOT EXISTS fulfillment_method TEXT,
  ADD COLUMN IF NOT EXISTS contact_name       TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone      TEXT,
  ADD COLUMN IF NOT EXISTS contact_email      TEXT,
  ADD COLUMN IF NOT EXISTS admin_notes        TEXT,
  ADD COLUMN IF NOT EXISTS status             TEXT,
  ADD COLUMN IF NOT EXISTS created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE public.trade_in_requests SET status = 'submitted' WHERE status IS NULL;
UPDATE public.trade_in_requests SET accessories = '{}'::TEXT[] WHERE accessories IS NULL;

-- ------------------------------------------------------------
-- 3. Indexes
-- ------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS uq_trade_in_requests_display_id
  ON public.trade_in_requests (display_id)
  WHERE display_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_trade_in_requests_user_id
  ON public.trade_in_requests (user_id);

CREATE INDEX IF NOT EXISTS idx_trade_in_requests_status
  ON public.trade_in_requests (status);

-- ------------------------------------------------------------
-- 4. display_id generator — TRD00001, TRD00002, ...
--    Runs BEFORE INSERT so the value is visible in the RETURNING
--    clause. We compute the next number from the highest existing
--    display_id digits, then format with leading zeros.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_generate_trade_display_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_last_num INTEGER;
BEGIN
  IF NEW.display_id IS NOT NULL AND NEW.display_id <> '' THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(
    MAX(NULLIF(REGEXP_REPLACE(COALESCE(t.display_id, ''), '\D', '', 'g'), '')::INTEGER),
    0
  )
    INTO v_last_num
    FROM public.trade_in_requests t
   WHERE t.display_id IS NOT NULL;

  NEW.display_id := 'TRD' || LPAD((v_last_num + 1)::TEXT, 5, '0');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_trade_in_requests_display_id
  ON public.trade_in_requests;
CREATE TRIGGER trg_trade_in_requests_display_id
  BEFORE INSERT ON public.trade_in_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_generate_trade_display_id();

-- Backfill any existing rows that don't have a display_id yet.
DO $$
DECLARE
  r RECORD;
  v_last_num INTEGER;
BEGIN
  SELECT COALESCE(
    MAX(NULLIF(REGEXP_REPLACE(COALESCE(display_id, ''), '\D', '', 'g'), '')::INTEGER),
    0
  ) INTO v_last_num
  FROM public.trade_in_requests
  WHERE display_id IS NOT NULL;

  FOR r IN
    SELECT id FROM public.trade_in_requests
    WHERE display_id IS NULL
    ORDER BY created_at ASC
  LOOP
    v_last_num := v_last_num + 1;
    UPDATE public.trade_in_requests
       SET display_id = 'TRD' || LPAD(v_last_num::TEXT, 5, '0')
     WHERE id = r.id;
  END LOOP;
END $$;

-- ------------------------------------------------------------
-- 5. updated_at maintenance
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_trade_in_requests_updated_at
  ON public.trade_in_requests;
CREATE TRIGGER trg_trade_in_requests_updated_at
  BEFORE UPDATE ON public.trade_in_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_touch_updated_at();

-- ------------------------------------------------------------
-- 6. Row Level Security
--    - Authenticated users can insert their own rows.
--    - Authenticated users can read their own rows.
--    - Authenticated users can update their own rows (so accept/
--      decline of an offer works from the client).
--    - Admins have full access.
-- ------------------------------------------------------------
ALTER TABLE public.trade_in_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trade_in_requests_insert_own"   ON public.trade_in_requests;
DROP POLICY IF EXISTS "trade_in_requests_select_own"   ON public.trade_in_requests;
DROP POLICY IF EXISTS "trade_in_requests_update_own"   ON public.trade_in_requests;
DROP POLICY IF EXISTS "trade_in_requests_admin_all"    ON public.trade_in_requests;

CREATE POLICY "trade_in_requests_insert_own"
  ON public.trade_in_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "trade_in_requests_select_own"
  ON public.trade_in_requests
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "trade_in_requests_update_own"
  ON public.trade_in_requests
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "trade_in_requests_admin_all"
  ON public.trade_in_requests
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- ------------------------------------------------------------
-- 7. Realtime — let the admin dashboard subscribe to status
--    changes. Wrapped in a DO block so re-runs don't error.
-- ------------------------------------------------------------
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.trade_in_requests;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
  END;
END $$;

ALTER TABLE public.trade_in_requests REPLICA IDENTITY FULL;

-- ------------------------------------------------------------
-- 8. Refresh PostgREST schema cache so the new table becomes
--    visible to the client immediately without restarting the
--    Supabase API container.
-- ------------------------------------------------------------
NOTIFY pgrst, 'reload schema';

COMMIT;
