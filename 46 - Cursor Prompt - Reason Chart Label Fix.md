# Cursor Prompt — R&F Reason Charts: Single-Line Labels

> One visual fix, applied everywhere the horizontal reason/drop-stage bar charts render (admin R&F status tabs, partner R&F, and any other reason bar chart using the same component). Fix the component once — all consumers inherit.

---

## Problem

Y-axis labels wrap to 2–3 lines ("Liveness check failed (wrong/scripted answers, couldn't read code)"), making rows ragged and hard to scan.

## Fix

Rebuild the chart rows as custom HTML rows instead of relying on the chart library's Y-axis text (or configure equivalent behavior if staying in recharts):

- Each row: **label (fixed-width gutter, single line)** · bar · count/% — vertically centered, consistent row height
- Labels: `white-space: nowrap; overflow: hidden; text-overflow: ellipsis;` in a ~240px gutter — **never wrap**
- Truncated labels get a `title`/tooltip with the **full reason text** on hover
- Additionally, add **short display labels** to the taxonomy for the worst offenders (a `shortLabel` field used only in charts), e.g.:
  - "Liveness check failed (wrong/scripted answers, couldn't read code)" → `Liveness check failed`
  - "Suspicious environment (staged/call-center setup)" → `Suspicious environment`
  - "Original document not shown (photocopy/print/screen)" → `Original doc not shown`
  - "Customer found outside India during the call" → `Customer outside India`
  - "Aadhaar data mismatch beyond tolerance" → `Aadhaar data mismatch`
  - "3rd person prompting the answers" → `3rd person prompting`
  - "Face match with Aadhaar photo failed" → `Aadhaar face match failed`
  - Fill in `shortLabel` for every taxonomy reason (≤ 26 chars); full label remains in tooltips, tables, and modals — charts are the only consumer of `shortLabel`

## Acceptance

1. No reason/drop-stage chart anywhere shows a wrapped label; all rows equal height, cleanly aligned
2. Hovering a truncated/shortened label reveals the full reason text
3. Tables, modals, and reports still show full labels (shortLabel is chart-only)
4. All apps build clean
