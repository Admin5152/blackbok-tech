# TRADE-IN SYSTEM — COMPLETE SPECIFICATION & PRICING PACKAGE (v7)

**Project:** BlackBox Ghana — Trade-In Estimator v2
**v7 changes (gap closure):** camera "replaced → Yes" dead-end fixed with a **recommended rule for the client to approve**; battery bands rewritten with exact non-overlapping edges (D21) and a NEW client decision for **replaced battery showing good health** (D22) with a recommendation attached; canonical question order + threshold timing defined; lead-capture form added to the threshold-stop screen; answer-change logging added (anti-gaming with the live ticker); "Never set it up" option added to Face ID/Touch ID; customer-facing copy for the "Bomb" grade; half-deduction rounding rule (recommended); spec-help text on Screen 4; iPad iCloud gate aligned with D2. **Every recommendation is clearly marked and requires client sign-off in the Decision Sheet before launch — nothing is pre-decided.**
**This document is the single source of truth.**

---

## 1. Concept

A guided trade-up journey: the customer identifies their device, picks the device they want to trade into, answers an interactive condition questionnaire, sees a preliminary estimate and top-up amount, and books pickup or drop-off. Final value is confirmed by BlackBox engineers after physical inspection against the customer's answers and the submitted IMEI/serial.

```
trade_in_estimate = base_value(your device: model, size, storage, SIM type)
                    − Σ resolved deductions (max ONE per category)

top_up_amount     = price(target device: model, storage, color) − trade_in_estimate
```

---

## 2. End-to-end flow

```
[1] Device type: iPhone or iPad
[2] Category (series/line)          ["My device isn't listed" escape hatch]
[3] Model
[4] Your device specs
      iPhone: storage → SIM type → color
      iPad:   generation (chip) → storage → SIM type → size → color
[5] Target device (type → category → model → storage → color)
[6] Condition questionnaire (interactive; value updates per step; threshold stop)
[7] Summary: estimate breakdown + top-up + validity period
[8] Your details: contact + IMEI/serial + pickup or drop-off + T&C
[9] Confirmation + reference code → public status-tracking page
```

Persistent progress indicator; back navigation preserves answers; state survives refresh; no login required.

---

## 3. Screen-by-screen specification

### Screen 1 — Device type
Two cards: **iPhone** / **iPad**. iPad card hidden automatically until iPad pricing (Section 10) is seeded.

### Screen 2 — Category grid
- **iPhone:** series cards, newest first: 17 → 16 → 15 → 14 → 13 → 12 → 11 → XR.
- **iPad:** line cards: **iPad Pro**, **iPad Air**, **iPad Mini**, **iPad** (standard).
- Only categories with ≥1 active priced model appear.
- Persistent link: **"My device isn't listed"** → short manual form (device description free-text + name + phone) → lands in the admin manual-review queue. No instant estimate. (Covers iPhone X/XS/SE and anything else outside the configurator.)

### Screen 3 — Model selection
Cards with images per model (e.g., iPhone 17 / 17 Air / 17 Pro / 17 Pro Max; iPad Pro M4, etc.). Database-driven.

### Screen 4 — Your device specifications (configuration page)
**iPhone:** 1) Storage · 2) SIM type — Physical SIM / eSIM only (14+ excl. 17 Air; others skip) · 3) Color.
**iPad (client-confirmed):** 1) **Generation (chip type)** — e.g., M4, M2, M1, A17 Pro · 2) **Storage** · 3) **SIM type** — eSIM / physical (or both) — plus Wi-Fi only if D20 says yes; options filtered per model · 4) **Size** (only if the model has multiple, e.g., Pro 11"/13") · 5) Color.
Color is for identification only; it does not change value (Decision Sheet D3). Base value locks internally — not shown yet.
**Help text on this screen:** *"Not sure of your storage or SIM type? Check Settings → General → About."* (Future enhancement, not launch-blocking: TAC lookup on the submitted IMEI to auto-verify the claimed model/storage for engineers.)

### Screen 5 — Target device
Mirrors 1–4 from the **retail shop catalog**; cross-type allowed. Select model → storage → color (in-stock; out-of-stock handling per D4). Optional **"Cash trade-in only"** path (D5). Prices come from the shop catalog — never duplicated into trade tables.

