# Handoff 34 — UI layout/overflow fixes on the Round 30/31 restyled screens

**Status:** locked, ready to build. This is a fresh chat with no memory of prior rounds — read this
doc in full before doing anything. Context below is self-contained; this repo (`jayant-vkyc`) has
30+ prior handoffs in `handoffs/` if deeper history is ever needed, but nothing here requires
reading them.

**Scope:** four distinct layout/overflow bugs across screens that were restyled in Round 30/31 (the
design-system pass). These are **visual/CSS bugs only** — no tree logic, classifier behaviour,
scoring, or verdict logic should be touched. Screenshots referenced throughout were taken directly
from the running app by Jack; exact descriptions below are grounded in what's visible in them, not
guessed.

---

## 0. Context — why these bugs exist

Round 30 introduced the new design system (`cf-design-system.css`, Cashfree's "Thunderclap"
tokens/components) and restyled Login, OTP, and Home (offline state). Round 31 extended that styling
to the remaining screens — Home online, the Amber answer machine, incoming call, resolution, case
summary, etc. Both rounds were largely successful, but four specific layout bugs surfaced when Jack
actually used the running app afterward — these are real regressions from that restyle work, not
pre-existing issues, and need fixing before this build goes further (including before it's used as
the base for any future work, such as the separate story-asset track — see `handoff_round32...` and
`handoff_round33...` in this same folder if that context matters later, though it's unrelated to
this bug list).

---

## 1. Bug 1 — Incoming-call card is pushed below a long queue list; agent has to scroll the whole page to reach it

**What's wrong:** on the Home/queue screen, the queue table can have many rows (Jack's screenshot
shows "14 in view · 400 total"). The incoming-call card (the one with "INCOMING V-CIP CALL", the
applicant's avatar, Accept call / Decline / Risk snapshot) is currently placed **after** the queue
table in the page's normal document flow — so with a long queue above it, an agent has to scroll the
entire page down past all the rows just to see and act on the incoming call. This defeats the
purpose of an incoming-call alert, which needs to be immediately visible/actionable the moment it
appears, regardless of how long the queue is.

**Locate the current component:** find wherever the queue table (`QueuePage.tsx` or equivalent —
confirm the actual current file/component name, don't assume it hasn't been renamed since Round 31)
and the incoming-call card are rendered together on the same page, and confirm they're currently
siblings in normal document flow with the queue table first.

**Fix — pick whichever pattern fits the existing component structure with least disruption, in this
order of preference:**
1. **Preferred:** make the incoming-call card `position: fixed` (or sticky within its own layout
   container) so it stays visible in the viewport regardless of queue scroll position — e.g.
   anchored bottom-right or as a persistent banner near the top, above the queue table's own scroll
   area. This matches how a real call-center "incoming call" alert should behave — always visible,
   never buried.
2. **Acceptable fallback if fixed positioning conflicts with existing modal/z-index logic:**
   restructure the page so the incoming-call card renders in a separate, always-visible region (e.g.
   a persistent header/sidebar slot) rather than inline before/after the queue table, and give the
   queue table itself its own internal scroll container (`overflow-y: auto` with a bounded height)
   so a long queue scrolls within its own box instead of pushing page content down.

**Verification:** load the queue with enough rows to exceed one viewport height (use the existing
mock/demo data — Jack's screenshot already shows this reproducing with the current data, so no new
test data should be needed), trigger or simulate an incoming call, and confirm the incoming-call
card is visible without scrolling the page, at any scroll position within the queue.

---

## 2. Bug 2 — Risk snapshot modal is overflowing/rendering a duplicate frame

**What's wrong:** the Risk Snapshot modal (opened from the queue or the incoming-call card — confirm
its actual entry point) is visibly overflowing its own container. In Jack's screenshot, the modal's
content (the "Amber — needs a question" summary card, the "Signals flagged" list with Identity and
Coherence Risk chips, the "3 signals clear" expandable row, and a Close button) appears to render
**taller than its own frame**, with a second, ghosted/duplicate-looking card frame bleeding through
behind and around it — visible as pale rounded-rectangle edges above and below the main modal
content, as if either (a) the modal has no `max-height`/internal scroll and is overflowing its
positioning container, or (b) two modal instances are stacking/rendering on top of each other.

**This needs investigation, not a guessed fix** — the exact cause (missing `max-height` + `overflow-y:
auto` on the modal body vs. an actual duplicate-render/double-mount bug in the component) isn't
determinable from a static screenshot alone. Locate the Risk Snapshot modal component (likely
`RiskSnapshotModal.tsx`, per earlier rounds' file references — confirm the actual current name), and:

1. First check whether the component is being mounted/rendered twice (a duplicate modal instance in
   the DOM) — inspect the rendered output in the browser dev tools if needed. If so, that's the root
   cause and the real fix is removing the duplicate mount, not CSS.
2. If it's a single instance but the *content* is taller than the modal's own box, give the modal a
   sane `max-height` (e.g. `85vh` or similar, matching whatever convention `cf-design-system.css`
   already uses for other modals/cards) with `overflow-y: auto` on the scrollable content region,
   so long dimension lists scroll within the modal rather than overflowing it.
3. Whichever cause it turns out to be, the modal's outer frame (the pale background/border currently
   bleeding through) should not be visible outside the modal's own intended edges once fixed.

