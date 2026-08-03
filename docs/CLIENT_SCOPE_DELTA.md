# BlackBox Ghana — Client Scope Delta

Living list of work delivered **beyond the original shop + basic repair/trade + admin scope**. Use this for client estimates and change tracking.

**Effort key:** S ≈ 4–8h · M ≈ 1–3 days · L ≈ 1–2 weeks · XL ≈ multi-week workstream  
Estimates are placeholders for commercial discussion — replace with agreed hours after review.

---

## Changelog

| Date | Item | Notes |
|------|------|--------|
| 2026-08-03 | Doc created | Seeded from git themes + codebase inventory |
| 2026-08-03 | iPad retail category | Catalogue import, `display_size` axis, availability RPCs, `/ipads` UX, admin bulk pricing |

---

## Scope delta line items

| Feature | What shipped | Evidence | Est. | Status |
|---------|--------------|----------|------|--------|
| **Trade-in Estimator v2** | Multi-screen customer flow, DB pricing engine (`compute_trade_estimate`), upgrade targets, IMEI/serial, aesthetics, thresholds, expiry sweep, rich admin | `views/trade/*`, `views/admin/trade/*`, `database/migrations/2026_06_trade_*`, `2026_07_trade_*`, `BlackBox-Trade-In-Specification-v7.md`, `docs/trade-system-handbook.md` | XL | Shipped |
| **Promotions platform + Deal of the Day** | Campaign builder, promo codes registry, campus/category bridge, repair/trade promo scope, Deal of the Day in shop | `views/admin/promotions/*`, `lib/promotions.ts`, `database/migrations/20260721*`, `2026_07_deal_of_the_day.sql` | L | Shipped |
| **Resend email + web push** | Transactional email for orders/trades/repairs; web push subscriptions; notification fan-out | `2026_07_email_notification_triggers.sql`, `2026_07_push_subscriptions*.sql`, Resend/push scripts; note: `SYSTEM_DOCUMENTATION.md` §24.2 is stale | M–L | Shipped |
| **Invoice / receipt redesign** | BlackBox letterhead invoices and order docs | `components/invoice/*` | M | Shipped |
| **SKU matrix / variant admin** | Tabbed product form, per-SKU cards, colour×storage×SIM matrix, per-colour images, absolute variant prices | `views/admin/ProductSkuMatrix.tsx`, `AdminProductForm.tsx`, iPhone retail seed migrations | L | Shipped |
| **PWA idle logout (7-day)** | Wall-clock idle session expiry for PWA installs | `hooks/useIdleLogout.ts`, `docs/IDLE_LOGOUT_QA.md`, `README.md` | S–M | Shipped |
| **Wishlist / compare / cancel flows** | Compare modal, wishlist APIs, friendlier cancel UX | `views/Compare.tsx`, `components/CompareModal.tsx`, wishlist helpers in `lib/api.ts` | M | Shipped |
| **Repair dual pricing** | Apple matrix pricing vs diagnostic quote path; photos; emergency fee | `docs/TRADE_REPAIR_CHANGE_TRACKER.md`, `views/Repair.tsx`, `AdminRepairPricingModal.tsx` | L | Shipped |
| **Pickup-only checkout** | Delivery disabled; cart/checkout pickup-only | commit `e135038` | S | Shipped |
| **RBAC hardening** | Admin-only role management; staff cannot change roles | `AdminUsers.tsx`, related commits | S | Shipped |
| **Storefront polish** | Hero/carousel, category cards, pagination, mobile nav | `views/Home.tsx`, `views/Store.tsx`, Navbar | M | Shipped |
| **iPad retail category** | Spreadsheet import → products/variants; `display_size` axis; availability/resolve RPCs; `/ipads` listing + PDP cascade; admin bulk price/stock/CSV + price audit | `data/BlackBox_iPad_Catalogue.xlsx`, `scripts/import-ipads.ts`, `database/migrations/20260803000100_ipad_retail_display_size_and_rpcs.sql`, `database/migrations/20260803000200_ipad_retail_catalogue_seed.sql`, `views/Ipads.tsx`, `views/IpadModelPage.tsx`, `views/admin/AdminIpads.tsx` | L | Shipped |
| **Live Paystack / MoMo** | Card & mobile-money capture | — | L | **Not shipped** (deferred; see `SYSTEM_DOCUMENTATION.md` §24.1) |
| **Native mobile apps** | iOS/Android apps | — | XL | **Out of scope** |
| **Trade-in iPad valuation prices** | Retail iPad catalogue does **not** auto-feed `trade_base_values` | Handbook TODOs / Decision Sheet | M | Pending client trade price sheet |

---

## Pattern for the next category (MacBook, etc.)

1. **Data shape** — spreadsheet is source of truth; validate before write.  
2. **Constraints** — CHECK / UNIQUE on the price key; never invent missing configs.  
3. **One resolver** — availability matrix upfront; resolve single SKU for cart.  
4. **UI reads the resolver** — no per-click round trips.  
5. **Axes change; stack does not** — keep `products` + `product_variants` (GHS), map connectivity → `sim_type`.

---

## How to use with the client

1. Agree which rows were **in original SOW** vs **delta**.  
2. Replace Est. placeholders with commercial hours/rates.  
3. Update the Changelog whenever a major delta feature lands.  
4. Keep **Not shipped** rows visible so they are not billed as delivered.
