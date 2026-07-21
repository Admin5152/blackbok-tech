-- =====================================================================
-- BlackBox Ghana — iPhone retail catalog (prices + Apple colours)
-- Migration: 20260721000700_iphone_retail_variant_prices.sql
--
-- Source: staff final price sheet (the COMPLETE second list in the brief —
-- lower prices including 14 / 13 / 12 / 11 / XR).
-- The first higher-price sheet was NOT loaded — say if you need those as
-- a separate "New" condition catalog.
-- Skips rows marked XXXX / ++++ / blank (16E, SE 2/3, 13 Mini, 12 Mini, XS…).
--
-- Model: one products row per iPhone model + product_variants for each
--        Colour × Storage × SIM combo. Prices are absolute GHS on the variant
--        (same price for every colour at a given storage/SIM).
-- Colours: official Apple options per model (lib/appleColors.ts / trade-in).
-- Condition: new retail stock by default; set pre-owned in admin when needed.
-- trade_model links trade-IN eligibility only — it does not imply pre-owned.
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
('iPhone 13 Pro Max', 'single', '128GB', 5299),
('iPhone 13 Pro Max', 'single', '256GB', 5799),
('iPhone 13 Pro Max', 'single', '512GB', 6199),
('iPhone 13 Pro Max', 'single', '1TB',   6899),

-- ── iPhone 13 Pro ────────────────────────────────────────────────
('iPhone 13 Pro', 'single', '128GB', 4699),
('iPhone 13 Pro', 'single', '256GB', 4899),
('iPhone 13 Pro', 'single', '512GB', 5299),
('iPhone 13 Pro', 'single', '1TB',   5999),

-- ── iPhone 13 ────────────────────────────────────────────────────
('iPhone 13', 'single', '128GB', 3599),
('iPhone 13', 'single', '256GB', 3999),
('iPhone 13', 'single', '512GB', 4499),

-- ── iPhone 12 Pro Max ────────────────────────────────────────────
('iPhone 12 Pro Max', 'single', '128GB', 4199),
('iPhone 12 Pro Max', 'single', '256GB', 4599),
('iPhone 12 Pro Max', 'single', '512GB', 4899),

-- ── iPhone 12 Pro ────────────────────────────────────────────────
('iPhone 12 Pro', 'single', '128GB', 3599),
('iPhone 12 Pro', 'single', '256GB', 3999),
('iPhone 12 Pro', 'single', '512GB', 4399),

-- ── iPhone 12 ────────────────────────────────────────────────────
('iPhone 12', 'single', '64GB',  2649),
('iPhone 12', 'single', '128GB', 2949),
('iPhone 12', 'single', '256GB', 3399),

-- ── iPhone 11 Pro Max ────────────────────────────────────────────
('iPhone 11 Pro Max', 'single', '64GB',  2849),
('iPhone 11 Pro Max', 'single', '256GB', 3249),
('iPhone 11 Pro Max', 'single', '512GB', 3549),

-- ── iPhone 11 Pro ────────────────────────────────────────────────
('iPhone 11 Pro', 'single', '64GB',  2599),
('iPhone 11 Pro', 'single', '256GB', 2999),
('iPhone 11 Pro', 'single', '512GB', 3299),

-- ── iPhone 11 ────────────────────────────────────────────────────
('iPhone 11', 'single', '64GB',  2099),
('iPhone 11', 'single', '128GB', 2349),
('iPhone 11', 'single', '256GB', 2549),

-- ── iPhone XR ────────────────────────────────────────────────────
('iPhone XR', 'single', '64GB',  1779),
('iPhone XR', 'single', '128GB', 2249),
('iPhone XR', 'single', '256GB', 2449);

create temporary table if not exists tmp_iphone_model_colors (
  model      text not null,
  color      text not null,
  sort_order int  not null,
  primary key (model, color)
) on commit drop;

truncate tmp_iphone_model_colors;

