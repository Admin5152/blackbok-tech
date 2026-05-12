-- ============================================================
-- BlackBox: Repair Requests table + REP00001 display_id generator
--
-- Fixes REP-24 ("Could not find the 'device' column of
-- 'repair_requests' in the schema cache"). Root cause: no prior
-- migration created `public.repair_requests`, so the deployed
-- table was hand-built and is missing most of the columns the
-- client now writes. This file:
--
--   1. Creates the table if it's missing, with every column the
--      client uses today.
--   2. Re-asserts each column via ADD COLUMN IF NOT EXISTS so a
--      partial table is also healed.
--   3. Adds a REP00001-style display_id generator.
--   4. Sets up RLS so users manage their own requests and admins
--      have full access.
--   5. Refreshes the PostgREST schema cache.
--
-- Safe to re-run.
-- ============================================================
BEGIN;

-- ------------------------------------------------------------
-- 1. Base table
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.repair_requests (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_id          TEXT UNIQUE,

  user_id             UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_id         UUID,
  user_name           TEXT,

  device_brand        TEXT,
  device_model        TEXT,

  issue_type          TEXT,
  issue_description   TEXT,
  ai_diagnosis        TEXT,
  image_urls          TEXT[] DEFAULT '{}'::TEXT[],
  accessories         TEXT[] DEFAULT '{}'::TEXT[],
  urgency             TEXT,

  fulfillment_method  TEXT,
  preferred_date      DATE,
  preferred_time      TEXT,

  contact_name        TEXT,
  contact_phone       TEXT,
  contact_email       TEXT,

  repair_approval     TEXT,
  data_backup         TEXT,
  diagnostic_fee      TEXT,
  agrees_to_terms     BOOLEAN DEFAULT FALSE,
  client_signature    TEXT,

  estimated_cost      NUMERIC(10,2),
  final_cost          NUMERIC(10,2),

  technician_notes    TEXT,
  admin_note          TEXT,
  assigned_technician UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  status              TEXT NOT NULL DEFAULT 'pending',

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 2. Re-assert every column (heals partially-built tables)
-- ------------------------------------------------------------
ALTER TABLE public.repair_requests
  ADD COLUMN IF NOT EXISTS display_id          TEXT,
  ADD COLUMN IF NOT EXISTS customer_id         UUID,
  ADD COLUMN IF NOT EXISTS user_name           TEXT,
  ADD COLUMN IF NOT EXISTS device_brand        TEXT,
  ADD COLUMN IF NOT EXISTS device_model        TEXT,
  ADD COLUMN IF NOT EXISTS issue_type          TEXT,
  ADD COLUMN IF NOT EXISTS issue_description   TEXT,
  ADD COLUMN IF NOT EXISTS ai_diagnosis        TEXT,
  ADD COLUMN IF NOT EXISTS image_urls          TEXT[] DEFAULT '{}'::TEXT[],
  ADD COLUMN IF NOT EXISTS accessories         TEXT[] DEFAULT '{}'::TEXT[],
  ADD COLUMN IF NOT EXISTS urgency             TEXT,
  ADD COLUMN IF NOT EXISTS fulfillment_method  TEXT,
  ADD COLUMN IF NOT EXISTS preferred_date      DATE,
  ADD COLUMN IF NOT EXISTS preferred_time      TEXT,
  ADD COLUMN IF NOT EXISTS contact_name        TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone       TEXT,
  ADD COLUMN IF NOT EXISTS contact_email       TEXT,
  ADD COLUMN IF NOT EXISTS repair_approval     TEXT,
  ADD COLUMN IF NOT EXISTS data_backup         TEXT,
  ADD COLUMN IF NOT EXISTS diagnostic_fee      TEXT,
  ADD COLUMN IF NOT EXISTS agrees_to_terms     BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS client_signature    TEXT,
  ADD COLUMN IF NOT EXISTS estimated_cost      NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS final_cost          NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS technician_notes    TEXT,
  ADD COLUMN IF NOT EXISTS admin_note          TEXT,
  ADD COLUMN IF NOT EXISTS assigned_technician UUID,
  ADD COLUMN IF NOT EXISTS status              TEXT,
  ADD COLUMN IF NOT EXISTS created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE public.repair_requests SET status = 'pending' WHERE status IS NULL;
UPDATE public.repair_requests SET image_urls  = '{}'::TEXT[] WHERE image_urls  IS NULL;
UPDATE public.repair_requests SET accessories = '{}'::TEXT[] WHERE accessories IS NULL;

-- Make sure the assigned_technician FK constraint exists. We don't
-- error if it's already there.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name   = 'repair_requests'
      AND constraint_type = 'FOREIGN KEY'
      AND constraint_name = 'repair_requests_assigned_technician_fkey'
  ) THEN
    ALTER TABLE public.repair_requests
      ADD CONSTRAINT repair_requests_assigned_technician_fkey
      FOREIGN KEY (assigned_technician)
      REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ------------------------------------------------------------
-- 3. Indexes
-- ------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS uq_repair_requests_display_id
  ON public.repair_requests (display_id)
  WHERE display_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_repair_requests_user_id
  ON public.repair_requests (user_id);

CREATE INDEX IF NOT EXISTS idx_repair_requests_status
  ON public.repair_requests (status);

-- ------------------------------------------------------------
-- 4. REP00001 display_id generator
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_generate_repair_display_id()
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
    MAX(NULLIF(REGEXP_REPLACE(COALESCE(r.display_id, ''), '\D', '', 'g'), '')::INTEGER),
    0
  )
    INTO v_last_num
    FROM public.repair_requests r
   WHERE r.display_id IS NOT NULL;

  NEW.display_id := 'REP' || LPAD((v_last_num + 1)::TEXT, 5, '0');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_repair_requests_display_id
  ON public.repair_requests;
