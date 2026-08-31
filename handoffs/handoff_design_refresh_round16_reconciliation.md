# Handoff: Design Refresh v2 — Round 16 (Reconciliation)

**Companion to `2026-08-26_design_refresh_handoff_v2.md`.** All three items flagged in this round
are now resolved — decisions below, ready for Code.

---

## Resolved

### 1. Listen button layout — v2 wins

**Decision: compact, inline-left, per v2 §9** — not v1 §6's full-width-above version. Discard v1
§6's layout instruction.

**Non-negotiable regardless of layout: add an explicit `min-width`.** "Auto-width" is how the
original round 9 bug happened — no fixed width, button reflows based on neighboring content, shape
becomes unstable. This is a requirement on the compact-inline version, not optional polish.

### 2. "Manually choose bucket" — label stays as v2 wrote it

**Decision: keep `"Manually choose bucket"`** as the visible label.

**One mitigation worth keeping even though the label stands:** internal variable/prop/handler names
in the code should stay tied to what the control actually does (e.g. `simulateAnswer`,
`onSimulateResponse`) rather than renaming those to match the UI label. The concern flagged
earlier — that "manually choose bucket" describes the exact behavior round 4 removed — is about a
future engineer misreading the *code*, not the UI copy the agent sees. Keeping the internal naming
semantically distinct from the display label protects against that without touching what's
decided here.

### 3. Bucket-list radio/border treatment — state D only, confirmed

**Decision: applies only once a suggestion exists (state D).** The pre-suggestion listening state
keeps round 4's original treatment — no border, no fill, not tappable. §9 should be built with this
scoping explicit in the component logic, not applied uniformly to the whole list regardless of
state.

---

## §1a — ready as-is, no conflicts

- Merged "Rule Fired" column (scenario name + "{n} rules fired" stacked) reasonably consolidates
  round 3's separate Scenario / Rules Fired columns — no information lost.
- Legend-row scroll-bug fix (sibling after the scrollable container, not inside it) and the added
  avatar column are both additive — nothing to reconcile against prior rounds.

## Everything else in §9 — ready as-is

Video Visible/Audible card tinting, Customer Details section-label coloring, and the header avatar
fill are all new visual polish with no conflicts against anything decided in this thread.

---

## Resolution (Code)

All three reconciled decisions built exactly as resolved, not as v1/v2 separately specified them:

1. **Listen button** — reverted round 15's full-width-above layout back to compact inline-left, per
   v2 §9. Built the non-negotiable explicit `min-width` (180px) on it — this is the actual fix for
   the original round 9 bug (auto-width reflow), so it went in regardless of which layout won.
2. **"Manually choose bucket"** — display label changed; every internal identifier
   (`onSimulateBucket`, `handleSimulateBucket`, `simulatedTapId`, the `SpeechCapture` prop name)
   stayed exactly as it was. Left a comment at the change site pointing at this decision, since
   nothing about the code itself signals why the label and the internals now read differently.
3. **Bucket-list radio/border treatment** — scoped to `flowState === 'suggested'` specifically, not
   applied uniformly. Restructured the tap-rendering branch so states A-C keep an entirely separate,
   unstyled code path (round 4's original treatment, untouched) rather than one shared render with
   conditional classes — the reconciliation asked for this scoping "explicit in the component logic,"
   which a shared branch with a state check bolted on wouldn't have been.

§1a's five corrections are all in: the Risk Profile column header now carries the I/D/T/P/C initials
sub-row (this had been dropped when round 15 moved that content into the standalone legend row —
v2 wants both, not one or the other), Rules Fired and Scenario are merged into one "Rule Fired"
column (scenario name + "{n} rules fired"/"No rules fired" stacked beneath), the legend row is now a
JSX sibling *after* the scrollable rows div rather than a descendant of it, legend initials are bold
and `text-text` instead of muted gray, and column widths were adjusted for the new 7-column,
one-fewer-column layout. Verified live that the legend stays put while the row list scrolls past it.

§9's remaining items (Video Visible/Audible tinting + icons, Customer Details section-label dots +
colored header avatar) are built as specified — "No" buttons use the same hue as their card
(accent-outlined for Video Visible, success-outlined for Audible) rather than the app's generic
danger red, per the doc's explicit call-out that this shouldn't read as "a plain gray dark/light
choice." One implementation note: `Card`'s className merge (`cn()` in this repo is plain
concatenation, not tailwind-merge) meant the tinted background needed a `!` override to reliably beat
`Card`'s own `bg-surface` — a same-specificity collision that would otherwise depend on unpredictable
Tailwind stylesheet source order, not JSX prop order.

Everything else in §1-§8 was already built and verified in round 15 and is unchanged here.
