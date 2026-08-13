# Trade-In, Repair & August Store Change Tracker

This document tracks **what changed**, **why**, **how to operate it**, and **limits/constraints**.

- **§1–13:** June 2026 trade-in & repair redesign (and known follow-ups).
- **§14:** August 2026 catalogue seeds, shop filters, Pre-owned, live trade battery rules, nav/UX — including **unplanned** follow-ons and a **limits quick reference** (§14.12).

**Status:** App code is in the working tree. For August catalogue + live trade bands, **run SQL `00100`–`00700`, then `00850`, then `00800`, then `00900`** on Supabase (§14.11). June valuation columns still need their own migrations (§8) if not already applied.
---

## Quick summary

| Area | Before | After |
|------|--------|--------|
| Trade-in devices | Many brands/categories | **Apple iPhone & iPad only** |
| Trade-in pricing | Manual / vague | **Base purchase price − component % deductions** → credit + optional top-up |
| Trade-in upgrade target | Any store product (broad filter) | **iPhone/iPad store products only** |
| Repair iPhone pricing | Mixed with other devices | **Apple iPhone matrix**; others get **diagnostic quote** |
| Admin pricing | Hard-coded in source files only | **Admin modals** edit prices (browser localStorage overrides) |
| Admin dashboards | Generic request lists | **Workflow-oriented** UI (matrix vs diagnostic / inspect → offer) |
| Product cards | Tall cards | **Compact e-commerce height** |

---

## 1. Customer trade-in (`views/Trades.tsx`)

### 1.1 Apple-only device flow
- **Before:** Multi-step flow included brand picker (Samsung, etc.) and many device types.
- **After:** Only **iPhone** (`smartphone`) and **iPad** (`tablet`). Choosing a type auto-sets brand to **Apple** and skips the brand step.
- **Files:** `views/Trades.tsx`, `data/tradeInDevices.ts`, `data/deviceBrands.ts`

### 1.2 Component-based valuation
- **Before:** No structured condition deductions; estimate was informal.
- **After:** Customer flags faulty **components** (battery, screen, camera, etc.). Each applies a **% deduction** from the base purchase price. Live **TradeValuationCard** shows base, deductions, final credit, and top-up if an upgrade product is selected.
- **Files:** `lib/tradeValuation.ts`, `components/TradeValuationCard.tsx`, `data/tradeInPrices.ts`

### 1.3 Upgrade target (iPhone/iPad products only)
- **Before:** Upgrade picker could include laptops, accessories, etc. (especially when admin stored product IDs without filtering).
- **After:** `isEligibleTradeUpgradeProduct()` restricts targets to products whose name/category indicates **iPhone or iPad**. Invalid restored selections are cleared. Submit validates eligibility.
- **Files:** `lib/tradeUpgradePicks.ts`, `views/Trades.tsx`

### 1.4 Wizard structure
- **Before:** Mirrored repair sub-steps including brand; less clear overall progress.
- **After:**
  - **Step 1:** Device (type → model)
  - **Step 2:** Details (Upgrade → Condition → Notes)
  - **Step 3:** Schedule + contact
  - **Step 4:** Review & submit
  - **FlowStepper** component shows progress on steps 1–4
- **Files:** `views/Trades.tsx`, `components/FlowStepper.tsx`

### 1.5 Submit payload (new DB fields)
Trade requests now persist (when migration applied):
- `device_type`, `pricing_mode` (`matrix_estimate` | `inspection_quote`)
- `base_trade_value`, `deduction_breakdown`, `component_flags`
- `target_product_price`, `top_up_amount`
- Existing: `target_product_id`, `target_variant_id`, contact/booking fields

**Files:** `views/Trades.tsx`, `lib/api.ts`, `types.ts`, `database/migrations/2026_06_trade_valuation.sql`

---

## 2. Customer repair (`views/Repair.tsx`)

### 2.1 Pricing paths
- **Before:** Apple repair matrix shown broadly; less distinction for non-iPhones.
- **After:**
  - **Apple + iPhone model + priced issues** → `apple_matrix` — shows matrix component prices and total.
  - **Everything else** (Samsung, laptop, iPad repair, unknown issues) → `diagnostic_quote` — “quote after diagnostic”.
- **Files:** `lib/repairDeviceTypes.ts`, `lib/repairIssueCatalog.ts`, `views/Repair.tsx`

### 2.2 Device-tailored issues & accessories
- Issue checklist and accessory options depend on **device type** and **brand** (not one generic list).
- **Files:** `lib/repairIssueCatalog.ts`, `data/deviceBrands.ts`

### 2.3 Brand filtering
- Brand grid only shows manufacturers relevant to the selected category (e.g. no Nintendo on smartphone repair).
- **Files:** `data/deviceBrands.ts`, `views/Repair.tsx`

### 2.4 Submit payload (new DB fields)
- `device_type`, `pricing_mode` sent on create; `estimated_cost` set when matrix total &gt; 0.
- **Files:** `views/Repair.tsx`, `lib/api.ts`, `database/migrations/2026_06_repair_device_pricing_mode.sql`