insert into tmp_iphone_model_colors (model, color, sort_order) values
-- iPhone 17 family
('iPhone 17 Pro Max', 'Cosmic Orange', 1),
('iPhone 17 Pro Max', 'Deep Blue',     2),
('iPhone 17 Pro Max', 'Silver',        3),
('iPhone 17 Pro',     'Cosmic Orange', 1),
('iPhone 17 Pro',     'Deep Blue',     2),
('iPhone 17 Pro',     'Silver',        3),
('iPhone 17 Air',     'Space Black',   1),
('iPhone 17 Air',     'Cloud White',   2),
('iPhone 17 Air',     'Light Gold',    3),
('iPhone 17 Air',     'Sky Blue',      4),
('iPhone 17',         'Black',         1),
('iPhone 17',         'White',         2),
('iPhone 17',         'Sage',          3),
('iPhone 17',         'Lavender',      4),
('iPhone 17',         'Mist Blue',     5),
-- iPhone 16 family
('iPhone 16 Pro Max', 'Black Titanium',    1),
('iPhone 16 Pro Max', 'White Titanium',    2),
('iPhone 16 Pro Max', 'Natural Titanium',  3),
('iPhone 16 Pro Max', 'Desert Titanium',   4),
('iPhone 16 Pro',     'Black Titanium',    1),
('iPhone 16 Pro',     'White Titanium',    2),
('iPhone 16 Pro',     'Natural Titanium',  3),
('iPhone 16 Pro',     'Desert Titanium',   4),
('iPhone 16 Plus',    'Black',         1),
('iPhone 16 Plus',    'White',         2),
('iPhone 16 Plus',    'Pink',          3),
('iPhone 16 Plus',    'Teal',          4),
('iPhone 16 Plus',    'Ultramarine',   5),
('iPhone 16',         'Black',         1),
('iPhone 16',         'White',         2),
('iPhone 16',         'Pink',          3),
('iPhone 16',         'Teal',          4),
('iPhone 16',         'Ultramarine',   5),
-- iPhone 15 family
('iPhone 15 Pro Max', 'Black Titanium',    1),
('iPhone 15 Pro Max', 'White Titanium',    2),
('iPhone 15 Pro Max', 'Blue Titanium',     3),
('iPhone 15 Pro Max', 'Natural Titanium',  4),
('iPhone 15 Pro',     'Black Titanium',    1),
('iPhone 15 Pro',     'White Titanium',    2),
('iPhone 15 Pro',     'Blue Titanium',     3),
('iPhone 15 Pro',     'Natural Titanium',  4),
('iPhone 15 Plus',    'Black',         1),
('iPhone 15 Plus',    'White',         2),
('iPhone 15 Plus',    'Blue',          3),
('iPhone 15 Plus',    'Green',         4),
('iPhone 15 Plus',    'Yellow',        5),
('iPhone 15 Plus',    'Pink',          6),
('iPhone 15',         'Black',         1),
('iPhone 15',         'Blue',          2),
('iPhone 15',         'Green',         3),
('iPhone 15',         'Yellow',        4),
('iPhone 15',         'Pink',          5),
-- iPhone 14 family
('iPhone 14 Pro Max', 'Deep Purple', 1),
('iPhone 14 Pro Max', 'Gold',        2),
('iPhone 14 Pro Max', 'Silver',      3),
('iPhone 14 Pro Max', 'Space Black', 4),
('iPhone 14 Pro',     'Deep Purple', 1),
('iPhone 14 Pro',     'Gold',        2),
('iPhone 14 Pro',     'Silver',      3),
('iPhone 14 Pro',     'Space Black', 4),
('iPhone 14 Plus',    'Midnight',    1),
('iPhone 14 Plus',    'Starlight',   2),
('iPhone 14 Plus',    'Blue',        3),
('iPhone 14 Plus',    'Purple',      4),
('iPhone 14 Plus',    'Yellow',      5),
('iPhone 14 Plus',    'Red',         6),
('iPhone 14',         'Midnight',    1),
('iPhone 14',         'Starlight',   2),
('iPhone 14',         'Blue',        3),
('iPhone 14',         'Purple',      4),
('iPhone 14',         'Yellow',      5),
('iPhone 14',         'Red',         6),
-- iPhone 13 family
('iPhone 13 Pro Max', 'Graphite',     1),
('iPhone 13 Pro Max', 'Gold',         2),
('iPhone 13 Pro Max', 'Silver',       3),
('iPhone 13 Pro Max', 'Sierra Blue',  4),
('iPhone 13 Pro Max', 'Alpine Green', 5),
('iPhone 13 Pro',     'Graphite',     1),
('iPhone 13 Pro',     'Gold',         2),
('iPhone 13 Pro',     'Silver',       3),
('iPhone 13 Pro',     'Sierra Blue',  4),
('iPhone 13 Pro',     'Alpine Green', 5),
('iPhone 13',         'Midnight',     1),
('iPhone 13',         'Starlight',    2),
('iPhone 13',         'Blue',         3),
('iPhone 13',         'Pink',         4),
('iPhone 13',         'Green',        5),
('iPhone 13',         'Red',          6),
-- iPhone 12 family
('iPhone 12 Pro Max', 'Graphite',     1),
('iPhone 12 Pro Max', 'Silver',       2),
('iPhone 12 Pro Max', 'Gold',         3),
('iPhone 12 Pro Max', 'Pacific Blue', 4),
('iPhone 12 Pro',     'Graphite',     1),
('iPhone 12 Pro',     'Silver',       2),
('iPhone 12 Pro',     'Gold',         3),
('iPhone 12 Pro',     'Pacific Blue', 4),
('iPhone 12',         'Black',        1),
('iPhone 12',         'White',        2),
('iPhone 12',         'Blue',         3),
('iPhone 12',         'Green',        4),
('iPhone 12',         'Purple',       5),
('iPhone 12',         'Red',          6),
-- iPhone 11 family
('iPhone 11 Pro Max', 'Space Gray',      1),
('iPhone 11 Pro Max', 'Silver',          2),
('iPhone 11 Pro Max', 'Gold',            3),
('iPhone 11 Pro Max', 'Midnight Green',  4),
('iPhone 11 Pro',     'Space Gray',      1),
('iPhone 11 Pro',     'Silver',          2),
('iPhone 11 Pro',     'Gold',            3),
('iPhone 11 Pro',     'Midnight Green',  4),
('iPhone 11',         'Black',        1),
('iPhone 11',         'White',        2),
('iPhone 11',         'Green',        3),
('iPhone 11',         'Yellow',       4),
('iPhone 11',         'Purple',       5),
('iPhone 11',         'Red',          6),
-- iPhone XR
('iPhone XR',         'Black',        1),
('iPhone XR',         'White',        2),
('iPhone XR',         'Blue',         3),
('iPhone XR',         'Yellow',       4),
('iPhone XR',         'Coral',        5),
('iPhone XR',         'Red',          6);

