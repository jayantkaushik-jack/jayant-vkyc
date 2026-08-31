# Cursor Prompt — Admin Home: Agent Allocation Card Changes

> Five changes to the Agent Allocation card only. Minimal diffs; data change (item 4) lives in the shared generator.

---

## 1. Card expanded by default
The Allocation card itself opens **expanded**, showing the list of partner group rows. (The individual partner groups stay collapsed by default — see 2.)

## 2. Collapsed partner rows show counts
Each collapsed partner group header shows, right-aligned alongside the partner name:
`18 agents · 16 dedicated · 2 shared`
(counts computed from the roster selector for that partner). Keep the expand chevron.

## 3. Column headers only when a group is expanded
The table header row (`Agent | Partner(s) | Allocation`) must not render while all groups are collapsed. Render it **inside each expanded group** (above that group's agent rows) — or once at the top only when at least one group is expanded; pick the cleaner implementation, but a fully-collapsed card shows only partner header rows, nothing else.

## 4. Shared agents span exactly 2 partners
In the data generator: shared agents (the ~10%) get **exactly 2 partners** — never 3. Verify the tooltip on `Shared` badges lists exactly one other partner.

## 5. Remove the duplicate summary footer
Delete the bottom section of the card that repeats the per-partner dedicated/shared summary ("12 dedicated · 8 shared" footer lines and any "Unassigned" recap if it duplicates a group). The group headers (item 2) now carry that information. If unassigned agents exist, they remain as a normal collapsible group, not a footer.

## Acceptance
1. Fresh load: card open, five partner rows visible, each showing `N agents · N dedicated · N shared`, no table headers anywhere
2. Expanding one group reveals headers + agent rows for that group only; collapsing hides them again
3. Every `Shared` badge tooltip names exactly one other partner; roster data shows no agent with 3+ partners
4. No summary footer remains; total of group counts = 67 agents (shared agents counted under both their partners)
5. `npm run build` clean; no other Home sections touched
