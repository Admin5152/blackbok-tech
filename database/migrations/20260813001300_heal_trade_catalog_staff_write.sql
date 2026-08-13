-- =============================================================================
-- Ensure staff can WRITE trade catalog tables (devices / config / Q&A / aesthetics)
-- Migration: 20260813001300_heal_trade_catalog_staff_write.sql
--
-- 2026_07_trade_public_read_fix.sql added SELECT-only policies. Staff admin
-- screens also INSERT/UPDATE/DELETE these rows — recreate manage policies.
-- Idempotent. Tables that do not exist yet are skipped safely via DO blocks.
-- =============================================================================

BEGIN;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'trade_devices',
    'trade_config',
    'trade_questions',
    'trade_answers',
    'trade_aesthetic_overrides'
  ]
  LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      RAISE NOTICE 'skip % — table missing', t;
      CONTINUE;
    END IF;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_staff_manage', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated
         USING (
           public.has_role(auth.uid(), ''admin''::public.app_role)
           OR public.has_role(auth.uid(), ''staff''::public.app_role)
           OR public.fn_is_staff()
         )
         WITH CHECK (
           public.has_role(auth.uid(), ''admin''::public.app_role)
           OR public.has_role(auth.uid(), ''staff''::public.app_role)
           OR public.fn_is_staff()
         )',
      t || '_staff_manage',
      t
    );
  END LOOP;
END $$;

COMMIT;
