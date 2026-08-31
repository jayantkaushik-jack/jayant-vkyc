# Cursor Prompt — Admin: "Configuration" Page Rebuild (Queues, Negative Lists, Auto Answer, Thresholds)

> Renames Configure → Configuration and rebuilds the page around queue management (modeled on the reference ops dashboard's Configuration tab), plus new config sections. This introduces queues into the shared data model with ripple effects into Home. Read touched files first; keep existing skill-routing matrix content.

---

## 1. Rename

Sidebar + title: **"Configuration"** (route rename/redirect consistently).

## 2. Page structure (top to bottom)

1. **Queue Management** (new — the main feature)
2. **Routing Rules** (existing skill matrix + new Auto Answer)
3. **Negative Lists** (new)
4. **Thresholds** (new)
5. **Scoring** (existing read-only EFFICIENCY_CONFIG card)

## 3. Queue Management

**Data model** (`@vkyc/shared`): `Queue { id, name, partnerIds[], agentIds[] }`. Seed 4 queues: `Q1 "Paisabazaar Queue" [Paisabazaar]`, `Q2 "Credilio Queue" [Credilio]`, `Q3 "Niyo + ZET Queue" [Niyo, ZET]` (shared queue), `Q4 "Direct Queue" [GENERAL]`. Every partner belongs to exactly one queue; a queue can hold multiple partners. Agents are assigned to **one or more queues** (~90% one queue, ~10% two). **Agent→partner allocation now derives from queue membership** (`getAgentRoster` computes partners via queues; the Allocation card's `Shared` badge = agent serves >1 partner, via a multi-partner queue or multiple queues).

**UI** (modeled on the reference):
- Header: "Queue Configurations" + "N Active Queues" + primary **Add New Queue** button
- Queue cards: name + ID, "Partners: Niyo, ZET", "Agents Assigned: 20", edit (pencil) + delete (trash, with confirm; deleting unassigns its agents)
- **Create/Edit Queue modal**: Queue Name input · Partner checkboxes (a partner already in another queue shows its current queue and moves if checked) · Agent multi-select (searchable checkbox list; agents already in other queues show a "also in Q1" hint — multi-queue is allowed) · Save
- Info note under the header: **"Agents assigned to multiple queues receive calls on a round-robin basis across their queues, subject to availability."** (demo behavior statement; no live routing engine to build)
- **Ripple**: Home's Queue Monitor card now lists these actual queues (name, partners, depth, wait, imbalance) instead of raw partners; Call Breakdown stays partner-based

## 4. Auto Answer (in Routing Rules)

Toggle: **"Auto Answer"** — help text: "When enabled, calls routed to an online agent connect automatically without requiring the agent to accept." Default OFF. Store in the shared config state. Note in code + a small ⓘ: in this demo the agent app ships with its own default; live propagation between the deployed apps is out of scope. Optional per-agent override field appears in Edit Agent wizard step 2 (`Auto Answer: Inherit / On / Off`, cosmetic).

## 5. Negative Lists

Card "Negative Location Lists" — two managed lists, same pattern each:
- **Blocked States**: chip input with autocomplete from Indian states; seeded: `Jammu & Kashmir` (example); add/remove chips
- **Blocked PIN Codes**: tag input accepting 6-digit PINs (validate format); supports ranges typed as `mmmnnn-mmmnnn`; seeded with 2 examples
- Help text: "Customers whose live location resolves to a blocked state or PIN code are restricted before agent connection (CUSTOMER_RESTRICTED)." Save → toast. Cosmetic beyond that — but add one seeded system-blocked case note in the R&F "system" bucket if trivial

## 6. Thresholds

Card "Agent Time Thresholds" with two controls (slider + numeric input):
- **Max total break time / day**: default 60 min (range 30–120)
- **Min total online time / day**: default 7.5 h (range 6–9)
Help text: breaching agents get flagged. **Wire the flags**: Productivity roster and agent-detail attendance mark days breaching either threshold (red text/icon on the value); thresholds read live from this config state

## Acceptance

1. Sidebar reads "Configuration"; five sections render in order; skill matrix + Scoring intact
2. Queues: 4 seeded cards with correct partners/counts; create/edit/delete works; partner exclusivity enforced with the move behavior; agent multi-queue allowed with hint; round-robin note visible
3. Allocation card, Availability panels, and Partner Analytics "Agents Allocated" all reflect queue-derived partner allocation (consistent with `getAgentRoster`); Home Queue Monitor shows the 4 queues
4. Auto Answer toggle + per-agent override render and persist in session; default OFF
5. Negative lists validate input and persist chips in session
6. Threshold changes immediately re-flag breaching days in Productivity (test: lower break max to 30 → more red flags)
7. `npm run build` clean for both apps; agent app behavior unchanged
