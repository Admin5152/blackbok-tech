-- ============================================================
-- Add missing `staff` label to public.app_role (legacy DBs).
--
-- Older installs may have app_role = ('user','admin') only. Newer
-- migrations expect 'staff' (e.g. 2026_05_products_catalog_rls.sql).
--
-- Run AFTER 2026_05_production_ready.sql (or any migration that created
-- app_role). Safe to re-run: no-op if staff already exists.
-- ============================================================
BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'app_role'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'app_role'
      AND e.enumlabel = 'staff'
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'staff';
  END IF;
END
$$;

COMMIT;
