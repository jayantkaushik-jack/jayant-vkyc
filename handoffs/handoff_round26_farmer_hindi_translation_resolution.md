# Round 26 — Farmer Tree Hindi Translation — Resolution (Code)

Two things needed your confirmation before building, both asked up front rather than guessed: the
display mechanism (§5, explicitly deferred by the handoff) and three real typos found while checking
the supplied Hindi text against the live source. Built after both were confirmed.

## Confirmed with you before building

- **Display mechanism: bilingual, always both visible** — English and Hindi both shown on every
  question and tap, regardless of the language dropdown. Not a monolingual toggle.
- **Three Hindi typos, fixed rather than reproduced verbatim** — found by inspecting the handoff's
  Devanagari text character-by-character (not eyeballing):
  - `land_water`'s "irrigated" tap: बोरॵेल contained U+0975 (an obscure letter never used in
    standard Hindi) → corrected to **बोरवेल** (borewell).
  - `year_clean_path`'s question: केंगे was missing ह compared to the correct conjugation →
    corrected to **कहेंगे** ("would say").
  - `q3_alt`'s new Hindi: हिसाला isn't a real word → corrected to **सालाना** ("yearly"), matching
    the English "yearly income."
  - **A fourth typo caught during transcription, not in the original list of three flagged to
    you**: `q3_alt`'s `sold_asset` tap Hindi label had संपत्त (missing the final ि) — corrected to
    **संपत्ति** ("asset/property"). Flagging this now since it wasn't in the earlier confirmation;
    happy to revert if you'd rather review it separately.

## What changed

**`apps/agent/src/features/agent/call/amber/tree.ts`** — Farmer tree only, as scoped:
- Added `questionHi?: string` to `QuestionNode` and `labelHi?: string` to `Tap` — both optional,
  additive, display-only. Only Farmer-tree nodes/taps populate them; SIM and premium-address are
  completely untouched (their nodes simply have no `questionHi`/`labelHi`, so they render exactly as
  before).
- Populated Hindi for every Farmer question and every tap across all 8 nodes, using the handoff's
  text with the three (then four) corrections above.
- **`q3_alt.question`'s English value itself changed** to the user's rewrite ("You'd mentioned your
  yearly income earlier — that seems a bit more than we'd expect for this land. Is there anything
  else coming in — another job, pension, remittance, government scheme, or rental?"), replacing the
  original "That figure looks higher than we would expect..." — exactly as instructed, not just an
  added translation. `q3_alt`'s 8 taps/buckets themselves are untouched, per the explicit "don't
  change buckets" instruction.
- Confirmed (§3's own ask) that `api/_classify-core.ts`'s bucket-list construction
  (`taps.map((t) => \`- ${t.id}: ${t.definition ?? t.label}\`)`) only ever reads `definition`/`label`
  — both English — so adding `labelHi` alongside them changes nothing about what reaches the Haiku
  classifier. No classifier file touched.

**`apps/agent/src/features/agent/call/amber/AmberPanel.tsx`**:
- Two new small presentational components: `QuestionText` (English question, Hindi directly below
  when `questionHi` exists) and `TapLabel` (same pattern for a tap's label, inline-safe so it drops
  into existing flex rows with icons/checkmarks without restructuring them). Both render exactly the
  English-only original when the Hindi field is absent — so SIM/premium-address nodes are visually
  unchanged.
- Replaced every `{node.question}` and `{tap.label}` render site (6 tap-label sites across the
  awaiting/confirmed/suggested/degraded states, 1 question site) with the new components.
- The "Manually choose bucket" simulate dropdown is the one exception — HTML `<option>` can't hold
  rich JSX, so its options render as a single concatenated string (`"English — हिन्दी"`) instead of
  two lines.

## Testing

- `npx tsc --noEmit -p tsconfig.json`: clean.
- Live in the browser (a Farmer-tree call, Meena Devi persona), verified via both visual screenshots
  and `javascript_tool`/`read_page` (checking actual rendered text, not just eyeballing):
  - q1 (`What do you grow...`): English + Hindi both rendered on the question and on every tap,
    confirmed via screenshot.
  - The "Manually choose bucket" dropdown: confirmed via `read_page` that every option reads
    `"English — Hindi"` correctly.
  - `land_water`'s irrigated tap: confirmed programmatically (`document.body.innerText.includes(...)`)
    that the corrected बोरवेल is present and the glitch character (ॵ, U+0975) is completely absent
    from the rendered page.
  - `year_clean_path`'s "कहेंगे" fix: this specific persona's calc routed to `year_recheck` instead
    (a different node, with no "would you say" phrasing at all, so nothing to check there) — verified
    the fix directly in the committed source instead (`grep` confirms `कहेंगे` present, `केंगे` absent
    anywhere in `tree.ts`).
  - `q3_alt`: reached live via the same call. Confirmed programmatically that the new English string
    is present and the old one is completely gone, and that the corrected सालाना Hindi is present with
    हिसाला completely gone.
  - No console errors traceable to this round (one pre-existing Vite HMR WebSocket log and one stale
    `/api/stt-token` 500 from an earlier, unrelated test action in this same browser session — neither
    is new, and this round added no network calls at all, being pure content/display).
