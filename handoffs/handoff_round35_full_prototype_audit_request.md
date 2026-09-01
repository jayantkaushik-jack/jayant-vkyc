# Handoff 35 — Full prototype audit (produce a document, not a code change)

**Status:** ready to run. This is a fresh chat with no memory of prior rounds — read this doc in
full first. Unlike every other handoff in this folder, **this round asks you to produce a written
audit document, not change any code.** Do not edit, fix, or refactor anything as part of this
round — even if you spot an obvious bug while reading through the code, note it in the audit rather
than fixing it inline. Fixes happen in later, separate rounds once Jack has reviewed the audit and
decided what to prioritize.

---

## 0. Why this exists, and why it's unusually broad

This repo (`jayant-vkyc`) is the agent-console prototype for Mule Sentinel, Cashfree's
onboarding-stage mule-detection product. It's been through 30+ rounds of handoffs already (see
`handoffs/` for the full history if useful context, though this round shouldn't require reading all
of them). Jack is about to start using **this chat** as his ongoing brainstorming partner for future
prototype changes — not just one-off fixes like the last few rounds, but an extended, continuing
conversation about the screens, the flows, and what to build next.

For that to work well, this chat needs a real, current, comprehensive picture of the whole
prototype — not fragments pieced together from old handoffs (which each only cover their own narrow
slice) and not guesses. You can read every file in this repo directly; a separate planning
conversation Jack also uses cannot — it only has whatever's been summarized or pasted to it over
time, which is necessarily partial and can drift out of date. So this round's job is to close that
gap: produce one comprehensive, current, ground-truth document by actually reading the codebase,
that both this chat and that other conversation can rely on going forward.

---

## 1. What the audit needs to cover

Produce a single Markdown file (see §3 for exactly where) with the following sections. For every
section, ground claims in what you actually find in the code — file names, component names, real
behavior — not assumptions carried over from old handoff docs (those may be stale; verify against
current code rather than trusting them).

### 1.1 Screen / component inventory

Every screen in the app, with: the component file(s) that render it, a one-line description of what
it does and when a user sees it, and its current design-system status (fully restyled with
`cf-design-system.css` per Round 30/31's work, partially restyled, or still on the old Tailwind
palette — check against Round 31's own screen list if useful, but verify current state directly
rather than trusting that list is still accurate).

### 1.2 Known bugs — both open and already-fixed

A consolidated bug list, each entry with: what's wrong, which screen/component, severity (blocks a
demo vs. cosmetic vs. edge-case), and status (open / fixed-in-round-N / unclear). Pull from two
sources and reconcile them:
- The four bugs just handed off in `handoffs/handoff_round34_ui_layout_overflow_fixes.md` — check
  whether they've been fixed yet by the time you run this audit, and report their actual current
  status rather than assuming they're still open.
- Any other bugs you find by actually reading the code and/or running the app — don't limit the list
  to only what's been explicitly reported in a prior handoff; if something looks broken while you're
  auditing, note it even if nobody's flagged it yet.

### 1.3 Design-system coverage

A clear picture of which screens are fully on `cf-design-system.css`'s tokens/components and which
still have hand-rolled Tailwind styling — this determines what's safe to treat as "final" visual
state vs. what still needs a restyle pass. Cross-check against Round 31's original scope list
(`handoffs/handoff_round31_apply_design_system_remaining_screens.md`) but verify current state
directly — that handoff was written before the work was done, not after.

### 1.4 Data model — personas, trees, rules

- Every persona currently in `personas.ts`: name, tree, verdict/band, and whether its 5-dimension
  data (`identity`, `digitalPresence`, `telecom`, `paymentFraudBlacklists`, `coherenceRisk`) is
  fully populated with both a `level` and a `primarySignal`, or has gaps (e.g. a level with no
  signal text, or a `NOT_AVAILABLE` that looks like it should have real data).
- Every tree in `tree.ts` (or wherever tree definitions currently live): what it's for, how many
  questions/nodes, and its current build status (fully wired, partially built, designed-only-not-
  built — some of this may already be described in older handoffs like the GFF alignment doc, but
  verify against actual code state).
- Any discrepancy between the PRD's on-paper rule catalogue (`[PRD] Mule Sentinel.docx`, if useful
  as a reference — 57 rules across 9 categories) and what's actually implemented in this prototype's
  simplified rule/scoring logic, if any exists and is worth flagging.

### 1.5 API / integration state

- Every external integration referenced in code (Claude/Anthropic classifier calls, ElevenLabs STT,
  any others) — current status (working, needs a funded key, mocked/stubbed, dead code), and where
  the relevant config/env vars are (without exposing actual secret values).
- Any known reliability issues already documented in prior handoffs (e.g. the classifier timeout fix
  from Round 30) — confirm current status rather than assuming still-open or already-fixed.

### 1.6 Prioritized flag list (descriptive, not directive)

Close the audit with a flagged list of the issues found across all sections above, each tagged by
severity/blast-radius (e.g. "blocks any live demo," "cosmetic, low visibility," "data gap, easy
fix," "structural, needs a real decision from Jack first"). This should help Jack and future
conversations quickly see what matters most — but the actual prioritization decision (what to fix
first) is Jack's to make, not yours. Present the flags; don't tell him what order to do them in.

---

## 2. How to do this without guessing

- Actually read the files — don't reconstruct the picture solely from old handoff docs. Prior
  handoffs are useful as a starting map of what to look at, but every claim in the final audit
  should be checked against the current code, since some of those handoffs are many rounds old.
- Where you're not certain something is a bug vs. intentional (e.g. a screen that looks
  incomplete but might be deliberately minimal), say so explicitly rather than asserting it as a
  bug — this document needs to be trustworthy, not just thorough.
- If running the app live (via whatever local dev server this repo uses) would help confirm
  something a static code read can't settle — like the Bug 2 (Risk Snapshot modal overflow)
  investigation from Round 34 — do that rather than guessing from source alone.

## 3. Where to put the finished audit

Write it to `handoffs/full_system_audit.md` in this repo. **Check first whether a file already
exists at that exact path** (there's a mention of one in this folder's file listing) — if it does,
read it first: it may be an earlier version of exactly this kind of audit, in which case this round
should be treated as **refreshing/superseding it** with current, verified information, not
duplicating it blindly. If the existing file is recent and largely still accurate, say so and note
what's changed rather than rewriting everything from scratch; if it's stale or was written for a
narrower purpose, replace it with the full audit described above.

## 4. Explicit non-changes

- No code changes, no bug fixes, no refactoring — this round produces a document only.
- No change to `personas.ts`, `tree.ts`, or any component file.
- If you find something so obviously wrong it's tempting to just fix it inline — don't. Note it in
  the audit instead. A future round will handle fixes once Jack has reviewed this.

## 5. What happens after this round

The audit becomes the shared reference for both this chat (as it becomes an ongoing prototype
brainstorming partner) and the separate planning conversation Jack also uses. Report back a summary
of what the audit found (high-level — the full detail will already be in the file itself) once it's
written.
