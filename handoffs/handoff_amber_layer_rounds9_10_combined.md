# Handoff: Amber Resolution Layer — Rounds 9–10 (Combined)

**Context:** consolidates two rounds into one file, same pattern as the rounds 6–8 combined handoff.
Round 10 resolves the one open item round 9 left pending (the processing-state copy) — this file
reflects only the final decision, not the superseded interim state. Noted inline where that happened.

**Companion file:** `control_row_quick_flags_fix_reference.html` — visual reference for item 1 and
item 5 below. Hand both files to Code together.

---

## 1. Control row — fixed layout, no more shape-shifting Listen button

**Bug confirmed:** the `Listen for applicant answer` button has no fixed width. Depending on how much
space the Simulate dropdown's current label takes, it sometimes renders as a proper pill and
sometimes collapses into a near-circle with wrapped text.

**Fix — two groups, not one undifferentiated row:**
- **Primary action (Listen button):** fixed min-width (220px), fixed height, single-line text that
  never wraps regardless of sibling content. Filled accent background.
- **Secondary/utility cluster (Language + Simulate):** grouped tightly (~8px gap), outlined/ghost
  styling, visually quieter than the Listen button — both are demo/utility controls, not the primary
  action.
- **~24px gap** between the primary group and the secondary cluster — that gap is the bifurcation
  that was missing; right now all three controls compete in one row with no grouping logic.

See the companion HTML file for the exact target layout.

---

## 2. Mr. Holmes persona — the AI classifier, named consistently across every touchpoint

**Not a joke label** — this is the name for the AI classifier itself, the same pattern as Intercom's
"Fin" or Salesforce's "Einstein." Applies identically across all three built trees (SIM Circle
Mismatch, Farmer Income Mismatch, Premium Address Risk) — same backend classifier in all three, so
the persona isn't tree-specific.

*Minor note for the record: Sherlock Holmes stories are public domain at this point, and "Mr. Holmes"
without "Sherlock" is a soft, generic reference — low-risk, common in other products, worth flagging
once since this goes in front of external stakeholders and press at GFF.*

### 2a. Processing state (State C) — supersedes this round's original "Reviewing response…"

**Final copy:** `Mr. Holmes is reviewing the response…`

Same 3-dot loader, same position, same muted styling — only the caption text changes.

### 2b. Suggestion state (State D) — eyebrow label renamed

**Was:** `SUGGESTED` **→ Now:** `MR. HOLMES SUGGESTS` — same position, same small-caps eyebrow
treatment. Bucket name, `Confirm` button, and the muted/tappable other-bucket list underneath are
unchanged.

### 2c. Degraded-mode fallback — stays in persona

Round 2 specified `Degraded mode — select manually` for when classification returns no suggestion.
Rather than breaking character only in the failure case:

**Final copy:** `Mr. Holmes couldn't narrow this down — select manually`

Same full-bucket-list-expanded layout as originally specified — only the caption text changes.

### 2d. Icon — reuse the existing magnifying glass, don't design a new one

The Progress panel already uses a magnifying glass icon for the `Amber Resolution` stage — reuse that
exact icon as Mr. Holmes's visual identity everywhere the name appears (2a, 2b, 2c above). Small
circular badge (~20px), positioned immediately to the left of the "Mr. Holmes" text in each case —
already thematically right (search/investigate) and already exists, so nothing new to design.

---

## 3. Remove the "customer may have stepped away" banner — entirely, everywhere

Remove this banner from the call screen completely, in every state — not scoped to Amber Resolution
alone. It's firing unpredictably and interrupting the demo with no compensating value. Don't fix its
trigger logic, just remove it outright.

---

## 4. Quick-flags section — fix the disappearing bug, give it its own visual identity

**The chips in question:** `Applicant appears coached`, `This looks like a data error`,
`"Why are you asking?" script`, `Handover`.

**Bug — needs investigation, not a prescribed fix:** these chips are visible in one screenshot and
reportedly vanish intermittently in others. Likely the same category of bug as round 5's root cause —
something in this panel's visibility condition reading a stale or independent flag rather than the
single current-state value driving the rest of the resolution flow. Code should diagnose the actual
condition, not guess-patch the symptom.

**Visual treatment:** currently blends with the bucket options above it — these are agent-facing
escalation shortcuts, a different category of thing from answer buckets, but styled identically
right now.

**Fix:**
- Small-caps section header: `QUICK FLAGS`
- Light gray background — distinct from both the white bucket list above and the amber-tinted abort
  accordion
- Own spacing — separated from whatever sits above it, not flush against the abort link or the
  bucket list

See the companion HTML file for the exact target styling.

---

## Open items

1. **Item 4's bug** — root cause needs Code's investigation before the fix can be confirmed correct;
   the visual treatment can be built regardless of when the root cause is found.

Everything else across both rounds is fully decided.

---

## Resolution (Code)

**Item 4's root cause, found:** not a stale-flag bug like round 5's. `AmberPanel`'s root
(`flex flex-col h-full`) sits inside the call-room's middle column, which already has `min-w-0` for
horizontal shrinking but nothing for vertical. Without `min-h-0`, a flex item's automatic minimum
height stays content-based instead of shrinking to the available space — so whenever the question
card's content grew (more fired rules, the handover-count line, a longer transcript-so-far list),
the whole panel overflowed past its container and the ancestor's `overflow-hidden` clipped whatever
rendered last: the quick-flags footer. Fixed by adding `min-h-0` to `AmberPanel`'s root, which lets
the inner `flex-1 overflow-y-auto` region actually engage — the question/bucket area now scrolls
internally while quick flags stays pinned and visible regardless of content height. Verified by
building up three answered questions' worth of content in-browser and confirming quick flags never
left the screen.

Items 1, 2, 3, and 4's visual treatment are built as specified and verified in-browser: the Listen
button is now a fixed 220×52px filled-accent pill that never reshapes; Language + Simulate are
grouped in their own outlined cluster 24px away; Mr. Holmes's name and magnifying-glass badge appear
at all three touchpoints (processing, suggestion, degraded); the "customer may have stepped away"
banner and its trigger are removed entirely; quick flags now render in their own light-gray,
2-column QUICK FLAGS box, separated from the bucket list and abort accordion.
