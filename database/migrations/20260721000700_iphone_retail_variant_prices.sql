-- =====================================================================
-- BlackBox Ghana — Final iPhone retail prices (product page variants)
-- Migration: 20260721000700_iphone_retail_variant_prices.sql
--
-- Source: staff final price sheet (the COMPLETE second list in the brief —
-- lower prices including 14 / 13 / 12 / 11 / XR).
-- The first higher-price sheet was NOT loaded — say if you need those as
-- a separate "New" condition catalog.
-- Skips rows marked XXXX / ++++ / blank (16E, SE 2/3, 13 Mini, 12 Mini, XS…).
--
-- Model: one products row per iPhone model + product_variants for each
--        Storage × SIM combo. Prices are absolute GHS on the variant.
-- SIM codes: ps = Physical SIM, es = eSIM, single = no SIM picker.
-- Color: placeholder 'Black' so the SKU unique key is stable; add more
--        colours in admin later (matrix will expand).
-- Stock: 0 — set live stock in admin after import.
--
-- Idempotent: re-run updates prices on matching (product, color, storage,
-- ram, sim_type) rows and refreshes product.price to the cheapest SKU.
-- =====================================================================

begin;

create temporary table if not exists tmp_iphone_retail (
  model    text not null,
  sim_type text not null,   -- ps | es | single
  storage  text not null,
  price    numeric(12,2) not null check (price > 0)
) on commit drop;

truncate tmp_iphone_retail;

insert into tmp_iphone_retail (model, sim_type, storage, price) values
-- ── iPhone 17 Pro Max ──────────────────────────────────────────────
('iPhone 17 Pro Max', 'ps', '256GB', 15799),
('iPhone 17 Pro Max', 'ps', '512GB', 17499),
('iPhone 17 Pro Max', 'ps', '1TB',   19499),
('iPhone 17 Pro Max', 'ps', '2TB',   21499),
('iPhone 17 Pro Max', 'es', '256GB', 14799),
('iPhone 17 Pro Max', 'es', '512GB', 16499),
('iPhone 17 Pro Max', 'es', '1TB',   18499),
('iPhone 17 Pro Max', 'es', '2TB',   20499),

-- ── iPhone 17 Pro ────────────────────────────────────────────────
('iPhone 17 Pro', 'ps', '256GB', 14799),
('iPhone 17 Pro', 'ps', '512GB', 16499),
('iPhone 17 Pro', 'ps', '1TB',   18499),
('iPhone 17 Pro', 'es', '256GB', 13799),
('iPhone 17 Pro', 'es', '512GB', 15499),
('iPhone 17 Pro', 'es', '1TB',   17499),

-- ── iPhone 17 Air (eSIM only) ────────────────────────────────────
('iPhone 17 Air', 'es', '256GB', 9899),
('iPhone 17 Air', 'es', '512GB', 10899),
('iPhone 17 Air', 'es', '1TB',   11899),

-- ── iPhone 17 ────────────────────────────────────────────────────
('iPhone 17', 'ps', '256GB', 8999),
('iPhone 17', 'ps', '512GB', 9999),
('iPhone 17', 'es', '256GB', 8299),
('iPhone 17', 'es', '512GB', 9299),

-- ── iPhone 16 Pro Max ────────────────────────────────────────────
('iPhone 16 Pro Max', 'ps', '256GB', 10499),
('iPhone 16 Pro Max', 'ps', '512GB', 11999),
('iPhone 16 Pro Max', 'ps', '1TB',   12999),
('iPhone 16 Pro Max', 'es', '256GB', 9499),
('iPhone 16 Pro Max', 'es', '512GB', 10499),
('iPhone 16 Pro Max', 'es', '1TB',   11499),

-- ── iPhone 16 Pro ────────────────────────────────────────────────
('iPhone 16 Pro', 'ps', '128GB', 8999),
('iPhone 16 Pro', 'ps', '256GB', 9799),
('iPhone 16 Pro', 'ps', '512GB', 10499),
('iPhone 16 Pro', 'ps', '1TB',   11999),
('iPhone 16 Pro', 'es', '128GB', 8299),
('iPhone 16 Pro', 'es', '256GB', 8999),
('iPhone 16 Pro', 'es', '512GB', 9699),
('iPhone 16 Pro', 'es', '1TB',   10999),

-- ── iPhone 16 Plus ───────────────────────────────────────────────
('iPhone 16 Plus', 'ps', '128GB', 8199),
('iPhone 16 Plus', 'ps', '256GB', 8899),
('iPhone 16 Plus', 'ps', '512GB', 9499),
('iPhone 16 Plus', 'es', '128GB', 7499),
('iPhone 16 Plus', 'es', '256GB', 7999),
('iPhone 16 Plus', 'es', '512GB', 8599),

-- ── iPhone 16 ────────────────────────────────────────────────────
('iPhone 16', 'ps', '128GB', 7399),
('iPhone 16', 'ps', '256GB', 7899),
('iPhone 16', 'ps', '512GB', 8599),
('iPhone 16', 'es', '128GB', 6699),
('iPhone 16', 'es', '256GB', 7399),
('iPhone 16', 'es', '512GB', 8899),