### 2.5 Admin-editable matrix prices (customer reads overrides)
- Customer matrix uses `getEffectiveRepairPricing()` which merges defaults + localStorage overrides.
- **Files:** `lib/repairPricingStore.ts`, `views/Repair.tsx`

---

## 3. Admin trade-ins (`views/admin/AdminTrades.tsx`)

### 3.1 Workflow-oriented dashboard
- **Workflow banner:** Submitted → Inspect → Offer → Complete (+ stock).
- **Table:** Shows **Est. credit** and pricing mode; review modal shows **Type**, **Pricing path**, customer estimate breakdown.
- **Offer form:** Pre-fills from customer estimate; **“Use customer estimate”** shortcut.
- **Files:** `views/admin/AdminTrades.tsx`, `lib/adminWorkflow.ts`, `components/FlowStepper.tsx` (`AdminFlowBar`)

### 3.2 Pricing manager
- **New button:** **Pricing** → `AdminTradePricingModal`
- Edit **base purchase price** per iPhone/iPad model and **component deduction %**.
- Saves to **browser localStorage** (`bb_v4_trade_device_prices`, `bb_v4_trade_component_percents`).
- **Files:** `views/admin/AdminTradePricingModal.tsx`, `lib/tradePricingStore.ts`

### 3.3 Upgrade picks & device catalog (unchanged storage model, stricter rules)
- **Upgrade picks:** Only iPhone/iPad products can be added; saves to localStorage.
- **Manage devices:** Still localStorage (`bb_v4_trade_devices`); catalog merged with defaults in `data/tradeInDevices.ts`.

### 3.4 Review modal — valuation display
- Shows `base_trade_value`, estimated credit, top-up, and line-item **deduction_breakdown** when present.

---

## 4. Admin repairs (`views/admin/AdminRepairs.tsx`)

### 4.1 Two-path workflow
- **Banner:** Explains **iPhone matrix** vs **diagnostic** flows.
- **Filter tabs:** All pricing | iPhone matrix | Diagnostic.
- **Review modal:** `AdminFlowBar` (Intake → Diagnose → Quote → In repair → Done), pricing path description, matrix issue tags + customer matrix total when applicable.
- **Files:** `views/admin/AdminRepairs.tsx`, `lib/adminWorkflow.ts`

### 4.2 Matrix pricing manager
- **New button:** **Matrix prices** → `AdminRepairPricingModal`
- Edit iPhone model × repair columns **A–H** (screen, battery, etc.).
- Saves to localStorage (`bb_v4_repair_matrix_prices`).
- **Files:** `views/admin/AdminRepairPricingModal.tsx`, `lib/repairPricingStore.ts`

### 4.3 Estimate sending
- Pre-fills estimate from customer matrix total for `apple_matrix` jobs.
- **“Use customer matrix total”** button in estimate section.

---

## 5. New libraries & data files

| File | Purpose |
|------|---------|
| `lib/tradeValuation.ts` | Component defs, `computeTradeValuation()`, top-up math, pricing mode labels |
| `lib/tradePricingStore.ts` | localStorage overrides for trade device prices & component %; `lookupTradeBasePrice()` |
| `lib/repairDeviceTypes.ts` | `device_type`, `pricing_mode`, `buildRepairDeviceFields()`, DB constraint helpers |
| `lib/repairIssueCatalog.ts` | Device-specific issues, Apple matrix price lookup via effective pricing store |
| `lib/repairPricingStore.ts` | localStorage overrides for iPhone repair matrix |
| `lib/adminWorkflow.ts` | Admin workflow stage helpers & path descriptions |
| `lib/tradeUpgradePicks.ts` | Upgrade product resolution + **iPhone/iPad eligibility** filter |
| `data/tradeInPrices.ts` | Default iPhone/iPad base purchase prices (GHS) |
| `data/tradeInDevices.ts` | Trimmed catalog: iPhone & iPad lines only |
| `data/deviceBrands.ts` | Per-category brand lists (`getBrandsForDeviceType`) |
| `components/TradeValuationCard.tsx` | Live trade estimate UI (full + compact) |
| `components/FlowStepper.tsx` | Customer wizard stepper + `AdminFlowBar` |

---

## 6. API & types (`lib/api.ts`, `types.ts`, `types/supabase.ts`)

### Trade
- Extended `TRADE_DB_COLUMNS` and `mapTradeFromDb` for valuation fields.
- Friendly errors for pricing/constraint failures.
- `createTradeRequest` sends new columns when provided.

### Repair
- Extended `REPAIR_DB_COLUMNS` with `device_type`, `pricing_mode`.
- `assertRepairPricingConstraint()` guard on insert (apple_matrix ⇒ Apple iPhone smartphone).
- `mapRepairFromDb` exposes `pricing_mode`, `device_type`.

---

## 7. Store UI (related)

### Product cards
- **Before:** Cards were very tall.
- **After:** Compact layout; icon cart; color options on card; tighter media aspect ratio in `global.css`.
- **Files:** `components/ProductCard.tsx`, `global.css`

---

## 8. Database migrations (must run in Supabase)

Run in order:

