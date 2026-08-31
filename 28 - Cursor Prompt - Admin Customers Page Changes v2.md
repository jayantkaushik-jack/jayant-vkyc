# Cursor Prompt — Admin: Customers Page Changes v2

> Follow-on changes to the Customers page. Minimal diffs; agent app untouched. The recording thumbnail asset is provided (see item 7).

---

## Customer Details modal

1. **Fixed modal size + internal scroll**: the modal must not grow when accordions expand. Set a max height (~80vh), keep the header (title + close) sticky, and make the body scrollable (`overflow-y-auto`). Expanding PAN/Income/Account/Call Allocation scrolls within the modal
2. **Stack the two panels**: "Personal Details" above "As per Aadhaar" (full-width sections, one below the other), not side by side
3. **Remove the Application Timeline accordion** from this modal entirely
4. **Remove the edit and delete icons** from the modal header (keep only the close ✕)

## Activity Log modal

5. **Remove the Call No. column** (keep the attempt number in the data model — just don't render the column)
6. **Ascending order**: events render oldest-first (top) → latest (bottom), matching the natural reading order of a journey. Auto-scroll position starts at the top

## Call recording modal

7. **Remove the "(1/2)" from the title** — that's a Karza artifact where a session interrupted by reconnection produces multiple recording files (part 1 of 2); our demo models one continuous recording, so it's just "Video Recording". **Poster: render a paused frame of OUR call room, not an external image** — build a small `RecordingPoster` component that composes the poster from the app's own assets, mimicking the agent call-room video panel: dark rounded panel; the **customer sample image** (`demo/face-live.jpg`) as the main feed (object-cover, slightly dimmed); the **agent avatar** (that call's agent, via `getAvatarUrl`) as the PIP tile bottom-right with a thin border; a small "Strong" network badge top-left and the call timestamp top-right; a centered play button overlay. It must look like a frozen moment of the Cashfree call screen, consistent per call (same customer/agent as the record). Keep the scrub bar + duration below

## Call History

8. **Remove the "Report Issue" CTA** — remaining four, still centered: `View Details · Activity Log · View Video · View Report`
11. **Pagination**: the table shows working pagination controls — 25 rows per page, `‹ 1 2 3 … ›` controls + "Showing 1–25 of 64,738 Records" caption, page state preserved while opening/closing modals; search/filters reset to page 1

## Queue tabs

9. **Scheduled tab — Scheduled Time values**: all three scheduled calls have Scheduled Time between **14:00 and 14:05** (e.g., 14:00, 14:02, 14:05) — not 14:30/15:00
10. **Waiting tab — consistency rule**: wait time must be **derived from Join Time** (`now − joinTime`), not seeded independently: the earliest Join Time row shows the longest Waiting Since, the latest join the shortest, strictly monotonic. Verify the ticking values keep this ordering

## Acceptance

1. Customer Details: fixed height, internal scroll, stacked sections, no timeline, header shows only ✕
2. Activity Log: no Call No. column; oldest event first; scrolls smoothly
3. Recording modal: title "Video Recording" (no 1/2); poster is the composed call-room frame showing that call's customer image + agent avatar PIP with play overlay
4. Call History: four centered CTAs (no Report Issue); pagination works with search/filters (reset to page 1 on filter change)
5. Scheduled times all within 14:00–14:05; Waiting tab ordering: join time ↑ ⇒ wait time ↓, always consistent while ticking
6. `npm run build` clean; nothing else touched