-- ── iPhone 15 Pro Max ────────────────────────────────────────────
('iPhone 15 Pro Max', 'ps', '256GB', 7999),
('iPhone 15 Pro Max', 'ps', '512GB', 8699),
('iPhone 15 Pro Max', 'ps', '1TB',   9699),
('iPhone 15 Pro Max', 'es', '256GB', 7499),
('iPhone 15 Pro Max', 'es', '512GB', 8199),
('iPhone 15 Pro Max', 'es', '1TB',   8999),

-- ── iPhone 15 Pro ────────────────────────────────────────────────
('iPhone 15 Pro', 'ps', '128GB', 7399),
('iPhone 15 Pro', 'ps', '256GB', 7899),
('iPhone 15 Pro', 'ps', '512GB', 8499),
('iPhone 15 Pro', 'ps', '1TB',   9499),
('iPhone 15 Pro', 'es', '128GB', 6899),
('iPhone 15 Pro', 'es', '256GB', 7399),
('iPhone 15 Pro', 'es', '512GB', 7799),
('iPhone 15 Pro', 'es', '1TB',   8499),

-- ── iPhone 15 Plus ───────────────────────────────────────────────
('iPhone 15 Plus', 'ps', '128GB', 6999),
('iPhone 15 Plus', 'ps', '256GB', 7499),
('iPhone 15 Plus', 'ps', '512GB', 7999),
('iPhone 15 Plus', 'es', '128GB', 6199),
('iPhone 15 Plus', 'es', '256GB', 6799),
('iPhone 15 Plus', 'es', '512GB', 7399),

-- ── iPhone 15 ────────────────────────────────────────────────────
('iPhone 15', 'ps', '128GB', 5999),
('iPhone 15', 'ps', '256GB', 6899),
('iPhone 15', 'ps', '512GB', 7399),
('iPhone 15', 'es', '128GB', 5199),
('iPhone 15', 'es', '256GB', 5999),
('iPhone 15', 'es', '512GB', 6799),

-- ── iPhone 14 Pro Max ────────────────────────────────────────────
('iPhone 14 Pro Max', 'ps', '128GB', 6899),
('iPhone 14 Pro Max', 'ps', '256GB', 7299),
('iPhone 14 Pro Max', 'ps', '512GB', 7699),
('iPhone 14 Pro Max', 'ps', '1TB',   8599),
('iPhone 14 Pro Max', 'es', '128GB', 6399),
('iPhone 14 Pro Max', 'es', '256GB', 6899),
('iPhone 14 Pro Max', 'es', '512GB', 7399),
('iPhone 14 Pro Max', 'es', '1TB',   7799),

-- ── iPhone 14 Pro ────────────────────────────────────────────────
('iPhone 14 Pro', 'ps', '128GB', 5999),
('iPhone 14 Pro', 'ps', '256GB', 6599),
('iPhone 14 Pro', 'ps', '512GB', 6999),
('iPhone 14 Pro', 'ps', '1TB',   7499),
('iPhone 14 Pro', 'es', '128GB', 5299),
('iPhone 14 Pro', 'es', '256GB', 5899),
('iPhone 14 Pro', 'es', '512GB', 6299),
('iPhone 14 Pro', 'es', '1TB',   6999),

-- ── iPhone 14 Plus ───────────────────────────────────────────────
('iPhone 14 Plus', 'ps', '128GB', 5199),
('iPhone 14 Plus', 'ps', '256GB', 5699),
('iPhone 14 Plus', 'ps', '512GB', 6299),
('iPhone 14 Plus', 'es', '128GB', 4699),
('iPhone 14 Plus', 'es', '256GB', 5199),
('iPhone 14 Plus', 'es', '512GB', 5699),

-- ── iPhone 14 ────────────────────────────────────────────────────
('iPhone 14', 'ps', '128GB', 4199),
('iPhone 14', 'ps', '256GB', 4699),
('iPhone 14', 'ps', '512GB', 5199),
('iPhone 14', 'es', '128GB', 3599),
('iPhone 14', 'es', '256GB', 4199),
('iPhone 14', 'es', '512GB', 4799),

-- ── iPhone 13 Pro Max (no SIM split on sheet) ────────────────────
('iPhone 13 Pro Max', '', '128GB', 5299),
('iPhone 13 Pro Max', '', '256GB', 5799),
('iPhone 13 Pro Max', '', '512GB', 6199),
('iPhone 13 Pro Max', '', '1TB',   6899),

-- ── iPhone 13 Pro ────────────────────────────────────────────────
('iPhone 13 Pro', '', '128GB', 4699),
('iPhone 13 Pro', '', '256GB', 4899),
('iPhone 13 Pro', '', '512GB', 5299),
('iPhone 13 Pro', '', '1TB',   5999),

-- ── iPhone 13 ────────────────────────────────────────────────────
('iPhone 13', '', '128GB', 3599),
('iPhone 13', '', '256GB', 3999),
('iPhone 13', '', '512GB', 4499),

