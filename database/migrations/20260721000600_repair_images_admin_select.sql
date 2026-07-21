-- =====================================================================
-- Repair images: let admin/staff view customer photos even when
-- user_roles is out of sync (profiles.role fallback).
-- Migration: 20260721000600_repair_images_admin_select.sql
-- =====================================================================

drop policy if exists "repair_images_select_staff_admin" on storage.objects;
create policy "repair_images_select_staff_admin"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'repair-images'
    and (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      or public.has_role(auth.uid(), 'staff'::public.app_role)
      or exists (
        select 1 from public.profiles p
        where p.id = auth.uid()
          and p.role in ('admin', 'staff')
      )
    )
  );
