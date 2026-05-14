-- Allow signed-in users to delete their own in-app notification rows (bell "Clear all" / dismiss).
-- SELECT + UPDATE policies already exist in gapfillmitigation.sql; DELETE was missing.

DROP POLICY IF EXISTS "Users delete own notifications" ON public.notifications;
CREATE POLICY "Users delete own notifications" ON public.notifications
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());