-- Ensure absolute price column exists
alter table public.product_variants
  add column if not exists price numeric(12,2),
  add column if not exists sim_type text,
  add column if not exists is_active boolean default true;

-- SKU must distinguish PS vs eSIM (same colour + storage, different sim_type)
create or replace function public.fn_variant_before_write()
returns trigger language plpgsql as $$
begin
  if new.sku is null or btrim(new.sku) = '' then
    new.sku := 'SKU-' || left(new.product_id::text, 8)
      || coalesce('-' || upper(regexp_replace(new.color,   '[^A-Za-z0-9]+', '', 'g')), '')
      || coalesce('-' || upper(regexp_replace(new.storage, '[^A-Za-z0-9]+', '', 'g')), '')
      || coalesce('-' || upper(regexp_replace(new.ram,     '[^A-Za-z0-9]+', '', 'g')), '')
      || case
           when coalesce(nullif(btrim(new.sim_type), ''), 'single') not in ('', 'single')
           then upper(regexp_replace(new.sim_type, '[^A-Za-z0-9]+', '', 'g'))
           else ''
         end;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

-- Re-sku iPhone rows from a prior partial run (ps/es used to collide on uq_variant_sku)
update public.product_variants pv
   set sku = 'SKU-' || left(pv.product_id::text, 8)
     || coalesce('-' || upper(regexp_replace(pv.color,   '[^A-Za-z0-9]+', '', 'g')), '')
     || coalesce('-' || upper(regexp_replace(pv.storage, '[^A-Za-z0-9]+', '', 'g')), '')
     || coalesce('-' || upper(regexp_replace(pv.ram,     '[^A-Za-z0-9]+', '', 'g')), '')
     || case
          when coalesce(nullif(btrim(pv.sim_type), ''), 'single') not in ('', 'single')
          then upper(regexp_replace(pv.sim_type, '[^A-Za-z0-9]+', '', 'g'))
          else ''
        end
  from public.products p
 where pv.product_id = p.id
   and p.category = 'iPhone'
   and exists (
     select 1 from tmp_iphone_retail r where r.model = p.name
   );

