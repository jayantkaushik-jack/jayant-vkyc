# Round 38 — Live-testing fixes: Risk Snapshot mispositioned, blank left rail on call room — Resolution (Code)

**Status:** built and verified. No separate request handoff exists for this round — these three items
were reported directly, with screenshots, from Jack's own testing in a real (non-sandboxed) Chrome
window rather than delivered as a written handoff doc. Written up here anyway, same discipline as
every other round, since two of the three are real regressions in code this engagement has already
shipped and reported as fixed.

**Scope:** three items, all visual/layout. No tree logic, classifier behaviour, scoring, or verdict
logic touched.

---

## 1. Risk Snapshot modal — genuinely unscrollable and mispositioned, opened from the incoming-call card specifically

**What was reported:** opening Risk Snapshot from the incoming-call card's own button rendered a
modal that was cut off partway down, with no way to scroll to the rest of it or reach the Close
button — reproducing on a real, moderately-tall browser window, not the sandbox's own viewport.

**Root cause — two distinct bugs stacked on top of each other, both confirmed via live DOM
measurement, not guessed:**

1. **The real, primary cause:** `.callcard` (`cf-design-system.css`) has its own `backdrop-filter`
   (the frosted-glass look). `backdrop-filter` — like `filter`/`transform` — establishes a new CSS
   containing block for any `position: fixed` descendant. `RiskSnapshotModal`'s `.scrim` was rendered
   *inside* `IncomingCallCard`'s `.callcard` div, so its "fixed, full-viewport" positioning was
   actually resolving relative to that ~450px-tall card's own box, not the true viewport. Measured
   live before the fix: `.scrim`'s own bounding rect was `top:351, bottom:795` in an 820px-tall
   window — nowhere near `inset:0`. The modal itself (708px of real content) had nowhere near enough
   room in that mis-sized box, so it rendered oversized and cut off with no correct scroll container
   to reach the rest.
2. **A second, independent bug that made the first one worse:** `.modal__body` had `overflow: auto`
   but no `flex: 1; min-height: 0`. `.modal` is `display:flex; flex-direction:column; max-height:88vh`
   — but a flex child's default `min-height:auto` means it won't shrink below its own content's
   natural height even when the parent's `max-height` would otherwise force it to. Without an
   explicit `flex:1; min-height:0`, `.modal__body`'s `overflow:auto` was a no-op: tall content simply
   grew the box past `.modal`'s own 88vh instead of clipping/scrolling. This is a real, general fix —
   independent of bug 1, and would have caused an unscrollable modal on a short-enough window even at
   the two other (correctly-positioned) call sites.

**Why this specific call site only:** the Queue row and pre-call dossier's own `RiskSnapshotModal`
instances were never nested inside anything with a `backdrop-filter`/`filter`/`transform` — confirmed
by re-reading `TodaysQueue`/`CustomerDetailsStep`'s own markup — so bug 1 never affected them, which
is exactly why Round 37's own live testing of those two entry points looked correct.

**Fix:**
- `apps/agent/src/styles/cf-design-system.css` — `.modal__body` gained `flex: 1; min-height: 0;`.
- `apps/agent/src/components/agent-status/IncomingCallCard.tsx` — `RiskSnapshotModal` moved to render
  as a **sibling** of `.callcard`, not a descendant (wrapped the whole return in a fragment), so it
  escapes `.callcard`'s containing-block trap entirely. `IncomingCallOverlay`'s outer wrapper divs
  were re-confirmed free of any `transform`/`filter`/`backdrop-filter` of their own, so `.scrim` now
  correctly resolves against the real viewport all the way up the tree.

**Verified live**, on a real 1600×820 window (matching the reported symptom, not the sandbox default):
before the fix, reproduced the exact cut-off/unscrollable rendering; after, `.scrim`'s own bounding
rect measured `{top:0, bottom:820, left:0, right:1600}` — exactly `inset:0` against the real
1600×820 viewport — modal renders fully, centered, Close button reachable, no scrolling needed for
this persona's content (2 flagged + 3 clear signals).

## 2. "Score 38" appearing to repeat — was the same mispositioning bug, not a copy/content mistake

