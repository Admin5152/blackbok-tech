-- =====================================================================
-- BlackBox Ghana — iPhone retail catalog: NEW + PREOWNED
-- Migration: 20260727000100_iphone_new_preowned_retail_prices.sql
--
-- ASSUMES 20260721000700 already ran (one product per model, condition=new,
-- lower-sheet prices + colour×storage×SIM variants).
--
-- This migration ALTERS existing rows:
--   1) Models on BOTH sheets (15–17): keep existing product as NEW (update
--      prices to higher sheet) + INSERT a second PREOWNED product (lower sheet).
--   2) Models only on lower sheet (14→XR): CONVERT existing product to
--      condition=preowned and refresh prices (no duplicate "new" product).
--   3) Upsert variants (colour × storage × SIM); deactivate SKUs no longer
--      on the sheet / colour list for that product.
--
-- Condition values: new | preowned (NOT "used").
-- Skips blank / XXXX / ++++ (16E, SE 2/3, 13 Mini, 12 Mini, XS…).
-- Stock unchanged on existing rows; new products start at stock 0.
-- Idempotent — safe to re-run.
-- =====================================================================

begin;

create temporary table if not exists tmp_iphone_retail (
  model     text not null,
  condition text not null check (condition in ('new', 'preowned')),
  sim_type  text not null,   -- ps | es | single
  storage   text not null,
  price     numeric(12,2) not null check (price > 0)
) on commit drop;

truncate tmp_iphone_retail;