do $seed$
declare
  m record;
  t record;
  c record;
  v_product_id uuid;
  v_slug text;
  v_min numeric(12,2);
  v_storages text[];
  v_colors text[];
  v_existing uuid;
  v_sim text;
  v_sku text;
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

    select array_agg(mc.color order by mc.sort_order)
      into v_colors
    from tmp_iphone_model_colors mc
    where mc.model = m.model;

    if v_colors is null or cardinality(v_colors) = 0 then
      raise warning 'No colours defined for % — skipping', m.model;
      continue;
    end if;

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
        format('BlackBox priced %s — choose colour, storage and SIM on the product page.', m.model),
        v_min,
        'GHS',
        0,
        'active',
        'new',
        coalesce(v_storages, '{}'),
        v_colors,
        false,
        true,
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
             colors      = v_colors,
             trade_model = coalesce(trade_model, m.model),
             updated_at  = now()
       where id = v_product_id;
    end if;

    for t in
      select * from tmp_iphone_retail where model = m.model
    loop
      v_sim := coalesce(nullif(btrim(t.sim_type), ''), 'single');

      for c in
        select mc.color
        from tmp_iphone_model_colors mc
        where mc.model = m.model
        order by mc.sort_order
      loop
        v_sku := 'SKU-' || left(v_product_id::text, 8)
          || '-' || upper(regexp_replace(c.color, '[^A-Za-z0-9]+', '', 'g'))
          || '-' || upper(regexp_replace(t.storage, '[^A-Za-z0-9]+', '', 'g'))
          || '-'
          || case
               when v_sim <> 'single'
               then upper(regexp_replace(v_sim, '[^A-Za-z0-9]+', '', 'g'))
               else ''
             end;

        select pv.id into v_existing
        from public.product_variants pv
        where pv.product_id = v_product_id
          and coalesce(pv.color, '') = c.color
          and coalesce(pv.storage, '') = t.storage
          and coalesce(pv.ram, '') = ''
          and coalesce(nullif(btrim(pv.sim_type), ''), 'single') = v_sim
        limit 1;

        if v_existing is not null then
          update public.product_variants
             set price = t.price,
                 sim_type = v_sim,
                 sku = v_sku,
                 is_active = true
           where id = v_existing;
        else
          insert into public.product_variants (
            product_id, color, storage, ram, sim_type, price, stock, is_active, sku
          ) values (
            v_product_id, c.color, t.storage, '', v_sim, t.price, 0, true, v_sku
          );
        end if;
      end loop;
    end loop;
  end loop;

  -- Earlier draft used preowned for all iPhones; retail catalog is new unless admin sets otherwise
  update public.products p
     set condition = 'new',
         is_new = true
   where p.category = 'iPhone'
     and p.condition = 'preowned'
     and exists (select 1 from tmp_iphone_retail r where r.model = p.name);
end;
$seed$;

commit;

-- Quick check after run:
-- select p.name, p.colors, count(pv.id) as variant_rows
-- from products p
-- join product_variants pv on pv.product_id = p.id and pv.is_active
-- where p.category = 'iPhone'
-- group by p.id, p.name, p.colors
-- order by p.name;
