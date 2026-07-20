-- Storage Setup for BlackBox Project
-- This script sets up the necessary storage buckets and policies

-- Create storage bucket for repair images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'repair-images',
  'repair-images',
  true,
  5242880, -- 5MB in bytes
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for product images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  10485760, -- 10MB in bytes
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/jpg']
) ON CONFLICT (id) DO NOTHING;

-- RLS Policies for repair-images bucket
CREATE POLICY "Users can upload their own repair images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'repair-images' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Users can view their own repair images"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'repair-images' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Users can update their own repair images"
  ON storage.objects FOR UPDATE
  WITH CHECK (
    bucket_id = 'repair-images' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Users can delete their own repair images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'repair-images' AND
    auth.role() = 'authenticated'
  );

-- RLS Policies for product-images bucket (admin + staff)
-- Prefer migration 2026_07_product_images_storage_staff.sql on existing projects.
-- Uses is_staff_or_admin when present; otherwise has_role + profiles.role fallback.

DROP POLICY IF EXISTS "Public can view product images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage product images" ON storage.objects;
DROP POLICY IF EXISTS "Staff and admins can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Staff and admins can update product images" ON storage.objects;
DROP POLICY IF EXISTS "Staff and admins can delete product images" ON storage.objects;

CREATE POLICY "Public can view product images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

CREATE POLICY "Staff and admins can upload product images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'staff'::public.app_role)
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND lower(trim(COALESCE(p.role::TEXT, ''))) IN ('admin', 'staff')
      )
    )
  );

CREATE POLICY "Staff and admins can update product images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'product-images'
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'staff'::public.app_role)
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND lower(trim(COALESCE(p.role::TEXT, ''))) IN ('admin', 'staff')
      )
    )
  )
  WITH CHECK (
    bucket_id = 'product-images'
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'staff'::public.app_role)
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND lower(trim(COALESCE(p.role::TEXT, ''))) IN ('admin', 'staff')
      )
    )
  );

CREATE POLICY "Staff and admins can delete product images"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'product-images'
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'staff'::public.app_role)
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND lower(trim(COALESCE(p.role::TEXT, ''))) IN ('admin', 'staff')
      )
    )
  );
