-- =====================================================================
-- BlackBox Ghana — Attach campus to own order before promo_reserve
-- Migration: 20260721000400_promo_set_order_campus.sql
-- Depends on: 20260721000000_promotions.sql (orders.campus_id)
-- =====================================================================

begin;

create or replace function public.promo_set_order_campus(
  p_order_id uuid,
  p_campus_id uuid
) returns void
language plpgsql volatile security definer
set search_path = public, pg_temp as $$
declare
  v_owner uuid;
begin
  if p_campus_id is null then
    return;
  end if;

  select o.user_id into v_owner
  from public.orders o
  where o.id = p_order_id;

  if not found then
    raise exception 'order not found' using errcode = 'P0002';
  end if;

  if v_owner is distinct from auth.uid() then
    raise exception 'not your order' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.campuses c where c.id = p_campus_id and c.is_active
  ) then
    raise exception 'campus not found' using errcode = 'P0002';
  end if;

  -- Only fill when unset; never let the client overwrite a resolved campus.
  update public.orders
     set campus_id = p_campus_id,
         updated_at = now()
   where id = p_order_id
     and campus_id is null;
end $$;

revoke all on function public.promo_set_order_campus(uuid, uuid) from public, anon;
grant execute on function public.promo_set_order_campus(uuid, uuid) to authenticated;

commit;
