-- Supabase Storage: bucket for repair request photos (see lib/upload.ts, components/ImageUpload.tsx).
-- Run this in the Supabase SQL editor or via `supabase db push` so uploads to bucket `repair-images` succeed.

-- 1) Bucket (public URLs via getPublicUrl; size/mime aligned with lib/upload.ts + ImageUpload)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
SELECT
  'repair-images',
  'repair-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']::text[]
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'repair-images');

UPDATE storage.buckets
SET
  public = true,
  file_size_limit = COALESCE(file_size_limit, 5242880),
  allowed_mime_types = COALESCE(allowed_mime_types, ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']::text[])
WHERE id = 'repair-images';

-- 2) Policies on storage.objects (idempotent)
DROP POLICY IF EXISTS "repair_images_select_public" ON storage.objects;
CREATE POLICY "repair_images_select_public"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'repair-images');

DROP POLICY IF EXISTS "repair_images_insert_own_folder" ON storage.objects;
CREATE POLICY "repair_images_insert_own_folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'repair-images'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

DROP POLICY IF EXISTS "repair_images_delete_own" ON storage.objects;
CREATE POLICY "repair_images_delete_own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'repair-images'
    AND (owner = auth.uid() OR split_part(name, '/', 1) = auth.uid()::text)
  );