1. **`database/migrations/2026_06_repair_device_pricing_mode.sql`**
   - Adds `repair_requests.device_type`, `repair_requests.pricing_mode`
   - CHECK: `apple_matrix` ⇒ `device_type = 'smartphone'`

2. **`database/migrations/2026_06_trade_valuation.sql`**
   - Adds trade valuation columns (`device_type`, `pricing_mode`, `base_trade_value`, `deduction_breakdown`, `component_flags`, `target_product_price`, `top_up_amount`)
   - CHECK on `pricing_mode` enum

After running: `NOTIFY pgrst, 'reload schema'` is included in each file.

---

## 9. TypeScript & routing fixes (supporting)

- `ProductOptionPickers.tsx` — `strictStock` destructure
- `App.tsx` — `setUser` typing
- `Repair.tsx` — union narrowing for `buildRepairDeviceFields`
- `AdminTrades.tsx`, `AdminRepairs.tsx` — defaults aligned with new enums
- `Navbar.tsx`, `MobileNavDrawer.tsx`, `Store.tsx`, `Profile.tsx`, `goBack.ts` — router/search typing

`npx tsc --noEmit` passes after these changes.

---

## 10. Important behavioral differences to remember

### Admin pricing is localStorage-only
Changes in **Pricing** / **Matrix prices** / **Upgrade picks** / **Manage devices** apply **only in that browser**. They do **not** sync to Supabase or other staff machines. Defaults remain in `data/tradeInPrices.ts`, `data/repairPrices.ts`, and bundled catalogs.

### Trade inspection quotes vs zero
- UI treats unknown models as **inspection quote** (no matrix).
- API still defaults missing `estimated_value` to **0** on insert — admin may show GH₵0 instead of “TBD” until fixed.

### Repair appointment date vs admin “Date” column
- Customer books `preferred_date` / `preferred_time` (saved to DB).
- Admin table/modal **Date** still shows **request created_at** — not the appointment slot.

### Trade pickup address
- Customer must enter address for pickup in the wizard, but there is **no dedicated DB column** yet — address is **not persisted** on the trade row.

---

## 11. Known follow-ups (from audit — not yet fixed)

These were identified in review but **not implemented** in this pass:

| Priority | Issue |
|----------|--------|
| P0 | Persist trade pickup `address` (column + API) |
| P0 | Do not store `estimated_value = 0` for `inspection_quote` |
| P0 | Show repair **preferred_date** in admin instead of only `created_at` |
| P0 | Remove fuzzy partial matching in `lookupTradeBasePrice()` |
| P1 | Remove repair-model **1500** fallback from trade price table |
| P1 | Align repair stored `estimated_cost` with urgency/pickup fees shown in UI |
| P1 | Complete “New Request” wizard reset (all phase/component state) |
| P1 | Surface **multiple** pending trade offers / repair estimates |
| P2 | Move admin pricing/catalog to Supabase for multi-user consistency |

---

## 12. File change index

### New files
- `components/FlowStepper.tsx`
- `components/TradeValuationCard.tsx`
- `data/tradeInPrices.ts`
- `database/migrations/2026_06_repair_device_pricing_mode.sql`
- `database/migrations/2026_06_trade_valuation.sql`
- `lib/adminWorkflow.ts`
- `lib/repairDeviceTypes.ts`
- `lib/repairIssueCatalog.ts`
- `lib/repairPricingStore.ts`
- `lib/tradePricingStore.ts`
- `lib/tradeValuation.ts`
- `views/admin/AdminRepairPricingModal.tsx`
- `views/admin/AdminTradePricingModal.tsx`
- `types/supabase.ts` (generated/typed DB helpers)

### Modified (trade/repair core)
- `views/Trades.tsx`
- `views/Repair.tsx`
- `views/admin/AdminTrades.tsx`
- `views/admin/AdminRepairs.tsx`
- `lib/api.ts`
- `lib/tradeUpgradePicks.ts`
- `data/tradeInDevices.ts`
- `data/deviceBrands.ts`
- `types.ts`

### Modified (UI / other)
- `components/ProductCard.tsx`, `global.css`, `components/ProductOptionPickers.tsx`
- `App.tsx`, `views/Admin.tsx`, routing/nav files, etc.

---

## 13. How to verify manually

### Trade-in (customer)
1. Open `/trades` — only iPhone/iPad types.
2. Pick model → flag components → see live estimate.
3. Upgrade step — only iPhone/iPad products (or admin-curated subset).
4. Submit while signed in — check admin trade row for breakdown fields.

### Trade-in (admin)
1. Admin → Trades → **Pricing** — change a model price; refresh customer page (same browser) — estimate updates.
2. Review a request — workflow bar, estimate breakdown, offer pre-fill.

### Repair (customer)
1. Apple iPhone + screen issue — matrix prices shown.
2. Samsung phone — diagnostic quote copy, no matrix total.

### Repair (admin)
1. **Matrix prices** — edit a cell; customer iPhone repair page reflects it (same browser).
2. Filter **iPhone matrix** — matrix requests show issue tags + total.

---

---

## 14. August 2026 — Full change document (catalogue, shop, trade, nav)

Tracks work **after** the June trade/repair redesign. Includes both **planned** items and **follow-on / unplanned** changes discovered during build and production cross-check.