### Screen 6 — Condition questionnaire
Card-based, one question per view, big tappable answers, progress dots. iPhone bank: Section 5A. iPad bank: Section 5B. Engine: Section 4.
**Canonical component order (client's own list):** Screen → Battery → Face ID (Touch/Face ID on iPad) → Back glass (Back housing) → Charging system → Cameras → Overall aesthetic.
**Live value (client-confirmed):** the trade-in value updates on screen after every answer.
**Threshold timing:** the threshold check runs only after a component fully resolves (never mid-component), so a customer is never cut off between BG1 and BG2.
**Threshold stop (client-confirmed):** if the running value falls below the acceptable threshold (D16), the questionnaire ends with the client's message: *"Your phone fell below acceptable trade-in threshold, visit BlackBox in person for further analysis, thanks."* The stop screen includes a **mini lead-capture form** (name + phone + consent checkbox) — submitting it saves the partial answers to the manual-review lane; skipping it discards them.
**Answer-change logging (anti-gaming):** because the price is visible live, every edit made via back-navigation is recorded (question, old answer, new answer, timestamp) in the answers snapshot. Engineers see an "answers changed" indicator on the request.

### Screen 7 — Summary & estimate
```
Your device:       iPhone 14 Pro · 256GB · Physical SIM · Deep Purple
Base value                                    GHS 4,200
Deductions
  Battery health — Poor band                 − GHS 590
  Back camera fault                          − GHS 850
Trade-in estimate                             GHS 2,760
────────────────────────────────────────────────────────
You're trading into:  iPhone 16 Pro · 256GB · Black Titanium
Price                                         GHS X,XXX
YOU TOP UP                                    GHS X,XXX

Estimate valid for [N] days (D10). Final value confirmed after inspection.
```
Clamp ≤ 0 → manual-review message. Estimate > target price → balance handling per D6.

### Screen 8 — Your details
- Name, Ghana-format phone (verified by one-time SMS/WhatsApp code before submit — anti-spam; channel per D12), optional email.
- **IMEI or serial number (required):** with inline help — *"Dial \*#06\# or go to Settings → General → About."* iPads: serial number accepted (IMEI too for cellular models). Validation: 15-digit Luhn check for IMEI; free-format serial with length sanity check.
- **Duplicate protection:** one active request per IMEI/serial. If a live request exists, show its reference code instead of creating a new one.
- Handover: **Pickup** (address/area/landmark + date + time window) or **Drop-off at store**.
- T&C checkbox (short trade-in terms: device must match answers, ownership declaration, data-wipe advice).
- Submit → trade request created.

### Screen 9 — Confirmation & tracking
- Reference code (`TR-2026-0421`) + admin-configurable message with SLA.
- **Public status page** (`/trade-in/status`): lookup by reference code + phone number → shows current status, final offer when made, and Accept / Reject / Cancel actions (cancel allowed until status = `scheduled`).
- Notifications fire on **submitted, offer_made, scheduled, completed** via the channel in D12.

---

## 4. Deduction engine rules

1. **One deduction per component, max (client-confirmed: "there won't be a situation where deduction will be more than once per component").** iPhone components: Screen, Battery, Face ID, Back glass, Charging system, Front camera, Back camera, Overall aesthetic. iPad components: Screen, Battery, Touch/Face ID, Back housing, Charging, Front camera, Back camera, Overall aesthetic.
2. **Worst-outcome resolution:** each answer maps to `none` or an outcome; the engine applies the single highest-value outcome per component — never a sum.
3. **Live per-step recalculation (client-confirmed):** value recomputes and displays after every answer.
4. **Acceptable-threshold logic (client-confirmed):** a configurable minimum trade-in value (D16). The moment the running value drops below it, the flow stops with the client's exact message (Screen 6). Sub-zero clamping remains as a backstop but the threshold should trigger first.
5. **Battery bands (exact, non-overlapping edges — proposed for D21 sign-off; stored as config):** replaced before → see D22 rule below · not replaced: **≥85%: none · 80–84%: HALF the battery amount · ≤79% or "Service": full amount.** *(The client's ranges "100–90 / 90–85 / 85–80 / 79-below" overlapped at 90% and 85%; these edges implement the same intent unambiguously.)*
   **Replaced battery with good health (D22 — client decides; our recommendation attached):** the current rule deducts full even if health reads 95–100%. Client options: (a) always full · (b) half if health ≥85% · (c) no deduction if health ≥90% · (d) engineer decides at inspection. **Recommendation: (d)** — show the full deduction in the online estimate (customer never over-promised) with a `needs_verification` flag and the health value stored, and let the engineer raise the final offer for a quality replacement. This behavior only ships if the client approves it in D22.
   **Rounding (recommended, D21):** any half-amount or %-based amount that isn't whole rounds to the **nearest GHS 5** so the live ticker never shows decimals — client confirms in D21.
6. **Camera "replaced before → Yes" (D17 — client decides; recommendation attached):** the client's rules leave this unspecified. **Recommendation: deduct the full camera amount + `needs_verification`** (conservative online, engineer corrects upward if the replacement is fine). Alternative: no deduction if it currently works. Ships only per the client's D17 answer.
7. **Amount resolution (fallback chain, for anything not client-fixed):** `per-model amount (12.3) → global tier rule (12.2) → full component amount (9.1 / 10.2)`.
8. **"Not sure" / "Never set it up" answers:** "Not sure" prices as the deduction-triggering outcome + `needs_verification`. Face ID / Touch ID **"Never set it up"** = no deduction + `needs_verification` (the hardware may be fine; the customer simply can't test it — engineer verifies).
9. **Estimate validity:** requests carry `expires_at` (D10, suggested 7 days); expired → status `expired`.
10. **Snapshot on submission:** base value, all answers **including the back-navigation edit log**, camera issue descriptions, resolved deductions + pricing level per line, target device + price, colors, IMEI/serial.
11. **Gates before pricing:** powers on; can sign out of iCloud / Find My (identical wording and D2 handling on iPhone AND iPad). Fail → hard stop.

---

## 5A. iPhone question bank — CLIENT-CONFIRMED RULES

### Gates (Q0)
- "Does your phone power on and work normally?" → No = hard stop.
- "Can you sign out of iCloud (turn off Find My iPhone)?" → No = hard stop or deduction (D2).

### Battery — column C ✅ client-confirmed (edges per D21; replaced+good-health per D22)
| # | Question | Answers → outcome |
|---|---|---|
| B1 | Has your battery been replaced before? | **Yes → B2 anyway** (health still asked and stored) → outcome per client's D22 choice; **recommended:** full amount + `needs_verification` · No → B2 |
| B2 | Go to **Settings → Battery → Battery Health**. What's the percentage? | ≥85% → none · 80–84% → **HALF the battery amount** (rounded to nearest GHS 5) · ≤79% or "Service" → full amount |

### Face ID — column H ✅ client-confirmed (+ non-user option)
| # | Question | Answers → outcome |
|---|---|---|
| F1 | Does Face ID work? | Yes → none · No → **full Face ID amount** · **I never set it up → none + `needs_verification`** (engineer tests at inspection) |

### Back glass — column D ✅ client-confirmed
| # | Question | Answers → outcome |
|---|---|---|
| BG1 | Has the back glass been replaced before? | Yes → **full back-glass amount** · No → BG2 |
| BG2 | Does it have any cracks? | Yes → full back-glass amount · No → none |
*(One deduction max — replaced AND cracked still deducts once.)*

### Charging system — column E ✅ client-confirmed
| # | Question | Answers → outcome |
|---|---|---|
| C1 | Are there any charging issues? *(even if it needs a tiny adjustment before it charges)* | Yes → **full charging amount** · No → none |

### Cameras — columns F (front) & G (back), resolved independently ✅ client-confirmed
| # | Question | Answers → outcome |
|---|---|---|
| CAM1 | Has your **front camera** been replaced before? | Yes → per client's D17 choice; **recommended:** full front-cam amount + `needs_verification` · No → CAM2 |
| CAM2 | Does the front camera have any issues right now? | Yes → **describe the issue** (blurry / blank / spots / other — multi-select + optional text, saved for the engineer) → full front-cam amount · No → none |
| CAM3 | Has your **back camera** been replaced before? | Yes → per D17; **recommended:** full back-cam amount + `needs_verification` · No → CAM4 |
| CAM4 | Does the back camera have any issues right now? | Yes → describe the issue → full back-cam amount · No → none |
*(Client note: deductions made only once per camera.)*

### Screen — column B ⚠️ client rules pending
Client's component list includes Screen, but no screen rules were on the pages received. Suggested questions below stay as placeholders until the client sends screen rules (D19):
| # | Question | Answers → outcome (suggested) |
|---|---|---|
| S1 | Has the screen been replaced before? | Yes → full screen amount · No → S2 |
| S2 | Any cracks or display problems (lines, spots, touch issues)? | Yes → full screen amount · No → none |

### Overall aesthetic ✅ client-confirmed (3 grades; amounts via 12.2 rows A1/A2)
Internal grade keys: Excellent / Intermediate / Bomb. **Customer-facing labels** (admin-editable copy — "Bomb" is internal slang, never shown to customers):
| # | Question | Answers → outcome |
|---|---|---|
| O1 | Overall, how does your phone look? | **"Like new"** — no dents or cracks → none · **"Some visible wear"** — light scratches, used but decent → **slight deduction** (A1) · **"Heavily worn"** — dents, deep scratches, looks bad → **massive deduction** (A2) |

*(v5's bent-frame and water-damage questions removed from the main bank per client's rules; kept as optional recommendations in D18 since they materially affect resale value.)*

---

## 5B. iPad question bank + calculation mapping

**iPad configuration page (client-confirmed order):** **Generation (chip type) → Storage → SIM type (eSIM / physical or both) → Size** — then the condition questions below. Screen 4 and the flow map follow this order for iPads. ⚠️ D20: are **Wi-Fi-only iPads** (no SIM at all) accepted for trade-in? If yes, "Wi-Fi only" is added as a SIM-type option with its own base-value column (Section 10.1 already carries it).

Same engine as iPhone: one deduction per component, live per-step value, threshold stop, client's battery-style logic mirrored where applicable. Deduction amounts come from Section 10.2; Touch ID vs Face ID auto-selected from the model's `biometric_type`.

### Gates (Q0-iPad)
- "Does your iPad power on and work normally?" → No = hard stop.
- "Can you sign out of iCloud (turn off Find My)?" → No = hard stop or deduction (D2).

### Battery — 10.2 column "Battery" (mirrors client's iPhone logic; most iPads don't show a health %, so the band question applies only where iPadOS shows it)
| # | Question | Answers → outcome |
|---|---|---|
| iB1 | Has the battery been replaced before? | Yes → **iB2 anyway** (health/behavior stored) → per D22; **recommended:** full amount + `needs_verification` · No → iB2 |
| iB2 | If your iPad shows Battery Health (Settings → Battery): what's the percentage? Otherwise: how does the battery hold up? | ≥85% / lasts most of the day → none · 80–84% / drains noticeably fast → **half amount** (nearest GHS 5) · ≤79% / dies quickly or shuts down → full amount |

### Screen — 10.2 column "Screen" ⚠️ pending client screen rules (D19); suggested placeholder
| # | Question | Answers → outcome |
|---|---|---|
| iS1 | Has the screen been replaced before? | Yes → full screen amount · No → iS2 |
| iS2 | Any cracks, display problems, or touch/Pencil issues? | Yes → full screen amount · No → none |

### Back housing — 10.2 column "Back housing"
| # | Question | Answers → outcome |
|---|---|---|
| iH1 | Is the back panel cracked, dented, or has it been replaced? | Yes → **full back-housing amount** · No → none |

### Charging — 10.2 column "Charging" (client's iPhone rule mirrored)
| # | Question | Answers → outcome |
|---|---|---|
| iC1 | Are there any charging issues? *(even if it needs a tiny adjustment before it charges)* | Yes → **full charging amount** · No → none |

### Cameras — 10.2 columns "Front cam" / "Back cam", resolved independently (client's iPhone rule mirrored)
| # | Question | Answers → outcome |
|---|---|---|
| iCAM1 | Has the front camera been replaced before? | Yes → per D17; **recommended:** full amount + `needs_verification` · No → iCAM2 |
| iCAM2 | Any front-camera issues right now? | Yes → describe (blurry/blank/spots/other) → full front-cam amount · No → none |
| iCAM3 | Has the back camera been replaced before? | Yes → per D17; **recommended:** full amount + `needs_verification` · No → iCAM4 |
| iCAM4 | Any back-camera issues right now? | Yes → describe → full back-cam amount · No → none |

### Touch ID / Face ID — 10.2 column "Touch/Face ID" (question auto-selected per model; client's Face ID rule mirrored)
| # | Question | Answers → outcome |
|---|---|---|
| iF1 | Does [Touch ID / Face ID] work? | Yes → none · No → **full amount** · **I never set it up → none + `needs_verification`** |

### Overall aesthetic — client's 3 grades (amounts via 12.2 rows A1/A2; customer-facing labels as on iPhone)
| # | Question | Answers → outcome |
|---|---|---|
| iO1 | Overall, how does your iPad look? | **"Like new"** → none · **"Some visible wear"** → slight deduction (A1) · **"Heavily worn"** (dents, deep scratches) → massive deduction (A2) |

---

## 6. Data model

Migrations (`2026_07_...`), extending the cross-checked schema (`2026_06_repair_device_pricing_mode`, `2026_05_trade_offer_requires_value`, `2026_06_trade_valuation`):

- `devices`: `device_type`, `product_line`, `series`, `screen_size`, `biometric_type` (`face_id`|`touch_id`), `is_active`, `image_url`.
- `device_colors`: device_id, name, hex, is_active.
- `device_variants`: (size ×) storage × `sim_type` (`physical`|`esim`|`wifi_only`|`cellular_physical`|`cellular_esim`) with `base_value`. Target retail prices reference the shop catalog.
- `condition_questions` / `condition_answers`: data-driven; answers carry outcome, category, tier, `needs_verification_on_unsure`, optional `override_amount`.
- `tier_rules`: tier code, mode (`full`|`global_pct`|`global_ghs`|`per_model`), value. `tier_model_amounts`: tier × device → GHS (the 12.3 matrix).
- `battery_bands` (config): healthy_min, reduced_min — 12.1.
- `trade_requests`: value fields (satisfying `requires_value`), **`imei_serial` (required)** with partial unique index on active statuses, `your_color`, `target_device_variant_id`, `target_color`, `target_price_snapshot`, `top_up_amount`, `handover_method` + pickup fields, `reference_code`, `phone_verified_at`, `expires_at`, `answers_snapshot` (jsonb incl. fallback level per deduction), `terms_accepted_at`, status enum `submitted → under_review → offer_made → accepted → rejected → scheduled → completed → cancelled → expired`.
- `trade_notifications`: request_id, status_trigger, channel, sent_at.
- Audit table on all price/question/tier edits.

**RLS:** anon read on catalog/questions/tiers; anon insert on trade_requests (post-OTP); status-page reads scoped by reference_code + phone match; admin-only writes.
**Data protection (Ghana Act 843):** IMEI + address + phone are personal data — purpose-limit to trade processing, retention window configurable, no exposure of IMEI on the public status page (masked: `…last 4`).

---

## 7. Admin dashboard

**Devices & pricing:** CRUD on devices, series, sizes, colors, variants, base values, deductions, tier rules, per-model tier matrix, battery bands; inline edit + CSV bulk import in Section 9/10 format. **Import validation:** numeric-only cells, letter-O-vs-zero detection, no negatives, warning when any single deduction ≥ lowest-tier base value, dry-run preview before commit.
**Questionnaire:** CRUD questions/answers per device type, reorder, edit mappings/tiers/gates.
**Requests:** filterable queue + reference/IMEI search; detail view (customer, IMEI/serial, both devices + colors, answer snapshot with `needs_verification` flags, breakdown with fallback level per line, top-up); engineer final value (separate column) + inspection notes + per-category discrepancy flags; offer → accept/reject → schedule → complete/cancel; manual-review lane (sub-zero, device-not-listed, water/bent hard-stops the client routes to review).
**Ops config:** confirmation copy, SLA hours, estimate validity days, notification channel + per-status templates, pickup zones, store locations.
**Analytics cards:** requests by status, weekly volume, average estimate vs final value gap, offer acceptance rate, top traded models. CSV export of requests.

---

## 8. CLIENT DECISION SHEET

| # | Decision | Answer |
|---|---|---|
| D1 🔴 | Data anomalies: 15 (PS) fourth value **4650** — missing 1TB or stray? / "47OO" = **4700**? / 17 Pro Max ES 2TB **14000** or 14800? | ______ / ______ / ______ |
| D2 🔴 | Can't sign out of iCloud: reject, or accept with Screen deduction? | ______ |
| D3 | Does color ever change trade-in value? (default: no) | ______ |
| D4 | Out-of-stock target color: hide, or grey + "notify me"? | ______ |
| D5 | Cash-only trade-in offered? Same rate as trade-up? | ______ |
| D6 | Estimate > target price: store credit / refund / capped? | ______ |
| D7 | ~~Live ticker or summary-only~~ **RESOLVED (client): value updates per step, live on screen** | ✅ |
| D8 🔴 | **Top-up payment:** how does the customer pay the difference — Paystack online at acceptance, on delivery/exchange (cash/MoMo/POS), or deposit + balance? | ______ |
| D9 🔴 | **Inspection point:** engineer verifies device at the customer's location during pickup (recommended — no return-logistics problem), or device is collected first and inspected at the store (then: who pays return delivery if the customer rejects the revised offer? ______) | ______ |
| D10 | Estimate validity: ______ days (suggested 7) | ______ |
| D11 | Is the target device **reserved from stock** at submission, at offer acceptance, or only at completion? | ______ |
| D12 | Notification + OTP channel: SMS / WhatsApp / email; and offer SLA ______ hrs | ______ |
| D13 | Older devices (iPhone X/XS/SE, older iPads): add pricing later, or keep permanently manual via "not listed"? | ______ |
| D14 | Pickup coverage areas ______ · drop-off location(s) ______ · confirmation copy ______ | ______ |
| D15 | Aesthetic amounts (client's 3 grades): **Intermediate = slight deduction** GHS ______ or ____% of base · **"Bomb" = massive deduction** GHS ______ or ____% of base (per model via 12.3 if preferred) | ______ |
| D16 🔴 | **Acceptable trade-in threshold** that triggers the "visit BlackBox in person" message: fixed GHS ______ or ____% of base value? Same for all models? | ______ |
| D17 | **Camera replaced before = ?** Rules say "(unspecified)". Options: deduct full / no deduction if currently working. **Our recommendation: deduct full + engineer-verify flag** (conservative online, corrected at inspection). Your choice: | ______ |
| D18 | Optional extra checks (recommended, not in client's rules): bent frame and water-damage questions — include or omit? | ______ |
| D19 🔴 | **Screen rules** — Screen is in the component list but no rules were provided. Confirm: replaced → full? cracked → full? any partial cases? | ______ |
| D20 | **Wi-Fi-only iPads** (no SIM): accepted for trade-in? | ______ |
| D21 | **Battery band edges** — your ranges overlap at 90% and 85%. **Our recommendation: ≥85% = none · 80–84% = half · ≤79% = full**, and half-amounts rounded to nearest GHS 5. Approve or adjust: | ______ |
| D22 | **Battery replaced BUT health reads well (e.g., 95%)** — choose: (a) always full · (b) half if health ≥85% · (c) no deduction if health ≥90% · (d) engineer decides at inspection. **Our recommendation: (d)**, with full deduction shown online + engineer-verify flag so customers are never over-promised. Your choice: | ______ |

---

## 9. CONFIRMED PRICING — iPhone trade-in values (GHS)

### 9.1 Per-model deductions (same across storage tiers)

| Model | B Screen | C Battery | D Backglass | E Charging | F Front cam | G Back cam | H Face ID |
|---|---|---|---|---|---|---|---|
| iPhone XR | 400 | 200 | 200 | 200 | 220 | 270 | 400 |
| iPhone 11 | 600 | 300 | 300 | 300 | 250 | 300 | 550 |
| iPhone 11 Pro | 750 | 300 | 300 | 300 | 300 | 400 | 550 |
| iPhone 11 Pro Max | 850 | 400 | 400 | 300 | 300 | 400 | 550 |
| iPhone 12 | 750 | 400 | 350 | 290 | 250 | 400 | 550 |
| iPhone 12 Pro | 750 | 450 | 400 | 340 | 380 | 500 | 550 |
| iPhone 12 Pro Max | 1000 | 490 | 450 | 380 | 380 | 500 | 550 |
| iPhone 13 | 1000 | 470 | 440 | 380 | 350 | 500 | 550 |
| iPhone 13 Pro | 1300 | 490 | 450 | 500 | 400 | 650 | 550 |
| iPhone 13 Pro Max | 1700 | 550 | 490 | 550 | 400 | 650 | 700 |
| iPhone 14 | 1500 | 490 | 470 | 500 | 370 | 600 | 600 |
| iPhone 14 Plus | 1700 | 550 | 500 | 550 | 370 | 600 | 600 |
| iPhone 14 Pro | 2200 | 590 | 550 | 550 | 600 | 850 | 800 |
| iPhone 14 Pro Max | 2500 | 650 | 590 | 600 | 600 | 850 | 800 |
| iPhone 15 | 2200 | 600 | 520 | 600 | 520 | 700 | 800 |
| iPhone 15 Plus | 2500 | 670 | 590 | 650 | 520 | 700 | 800 |
| iPhone 15 Pro | 3500 | 700 | 650 | 650 | 770 | 1000 | 1200 |
| iPhone 15 Pro Max | 4000 | 800 | 700 | 700 | 770 | 1000 | 1200 |
| iPhone 16 | 3800 | 800 | 700 | 770 | 900 | 1300 | 1200 |
| iPhone 16 Plus | 4300 | 1000 | 800 | 800 | 950 | 1400 | 1200 |
| iPhone 16 Pro | 4500 | 1050 | 800 | 900 | 1100 | 1600 | 1500 |
| iPhone 16 Pro Max | 5500 | 1200 | 900 | 1000 | 1300 | 1900 | 1500 |
| iPhone 17 | 5000 | 1400 | 900 | 850 | 1050 | 1500 | 2000 |
| iPhone 17 Air | 5500 | 1400 | 1050 | 850 | 1050 | 1500 | 2000 |
| iPhone 17 Pro | 6500 | 1800 | 1200 | 1200 | 1450 | 2000 | 2500 |
| iPhone 17 Pro Max | 7500 | 2200 | 1500 | 1200 | 1450 | 2000 | 2500 |

### 9.2 Base trade-in values

Pre-14 models: single value. iPhone 14+ (except 17 Air): **PS = Physical SIM / ES = eSIM**.

| Model | Storage | Base (single / PS) | Base (ES) |
|---|---|---|---|
| iPhone XR | 64GB | 1000 | — |
| iPhone XR | 128GB | 1200 | — |
| iPhone XR | 256GB | 1300 | — |
| iPhone 11 | 64GB | 1350 | — |
| iPhone 11 | 128GB | 1550 | — |
| iPhone 11 | 256GB | 1650 | — |
| iPhone 11 Pro | 64GB | 1600 | — |
| iPhone 11 Pro | 256GB | 1700 | — |
| iPhone 11 Pro | 512GB | 1800 | — |
| iPhone 11 Pro Max | 64GB | 1800 | — |
| iPhone 11 Pro Max | 256GB | 1950 | — |
| iPhone 11 Pro Max | 512GB | 2050 | — |
| iPhone 12 | 64GB | 1700 | — |
| iPhone 12 | 128GB | 1800 | — |
| iPhone 12 | 256GB | 1900 | — |
| iPhone 12 Pro | 128GB | 2000 | — |
| iPhone 12 Pro | 256GB | 2200 | — |
| iPhone 12 Pro | 512GB | 2300 | — |
| iPhone 12 Pro Max | 128GB | 2400 | — |
| iPhone 12 Pro Max | 256GB | 2600 | — |
| iPhone 12 Pro Max | 512GB | 2700 | — |
| iPhone 13 | 128GB | 2500 | — |
| iPhone 13 | 256GB | 2650 | — |
| iPhone 13 | 512GB | 2750 | — |
| iPhone 13 Pro | 128GB | 2850 | — |
| iPhone 13 Pro | 256GB | 3050 | — |
| iPhone 13 Pro | 512GB | 3200 | — |
| iPhone 13 Pro | 1TB | 3400 | — |
| iPhone 13 Pro Max | 128GB | 3500 | — |
| iPhone 13 Pro Max | 256GB | 3650 | — |
| iPhone 13 Pro Max | 512GB | 3750 | — |
| iPhone 13 Pro Max | 1TB | 4000 | — |
| iPhone 14 | 128GB | 3100 | 2850 |
| iPhone 14 | 256GB | 3250 | 3000 |
| iPhone 14 | 512GB | 3350 | 3100 |
| iPhone 14 Plus | 128GB | 3400 | 3100 |
| iPhone 14 Plus | 256GB | 3550 | 3250 |
| iPhone 14 Plus | 512GB | 3650 | 3350 |
| iPhone 14 Pro | 128GB | 4000 | 3750 |
| iPhone 14 Pro | 256GB | 4200 | 3950 |
| iPhone 14 Pro | 512GB | 4350 | 4100 |
| iPhone 14 Pro | 1TB | 4450 | 4200 |
| iPhone 14 Pro Max | 128GB | 4500 | 4100 |
| iPhone 14 Pro Max | 256GB | 4700 ⚠️ | 4300 |
| iPhone 14 Pro Max | 512GB | 4850 | 4450 |
| iPhone 14 Pro Max | 1TB | 4950 | 4550 |
| iPhone 15 | 128GB | 4200 | 3950 |
| iPhone 15 | 256GB | 4400 | 4100 |
| iPhone 15 | 512GB | 4550 | 4200 |
| iPhone 15 | (unassigned value 4650 ⚠️) | — | — |
| iPhone 15 Plus | 128GB | 4550 | 4200 |
| iPhone 15 Plus | 256GB | 4750 | 4400 |
| iPhone 15 Plus | 512GB | 4850 | 4500 |
| iPhone 15 Pro | 128GB | 6000 | 5500 |
| iPhone 15 Pro | 256GB | 6250 | 5750 |
| iPhone 15 Pro | 512GB | 6400 | 5950 |
| iPhone 15 Pro | 1TB | 6550 | 6100 |
| iPhone 15 Pro Max | 256GB | 6800 | 6300 |
| iPhone 15 Pro Max | 512GB | 7050 | 6550 |
| iPhone 15 Pro Max | 1TB | 7200 | 6700 |
| iPhone 16 | 128GB | 6000 | 5700 |
| iPhone 16 | 256GB | 6200 | 5900 |
| iPhone 16 | 512GB | 6350 | 6050 |
| iPhone 16 Plus | 128GB | 6500 | 6200 |
| iPhone 16 Plus | 256GB | 6700 | 6400 |
| iPhone 16 Plus | 512GB | 6850 | 6550 |
| iPhone 16 Pro | 128GB | 7000 | 6600 |
| iPhone 16 Pro | 256GB | 7300 | 6900 |
| iPhone 16 Pro | 512GB | 7500 | 7100 |
| iPhone 16 Pro | 1TB | 7700 | 7300 |
| iPhone 16 Pro Max | 256GB | 8500 | 7500 |
| iPhone 16 Pro Max | 512GB | 8800 | 7800 |
| iPhone 16 Pro Max | 1TB | 9000 | 8000 |
| iPhone 17 | 256GB | 7500 | 7000 |
| iPhone 17 | 512GB | 7800 | 7300 |
| iPhone 17 Air | 256GB | 7700 | — (eSIM-only) |
| iPhone 17 Air | 512GB | 8000 | — |
| iPhone 17 Air | 1TB | 8300 | — |
| iPhone 17 Pro | 256GB | 11000 | 10000 |
| iPhone 17 Pro | 512GB | 11800 | 10800 |
| iPhone 17 Pro | 1TB | 12800 | 11800 |
| iPhone 17 Pro Max | 256GB | 13000 | 12000 |
| iPhone 17 Pro Max | 512GB | 13800 | 12800 |
| iPhone 17 Pro Max | 1TB | 14800 | 13800 |
| iPhone 17 Pro Max | 2TB | 15800 | 14000 ⚠️ |

⚠️ = the three anomalies in D1. Seed as written; correct after confirmation.

---

## 10. FILL IN — iPad trade-in pricing

> **What filling this improves:** the iPad option is hidden on Screen 1 until this section is seeded. The moment 10.1 + 10.2 are entered in admin, the entire iPad flow (Size → Storage → SIM type configuration, iPad questionnaire from 5B, estimates, admin lifecycle) goes live automatically — zero code changes. Blank cells simply mean "we don't accept that configuration," and it won't be selectable.

### 10.1 iPad base trade-in values (GHS)

Configuration dimensions (client-confirmed): **Size → Storage → SIM type**.

| Line | Model / Gen | Size | Storage | Wi-Fi only | Cellular (physical SIM) | Cellular (eSIM) |
|---|---|---|---|---|---|---|
| iPad Pro | M4 | 13" | 256GB | ______ | ______ | ______ |
| iPad Pro | M4 | 13" | 512GB | ______ | ______ | ______ |
| iPad Pro | M4 | 13" | 1TB | ______ | ______ | ______ |
| iPad Pro | M4 | 13" | 2TB | ______ | ______ | ______ |
| iPad Pro | M4 | 11" | 256GB | ______ | ______ | ______ |
| iPad Pro | M4 | 11" | 512GB | ______ | ______ | ______ |
| iPad Pro | M4 | 11" | 1TB | ______ | ______ | ______ |
| iPad Pro | M2 (6th gen) | 12.9" | 128GB | ______ | ______ | ______ |
| iPad Pro | M2 (6th gen) | 12.9" | 256GB | ______ | ______ | ______ |
| iPad Pro | M2 (6th gen) | 12.9" | 512GB | ______ | ______ | ______ |
| iPad Pro | M2 (4th gen) | 11" | 128GB | ______ | ______ | ______ |
| iPad Pro | M2 (4th gen) | 11" | 256GB | ______ | ______ | ______ |
| iPad Pro | M1 (5th gen) | 12.9" | 128GB | ______ | ______ | ______ |
| iPad Pro | M1 (5th gen) | 12.9" | 256GB | ______ | ______ | ______ |
| iPad Air | M3 | 13" | 128GB | ______ | ______ | ______ |
| iPad Air | M3 | 13" | 256GB | ______ | ______ | ______ |
| iPad Air | M3 | 11" | 128GB | ______ | ______ | ______ |
| iPad Air | M3 | 11" | 256GB | ______ | ______ | ______ |
| iPad Air | M2 | 13" | 128GB | ______ | ______ | ______ |
| iPad Air | M2 | 11" | 128GB | ______ | ______ | ______ |
| iPad Air | 5th gen (M1) | 10.9" | 64GB | ______ | ______ | ______ |
| iPad Air | 5th gen (M1) | 10.9" | 256GB | ______ | ______ | ______ |
| iPad Air | 4th gen | 10.9" | 64GB | ______ | ______ | ______ |
| iPad Mini | 7 (A17 Pro) | 8.3" | 128GB | ______ | ______ | ______ |
| iPad Mini | 7 (A17 Pro) | 8.3" | 256GB | ______ | ______ | ______ |
| iPad Mini | 6 | 8.3" | 64GB | ______ | ______ | ______ |
| iPad Mini | 6 | 8.3" | 256GB | ______ | ______ | ______ |
| iPad | 11th gen (A16) | 10.9" | 128GB | ______ | ______ | ______ |
| iPad | 11th gen (A16) | 10.9" | 256GB | ______ | ______ | ______ |
| iPad | 10th gen | 10.9" | 64GB | ______ | ______ | ______ |
| iPad | 10th gen | 10.9" | 256GB | ______ | ______ | ______ |
| iPad | 9th gen | 10.2" | 64GB | ______ | ______ | ______ |
| iPad | 9th gen | 10.2" | 256GB | ______ | ______ | ______ |
| *(add rows as needed)* | | | | | | |

### 10.2 iPad per-model deductions (GHS)

> **What filling this improves:** these are the amounts the iPad questionnaire (5B) applies. A blank column for a model = that fault makes the model ineligible for instant estimate → manual review. Filling every cell means every iPad condition gets an instant, exact price.

| Model | Screen | Battery | Back housing | Charging | Front cam | Back cam | Touch/Face ID |
|---|---|---|---|---|---|---|---|
| iPad Pro 13" (M4) | ______ | ______ | ______ | ______ | ______ | ______ | ______ |
| iPad Pro 11" (M4) | ______ | ______ | ______ | ______ | ______ | ______ | ______ |
| iPad Pro 12.9" (M2) | ______ | ______ | ______ | ______ | ______ | ______ | ______ |
| iPad Pro 11" (M2) | ______ | ______ | ______ | ______ | ______ | ______ | ______ |
| iPad Pro 12.9" (M1) | ______ | ______ | ______ | ______ | ______ | ______ | ______ |
| iPad Air 13" (M3) | ______ | ______ | ______ | ______ | ______ | ______ | ______ |
| iPad Air 11" (M3) | ______ | ______ | ______ | ______ | ______ | ______ | ______ |
| iPad Air (M2) | ______ | ______ | ______ | ______ | ______ | ______ | ______ |
| iPad Air 5 / 4 | ______ | ______ | ______ | ______ | ______ | ______ | ______ |
| iPad Mini 7 / 6 | ______ | ______ | ______ | ______ | ______ | ______ | ______ |
| iPad 11th / 10th / 9th gen | ______ | ______ | ______ | ______ | ______ | ______ | ______ |

---

## 11. FILL IN — Target device retail prices

> **What filling this improves:** Screen 5 (the device customers trade INTO) and the top-up calculation depend on these prices and color availability. The system reads live prices from the BlackBox shop catalog — this table exists to confirm the catalog is complete and mark which products are offered as trade-up targets. Any device missing a price here (and in the shop) simply won't appear as a target, shrinking what customers can trade toward.

| Model | Storage | Colors available | Retail price (GHS) | Offered as trade-up target? |
|---|---|---|---|---|
| iPhone 17 Pro Max | 256GB | ______ | ______ | Y / N |
| iPhone 17 Pro Max | 512GB | ______ | ______ | Y / N |
| iPhone 17 Pro Max | 1TB | ______ | ______ | Y / N |
| iPhone 17 Pro | 256GB | ______ | ______ | Y / N |
| iPhone 17 Pro | 512GB | ______ | ______ | Y / N |
| iPhone 17 Air | 256GB | ______ | ______ | Y / N |
| iPhone 17 | 256GB | ______ | ______ | Y / N |
| iPhone 16 Pro Max | 256GB | ______ | ______ | Y / N |
| iPhone 16 Pro | 256GB | ______ | ______ | Y / N |
| iPhone 16 | 128GB | ______ | ______ | Y / N |
| iPhone 15 Pro Max | 256GB | ______ | ______ | Y / N |
| iPhone 15 | 128GB | ______ | ______ | Y / N |
| iPad Pro 13" (M4) | 256GB | ______ | ______ | Y / N |
| iPad Air 11" (M3) | 128GB | ______ | ______ | Y / N |
| iPad Mini 7 | 128GB | ______ | ______ | Y / N |
| iPad 11th gen | 128GB | ______ | ______ | Y / N |
| *(add every model/storage sold)* | | | | |

Also confirm: pre-owned/refurbished devices as targets, or new stock only? ______

---

## 12. Tier & threshold configuration — mostly RESOLVED by client rules

> **What's left to fill and what it improves:** the client's rules fixed almost everything (battery bands and the half-deduction, full-amount rules for Face ID / back glass / charging / cameras). Only three groups of numbers remain: the aesthetic grade amounts (A1/A2), the acceptable threshold (D16), and screen rules (D19). Filling them makes every possible answer priceable; until then those specific answers route to manual review.

### 12.1 Battery bands ✅ client-confirmed intent, exact edges per D21 (stored as config)

| Condition | Outcome |
|---|---|
| Battery replaced before, health ≥85% | **Per D22 (client decides)** — recommended: full + engineer-verify, health stored |
| Battery replaced before, health <85% | Full battery amount |
| Not replaced, health ≥85% | No deduction |
| Not replaced, health 80–84% | **50% of the battery amount** (rounded to nearest GHS 5) |
| Not replaced, health ≤79% or "Service" | Full battery amount |

### 12.2 Remaining configurable amounts

Modes: **Global GHS** · **Global %** (of base value or of a component amount) · **Per-model** (fill 12.3). Blank = manual review for that answer.

| Code | Trigger | Client decision |
|---|---|---|
| A1 | Aesthetic: **Intermediate** (slight deduction) | GHS ______ / ____% of base / Per-model |
| A2 | Aesthetic: **"Bomb"** (massive deduction) | GHS ______ / ____% of base / Per-model |
| TH | **Acceptable threshold** (D16) — running value below this stops the flow with the client's message | GHS ______ fixed / ____% of base value |
| — | Camera replaced (D17) | Deduct camera amount: Y / N |
| — | Screen rules (D19) | Replaced → full? Cracked → full? Partial cases? |

### 12.3 Per-model amounts matrix (GHS) — only if A1/A2 are marked Per-model

| Model | A1 Intermediate | A2 "Bomb" |
|---|---|---|
| iPhone XR | ______ | ______ |
| iPhone 11 | ______ | ______ |
| iPhone 11 Pro | ______ | ______ |
| iPhone 11 Pro Max | ______ | ______ |
| iPhone 12 | ______ | ______ |
| iPhone 12 Pro | ______ | ______ |
| iPhone 12 Pro Max | ______ | ______ |
| iPhone 13 | ______ | ______ |
| iPhone 13 Pro | ______ | ______ |
| iPhone 13 Pro Max | ______ | ______ |
| iPhone 14 | ______ | ______ |
| iPhone 14 Plus | ______ | ______ |
| iPhone 14 Pro | ______ | ______ |
| iPhone 14 Pro Max | ______ | ______ |
| iPhone 15 | ______ | ______ |
| iPhone 15 Plus | ______ | ______ |
| iPhone 15 Pro | ______ | ______ |
| iPhone 15 Pro Max | ______ | ______ |
| iPhone 16 | ______ | ______ |
| iPhone 16 Plus | ______ | ______ |
| iPhone 16 Pro | ______ | ______ |
| iPhone 16 Pro Max | ______ | ______ |
| iPhone 17 | ______ | ______ |
| iPhone 17 Air | ______ | ______ |
| iPhone 17 Pro | ______ | ______ |
| iPhone 17 Pro Max | ______ | ______ |

(An identical iPad matrix is generated from Section 10's models. **Recommendation:** set A1/A2 as a % of base value — one pair of numbers scales correctly across all 26+ models automatically.)

**Engine fallback (built-in — a blank never crashes anything):**
`client-fixed rule → per-model amount → global rule → full component amount → unpriceable answer: manual review + threshold message where applicable`.

---

## 13. Acceptance criteria

- [ ] Full 9-screen flow end-to-end on mobile for iPhone, incl. colors on both devices, OTP phone verification, IMEI/serial capture with Luhn validation and duplicate-active-request protection.
- [ ] iPad flow fully wired (Size → Storage → SIM type config, 5B question bank, 10.2 amounts), dormant until Section 10 seeded, then live with zero code changes.
- [ ] Target prices + color stock read from the shop catalog; no duplicated retail pricing.
- [ ] One-deduction-per-component with worst-outcome resolution; unit tests cover multi-trigger cases (back glass replaced + cracked = one deduction; battery replaced + 95% health = full amount).
- [ ] **Live value updates after every answer**; threshold checked only after a component fully resolves; threshold-stop screen shows the exact client message AND a lead-capture mini-form (name + phone + consent) feeding manual review.
- [ ] Battery logic: replaced → per client's D22 choice (recommendation: full + verify flag, health stored); not replaced → ≥85% none / 80–84% half rounded to nearest GHS 5 / ≤79% full — edges and rounding per D21, stored as config.
- [ ] **No recommended rule ships without the client's explicit Decision Sheet answer** (D17, D21, D22 at minimum) — recommendations are implemented as config switches so any client choice is a settings change, not a code change.
- [ ] Camera "replaced → Yes" resolves (interim: full + verify flag); no dead-end answers anywhere in either bank — every option routes to an outcome.
- [ ] Face ID / Touch ID includes "Never set it up" → no deduction + verify flag.
- [ ] Back-navigation answer edits are logged in the snapshot and surfaced to engineers as an "answers changed" indicator.
- [ ] Customer-facing aesthetic labels ("Like new / Some visible wear / Heavily worn") shown; internal grade keys retained; all copy admin-editable.
- [ ] Camera "describe the issue" input captured and shown to engineers.
- [ ] "Not sure" answers price conservatively AND flag `needs_verification` for engineers.
- [ ] Gates hard-stop before pricing; expiry (`expires_at`) enforced with `expired` status.
- [ ] Spot-checks: 14 Pro PS 256GB, Poor battery + back cam = 4200 − 590 − 850 = **GHS 2,760**; 16 Pro Max ES 512GB, Face ID = 7800 − 1500 = **GHS 6,300**.
- [ ] Section 9 seeded exactly as written with ⚠️ anomalies commented; admin import validation catches non-numeric, O-vs-0, negatives, deduction-≥-base warnings.
- [ ] Public status page (reference + phone), cancel until `scheduled`, notifications on submitted/offer_made/scheduled/completed.
- [ ] IMEI masked on public surfaces; Act 843 posture documented (purpose limitation, configurable retention).
- [ ] Admin runs full lifecycle with discrepancy flags, audit trail, analytics cards, CSV export; RLS as specified.
- [ ] Every D-item resolved before public launch; unresolved tiers default to Full (documented).
