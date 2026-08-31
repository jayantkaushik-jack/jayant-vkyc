# Cursor Prompt — Admin: Convert Report Generation to Dropdown + Filters Modal

> Migration of the existing implementation (from the previous round): the report catalog card grid and the `/reports/generate/:reportType` filters **page** are replaced by a report-type **dropdown** and a filters **modal**. All filter logic built last round (adaptive filters, three-level status conditionality, live row count, column picker, params-on-history) is kept — it moves, it doesn't change. Minimal diffs beyond the relocation.

---

## 1. Reports page top section

Remove the catalog card grid. In its place, one compact **"Generate Report"** card:

- **Report Type dropdown**: the 7 types; rich option rows (name + one-line description). Default "Select a report type…"
- On selection: description line renders under the dropdown; buttons enable: primary **Generate**, secondary **Schedule** (existing schedule modal for that type)
- `Generate` disabled with nothing selected

## 2. Filters modal

- Delete the `/reports/generate/:reportType` route; `Generate` now opens a **modal** (~640px wide, max-height ~80vh, internal scroll, sticky header "Generate — <Report Name>" and sticky footer)
- **Move the entire filters panel from the page into the modal unchanged**: date-range presets + custom, `PartnerMultiSelect`, the three-level status filters with their conditional disabling + hints, role filter for Active Users, collapsible Columns section, live row-count preview, zero-match disabled state
- Adaptive visibility rules stay exactly as implemented (aggregate reports → date + partner only; inapplicable filters hidden)
- **Footer**: `Reset filters` (left) · `Cancel` · primary **Generate Report**

## 3. On confirm

Unchanged behavior: history entry created (highlighted), CSV/preview honor all filters, applied params render in the history row. The modal just closes instead of navigating.

## 4. Cleanup

- Remove the now-dead page component, its route, and the back-link; redirect any stale `/reports/generate/*` URL to `/reports`
- No leftover imports; `grep` for the old page component name returns nothing

## 5. Productivity page: rebalance the color bands (data + thresholds)

The agent Productivity roster currently renders mostly amber/red — the seeded metric values sit below the band thresholds, which reads as a struggling floor. Rebalance so the roster shows roughly **60% green · 30% amber · 10% red** per banded metric (Efficiency, Accuracy, Drop Rate, CSAT):

- Fix it primarily in the **data generator**: shift the agent metric distributions upward so most agents naturally clear the green thresholds (e.g., efficiency centered ~88, accuracy ~97.5, drop rate ~3%, CSAT ~4.4), with a deliberate amber tier and a small struggling tail
- Adjust band thresholds only if a metric's bands are objectively misaligned with its realistic range — thresholds remain in one config, and any change must stay consistent with where those bands appear elsewhere (agent app Analytics, admin Home)
- Apply the same rebalance to the agent-detail metric cards and the fleet summary strip (they read the same data, so this should follow automatically — verify)
- Sanity: the ~10% red agents should be *coherently* weak (their drop rate, accuracy, and CSAT correlate — not one random red cell per row), so the demo supports a "spot the struggling agent" story

## 6. Move System Status to the top bar

Remove the "System Status" mini-card from the admin sidebar footer. In the top bar, left of the admin avatar, render a compact status chip: pulsing green dot + "All systems operational" (or amber dot + short alert text when a queue alert is active, e.g., "Niyo queue latency"). Clicking the chip opens a small popover with the fuller status line (the old card's content). Keep it unobtrusive — chip height matches the top bar's other elements; text truncates on narrow widths (dot always visible).

## 7. Swap the Cashfree logo everywhere

A new logo file **`Cashfree Logo 2.png`** (225×225) is at the repo root. Replace the current logo asset with it **everywhere, in both apps**: copy it into the shared assets as the canonical logo (e.g., `cashfree-logo.png` — overwrite; keep one filename so all references update at once), and verify every render site picks it up — agent + admin top bars, login page brand panel, favicons (`index.html` of both apps), and any loading/empty states. If the new PNG is icon-only, keep the wordmark text treatment as-is next to it. Remove the old logo file so nothing can reference it (`grep` for the old filename returns nothing).

## Acceptance

1. Reports page: dropdown + Generate/Schedule replaces the card grid; no catalog cards remain
2. Modal contains the full filter set with identical behavior to the previous page (spot-check: three-level conditionality, live row count = CSV rows, zero-match disable, columns picker)
3. Old route redirects; dead code removed
4. History + Schedules sections untouched
5. Productivity roster scan: per banded metric column, roughly 60% of cells green / 30% amber / 10% red; weak agents are weak across metrics, not randomly; agent app Analytics accuracy/efficiency views still look sensible after the reseed
6. Sidebar footer has no System Status card; top bar shows the status chip on every admin page; popover opens with the full status text
7. New logo renders in both apps' top bars, login page, and browser-tab favicons; old logo file deleted with zero remaining references
8. `npm run build` clean for both apps