**Status:** App code is in the working tree. **Catalogue + live trade battery rules do not appear in production until SQL `00100`–`00800` are applied** on Supabase (§14.11).

---

### 14.0 What was in scope vs what got added later

| Kind | Item |
|------|------|
| **Planned** | MacBooks & Other Macs August PDF → seed |
| **Planned** | Smart watches taxonomy + Apple Watch seed |
| **Planned** | Android phones August PDF → seed (New-only list) |
| **Planned** | Shop Brand → Series (and Series → New/Used where applicable) |
| **Planned** | Align trade estimate to **live** battery bands + replaced policy |
| **Added later** | Consolidate side filter (Brand / Series / Condition separate; stop mixing Brand into Condition) |
| **Added later** | `series=all` deep-links so nav lands on product grid (skip card drill-downs) |
| **Added later** | Pre-owned badges + heal `condition` ↔ `is_new`; Android admin no longer forces New on save |
| **Added later** | Condition filter on **all** single-category browses (incl. Android) |
| **Added later** | Desktop Shop mega-menu regroup (Phones / Tablets & computers / Wearables & audio / More) |
| **Added later** | Mobile nav: single Sign in, Shop open by default, less cramped chrome |
| **Added later** | Footer + Home deep-links → canonical categories / `/trade` / trade history |
| **Added later** | `submitTradeRequest` re-RPC `compute_trade_estimate` before insert |
| **Added later** | Aesthetic exclusivity restore (`00600`) + battery hygiene (`00700`) |
| **Added later** | `00800` assert `v_product_page` columns for go-live |
| **Added later** | Compare page condition labels share `formatProductConditionLabel` |
| **Added later** | Admin taxonomy typing (`name`/`brand`) for Brand→Series resolve |
| **Added later** | Legacy App.tsx mobile menu category list updated (dead UI, kept consistent) |
| **Added later** | Compare page rebuilt as shop-floor matchup (deals, Pre-owned, series, trade CTA, diffs-only) |
| **Not done (ops)** | Fill `trade_devices.threshold_value` (D16); set seed stock &gt; 0; recreate view columns if `00800` fails |

---

### 14.1 Effort estimate (relative hours)

| Workstream | Est. hours | Notes |
|------------|------------|--------|
| MacBooks / Other Macs PDF → seed + admin KEY fields | 6–8 h | Taxonomy + variants + series `neo`/`other` |
| Smart watches taxonomy + Apple seed + Brand→Series shop | 5–7 h | Category remap, Ultra/Series, Samsung/Others placeholders |
| Android phones PDF seed + Brand→Series | 5–7 h | Fold/Flip/S/Pixel/Moto; blank-price skips |
| Store side filter consolidation (Brand / Series / Condition) | 4–5 h | Panel rewrite, `series=all` skip pickers, chips |
| Pre-owned rendering + condition↔`is_new` heal | 2–3 h | Cards, PDP, list, quick view, migration `00500` |
| Trade upgrade allowlist + linked targets | 2–3 h | `tradeUpgradePicks`, TradeTargetScreen |
| Trade battery bands (live 4-tier) + replaced=`full_verify` | 3–4 h | Migrations `00600`/`00700`, submit recompute, tests |
| Nav Shop categories + mobile de-cramp / single Sign in | 2–3 h | Desktop mega-menu sections; drawer UX |
| Unplanned polish (Home/Footer links, compare labels, view assert, condition everywhere) | 2–3 h | Production cross-check follow-ups |
| Change tracker + cross-check / promo path review | 1–2 h | Docs |
| **Total (this pass)** | **~32–45 h** | Parallelisable; migrations still need apply on Supabase |

---

### 14.2 Product catalogue & taxonomy — what changed

| Before | After |
|--------|--------|
| Sparse Mac / watch / Android coverage | August seeds: MacBooks, Smart watches (Apple), Android phones |
| Watches as loose / legacy tags (`iWatches`, `Apple Watches`) | Canonical **`Smart watches`** → Brand → Series (`Ultra` / `Series` / `Galaxy` / `Other`) |
| Android hard to find; spaced series broke matching | Brand→Series; match keeps spaces (`Fold 7`) |
| `condition` and `is_new` could disagree | Heal migration + client sync in `catalogApi` |
| Old stock looked “New” on cards | **Pre-owned** / **Refurbished** badges on card, list, PDP, quick view, compare |

**Canonical storefront categories** (via `normalizeProductCategory` in `lib/api.ts`):

| Input examples | Canonical |
|----------------|-----------|
| Laptop, Laptops, notebooks | `Laptops` |
| MacBook, iMac, Mac mini, Other Macs | `MacBooks` |
| Android, Pixel, Galaxy phone | `Android phones` |
| Apple Watch, smartwatch, Smart watches | `Smart watches` |
| Headphones, AirPods, earbuds | `Headphones` |
| Speakers, HomePod | `Speakers` |

**How products are filed (ops insight):**