**Verification:** open the Risk Snapshot modal for a persona with enough dimension content to be tall
(Dilip Chaudhary or a persona with several fired rules is a reasonable test case, given real data
already exists for him — see Round 22/32/33 handoffs if persona data specifics are needed, though
not required to fix this bug). Confirm the modal renders as a single, cleanly-bounded card with no
visible second frame behind it, and that if content exceeds the modal's height, it scrolls
internally rather than overflowing.

---

## 3. Bug 3 — "Manually choose bucket" dropdown overflows its card, runs off the page edge

**What's wrong:** on the Amber answer-machine screen (Question 1 and presumably every question in
this flow — confirm whether this is universal or specific to certain question types), the "Manually
choose bucket ▾" dropdown field is wider than its containing card and extends past the right edge of
the visible page. In Jack's screenshot it's clearly cut off — the field's right border/edge runs
off-screen rather than staying within the card's padding like every other element on that screen
(the "Listen for applicant answer" button and language selector above it are correctly contained).

**Locate the current component:** the Amber answer machine (`AmberPanel.tsx`, per prior rounds'
references — confirm current name) — specifically the manual-bucket-selection dropdown element,
likely a `<select>` or a custom dropdown component styled via `.field` or similar from
`cf-design-system.css`.

**Fix:** the dropdown needs `width: 100%` (or `max-width: 100%`) constrained to its parent
container's padding, matching the sibling elements above it that already render correctly within
the card. Check whether the dropdown is using a fixed pixel width, an unconstrained flex-basis, or
inheriting a width from unstyled native `<select>` behavior (native selects can size to their
longest `<option>` text if not explicitly constrained — if the options list includes a long bucket
label, that's a likely root cause worth checking specifically). Whatever the cause, the fix should
make this field respect its container's width exactly like the elements above it already do — don't
just cap it at an arbitrary pixel value that happens to look right at this screenshot's viewport
width, since that would likely re-break at a different window size.

**Verification:** view this question with a range of bucket-option label lengths (short and long
labels, if the current tree data includes both) at a couple of different browser/window widths, and
confirm the dropdown never exceeds its card's right edge at any width.

---

## 4. Bug 4 — Call-room screen: blank left rail, and a misaligned End Call button

**What's wrong (two distinct issues on the same screen):**

1. **Blank left rail.** In the call-room screen (top bar reads "Hi, Sumit — Amber resolution ·
   Farmer & SIM queues", with the KYC step rail — Liveliness, Location, Face, Aadhaar, PAN, Sign —
   above a two-column layout: video panel on the left, resolution/reasons panel on the right), the
   space to the left of and above the video panel (visible as a large blank grey area in the
   screenshot, above where the video panel starts) is empty/unused. This needs investigation to
   determine whether: (a) this is dead layout space that should be removed by tightening the grid/
   flex layout so the video panel starts higher and the page doesn't reserve unused space, or (b)
   there's supposed to be content there (a sidebar, agent info, queue mini-list, etc.) that isn't
   rendering. **Confirm which it is by checking the component's intended layout** (compare against
   the Round 31 design-handoff reference screens for this screen, if still available in the repo or
   Downloads, per that round's handoff — but don't invent content to fill the space if the reference
   doesn't call for anything there; removing the dead space via layout fix is the safer default if
   the reference is inconclusive).

2. **Misaligned End Call button.** In the video panel's control bar (bottom-left of the video,
   containing Reconnect, a kebab/more-options icon, chat, mic, camera, and End Call), the red "End
   Call" button/icon at the far right of that row does not appear correctly aligned with its
   sibling controls — worth checking padding, icon+label alignment, and vertical centering against
   the other icon buttons in the same row, and against however `cf-design-system.css` defines this
   control-bar pattern elsewhere if a shared class exists.

**Note — explicitly NOT a bug:** the video feed itself appearing dark/near-black in this screenshot
is real room lighting from testing, not a rendering bug — do not spend any time on the video feed's
brightness/visibility itself. Only the blank rail and the End Call button alignment are real issues
here.

**Locate the current component:** the call-room screen (`CallRoomPage.tsx` or equivalent — confirm
current name per Round 31's file references) and its video-panel control bar sub-component.

**Verification:** load the call-room screen and confirm there's no unexplained blank space in the
layout (either filled with intended content or removed), and that the End Call button reads as
visually aligned and consistent with its sibling controls in the same bar.

---

## 5. General approach for all four bugs

- Take a screenshot of each fixed screen using the browser tools available in this environment
  (per the design-system rounds' own established practice — Round 30's resolution doc used this
  same screenshot-and-verify discipline) and visually compare before/after, rather than assuming a
  CSS change worked without confirming it rendered correctly.
- These are visual bugs only — confirm no tree logic, classifier calls, scoring, or verdict
  computation is touched by any of these fixes. If a fix for any of these bugs seems to require
  touching non-visual logic, stop and flag that back rather than proceeding — that would mean the
  bug is deeper than currently understood.
- If any of the four root causes turns out to be different from what's described above once you're
  actually in the code (e.g. Bug 2 turns out to be neither a double-mount nor a missing max-height,
  but something else entirely), report what you actually found rather than forcing the fix described
  here to fit — the descriptions above are Jack's and my best read of static screenshots, not
  confirmed root causes.

## 6. Explicit non-changes

- No change to any tree logic, classifier behaviour, scoring math, or verdict logic.
- No change to persona data (`personas.ts`) as part of this round.
- No change to any screen not named in this handoff.
- No new features — this is a bug-fix round only.

## 7. What happens after this round

Report back, for each of the four bugs: what the actual root cause turned out to be, what was
changed, and a screenshot confirming the fix. This goes back to Jack for review.