insert into tmp_iphone_retail (model, condition, sim_type, storage, price) values
-- ── iPhone 17 Pro Max · new ────────────────────────────────
('iPhone 17 Pro Max', 'new', 'ps', '256GB', 16999),
('iPhone 17 Pro Max', 'new', 'ps', '512GB', 19499),
('iPhone 17 Pro Max', 'new', 'ps', '1TB', 22999),
('iPhone 17 Pro Max', 'new', 'ps', '2TB', 24499),
('iPhone 17 Pro Max', 'new', 'es', '256GB', 15799),
('iPhone 17 Pro Max', 'new', 'es', '512GB', 17999),
('iPhone 17 Pro Max', 'new', 'es', '1TB', 20999),
('iPhone 17 Pro Max', 'new', 'es', '2TB', 23499),
-- ── iPhone 17 Pro · new ────────────────────────────────
('iPhone 17 Pro', 'new', 'ps', '256GB', 15799),
('iPhone 17 Pro', 'new', 'ps', '512GB', 17999),
('iPhone 17 Pro', 'new', 'ps', '1TB', 20999),
('iPhone 17 Pro', 'new', 'es', '256GB', 14799),
('iPhone 17 Pro', 'new', 'es', '512GB', 15999),
('iPhone 17 Pro', 'new', 'es', '1TB', 19999),
-- ── iPhone 17 Air · new ────────────────────────────────
('iPhone 17 Air', 'new', 'es', '256GB', 11499),
('iPhone 17 Air', 'new', 'es', '512GB', 12999),
('iPhone 17 Air', 'new', 'es', '1TB', 14999),
-- ── iPhone 17 · new ────────────────────────────────
('iPhone 17', 'new', 'ps', '256GB', 10499),
('iPhone 17', 'new', 'ps', '512GB', 11999),
('iPhone 17', 'new', 'es', '256GB', 9499),
('iPhone 17', 'new', 'es', '512GB', 10499),
-- ── iPhone 16 Pro Max · new ────────────────────────────────
('iPhone 16 Pro Max', 'new', 'ps', '256GB', 13499),
('iPhone 16 Pro Max', 'new', 'ps', '512GB', 13999),
('iPhone 16 Pro Max', 'new', 'ps', '1TB', 15499),
('iPhone 16 Pro Max', 'new', 'es', '256GB', 12499),
('iPhone 16 Pro Max', 'new', 'es', '512GB', 12999),
('iPhone 16 Pro Max', 'new', 'es', '1TB', 14499),
-- ── iPhone 16 Pro · new ────────────────────────────────
('iPhone 16 Pro', 'new', 'ps', '128GB', 11499),
('iPhone 16 Pro', 'new', 'ps', '256GB', 12499),
('iPhone 16 Pro', 'new', 'ps', '512GB', 13499),
('iPhone 16 Pro', 'new', 'ps', '1TB', 14999),
('iPhone 16 Pro', 'new', 'es', '128GB', 10499),
('iPhone 16 Pro', 'new', 'es', '256GB', 11499),
('iPhone 16 Pro', 'new', 'es', '512GB', 12499),
('iPhone 16 Pro', 'new', 'es', '1TB', 13499),
-- ── iPhone 16 Plus · new ────────────────────────────────
('iPhone 16 Plus', 'new', 'ps', '128GB', 9299),
('iPhone 16 Plus', 'new', 'ps', '256GB', 9699),
('iPhone 16 Plus', 'new', 'ps', '512GB', 10699),
('iPhone 16 Plus', 'new', 'es', '128GB', 8499),
('iPhone 16 Plus', 'new', 'es', '256GB', 9199),
('iPhone 16 Plus', 'new', 'es', '512GB', 9899),
-- ── iPhone 16 · new ────────────────────────────────
('iPhone 16', 'new', 'ps', '128GB', 8199),
('iPhone 16', 'new', 'ps', '256GB', 8899),
('iPhone 16', 'new', 'ps', '512GB', 9899),
('iPhone 16', 'new', 'es', '128GB', 7499),
('iPhone 16', 'new', 'es', '256GB', 8199),
('iPhone 16', 'new', 'es', '512GB', 8899),
-- ── iPhone 15 Pro Max · new ────────────────────────────────
('iPhone 15 Pro Max', 'new', 'ps', '256GB', 10699),
('iPhone 15 Pro Max', 'new', 'ps', '512GB', 11499),
('iPhone 15 Pro Max', 'new', 'ps', '1TB', 12999),
('iPhone 15 Pro Max', 'new', 'es', '256GB', 9699),
('iPhone 15 Pro Max', 'new', 'es', '512GB', 10499),
('iPhone 15 Pro Max', 'new', 'es', '1TB', 11999),
-- ── iPhone 15 Pro · new ────────────────────────────────
('iPhone 15 Pro', 'new', 'ps', '128GB', 8999),
('iPhone 15 Pro', 'new', 'ps', '256GB', 9699),
('iPhone 15 Pro', 'new', 'ps', '512GB', 10499),
('iPhone 15 Pro', 'new', 'ps', '1TB', 11999),
('iPhone 15 Pro', 'new', 'es', '128GB', 7999),
('iPhone 15 Pro', 'new', 'es', '256GB', 8699),
('iPhone 15 Pro', 'new', 'es', '512GB', 9499),
('iPhone 15 Pro', 'new', 'es', '1TB', 10999),
-- ── iPhone 15 Plus · new ────────────────────────────────
('iPhone 15 Plus', 'new', 'ps', '128GB', 7999),
('iPhone 15 Plus', 'new', 'ps', '256GB', 8499),
('iPhone 15 Plus', 'new', 'ps', '512GB', 8899),
('iPhone 15 Plus', 'new', 'es', '128GB', 7199),
('iPhone 15 Plus', 'new', 'es', '256GB', 7799),
('iPhone 15 Plus', 'new', 'es', '512GB', 8199),
-- ── iPhone 15 · new ────────────────────────────────
('iPhone 15', 'new', 'ps', '128GB', 7499),
('iPhone 15', 'new', 'ps', '256GB', 8199),
('iPhone 15', 'new', 'ps', '512GB', 8999),
('iPhone 15', 'new', 'es', '128GB', 6899),
('iPhone 15', 'new', 'es', '256GB', 7699),
('iPhone 15', 'new', 'es', '512GB', 8499),
-- ── iPhone 17 Pro Max · preowned ────────────────────────────────
('iPhone 17 Pro Max', 'preowned', 'ps', '256GB', 15799),
('iPhone 17 Pro Max', 'preowned', 'ps', '512GB', 17499),
('iPhone 17 Pro Max', 'preowned', 'ps', '1TB', 19499),
('iPhone 17 Pro Max', 'preowned', 'ps', '2TB', 21499),
('iPhone 17 Pro Max', 'preowned', 'es', '256GB', 14799),
('iPhone 17 Pro Max', 'preowned', 'es', '512GB', 16499),
('iPhone 17 Pro Max', 'preowned', 'es', '1TB', 18499),
('iPhone 17 Pro Max', 'preowned', 'es', '2TB', 20499),
-- ── iPhone 17 Pro · preowned ────────────────────────────────
('iPhone 17 Pro', 'preowned', 'ps', '256GB', 14799),
('iPhone 17 Pro', 'preowned', 'ps', '512GB', 16499),
('iPhone 17 Pro', 'preowned', 'ps', '1TB', 18499),
('iPhone 17 Pro', 'preowned', 'es', '256GB', 13799),
('iPhone 17 Pro', 'preowned', 'es', '512GB', 15499),
('iPhone 17 Pro', 'preowned', 'es', '1TB', 17499),
-- ── iPhone 17 Air · preowned ────────────────────────────────
('iPhone 17 Air', 'preowned', 'es', '256GB', 9899),
('iPhone 17 Air', 'preowned', 'es', '512GB', 10899),
('iPhone 17 Air', 'preowned', 'es', '1TB', 11899),
-- ── iPhone 17 · preowned ────────────────────────────────
('iPhone 17', 'preowned', 'ps', '256GB', 8999),
('iPhone 17', 'preowned', 'ps', '512GB', 9999),
('iPhone 17', 'preowned', 'es', '256GB', 8299),
('iPhone 17', 'preowned', 'es', '512GB', 9299),
-- ── iPhone 16 Pro Max · preowned ────────────────────────────────
('iPhone 16 Pro Max', 'preowned', 'ps', '256GB', 10499),
('iPhone 16 Pro Max', 'preowned', 'ps', '512GB', 11999),
('iPhone 16 Pro Max', 'preowned', 'ps', '1TB', 12999),
('iPhone 16 Pro Max', 'preowned', 'es', '256GB', 9499),
('iPhone 16 Pro Max', 'preowned', 'es', '512GB', 10499),
('iPhone 16 Pro Max', 'preowned', 'es', '1TB', 11499),
-- ── iPhone 16 Pro · preowned ────────────────────────────────
('iPhone 16 Pro', 'preowned', 'ps', '128GB', 8999),
('iPhone 16 Pro', 'preowned', 'ps', '256GB', 9799),
('iPhone 16 Pro', 'preowned', 'ps', '512GB', 10499),
('iPhone 16 Pro', 'preowned', 'ps', '1TB', 11999),
('iPhone 16 Pro', 'preowned', 'es', '128GB', 8299),
('iPhone 16 Pro', 'preowned', 'es', '256GB', 8999),
('iPhone 16 Pro', 'preowned', 'es', '512GB', 9699),
('iPhone 16 Pro', 'preowned', 'es', '1TB', 10999),
-- ── iPhone 16 Plus · preowned ────────────────────────────────
('iPhone 16 Plus', 'preowned', 'ps', '128GB', 8199),
('iPhone 16 Plus', 'preowned', 'ps', '256GB', 8899),
('iPhone 16 Plus', 'preowned', 'ps', '512GB', 9499),
('iPhone 16 Plus', 'preowned', 'es', '128GB', 7499),
('iPhone 16 Plus', 'preowned', 'es', '256GB', 7999),
('iPhone 16 Plus', 'preowned', 'es', '512GB', 8599),
-- ── iPhone 16 · preowned ────────────────────────────────
('iPhone 16', 'preowned', 'ps', '128GB', 7399),
('iPhone 16', 'preowned', 'ps', '256GB', 7899),
('iPhone 16', 'preowned', 'ps', '512GB', 8599),
('iPhone 16', 'preowned', 'es', '128GB', 6699),
('iPhone 16', 'preowned', 'es', '256GB', 7399),
('iPhone 16', 'preowned', 'es', '512GB', 8899),
-- ── iPhone 15 Pro Max · preowned ────────────────────────────────
('iPhone 15 Pro Max', 'preowned', 'ps', '256GB', 7999),
('iPhone 15 Pro Max', 'preowned', 'ps', '512GB', 8699),
('iPhone 15 Pro Max', 'preowned', 'ps', '1TB', 9699),
('iPhone 15 Pro Max', 'preowned', 'es', '256GB', 7499),
('iPhone 15 Pro Max', 'preowned', 'es', '512GB', 8199),
('iPhone 15 Pro Max', 'preowned', 'es', '1TB', 8999),
-- ── iPhone 15 Pro · preowned ────────────────────────────────
('iPhone 15 Pro', 'preowned', 'ps', '128GB', 7399),
('iPhone 15 Pro', 'preowned', 'ps', '256GB', 7899),
('iPhone 15 Pro', 'preowned', 'ps', '512GB', 8499),
('iPhone 15 Pro', 'preowned', 'ps', '1TB', 9499),
('iPhone 15 Pro', 'preowned', 'es', '128GB', 6899),
('iPhone 15 Pro', 'preowned', 'es', '256GB', 7399),
('iPhone 15 Pro', 'preowned', 'es', '512GB', 7799),
('iPhone 15 Pro', 'preowned', 'es', '1TB', 8499),
-- ── iPhone 15 Plus · preowned ────────────────────────────────
('iPhone 15 Plus', 'preowned', 'ps', '128GB', 6999),
('iPhone 15 Plus', 'preowned', 'ps', '256GB', 7499),
('iPhone 15 Plus', 'preowned', 'ps', '512GB', 7999),
('iPhone 15 Plus', 'preowned', 'es', '128GB', 6199),
('iPhone 15 Plus', 'preowned', 'es', '256GB', 6799),
('iPhone 15 Plus', 'preowned', 'es', '512GB', 7399),
-- ── iPhone 15 · preowned ────────────────────────────────
('iPhone 15', 'preowned', 'ps', '128GB', 5999),
('iPhone 15', 'preowned', 'ps', '256GB', 6899),
('iPhone 15', 'preowned', 'ps', '512GB', 7399),
('iPhone 15', 'preowned', 'es', '128GB', 5199),
('iPhone 15', 'preowned', 'es', '256GB', 5999),
('iPhone 15', 'preowned', 'es', '512GB', 6799),
-- ── iPhone 14 Pro Max · preowned ────────────────────────────────
('iPhone 14 Pro Max', 'preowned', 'ps', '128GB', 6899),
('iPhone 14 Pro Max', 'preowned', 'ps', '256GB', 7299),
('iPhone 14 Pro Max', 'preowned', 'ps', '512GB', 7699),
('iPhone 14 Pro Max', 'preowned', 'ps', '1TB', 8599),
('iPhone 14 Pro Max', 'preowned', 'es', '128GB', 6399),
('iPhone 14 Pro Max', 'preowned', 'es', '256GB', 6899),
('iPhone 14 Pro Max', 'preowned', 'es', '512GB', 7399),
('iPhone 14 Pro Max', 'preowned', 'es', '1TB', 7799),
-- ── iPhone 14 Pro · preowned ────────────────────────────────
('iPhone 14 Pro', 'preowned', 'ps', '128GB', 5999),
('iPhone 14 Pro', 'preowned', 'ps', '256GB', 6599),
('iPhone 14 Pro', 'preowned', 'ps', '512GB', 6999),
('iPhone 14 Pro', 'preowned', 'ps', '1TB', 7499),
('iPhone 14 Pro', 'preowned', 'es', '128GB', 5299),
('iPhone 14 Pro', 'preowned', 'es', '256GB', 5899),
('iPhone 14 Pro', 'preowned', 'es', '512GB', 6299),
('iPhone 14 Pro', 'preowned', 'es', '1TB', 6999),
-- ── iPhone 14 Plus · preowned ────────────────────────────────
('iPhone 14 Plus', 'preowned', 'ps', '128GB', 5199),
('iPhone 14 Plus', 'preowned', 'ps', '256GB', 5699),
('iPhone 14 Plus', 'preowned', 'ps', '512GB', 6299),
('iPhone 14 Plus', 'preowned', 'es', '128GB', 4699),
('iPhone 14 Plus', 'preowned', 'es', '256GB', 5199),
('iPhone 14 Plus', 'preowned', 'es', '512GB', 5699),
-- ── iPhone 14 · preowned ────────────────────────────────
('iPhone 14', 'preowned', 'ps', '128GB', 4199),
('iPhone 14', 'preowned', 'ps', '256GB', 4699),
('iPhone 14', 'preowned', 'ps', '512GB', 5199),
('iPhone 14', 'preowned', 'es', '128GB', 3599),
('iPhone 14', 'preowned', 'es', '256GB', 4199),
('iPhone 14', 'preowned', 'es', '512GB', 4799),
-- ── iPhone 13 Pro Max · preowned ────────────────────────────────
('iPhone 13 Pro Max', 'preowned', 'single', '128GB', 5299),
('iPhone 13 Pro Max', 'preowned', 'single', '256GB', 5799),
('iPhone 13 Pro Max', 'preowned', 'single', '512GB', 6199),
('iPhone 13 Pro Max', 'preowned', 'single', '1TB', 6899),
-- ── iPhone 13 Pro · preowned ────────────────────────────────
('iPhone 13 Pro', 'preowned', 'single', '128GB', 4699),
('iPhone 13 Pro', 'preowned', 'single', '256GB', 4899),
('iPhone 13 Pro', 'preowned', 'single', '512GB', 5299),
('iPhone 13 Pro', 'preowned', 'single', '1TB', 5999),
-- ── iPhone 13 · preowned ────────────────────────────────
('iPhone 13', 'preowned', 'single', '128GB', 3599),
('iPhone 13', 'preowned', 'single', '256GB', 3999),
('iPhone 13', 'preowned', 'single', '512GB', 4499),
-- ── iPhone 12 Pro Max · preowned ────────────────────────────────
('iPhone 12 Pro Max', 'preowned', 'single', '128GB', 4199),
('iPhone 12 Pro Max', 'preowned', 'single', '256GB', 4599),
('iPhone 12 Pro Max', 'preowned', 'single', '512GB', 4899),
-- ── iPhone 12 Pro · preowned ────────────────────────────────
('iPhone 12 Pro', 'preowned', 'single', '128GB', 3599),
('iPhone 12 Pro', 'preowned', 'single', '256GB', 3999),
('iPhone 12 Pro', 'preowned', 'single', '512GB', 4399),
-- ── iPhone 12 · preowned ────────────────────────────────
('iPhone 12', 'preowned', 'single', '64GB', 2649),
('iPhone 12', 'preowned', 'single', '128GB', 2949),
('iPhone 12', 'preowned', 'single', '256GB', 3399),
-- ── iPhone 11 Pro Max · preowned ────────────────────────────────
('iPhone 11 Pro Max', 'preowned', 'single', '64GB', 2849),
('iPhone 11 Pro Max', 'preowned', 'single', '256GB', 3249),
('iPhone 11 Pro Max', 'preowned', 'single', '512GB', 3549),
-- ── iPhone 11 Pro · preowned ────────────────────────────────
('iPhone 11 Pro', 'preowned', 'single', '64GB', 2599),
('iPhone 11 Pro', 'preowned', 'single', '256GB', 2999),
('iPhone 11 Pro', 'preowned', 'single', '512GB', 3299),
-- ── iPhone 11 · preowned ────────────────────────────────
('iPhone 11', 'preowned', 'single', '64GB', 2099),
('iPhone 11', 'preowned', 'single', '128GB', 2349),
('iPhone 11', 'preowned', 'single', '256GB', 2549),
-- ── iPhone XR · preowned ────────────────────────────────
('iPhone XR', 'preowned', 'single', '64GB', 1779),
('iPhone XR', 'preowned', 'single', '128GB', 2249),
('iPhone XR', 'preowned', 'single', '256GB', 2449);


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
('iPhone 15 Plus',    'Blue',          2),
('iPhone 15 Plus',    'Green',         3),
('iPhone 15 Plus',    'Yellow',        4),
('iPhone 15 Plus',    'Pink',          5),
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