| Category | Shop path | What to put on the product row |
|----------|-----------|--------------------------------|
| iPhone | Series → New/Used → products | `subcategory` = series slug (`iphone-17`…); `condition` = `new` \| `preowned` |
| iPad | Series → New/Used | `subcategory` = `pro`/`air`/`mini`/`standard`; `condition` |
| MacBooks | Series → New/Used | `subcategory` = `pro`/`air`/`neo`/`other`; `condition`; KEY specs in `specifications` |
| Android phones | Brand → Series → products | `brand` = Samsung/Google/Motorola; `subcategory` = series (`Fold 7`, `S26 Ultra`…); `condition` free (default New) |
| Smart watches | Brand → Series → products | `brand` = Apple/Samsung/Others; `subcategory` = `Ultra`/`Series`/`Galaxy`/`Other` |
| Laptops | Brand → Series | `brand` = HP/Dell; `subcategory` = Omen/Envy/… |
| Headphones / Speakers | Brand → Series | Brand on `products.brand`; series on `subcategory` |

**Seed sources / limits:**

- PDFs under `.tmp-pricing/` (not shipped to prod).
- Android: **blank price rows skipped** (e.g. some Fold 7 / A35 configs).
- Android seed is **New-only**; Pre-owned Android must be added manually in admin.
- All August seeds typically ship **`stock: 0`** / variant stock 0 → storefront shows **out of stock** until staff set stock.
- Seeds are **idempotent** (`ON CONFLICT (slug) DO UPDATE`) — safe to re-run.

**Migrations:** `00100`–`00500`.

---

### 14.3 Shop filtering — how it works

**URL search params** (`/store` via `App.tsx` `validateSearch`):

| Param | Meaning | Limits |
|-------|---------|--------|
| `category` / `categories` | Category filter (normalized) | Free string → canonical via `normalizeProductCategory` |
| `series` | Series slug, or **`all`** | Max ~80 chars; `all` = skip series card picker, show grid |
| `condition` | `new` \| `used` | Only those two in URL; UI “Used” maps to preowned/refurbished matching |
| `subcategory` | Brand (Brand→Series cats) or legacy | Max ~80 chars |
| `browse` | `all` \| `deals` | `deals` = Deal of the Day list |
| `q` | Text | Trimmed, max 200 chars |

**Side panel order:** Category → Brand (if Brand→Series) → Series → Condition → Price → Deals.

**Picker vs filter browse:**

- Card drill-downs still exist when shopper picks category without `series=all`.
- Nav / Footer / Home use **`series=all`** so shoppers land on the **grid** and refine in the panel.
- Condition filter is available whenever a **single category** is active (including Android).

**Promo / deals (do not confuse):**

| Feature | What it is | Limit |
|---------|------------|--------|
| Deal of the Day | `is_deal_of_the_day` on product; `browse=deals` | Listing flag + optional `promo_text`; not a checkout code by itself |
| Side “On sale only” | `discount > 0` | Product-level discount %, not promo engine |
| Checkout promo codes | `promo_reserve` / server evaluate | Requires valid code, min order, eligibility; smoke-test on staging |

**Key files:** `lib/storeFilters.ts`, `components/StoreFilterPanel.tsx`, `views/Store.tsx`.

---

### 14.4 Pre-owned & condition — rules and limits

**Canonical DB values:** `condition` ∈ `new` | `preowned` | `refurbished` (legacy `used` / `pre-owned` healed → `preowned`).

**Display** (`formatProductConditionLabel`):

| Data | Badge / label |
|------|----------------|
| `refurbished` | Refurbished |
| `preowned` / used / pre-owned | Pre-owned |
| `new` or `is_new=true` | New (card often **hides** “New” badge to reduce noise) |
| `is_new=false` with empty condition | Treated as Pre-owned after heal |

**Client sync** (`catalogApi.mapProductPageRow`): if condition is preowned/refurbished → force `is_new=false`; if `new` → `is_new=true`.

**Admin:**

- iPhone / iPad / MacBooks: taxonomy New/Used drives `condition`.
- Android / watches / audio / laptops (Brand→Series): taxonomy is brand; **Condition field on the form is preserved** on save (Android no longer forced New).
- Limit: changing Brand taxonomy alone will not wipe Pre-owned if `existingCondition` is passed correctly.

**Migration:** `00500_heal_product_condition_is_new.sql`.

---

### 14.5 Trade-in calculation (live site — not plan draft)

Live rules encoded in DB (`compute_trade_estimate` + `trade_config`):

| Rule | Live behaviour | Constraint |
|------|----------------|------------|
| Battery health (not replaced) | ≥91 none · 85–90 **25%** · 70–84 **50%** · ≤69 / Service **full** | Outcomes live on answer rows (B2/iB2); config keys document edges |
| Battery **replaced** (B1/iB1 Yes) | `battery_replaced_policy = full_verify` → **full** battery deduction + `needs_verification` | Health % is still asked/stored; it does **not** waive the replaced penalty |
| Camera replaced | `full_verify` → verify flag | Engineer may adjust after inspection |
| Aesthetics | Exclusive modes (`00600`) | percent / fixed / per_model — not stacked incorrectly |
| Threshold (D16) | `threshold_mode` may be `per_model` | **`trade_devices.threshold_value` still empty until ops fill** — feature dormant |
| Money on submit | Client calls RPC again inside `submitTradeRequest` | Never trust client-computed credit for insert |
| Upgrade targets | Product must have `products.trade_model` set | Allowlist in `trade_config` / localStorage; not every shop SKU |

