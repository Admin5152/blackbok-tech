-- ============================================================
-- Notifications schema reconcile (legacy message/order_id → body/reference_id)
--
-- Older installs used schema_updates.sql (message, order_id, order_ready…).
-- Newer code + triggers expect body, reference_id, type in
-- (info|order|repair|trade|promo). This migration is idempotent.
-- ============================================================
BEGIN;

-- Ensure core columns exist
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS body TEXT,
  ADD COLUMN IF NOT EXISTS reference_id UUID,
  ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Backfill body from legacy message when present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'message'
  ) THEN
    EXECUTE $q$
      UPDATE public.notifications
         SET body = COALESCE(NULLIF(BTRIM(body), ''), message, title, 'Update')
       WHERE body IS NULL OR BTRIM(body) = ''
    $q$;
  ELSE
    UPDATE public.notifications
       SET body = COALESCE(NULLIF(BTRIM(body), ''), title, 'Update')
     WHERE body IS NULL OR BTRIM(body) = '';
  END IF;
END$$;

-- Backfill reference_id from legacy order_id when present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'order_id'
  ) THEN
    EXECUTE $q$
      UPDATE public.notifications
         SET reference_id = COALESCE(reference_id, order_id)
       WHERE reference_id IS NULL AND order_id IS NOT NULL
    $q$;
  END IF;
END$$;

ALTER TABLE public.notifications
  ALTER COLUMN body SET DEFAULT 'Update';

UPDATE public.notifications
   SET body = COALESCE(NULLIF(BTRIM(body), ''), 'Update')
 WHERE body IS NULL;

ALTER TABLE public.notifications
  ALTER COLUMN body SET NOT NULL;

-- Normalize legacy type values before CHECK
UPDATE public.notifications
   SET type = CASE
     WHEN LOWER(type) LIKE 'order_%' THEN 'order'
     WHEN LOWER(type) IN ('info','order','repair','trade','promo') THEN LOWER(type)
     ELSE 'info'
   END;

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('info','order','repair','trade','promo'));

-- Customer delete policy (bell "Clear all")
DROP POLICY IF EXISTS "Users delete own notifications" ON public.notifications;
CREATE POLICY "Users delete own notifications" ON public.notifications
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

COMMIT;
