-- Repair images: private bucket + storage.objects RLS so only the owning user
-- (path prefix = auth.uid()) or staff/admin (has_role) can read via the API.
-- Public URLs for this bucket bypass RLS, so public=false is required for real isolation.
--
-- Depends on: public.has_role (roles / user_roles migrations).
-- After this migration, the app must use createSignedUrl (see lib/upload.ts).

BEGIN;

UPDATE storage.buckets
SET public = false
WHERE id = 'repair-images';

-- Remove world-readable SELECT (was effectively leaking all repair photos).
DROP POLICY IF EXISTS "repair_images_select_public" ON storage.objects;

-- Authenticated users: own folder only (upload path is `${auth.uid()}/...` per lib/upload.ts).
DROP POLICY IF EXISTS "repair_images_select_own" ON storage.objects;
CREATE POLICY "repair_images_select_own"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'repair-images'
    AND (
      split_part(name, '/', 1) = auth.uid()::text
      OR owner = auth.uid()
    )
  );

-- Staff / admin: review queue and diagnostics (same access pattern as repair_requests RLS).
DROP POLICY IF EXISTS "repair_images_select_staff_admin" ON storage.objects;
CREATE POLICY "repair_images_select_staff_admin"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'repair-images'
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'staff'::public.app_role)
    )
  );

-- Optional: allow users to replace objects in their prefix (upsert flows).
DROP POLICY IF EXISTS "repair_images_update_own" ON storage.objects;
CREATE POLICY "repair_images_update_own"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'repair-images'
    AND (
      split_part(name, '/', 1) = auth.uid()::text
      OR owner = auth.uid()
    )
  )
  WITH CHECK (
    bucket_id = 'repair-images'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

COMMIT;