**Routes:**

| Path | Role |
|------|------|
| `/trade` | Trade-in v2 wizard (Screens 1–9) |
| `/trades` | Redirects to `/trade` when `VITE_TRADE_V2_ENABLED` (default on) |
| `/account/trade-ins` | Customer trade history |

**Rollback:** `VITE_TRADE_V2_ENABLED=false` serves legacy `views/Trades.tsx` at `/trades`.

**Migrations:** `00600`, `00700`. Require earlier July trade engine migrations already on the DB.

**Admin copy:** `lib/tradeAdminCopy.ts` — documents live bands / `full_verify` for staff UI.

**Tests:** `tests/trade-engine-matrix.test.ts` + `scripts/engine-matrix.mjs` (may skip without DB credentials).

---

### 14.6 Navigation, Home, Footer (incl. unplanned UX)

**Desktop Shop mega-menu sections:**

1. Phones — iPhone, Android phones  
2. Tablets & computers — iPad, MacBooks, Laptops  
3. Wearables & audio — Smart watches, Headphones, Speakers  
4. More — Gaming, Accessories, Deal of the Day  

All category links use `{ category, series: 'all' }`.

**Mobile drawer (unplanned polish):**

- One **Sign in** in footer (removed duplicate header Sign-in).
- Guest profile block is static “Welcome” (not a second Sign-in).
- Shop submenu **open by default**.
- Quick Shop → `{ browse: 'all' }`.
- Trade history → `/account/trade-ins`.

**Home (unplanned):**

- Category tiles: `Laptops` (not `Laptop`), iPhone/Headphones with `series=all`.
- Trade CTAs → `/trade` (not `/trades`).

**Footer:** Shop categories aligned; Trade-ins → `/trade`; history → `/account/trade-ins`.

**Limits:**

- Active mobile menu is **`MobileNavDrawer` via Navbar**. The large menu block still in `App.tsx` is legacy and not opened; categories there were updated only for consistency.
- Cover images for new categories expect files in `public/`: `phones.jpeg`, `IMG_9008.JPG`, `macbook.jpeg`.

---

### 14.7 Admin product form — how to add stock correctly

1. Choose **category** from `ADMIN_MAIN_CATEGORIES`.
2. Set **taxonomy** (New/Used **or** Brand depending on category).
3. Set **series** when the category uses a series step.
4. Set **Condition** explicitly for Brand→Series categories if Pre-owned / Refurbished.
5. Prefer **SKU matrix** for multi-config phones/Macs; stock totals from variants.
6. Optional: `trade_model` if this SKU should appear as a trade **upgrade** target.
7. Optional: Deal of the Day flags + `promo_text`.

**Limits:**

- Category / subcategory values must pass Postgres CHECKs widened by August migrations (`NOT VALID` skips rechecking dirty legacy rows).
- Featured / delete / upload follow existing admin patterns; seeds do not auto-feature.
- Without `v_product_page.subcategory` (and friends), Brand→Series filters cannot see series from the listing view — run `00800`.

---

### 14.8 Storefront data path — limits

```
products (+ variants)  →  v_product_page  →  catalogApi.getProducts()  →  Store / cards
                         (must expose subcategory, condition, is_new, stock, prices, deals…)
```

- Cards do **not** join variants; stock/price come from the view aggregates.
- PDP hydrates variants + images after the shell row loads.
- If the view is stale, filters look empty even though `products` rows exist.

---

### 14.9 File change index (August pass)

**New migrations**

- `database/migrations/20260813000100_apple_watches_category_taxonomy.sql`
- `database/migrations/20260813000200_macbooks_other_macs_catalogue_seed.sql`
- `database/migrations/20260813000300_apple_watches_catalogue_seed.sql`
- `database/migrations/20260813000400_android_phones_catalogue_seed.sql`
- `database/migrations/20260813000500_heal_product_condition_is_new.sql`
- `database/migrations/20260813000600_restore_aesthetic_mode_strict.sql`
- `database/migrations/20260813000700_trade_estimate_battery_bands_hygiene.sql`
- `database/migrations/20260813000800_assert_v_product_page_storefront_columns.sql`
- `database/migrations/20260813000850_v_product_page_expose_product_columns.sql`
- `database/migrations/20260813000900_stock_match_variant_id_and_dims.sql`

**Core app**

- `lib/storeFilters.ts`, `lib/catalogApi.ts`, `lib/api.ts` (category normalize)
- `lib/tradeApi.ts`, `lib/tradeAdminCopy.ts`, `lib/tradeUpgradePicks.ts`, `lib/tradeTargetHelpers.ts`
- `lib/compareProducts.ts`
- `components/StoreFilterPanel.tsx`, `ProductCard.tsx`, `StoreProductListRow.tsx`, `QuickViewModal.tsx`
- `components/Navbar.tsx`, `MobileNavDrawer.tsx`, `Footer.tsx`
- `views/Store.tsx`, `ProductDetail.tsx`, `Home.tsx`
- `views/admin/AdminProductForm.tsx`, `AdminProducts.tsx`
- `views/admin/trade/TradeAdminConfig.tsx`
- `views/trade/TradeTargetScreen.tsx`
- `App.tsx` (routes already had store search; legacy menu labels updated)
- `global.css` (mobile nav spacing)
- `tests/trade-engine-matrix.test.ts`, `scripts/engine-matrix.mjs`

