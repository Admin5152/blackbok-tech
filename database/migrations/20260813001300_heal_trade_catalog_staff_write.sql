-- =============================================================================
-- Ensure staff can WRITE trade catalog tables (devices / config / Q&A / aesthetics)
-- Migration: 20260813001300_heal_trade_catalog_staff_write.sql
--
-- Deadlock-safe: one table at a time (auto-commit per statement via DO),
-- short lock_timeout, skip missing tables.
-- =============================================================================

SET lock_timeout = '8s';
SET statement_timeout = '60s';

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'trade_aesthetic_overrides',
    'trade_answers',
    'trade_config',
    'trade_devices',
    'trade_questions'
  ]
  LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      RAISE NOTICE 'skip % — table missing', t;
      CONTINUE;
    END IF;

    EXECUTE format('LOCK TABLE public.%I IN ACCESS EXCLUSIVE MODE', t);
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

RESET lock_timeout;
RESET statement_timeout;
