# Design refresh — handoff for implementation

**Prototype reference:** `VKYC Agent Prototype.dc.html` (open in the Omelette/design tool project, or ask for a PNG export per-screen). Use the tab bar at top to click through every screen below — the file is the single source of truth for spacing, color, and copy; this doc maps each tab to the exact repo files to change.

No new design tokens were introduced. Every color/radius/shadow value used in the prototype is already declared in `apps/agent/tailwind.config.js` (cashmere semantic palette) — implement with existing Tailwind classes (`bg-primary`, `text-warning-text`, `border-border`, `shadow-card`, etc.), not new hex values.

---

## 1. Amber Queue table (`QueuePage.tsx`)

File: `apps/agent/src/features/agent/QueuePage.tsx` (the `TodaysQueue` component).

- Wrap in a solid card (`rounded-lg border border-border bg-surface shadow-card`) instead of the dashed border.
- Header row: keep the funnel copy, add a small colored dot before each Green/Red/Amber segment (`w-1.5 h-1.5 rounded-full`, success/danger/warning bg respectively).
- Table header: uppercase 10.5px `text-text-disabled`, sticky, `bg-surface`.
- Add a 30px avatar circle per row (initials, `bg-primary-soft`/`bg-bg` depending on selection).
- Band/Status columns: render as small pill chips (`rounded-md px-2.5 py-1 text-[11px] font-semibold`) using `bg-warning-subtle text-warning-text` for Amber/Waiting instead of plain colored text.
- Risk-profile dots: bump to 10px, keep the `title` tooltip, and add a legend row under the table (`I·D·T·F·P`-style key spelling out each dimension name — see §4, names changed).
- Selected row: `border-l-2 border-primary bg-primary-soft` (unchanged behavior, just confirm styling matches).
- Scenario column needs `min-width` room (~150px) — "Farmer Income Mismatch" was clipping at the old width; don't let `flex-1` compress it below that.

## 2. Login / OTP (new screens — not yet in repo)

These don't exist in the codebase yet based on the shared screenshots; if there's a separate auth app, hand this section to whoever owns it. Layout: 40/60 split, dark (`#1b1b1b`) left panel with the Cashfree logo + concentric ring decoration, light-canvas right panel with a centered white card (`rounded-xl shadow-lg p-8`, max-width 420px). OTP screen: single wide bordered box with letter-spaced placeholder digits, resend countdown, Login + Back.

## 3. Home dashboard — offline / online states