---

### 14.10 Verify manually

1. Apply SQL **`00100`–`00800`** on staging/prod (§14.11).
2. Shop → Android / MacBooks / Smart watches from nav — grid lists seeded products.
3. Side filter: Brand → Series → Condition; Deal of the Day; checkout promo code.
4. Pre-owned badge on used/refurbished; admin save Pre-owned Android keeps Pre-owned.
5. Trade: battery ≥91 → no battery deduction line; Yes replaced → full battery + verify.
6. Mobile: one Sign in; Shop expanded; Home trade tile opens `/trade`.
7. `00800` NOTICE/EXCEPTION — fix `v_product_page` if core columns missing.
8. Set stock on a few SKUs and confirm Add to cart / OOS badge behaviour.

---

### 14.11 Production go-live checklist

| Gate | Status / action |
|------|-----------------|
| `vite build` | Clean (verified in cross-check) |
| Migrations `00100`…`00800` | **Must apply** on staging then prod |
| `v_product_page` columns | `00800` asserts core; optional deal/rating NOTICE only |
| Nav / Footer / Home | Canonical categories + `series=all`; `/trade` |
| Promo checkout | Smoke-test one code |
| Seed stock | Staff set stock &gt; 0 before marketing “in stock” |
| Trade D16 thresholds | Ops fill `trade_devices.threshold_value` when ready |
| Cover images | Present under `public/` |
| Engine matrix tests | Run against staging DB when credentials available |

**Apply order (Supabase SQL editor) — copy/paste each file top to bottom:**

1. `20260813000100_apple_watches_category_taxonomy.sql`
2. `20260813000200_macbooks_other_macs_catalogue_seed.sql`
3. `20260813000300_apple_watches_catalogue_seed.sql`
4. `20260813000400_android_phones_catalogue_seed.sql`
5. `20260813000500_heal_product_condition_is_new.sql`
6. `20260813000600_restore_aesthetic_mode_strict.sql`
7. `20260813000700_trade_estimate_battery_bands_hygiene.sql`
8. `20260813000850_v_product_page_expose_product_columns.sql` ← **fixes missing `subcategory` on the view**
9. `20260813000800_assert_v_product_page_storefront_columns.sql` ← assert (re-run after 00850)
10. `20260813000900_stock_match_variant_id_and_dims.sql` ← checkout stock uses `variant_id` + full dims
11. `20260813001000_order_items_variant_id_place_order.sql`
12. `20260813001100_heal_product_variants_staff_write.sql` ← staff can write SKU stock (RLS)

After apply: spot-check

```sql
SELECT category, brand, subcategory, condition, is_new, COUNT(*)
FROM products
WHERE category IN ('Android phones','MacBooks','Smart watches')
GROUP BY 1,2,3,4,5
ORDER BY 1,2,3;
```

---

### 14.12 Functional limits & constraints (quick reference)

| Area | You can | You cannot / watch out |
|------|---------|-------------------------|
| Catalogue seeds | Re-run safely; update prices via conflict | Invent series not on CHECK without altering constraint |
| Android PDF import | New SKUs with prices | Blank-price PDF rows were never seeded |
| Stock | Edit in admin / DB | Seeds alone leave everything OOS |
| Shop filters | Brand/Series/Condition/Price/Deals | Multi-category browse has limited Brand→Series UI |
| `series=all` | Skip pickers from nav | Bare `?category=` without series may still show pickers |
| Pre-owned | Badge + filter + heal | Badge needs honest `condition`/`is_new` on the **view** |
| Trade battery | Live 4-band + full_verify replaced | Plan/D21 waiver modes are **not** live |
| Trade money | Server RPC is source of truth | Do not patch estimates only in the React UI |
| Trade upgrade | Linked `trade_model` + allowlist | Unlinked shop products never appear as targets |
| Thresholds D16 | Config mode ready | Empty threshold values ⇒ no below-threshold behaviour |
| Nav v2 trade | `/trade` primary | Legacy `/trades` only if flag off |
| Admin pricing (June localStorage) | Still browser-local for old matrix tools | Live trade engine config is **Supabase `trade_config`** |
| `v_product_page` | Asserted by `00800` | View DDL is **not** in this repo — fix in Supabase if assert fails |
| Compare | Shop-floor matchup (§14.14) | Max 4; ruling only at 2 devices |

---

### 14.13 Known follow-ups after this pass

| Priority | Item |
|----------|------|
| P0 | Apply `00100`–`00700`, then **`00850`**, then **`00800`**, then **`00900`** on staging/prod |
| P0 | Fix `v_product_page` via `00850` if assert still fails |
| P0 | Set stock on SKUs that should sell (price by Storage+RAM, qty by Color — §14.15) |
| P1 | Fill D16 `threshold_value` when business rules ready |
| P1 | Add Pre-owned Android / Samsung watch rows if ops need them (seeds are New / Apple-heavy) |
| P2 | Remove or fully retire dead `App.tsx` mobile menu block |
| P2 | Prefer `formatProductConditionLabel` everywhere remaining ad-hoc labels exist |

