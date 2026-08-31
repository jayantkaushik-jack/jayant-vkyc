# Cursor Prompt — Admin: Partner Analytics Page Changes

> Six changes to the Partner Analytics page. Reuse shared components (`PartnerMultiSelect`, roster selector, hourly-volume selector, date-range picker from Call Breakdown). Minimal diffs; agent app untouched.

---

## 1. Global date-range filter

Add a page-level date filter at the top (next to the existing partner filter chips): preset **Today (default)** + `7D / 30D` + custom range picker. Every card on the page recomputes from the selection. Live/point-in-time elements have no meaning historically — same rule as Call Breakdown: for past ranges, anything "current" shows historical aggregates only.

## 2. Conversion funnel: Calls ↔ Unique Customers toggle

Add a two-option segmented toggle on the funnel card: **`Calls`** / **`Unique Customers`** (default Calls).
- **Calls** view: stage counts are call events (a customer with 2 attempts counts twice)
- **Unique Customers** view: stages count distinct customers reaching that stage at least once in the range (reattempts collapse; conversion % improves accordingly — consistent with the Home page's customer conversion definition)
- Stage labels stay the same; strictly-decreasing rule holds in both views; the −N% drop markers recompute

## 3. Call Time distribution

Next to the Wait Time histogram, add a **Call Time distribution** histogram (same card style): buckets `<1m / 1–2m / 2–3m / 3–4m / 4–5m / 5m+` over answered calls in range (~3-min average → peak in 2–4m buckets). Respects partner + date filters.

## 4. TAT & Drop-off table: define and document TAT, Trend, and colors

- **Avg TAT** ⓘ tooltip: "Average turnaround time from lead creation (Create User) to final KYC approval — includes queue, call, and auditor review time." Color bands (cell tint): **green ≤ 1h · amber 1–4h · red > 4h**
- **Drop-off %** color bands: **green < 15% · amber 15–25% · red > 25%**
- **Trend** ⓘ tooltip: "Daily call volume over the selected period." Render as a 7-point sparkline (or N days of the range); no color coding beyond the line itself
- Add a small legend row under the table explaining both band scales
- Ensure the seeded data produces a mix (at least one amber/red TAT partner) so the bands visibly work

## 5. Hour-wise call volume graph

Add an hourly call volume chart (9:00–20:00) to this page, filtered by the page-level partner + date selections. Reuse the Home chart component parameterized ("All" line + per-partner lines when specific partners are selected). For multi-day ranges, show the **average per hour** across the days with a subtitle noting it ("Avg per hour over 7 days").

## 6. Agents Allocated card

Add a card showing agent allocation for the selected partner(s), reusing `getAgentRoster()`:
- Headline: `Agents allocated: 18` with split `16 dedicated · 2 shared`
- A compact horizontal stacked bar per partner (dedicated segment purple, shared segment lavender) when multiple partners are selected — visual distribution comparison
- Shared agents' tooltip lists their other partner (consistent with the Home Allocation card)
- This card ignores the date filter (allocation is current-state); add a small "as of now" caption

## Acceptance

1. Date filter defaults to Today; switching to 7D/30D/custom recomputes funnel, histograms, TAT table, and hourly chart consistently
2. Funnel toggle: Unique Customers stage counts ≤ Calls stage counts at every stage; both strictly decreasing; drop markers correct
3. Wait Time and Call Time histograms sit side by side, both filter-aware; Call Time peaks in the 2–4m buckets
4. TAT and Drop-off cells are band-tinted per the defined scales, tooltips + legend present, at least one non-green partner visible; Trend sparklines render
5. Hourly chart respects filters; multi-day ranges show per-hour averages with the caption
6. Agents Allocated matches the Home Allocation card's numbers for the same partners ("as of now" caption present)
7. `npm run build` clean; other admin pages and agent app untouched
