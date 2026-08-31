# Cursor Prompt — Admin: Report Generation Filters Page

> Replaces the small Generate modal with a clean, full filters page for report generation. Reuse `PartnerMultiSelect`, the date-range picker, and the three-level status filter components from Call History. Minimal changes elsewhere on Reports.

---

## Flow

Catalog card `Generate` → routes to **`/reports/generate/:reportType`** (a page, not a modal): report name + description header, filters panel, live row-count preview, actions. Back link to the catalog.

## Filters panel (single clean card, two rows of controls)

**Row 1 — always present:**
- **Date range**: presets `Today / Yesterday / 7D / 30D` + custom from/to (default Today)
- **Partner**: `PartnerMultiSelect` (default All)

**Row 2 — status filters (session/case-level reports only):**
- **Call Status**: `Connected / User Dropped` (multi-select)
- **Agent Status**: `Approved / Unable to Verify / Rejected` (multi-select)
- **Auditor Decision**: `Approved / Recapture / Rejected / In Review` (multi-select)
- Conditional logic mirrors Call History: selecting `User Dropped` disables the other two levels; selecting an Agent Status other than Approved disables Auditor Decision. Disabled controls show a hint ("Not applicable for dropped calls")

**Applicability by report type:**
- Standard MIS, Customer Issues, Partner Day-wise: all filters (status filters restrict which sessions/cases/rows are counted)
- VKYC Daily Dashboard, V-KYC Partner Summary: date + partner only (aggregates)
- Active Users, User Productivity: date only (+ role filter for Active Users: Agent/Auditor/Admin)
- Hide inapplicable controls entirely — no disabled clutter

## Live row-count preview

Below the filters: **"2,318 rows match your filters"** — recomputes on every filter change (debounced), from the same selector the export will use. Zero matches → amber note + Generate disabled.

## Column picker

Collapsible "Columns" section (existing picker, default all selected) for column-based reports (MIS, Productivity, Issues, Day-wise). Select all / none links.

## Actions

- Primary **Generate Report** → creates the history entry, navigates back to Reports with the new entry highlighted; Preview/Download work as before, honoring every filter (the CSV contains exactly the row-count shown)
- Secondary **Reset filters**
- The filters used are stored on the history entry and shown in its params column (e.g., "7D · Niyo, ZET · Dropped only")

## Acceptance

1. Every catalog card routes to the filters page with the correct filter set for its type; inapplicable filters absent
2. Three-level status conditionality works with hints; row count updates live and equals the generated CSV's row count exactly
3. Filter combo test: Date=7D + Partner=Niyo + Call Status=User Dropped → count, preview, and CSV all match; history entry shows the params
4. Zero-match state disables Generate
5. `npm run build` clean; catalog, history, schedules untouched
