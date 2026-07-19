# Trade-in QA — notifications, lifecycle jobs & edge cases

Manual scripts for acceptance of Phase (notifications / expiry / OOS / IMEI / RLS).
Prereqs: migrations `2026_07_trade_expiry_and_notify.sql` and
`2026_07_trade_snapshot_on_target_change.sql` applied; Edge Function
`trade-expiry-sweep` deployable (or call RPC directly).

---

## 1. Expiry sweep (time-travel row)

**Goal:** Idempotent expiry of pre-offer trades past `expires_at`.

1. Create (or pick) a trade in status `submitted` (or `inspecting` / `under_review`).
2. Time-travel:
   ```sql
   UPDATE trade_in_requests
      SET expires_at = NOW() - INTERVAL '1 day'
    WHERE display_id = 'TRD…'; -- your ref
   ```
3. Run sweep (pick one):
   - SQL: `SELECT public.fn_trade_expiry_sweep();` → expect `1` (or count of matching rows).
   - Edge: `POST /functions/v1/trade-expiry-sweep` with service role / `CRON_SECRET` → JSON `{ "expired_count": N }`.
4. Assert row `status = 'expired'`. Customer My trade-ins / tracking shows Expired badge (Phase 5).
5. Re-run sweep → `expired_count = 0` (idempotent).

**Do not expire:** rows already in `offer_made`, `awaiting_user`, `accepted`, `completed`, etc.

---

## 2. Out-of-stock completion (D11 — no reservation)

**Goal:** Strict stock decrement on complete fails when stock is 0; staff can switch target and re-snapshot top-up.

1. Trade with `target_variant_id` set; set that variant `stock = 0`.
2. Staff: `/admin/trade/…` → mark **Completed**.
3. Expect error banner + toast from `TRADE_COPY.errors.outOfStock` and CTA **Restock or switch target**.
4. Either restock variant to ≥1 and complete again, **or** pick another in-stock product/variant in Target stock.
5. After switch, confirm `top_up_amount` / `target_product_price` refreshed (DB trigger on target change).
6. Complete again → stock before → after is −1; intake adjustment logged.

---

## 3. Notification center — three lifecycle events

**Goal:** In-app center shows submitted / offer / completed with deep links.

1. As customer, submit a trade → row in `/account/notifications` titled like **Trade-in received** (trigger on INSERT/status).
2. Staff sends offer (`offer_made` or `awaiting_user`) → **Trade-in offer ready** / awaiting; deep link → `/account/trade-ins`.
3. Staff completes → **Trade-in completed**; deep link → tracking or My trade-ins.
4. Bell dropdown **View all** → `/account/notifications`.
5. Copy templates also live in `lib/tradeCopy.ts` → `notifications.*` (UI empty/sign-in states).

**Channel stub:** `lib/notificationSender.ts` + config `notification_channel`. SMS/WhatsApp log to console only — `TODO(ops): provider pending`.

---

## 4. Duplicate IMEI race (two tabs)

1. Tab A and Tab B: same account, same IMEI, both reach Details submit.
2. Submit Tab A successfully.
3. Submit Tab B → toast with duplicate IMEI copy (`TRADE_COPY.details.imeiDuplicate*` or `errors.duplicateImei`); redirect toward config.
4. DB partial unique on active IMEI remains source of truth.

---

## 5. Cash-only target

1. Wizard: choose cash-only (no upgrade SKU).
2. Submit → `top_up_amount` null/omitted; confirmation does not invent a top-up.
3. Staff complete without target → no inventory decrement error.
4. Staff may later attach a target product/variant; top-up re-snapshots from server.

---

## 6. Below-threshold lead follow-up (admin)

1. Create / seed a request with `below_threshold = true` (quiz hard stop / lead capture).
2. `/admin/trade` → KPI **Below threshold** or tab **Lead follow-up** filters the queue.
3. Open request; staff can contact / advance status per ops process.

---

## 7. RLS denial — friendly errors, never blank

1. Signed-out or wrong-user: open `/account/trade-ins` or `/account/notifications` → sign-in / empty copy, not a blank page.
2. Force an RLS failure (e.g. update another user’s trade as customer) → toast/banner uses `TRADE_COPY.errors.rlsDenied` via `tradeFriendlyError`.
3. Notifications fetch failure → error card on the page, not empty white screen.

---

## 8. Ops config without deploy

1. `/admin/trade/config` — edit `offer_sla_hours`, `estimate_validity_days`, `store_location`, `notification_channel`.
2. Reload customer confirmation / details / summary → new SLA hours, validity days, store card text appear without redeploying the app.

---

## Checklist

| Case | Script / auto | Owner check |
|------|----------------|-------------|
| Expiry time-travel | §1 | |
| OOS complete + switch | §2 | |
| Notifications ×3 | §3 | |
| IMEI two-tab race | §4 | |
| Cash-only | §5 | |
| Below-threshold tab | §6 | |
| RLS friendly | §7 | |
| Ops config live | §8 | |