### 14.14 Compare page (shop-floor matchup) — August follow-on

**Goal:** Make `/compare` a complete BlackBox tool, not a generic spec table — using live catalogue strengths.

| Strength used | How compare uses it |
|---------------|---------------------|
| Deal of the Day / discount % | Rows + badges + picker priority |
| Pre-owned / New / Refurbished | Condition row (ranked), badges, meta line |
| Brand → Series taxonomy | Series/line row; search haystack; category chips |
| Stock / OOS | Availability wins; stock-first picker & starters |
| `trade_model` | Trade-ready badge + CTA into `/trade` |
| Canonical categories | Normalized picker filters (Android, MacBooks, Smart watches…) |

**UX:** Empty “Start a matchup” starters · Diffs-only toggle · Matchup insight strip · 2-up ruling (“Shop-floor lean”) · fork + full record · Clear tray.

**Limits:** Max **4** devices; ruling/fork only at **exactly 2**; money still from catalogue prices (not live trade estimate); variants on compare rows only if hydrated on the product object.

**Files:** `lib/compareProducts.ts`, `views/Compare.tsx`, `global.css` (compare section).

### 14.15 Inventory model — price by Storage+RAM, stock by Color

**Business rule (BlackBox):** For phones / Macs / similar, **Storage + RAM set the sell price**. **Color** (and similar options) mainly carry **how many units** you have of that config.

| Axis | Sets price? | Sets quantity? |
|------|-------------|----------------|
| Storage | Yes | Split across colors |
| RAM | Yes (with storage) | Split across colors |
| Color | No (same price as siblings) | Yes — per color qty |
| SIM / Size | Only when that config is priced differently | Per that combo |

**How the website stores it**

- One **product** = model family (e.g. iPhone 17).
- Many **`product_variants` (SKU rows)** = Color × Storage × RAM (× SIM/Size).
- Card “in stock” = **sum** of all SKU stocks.
- Checkout / cart qty for “Blue · 256GB · 8GB” = **that row’s stock only**.

**Staff steps (example: 100 iPhone 17, of which 6 Blue 256GB/8GB)**

1. Admin → product → **Options & stock**.
2. Chips: colors (Blue, Black…), storage (256GB…), RAM (8GB…).
3. Enable versions → **Create versions**.
4. Set price once on any Blue/Black row for **256GB / 8GB**.
5. Click **Match prices by Storage + RAM** so every color of that config gets the same price.
6. Set **Stock** on Blue 256/8 = 6; other colors of 256/8 as needed; leave unused combos at 0.
7. Save. Shop card shows total units; PDP Blue only sells up to 6.

**Do not** put “100” only on the product-level stock field while the matrix is on — that number is the **sum** of SKU rows after sync.

**Persistence hardening (Aug 2026):** `syncProductVariants` only updates IDs that exist for that product, verifies each UPDATE/INSERT returned rows (silent 0-row RLS failures used to look “saved”), and admin save writes variants then reconciles `products.stock`. Apply `20260813001100_heal_product_variants_staff_write.sql` if staff stock edits still fail.

**Hardening (this pass):** If SKU rows exist but the shopper’s combo doesn’t match a row, available stock is **0** (no longer falls back to the family total). That stops Blue from selling against Black’s quantity.

**UI / cart:** Listing cards (`v_product_page`) often lack SKU rows. `addToCart` / cart qty bumps hydrate via `getProduct` when chips exist but variants are missing; Quick View also hydrates on open so color/storage OOS chips match real SKU stock. Cart lines keep `variant_id` + variants for checkout (`00900`).

**Deal of the Day:** Flag + `discount` % + optional `promo_text` on products. Shop `browse=deals`, home rail, cards/PDP/cart use `lib/dealOfTheDay.ts` (`applyDealDiscountToAmount` on SKU price). Staff manage at **Admin → Shop → Deal of the Day** (`/admin/deals`). Promo codes stay under Promotions.

**Cart / checkout sync:** Line identity uses `lib/cartLineKey.ts` (`variant_id` preferred). `01000` adds `order_items.variant_id` and writes it from `place_order` so `00900` stock decrement hits the SKU.

**Account / tracking (pass 2):** Tracking fetches order + repair by UUID/`display_id` (same as trade). Order receipt no longer invents a fake invoice on error; uses `getOrder`/`getOrderByRef` with SKU join. History shows Track + Invoice + `display_id`. Profile/Returns/SignUp preserve `returnTo`.

**DB:** `00850` adds `subcategory` (and other missing product cols) to `v_product_page`. `00900` makes checkout validate/decrement by `variant_id` first, then Color/Storage/RAM/SIM/Size/Edition — no family fallback when SKUs exist.

---

*Last updated: August 2026 — catalogue, filters, trade, nav, compare, inventory, v_product_page subcategory fix, stock match.*