do $seed$
declare
  m record;
  t record;
  c record;
  v_product_id uuid;
  v_min numeric(12,2);
  v_storages text[];
  v_colors text[];
  v_existing uuid;
  v_sim text;
  v_sku text;
  v_is_new boolean;
  v_cond text;
  v_has_new boolean;
begin
  ------------------------------------------------------------------
  -- Pass 1: models that ONLY appear as preowned on the new sheets
  -- (14 → XR). Convert legacy 00700 products (condition=new) in place
  -- so we ALTER instead of creating duplicates.
  ------------------------------------------------------------------
  for m in
    select distinct r.model
      from tmp_iphone_retail r
     where r.condition = 'preowned'
       and not exists (
         select 1 from tmp_iphone_retail n
          where n.model = r.model and n.condition = 'new'
       )
  loop
    update public.products p
       set condition  = 'preowned',
           is_new     = false,
           updated_at = now()
     where p.category = 'iPhone'
       and p.name = m.model
       and coalesce(p.condition, 'new') <> 'preowned';
  end loop;

  ------------------------------------------------------------------
  -- Pass 2: upsert each (model, condition)
  --   • 15–17 NEW  → UPDATE existing 00700 product + variant prices
  --   • 15–17 PRE  → INSERT preowned twin (keep new product intact)
  --   • 14→XR PRE  → UPDATE converted product + variant prices
  ------------------------------------------------------------------
  for m in
    select distinct model, condition
      from tmp_iphone_retail
     order by model, condition
  loop
    v_cond := m.condition;
    v_is_new := (v_cond = 'new');

    select min(price) into v_min
      from tmp_iphone_retail
     where model = m.model and condition = v_cond;

    select array_agg(distinct storage order by storage)
      into v_storages
      from tmp_iphone_retail
     where model = m.model and condition = v_cond;

    select array_agg(mc.color order by mc.sort_order)
      into v_colors
      from tmp_iphone_model_colors mc
     where mc.model = m.model;

    if v_colors is null or cardinality(v_colors) = 0 then
      raise warning 'No colours defined for % — skipping', m.model;
      continue;
    end if;

    v_product_id := null;

    -- Exact name + condition
    select p.id into v_product_id
      from public.products p
     where p.name = m.model
       and p.category = 'iPhone'
       and p.condition = v_cond
     order by p.created_at nulls last
     limit 1;

    -- Legacy 00700: one row per model. Reuse for NEW sheet.
    if v_product_id is null and v_cond = 'new' then
      select p.id into v_product_id
        from public.products p
       where p.name = m.model
         and p.category = 'iPhone'
         and coalesce(p.condition, 'new') <> 'preowned'
       order by p.created_at nulls last
       limit 1;
    end if;

    -- Preowned-only models: reuse the (now converted) single product.
    -- Dual-sheet preowned: do NOT reuse the new product — insert a twin.
    if v_product_id is null and v_cond = 'preowned' then
      select exists (
        select 1 from tmp_iphone_retail n
         where n.model = m.model and n.condition = 'new'
      ) into v_has_new;

      if not v_has_new then
        select p.id into v_product_id
          from public.products p
         where p.name = m.model
           and p.category = 'iPhone'
         order by p.created_at nulls last
         limit 1;
      end if;
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
        format(
          'BlackBox priced %s (%s) — choose colour, storage and SIM on the product page.',
          m.model,
          case when v_cond = 'new' then 'New' else 'Pre-owned' end
        ),
        v_min,
        'GHS',
        0,
        'active',
        v_cond,
        coalesce(v_storages, '{}'),
        v_colors,
        false,
        v_is_new,
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
             condition   = v_cond,
             is_new      = v_is_new,
             storage     = coalesce(v_storages, storage),
             colors      = v_colors,
             trade_model = coalesce(trade_model, m.model),
             updated_at  = now()
       where id = v_product_id;
    end if;

    for t in
      select * from tmp_iphone_retail
       where model = m.model and condition = v_cond
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
             set price     = t.price,
                 sim_type  = v_sim,
                 sku       = v_sku,
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

    -- Deactivate leftover SKUs (wrong colour / storage / SIM) from prior seed
    update public.product_variants pv
       set is_active = false
     where pv.product_id = v_product_id
       and coalesce(pv.is_active, true)
       and not exists (
         select 1
           from tmp_iphone_retail r
           join tmp_iphone_model_colors mc
             on mc.model = r.model
          where r.model = m.model
            and r.condition = v_cond
            and coalesce(pv.color, '') = mc.color
            and coalesce(pv.storage, '') = r.storage
            and coalesce(nullif(btrim(pv.sim_type), ''), 'single')
                = coalesce(nullif(btrim(r.sim_type), ''), 'single')
       );
  end loop;

  ------------------------------------------------------------------
  -- Pass 3: set product.price = cheapest active variant
  ------------------------------------------------------------------
  update public.products p
     set price = sub.min_price,
         updated_at = now()
    from (
      select pv.product_id, min(pv.price) as min_price
        from public.product_variants pv
       where coalesce(pv.is_active, true)
         and pv.price is not null
         and pv.price > 0
       group by pv.product_id
    ) sub
   where p.id = sub.product_id
     and p.category = 'iPhone'
     and exists (
       select 1 from tmp_iphone_retail r where r.model = p.name
     );
end;
$seed$;

commit;

-- Quick check after run:
-- select p.name, p.condition, p.is_new, p.price,
--        count(*) filter (where coalesce(pv.is_active, true)) as active_variants
-- from products p
-- left join product_variants pv on pv.product_id = p.id
-- where p.category = 'iPhone'
-- group by p.id, p.name, p.condition, p.is_new, p.price
-- order by p.name, p.condition;
