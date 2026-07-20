-- ============================================================
-- product-images: storage + product_images RLS for admin/staff
--
-- Why uploads fail for "admins":
-- 1) Legacy storage policy checked profiles.role = 'admin' only, OR
--    has_role() which reads user_roles — UI may show admin from
--    profiles.role while user_roles is missing a row.
-- 2) product_images table was admin-only via has_role, so storage
--    could succeed and gallery INSERT still fail.
-- ============================================================
BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.routines
    WHERE routine_schema = 'public' AND routine_name = 'has_role'
  ) THEN
    RAISE EXCEPTION 'Missing dependency: public.has_role';
  END IF;
END $$;

-- Staff/admin: user_roles OR legacy profiles.role mirror
CREATE OR REPLACE FUNCTION public.is_staff_or_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(_user_id, 'admin'::public.app_role)
    OR public.has_role(_user_id, 'staff'::public.app_role)
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = _user_id
        AND lower(trim(COALESCE(p.role::TEXT, ''))) IN ('admin', 'staff')
    );
$$;

-- Ensure bucket exists (public read for storefront)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/jpg']
) ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public can view product images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage product images" ON storage.objects;
DROP POLICY IF EXISTS "Staff and admins can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Staff and admins can update product images" ON storage.objects;
DROP POLICY IF EXISTS "Staff and admins can delete product images" ON storage.objects;

CREATE POLICY "Public can view product images"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'product-images');

CREATE POLICY "Staff and admins can upload product images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND public.is_staff_or_admin(auth.uid())
  );

CREATE POLICY "Staff and admins can update product images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'product-images'
    AND public.is_staff_or_admin(auth.uid())
  )
  WITH CHECK (
    bucket_id = 'product-images'
    AND public.is_staff_or_admin(auth.uid())
  );

CREATE POLICY "Staff and admins can delete product images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'product-images'
    AND public.is_staff_or_admin(auth.uid())
  );

-- Gallery table: staff + admin (was admin-only)
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Images viewable by everyone" ON public.product_images;
CREATE POLICY "Images viewable by everyone" ON public.product_images
  FOR SELECT TO authenticated, anon
  USING (TRUE);

DROP POLICY IF EXISTS "Admins manage product images" ON public.product_images;
DROP POLICY IF EXISTS "Staff and admins manage product images" ON public.product_images;
CREATE POLICY "Staff and admins manage product images" ON public.product_images
  FOR ALL TO authenticated
  USING (public.is_staff_or_admin(auth.uid()))
  WITH CHECK (public.is_staff_or_admin(auth.uid()));

-- Heal admins/staff who only have profiles.role set
INSERT INTO public.user_roles (user_id, role)
SELECT
  p.id,
  CASE lower(trim(COALESCE(p.role::TEXT, '')))
    WHEN 'admin' THEN 'admin'::public.app_role
    WHEN 'staff' THEN 'staff'::public.app_role
  END
FROM public.profiles p
WHERE lower(trim(COALESCE(p.role::TEXT, ''))) IN ('admin', 'staff')
  AND NOT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = p.id
      AND ur.role = CASE lower(trim(COALESCE(p.role::TEXT, '')))
        WHEN 'admin' THEN 'admin'::public.app_role
        WHEN 'staff' THEN 'staff'::public.app_role
      END
  )
ON CONFLICT (user_id, role) DO NOTHING;

COMMIT;