No structural changes requested beyond visual polish already matching cashmere (sidebar `bg-primary` #1b1b1b, active nav item lighter fill). Confirmed current implementation is close to the redesign; no action needed unless you want the stat cards to add the small info-icon treatment shown in the prototype.

## 4. Risk dimension taxonomy — rename (data model change)

**Old → New**, applies everywhere a dimension name renders:

| Old | New |
|---|---|
| Identity Authenticity | Identity |
| Digital Presence | Digital Presence *(unchanged)* |
| Telecom Intelligence | Telecom |
| Fraud & Compliance | Payment Fraud & Blacklists |
| Payment Behaviour | Coherence Risk |

Files to update:
- `apps/agent/src/features/agent/call/amber/personas.ts` — `DIMENSION_LABELS` map and the `RiskDimensions` key names if you want the object keys to match (recommend renaming keys too: `identityAuthenticity→identity`, `telecomIntelligence→telecom`, `fraudCompliance→paymentFraudBlacklists`, `paymentBehaviour→coherenceRisk`).
- `apps/agent/src/components/risk/RiskSnapshotModal.tsx` — no literal strings, pulls from `DIMENSION_LABELS`, so it updates automatically once the map above changes.
- `apps/agent/src/features/agent/QueuePage.tsx` — `DIMENSION_INITIALS` map (I/D/T/F/P → new initials, suggest T/D/I/P/C to match the new order/names).
- Search the repo for any hardcoded dimension strings in `tree.ts` / scoring copy (`resolveFarmerIncomeExplained`, verdict `reasons` strings) that reference the old names in agent-facing text.

## 5. Customer Details step (`CustomerDetailsStep.tsx`)

File: `apps/agent/src/features/agent/call/steps/CustomerDetailsStep.tsx`.

- "Language selected by customer" → render as a small accent pill (`bg-accent-subtle text-accent`), not plain text.
- "Fired: …" line → split into a warning-tinted callout box (`border-l-[3px] border-warning bg-surface`) with the free-text reason on one line and small chips below for the structured tags (dimension name, risk tier, "+N more").
- Customer Details card: restructure the flat two-column grid into labeled sections — **Identity** (Gender, DOB, Father's Name, Mobile), **Contact & Address** (Email, Current/Permanent address), **Account** (Product Type, Onboarding Channel, Customer Status) — each with a small uppercase section label and a divider. Add a small header row with a 34px avatar + name + "New applicant · {productType}" subheading above the sections.
- "Proceed" button: make it look enabled by default (`bg-primary text-white`), matching the rest of the app's primary button — the disabled-gray look in the current build reads as broken.

## 6. Amber Resolution / Decision Tree (`AmberPanel.tsx`)

File: `apps/agent/src/features/agent/call/amber/AmberPanel.tsx`.

- **Progress rail**: move from a persistent right-hand vertical rail to a **horizontal strip above the video + question row**, spanning the full width, so both the video panel and the question card get more horizontal room. Shorten step labels to single words (Liveliness, Location, Face, Aadhaar, PAN, Sign) so it never needs a scrollbar; connecting line stretches between icons with `flex: 1`. Amber Resolution stays as the trailing pill, `bg-primary-soft text-primary`, when active.
- Rename the "Agent script" eyebrow label to **"Q{n}"** (e.g. "Q1") — shorter, same uppercase/muted treatment.
- "Listen for applicant answer" button: make it the unambiguous primary action — full-width, solid `bg-accent` pill with a mic icon, sitting above (not beside) the language/simulate selects so it doesn't compete for horizontal space with two secondary dropdowns.
- "Mr. Holmes is reviewing…" processing state: replace the plain bouncing-dots row with a compact accent-tinted panel (`bg-accent-subtle rounded-lg p-3.5`) containing a small spinning-ring badge (CSS `border-t-transparent` + `animate-spin` around the existing `MrHolmesBadge`) plus a one-line subtext ("Matching the applicant's answer to a response bucket").
- **Quick Flags**: this is the biggest real-estate fix. Replace the current full-width `bg-bg p-4` panel + 2×2 button grid with a single-row, low-height pill toolbar directly under the question card — small "Quick flags" label, then 4 compact pill buttons (icon + short label, ~32px tall, `rounded-full border border-border`), no card wrapper, no eyebrow padding block. Preserves all four actions (Coached, Data error, "Why asking?" script, Handover) with far less vertical space.

## 7. "Customer still connected" confirm modal

Same file (`AmberPanel.tsx`, the `showEndConfirm` modal). Add a small warning-tinted icon badge (36px circle, `bg-warning-subtle`, phone-off icon) to the left of the title for consistency with the other modals (Device Check, Risk Snapshot) which all lead with an icon.

## 8. Post-call outcome screen + new Case Summary (`PostCallConfirmation.tsx`)

File: `apps/agent/src/components/call/PostCallConfirmation.tsx`.

- Visual polish: decision label as a colored chip (`bg-warning-subtle text-warning-text px-2.5 py-1 rounded-md`) instead of plain colored text next to "Decision"; checklist items get a circled checkmark icon instead of a trailing "✓" character; icon badge gets a soft circular background matching its status color instead of a bare Lucide icon.
- **New: append the Case Summary directly below the existing outcome card, on the same screen** (not a separate route/page) — confirmed by the user, this replaces having it as its own screen. Add, in order, under the existing checklist card:
  1. A small "— Case Summary —" divider label.
  2. **Final Outcome badge** — large, color-coded per the spec doc (`uploads/Farmer_Tree_Case_Summary_Spec_and_Examples.md`): Green/Cleared, Red/Hard Stop, Amber/Routed to Human Review, Amber/Explanation Logged.
  3. **Narrative summary** paragraph — plain-language explanation generated from the same structured verdict data (do not hand-write this separately from the trail, per the spec's own note — keep one source of truth).
  4. **Structured fields**, shape depends on Amber flavor (mutually exclusive, omit entirely for Green/Red):
     - Pending-verification: *Reason for referral*, *Documents required*, *Expertise required*.
     - Explanation-logged: *Explanation logged: [category]*.
  5. **Question-by-question trail** — collapsible section (chevron toggle), each row showing the question, the applicant's transcript line in italics, and the confirmed bucket as a small chip. Default **collapsed** on the agent's own screen; default **expanded** if a second reviewer opens the case later (i.e. gate the default on a `viewerRole` or similar prop, not a hardcoded false).
  6. Existing "Next Call (Ns)" / "Back to Home" controls move to the very bottom, after the summary.
- Data for the narrative/trail should come from `AmberPanel`'s existing `Verdict` + `PathEntry[]` (the `path` state array already has `question` / `tapLabel` / corrected-flag per step) — no new data model needed, just surface what's already tracked through `onVerdict`.

---

## Open items / not covered

- Login and OTP screens aren't in the current repo (see §2) — confirm which app/route owns auth before implementing.
- The dimension rename (§4) touches scoring/verdict copy in `tree.ts` in places I haven't exhaustively grepped — do a full-repo search for the five old dimension label strings before shipping.
