# Trade-In & Repair Change Tracker (June 2026)

This document tracks **what changed**, **why**, and **what is different** from the previous behavior. It covers the trade-in redesign, repair pricing-mode work, admin tooling, and related UI fixes done in this iteration.

**Status:** Code is in the working tree; **run the SQL migrations in Supabase** before production use (see §8).

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

*Last updated: June 2026 — trade-in & repair redesign session.*