CREATE TRIGGER trg_repair_requests_display_id
  BEFORE INSERT ON public.repair_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_generate_repair_display_id();

-- Backfill existing rows that don't have a display_id yet.
DO $$
DECLARE
  r RECORD;
  v_last_num INTEGER;
BEGIN
  SELECT COALESCE(
    MAX(NULLIF(REGEXP_REPLACE(COALESCE(display_id, ''), '\D', '', 'g'), '')::INTEGER),
    0
  ) INTO v_last_num
  FROM public.repair_requests
  WHERE display_id IS NOT NULL;

  FOR r IN
    SELECT id FROM public.repair_requests
    WHERE display_id IS NULL
    ORDER BY created_at ASC
  LOOP
    v_last_num := v_last_num + 1;
    UPDATE public.repair_requests
       SET display_id = 'REP' || LPAD(v_last_num::TEXT, 5, '0')
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

DROP TRIGGER IF EXISTS trg_repair_requests_updated_at
  ON public.repair_requests;
CREATE TRIGGER trg_repair_requests_updated_at
  BEFORE UPDATE ON public.repair_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_touch_updated_at();

-- ------------------------------------------------------------
-- 6. Row Level Security
-- ------------------------------------------------------------
ALTER TABLE public.repair_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "repair_requests_insert_own"   ON public.repair_requests;
DROP POLICY IF EXISTS "repair_requests_select_own"   ON public.repair_requests;
DROP POLICY IF EXISTS "repair_requests_update_own"   ON public.repair_requests;
DROP POLICY IF EXISTS "repair_requests_admin_all"    ON public.repair_requests;

CREATE POLICY "repair_requests_insert_own"
  ON public.repair_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "repair_requests_select_own"
  ON public.repair_requests
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "repair_requests_update_own"
  ON public.repair_requests
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "repair_requests_admin_all"
  ON public.repair_requests
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
-- 7. Realtime
-- ------------------------------------------------------------
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.repair_requests;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
  END;
END $$;

ALTER TABLE public.repair_requests REPLICA IDENTITY FULL;

-- ------------------------------------------------------------
-- 8. Refresh PostgREST schema cache so the API picks up the new
--    columns immediately (this is what fixes REP-24's "could not
--    find the 'device' column" error — once the rest of the
--    columns are present and the cache is refreshed, the client's
--    normalizer is no longer fighting a stale schema).
-- ------------------------------------------------------------
NOTIFY pgrst, 'reload schema';

COMMIT;