Re-examined against the actual component code before touching anything, per the instruction not to
manufacture new copy: **no duplicate text exists anywhere in the source.** `RiskSnapshotModal` shows
the score exactly once (`MULE SCORE / 38`, the large number). The *other* "Score 38 · Flagged:
Identity (Medium)" / "Fired: No EPFO record found" line the screenshots also showed is real,
pre-existing content from a completely different component — `IncomingCallCard`'s own `.why` summary
panel (`getRiskSummaryLines()`), which is directly behind the mispositioned modal from item 1. Once
the modal is correctly positioned and sized (fix above), it fully covers that panel behind its scrim
exactly as intended, and only one "38" is visible on screen at a time. No copy changed.

## 3. Blank left rail on every call-room screen

**What was reported:** a large empty grey/blank area running down the left edge of the call-room
screen (pre-call and Amber Q&A both), pushing the video panel and content well away from the page
edge.

**Root cause, confirmed in code — a real regression in the Round 30 fix that was reported as working
at the time.** `.shell`'s `grid-template-columns` is a fixed 2-track definition
(`calc(240px * var(--ui-scale)) minmax(0,1fr)`). `AgentSidebar` returns `null` on call-room routes to
go full-bleed, and Round 30's own fix pinned the content column to `gridColumn: 2` so it wouldn't
auto-place into the sidebar's track. That fix addressed *which track content lands in* — it never
addressed the fact that an **explicit, fixed-size first track is reserved by the grid regardless of
whether anything occupies it.** A `240px` (not `1fr` or `auto`) column doesn't collapse just because
its own grid item is absent — confirmed live via `getComputedStyle(.shell).gridTemplateColumns`,
which showed a real, non-zero first track even with no sidebar rendered.

**Fix:**
- `apps/agent/src/components/layout/AgentSidebar.tsx` — exported its existing `CALL_ROOM` route regex
  (previously module-private) so the layout can check the identical condition, not a second
  hand-maintained copy that could drift.
- `apps/agent/src/components/layout/AgentLayout.tsx` — now reads `useLocation()` itself, applies a new
  `.shell--no-sidebar` class when `CALL_ROOM.test(pathname)`, and only sets the content column's
  `gridColumn: 2` inline style when a sidebar column actually exists (otherwise leaves it unset, so it
  auto-places into the single remaining track).
- `apps/agent/src/styles/cf-design-system.css` — `.shell--no-sidebar { grid-template-columns:
  minmax(0,1fr); }`, collapsing the grid to one real column on call-room routes.

**Verified live**, same 1600×820 window: `getComputedStyle` on `.shell` showed `gridTemplateColumns:
"1600px"` (a single full-width track) with class `shell shell--no-sidebar` applied, and `<main>`'s own
`getBoundingClientRect().left` measured `0` — confirmed on both the pre-call dossier and the Amber
Q&A screen (progress rail spanning true edge-to-edge, video panel flush against the page edge).
Re-verified the Queue page (a normal, sidebar-bearing route) separately earlier in the same session —
sidebar renders exactly as before; this change is additive and scoped to call-room routes only.

## Verification summary

- `npx tsc --noEmit -p tsconfig.json`: clean after every change.
- Live-tested at 1600×820 (a real laptop-class window, not the sandbox's default) specifically because
  items 1 and 3 both only reproduced at a window size the sandbox's own default hadn't been exercising
  — a reminder that this environment's default viewport isn't a substitute for testing at the size a
  real reported bug came from.
- One transient `IncomingCallCard.tsx` HMR/500 error appeared mid-edit (between the fragment's opening
  and closing tags landing) and self-resolved on the next save — confirmed via
  `/tmp/jayant-vkyc-agent-dev.log`'s immediately-following clean HMR update, the same stale-error
  pattern already established in this engagement, not a live issue.

## Explicit non-changes

No change to any tree logic, classifier behaviour, scoring math, or verdict logic. No change to
persona data. No new/invented copy anywhere — the "duplicate Score 38" turned out to be two already-
existing, already-correct pieces of text rendering on top of each other due to the positioning bug,
not a text authoring mistake. `RiskSnapshotModal`'s own header/body/footer markup is unchanged; only
where it's mounted in the tree (for the incoming-call card specifically) and one CSS property on its
body changed.