-- ── iPhone 12 Pro Max ────────────────────────────────────────────
('iPhone 12 Pro Max', '', '128GB', 4199),
('iPhone 12 Pro Max', '', '256GB', 4599),
('iPhone 12 Pro Max', '', '512GB', 4899),

-- ── iPhone 12 Pro ────────────────────────────────────────────────
('iPhone 12 Pro', '', '128GB', 3599),
('iPhone 12 Pro', '', '256GB', 3999),
('iPhone 12 Pro', '', '512GB', 4399),

-- ── iPhone 12 ────────────────────────────────────────────────────
('iPhone 12', '', '64GB',  2649),
('iPhone 12', '', '128GB', 2949),
('iPhone 12', '', '256GB', 3399),

-- ── iPhone 11 Pro Max ────────────────────────────────────────────
('iPhone 11 Pro Max', '', '64GB',  2849),
('iPhone 11 Pro Max', '', '256GB', 3249),
('iPhone 11 Pro Max', '', '512GB', 3549),

-- ── iPhone 11 Pro ────────────────────────────────────────────────
('iPhone 11 Pro', '', '64GB',  2599),
('iPhone 11 Pro', '', '256GB', 2999),
('iPhone 11 Pro', '', '512GB', 3299),

-- ── iPhone 11 ────────────────────────────────────────────────────
('iPhone 11', '', '64GB',  2099),
('iPhone 11', '', '128GB', 2349),
('iPhone 11', '', '256GB', 2549),

-- ── iPhone XR ────────────────────────────────────────────────────
('iPhone XR', '', '64GB',  1779),
('iPhone XR', '', '128GB', 2249),
('iPhone XR', '', '256GB', 2449);

-- Ensure absolute price column exists
alter table public.product_variants
  add column if not exists price numeric(12,2),
  add column if not exists sim_type text,
  add column if not exists is_active boolean default true;

do $seed$
declare
  m record;
  t record;
  v_product_id uuid;
  v_slug text;
  v_min numeric(12,2);
  v_storages text[];
  v_existing uuid;
begin
  for m in
    select distinct model from tmp_iphone_retail order by model
  loop
    v_slug := lower(regexp_replace(m.model, '[^a-zA-Z0-9]+', '-', 'g'));
    v_slug := trim(both '-' from v_slug);

    select min(price) into v_min
    from tmp_iphone_retail where model = m.model;

    select array_agg(distinct storage order by storage)
      into v_storages
    from tmp_iphone_retail where model = m.model;

    select p.id into v_product_id
    from public.products p
    where p.name = m.model
      and p.category = 'iPhone'
    order by p.created_at nulls last
    limit 1;

    if v_product_id is null then
      select p.id into v_product_id
      from public.products p
      where p.slug = v_slug
      limit 1;
    end if;

    if v_product_id is null then
      insert into public.products (
        name, brand, category, description, price, currency,
        stock, status, condition, storage, colors, featured, is_new,
        trade_model
      ) values (
        m.model,
        'Apple',
        'iPhone',
        format('BlackBox priced %s — choose storage and SIM on the product page.', m.model),
        v_min,
        'GHS',
        0,
        'active',
        'preowned',
        coalesce(v_storages, '{}'),
        array['Black']::text[],
        false,
        false,
        m.model
      )
      returning id into v_product_id;
    else
      update public.products
         set brand       = coalesce(nullif(brand, ''), 'Apple'),
             category    = 'iPhone',
             price       = v_min,
             currency    = coalesce(currency, 'GHS'),
             status      = coalesce(nullif(status, ''), 'active'),
             storage     = coalesce(v_storages, storage),
             colors      = case
                             when colors is null or cardinality(colors) = 0
                             then array['Black']::text[]
                             else colors
                           end,
             trade_model = coalesce(trade_model, m.model),
             updated_at  = now()
       where id = v_product_id;
    end if;

    for t in
      select * from tmp_iphone_retail where model = m.model
    loop
      select pv.id into v_existing
      from public.product_variants pv
      where pv.product_id = v_product_id
        and coalesce(pv.color, '') = 'Black'
        and coalesce(pv.storage, '') = t.storage
        and coalesce(pv.ram, '') = ''
        and coalesce(pv.sim_type, '') = t.sim_type
      limit 1;

      if v_existing is not null then
        update public.product_variants
           set price = t.price,
               is_active = true
         where id = v_existing;
      else
        insert into public.product_variants (
          product_id, color, storage, ram, sim_type, price, stock, is_active
        ) values (
          v_product_id, 'Black', t.storage, '', t.sim_type, t.price, 0, true
        );
      end if;
    end loop;
  end loop;
end;
$seed$;

commit;

-- Quick check after run:
-- select p.name, pv.sim_type, pv.storage, pv.price
-- from products p
-- join product_variants pv on pv.product_id = p.id
-- where p.category = 'iPhone'
-- order by p.name, pv.sim_type, pv.storage;
