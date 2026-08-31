# Amber-resolution case summary — screen spec + worked examples (Farmer tree, Path A)

This is the screen shown to the bank's V-CIP agent (and available to any later human
reviewer) when a case closes — live, at the end of the call. It is not a separate
report generated afterward; it's the artifact the in-flow resolution produces. Spec
below, then all four locked Path A personas worked through it as concrete examples.

## Screen zones, top to bottom

**1. Header** — persona name, case reference, timestamp closed.

**2. Final Outcome badge** — large, color-coded. One of:
- `GREEN — Cleared`
- `RED — Hard Stop`
- `AMBER — Routed to Human Review` (pending-verification flavor)
- `AMBER — Explanation Logged` (explanation-logged flavor)

**3. Narrative summary** — one short paragraph, plain language, explaining why this
outcome was reached, referencing the specific answers given. Written the way you'd
explain the case to someone who wasn't on the call — not a rule-ID dump.

**4. Structured fields** — shape depends on which kind of Amber this is. Omitted
entirely for Green/Red; never shown blank.
- **Pending-verification Amber** (something still needs to happen): *Reason for
  referral*, *Documents required*, *Expertise required*.
- **Explanation-logged Amber** (nothing pending, case proceeds): *Explanation
  logged: [category]*.

**5. Question-by-question trail** — collapsed by default, expandable. Every question
asked, the transcript ("Applicant said: …"), and the bucket confirmed for it. The
audit trail for a downstream analyst or a second agent picking the case up later.

---

## Example 1 — Ramesh Yadav

### 1. Header
**Ramesh Yadav** · Case ref: `FARM-PATHA-DEMO-001` · Closed: [call end timestamp]

### 2. Final Outcome
**GREEN — Cleared**

### 3. Narrative summary
Ramesh declared four irrigated acres of wheat, which plausibly supports his declared
income of ₹1,60,000 a year — comfortably inside the expected range for that crop and
acreage, not just barely inside it. He described a normal farming year with no
complications, sells through the local FPO rather than an informal-only channel, and
does not own farm equipment himself — he rents from a neighbour when needed, which
requires no further verification. Nothing about his case needs a second look.

### 4. Structured fields
*(none — Green cases carry no structured fields)*

### 5. Question-by-question trail

| Question | Applicant said | Bucket confirmed |
|---|---|---|
| To help us understand your income better, could you tell me what you grow, and whether you own the land you farm? | "I grow wheat. It's my own land, about four acres." | Food grain + Own it |
| How much land do you farm, roughly? | "About four acres." | 2–5 acres |
| Is your land irrigated, or does it depend on rainfall? | "It's fully irrigated, we have a tube well." | Irrigated |
| *(silent check: income arithmetic — 4ac × ₹25,000–60,000 = ₹1,00,000–2,40,000 plausible; declared ₹1,60,000 falls inside)* | — | Passed |
| Would you say this past year was normal for your farming, or better or worse than usual? | "Pretty normal, no major problems." | Normal |
| Where do you usually sell what you grow? | "I sell to the local FPO, they collect directly from farmers here." | FPO or cooperative |
| Do you own a tractor or any other farm equipment? | "No, I rent one from a neighbour when I need it." | Rents when needed |

---

## Example 2 — Meena Devi

### 1. Header
**Meena Devi** · Case ref: `FARM-PATHA-DEMO-002` · Closed: [call end timestamp]

### 2. Final Outcome
**AMBER — Routed to Human Review**

### 3. Narrative summary
Meena's declared income of ₹6,00,000 a year from four irrigated acres of grapes is
well within the expected range for that crop and acreage — the income arithmetic
itself is clean, the same as Ramesh Yadav's. Two separate, unrelated items are still
open, though: she sells through an informal trader rather than an organized channel,
which is worth a second look given the size of the holding, and she has claimed
tractor ownership that cannot be confirmed live on this call. Neither item on its own
would necessarily hold the case open for long, but both are open at the same time,
so this case is routed for a closer look rather than cleared outright.

### 4. Structured fields (pending-verification Amber)
- **Reason for referral:** Two independent open items — (1) large horticulture
  holding sold only through an informal trader, worth a second look; (2) equipment
  ownership claimed but not yet confirmed.
- **Documents required:** None from the applicant directly — vehicle registration
  check runs against the government registry (VAHAN) on the declared owner's name.
- **Expertise required:** Standard risk review — no specialist escalation needed;
  both items resolve from data already available to the review team.

### 5. Question-by-question trail

| Question | Applicant said | Bucket confirmed |
|---|---|---|
| To help us understand your income better, could you tell me what you grow, and whether you own the land you farm? | "I grow grapes. It's my own land, about four acres." | Horticulture + Own it |
| How much land do you farm, roughly? | "About four acres." | 2–5 acres |
| Is your land irrigated, or does it depend on rainfall? | "Fully irrigated, drip irrigation." | Irrigated |
| *(silent check: income arithmetic — 4ac × ₹80,000–450,000 = ₹3,20,000–18,00,000 plausible; declared ₹6,00,000 falls inside)* | — | Passed |
| Would you say this past year was normal for your farming, or better or worse than usual? | "Normal, a decent harvest." | Normal |
| Where do you usually sell your grapes? | "A local trader comes and collects it from the village." | A trader collects from the village → **flag 1 logged:** large holding, informal-only channel |
| Do you own a tractor or any other farm equipment? | "Yes, I have my own tractor." | Yes, owns → **flag 2 logged:** ownership claimed, registry verification pending |

---

## Example 3 — Bhagwan Singh

### 1. Header
**Bhagwan Singh** · Case ref: `FARM-PATHA-DEMO-003` · Closed: [call end timestamp]

### 2. Final Outcome
**AMBER — Explanation Logged**

### 3. Narrative summary
The applicant's declared income was roughly three times what three rain-fed acres of
cotton would typically produce on their own. When asked directly, he gave a
specific, real answer: his son works in Pune and sends money home every month. That
kind of household remittance is a common and legitimate reason farming income alone
would understate the household total, so the case proceeds — the gap is explained
and logged, not treated as unresolved.

### 4. Structured fields (explanation-logged Amber)
- **Explanation logged:** Household income includes remittance from a family member
  working elsewhere (son, Pune) — farming income alone does not reconcile with the
  declared figure, but the additional source accounts for the gap.

### 5. Question-by-question trail

| Question | Applicant said | Bucket confirmed |
|---|---|---|
| To help us understand your income better, could you tell me what you grow, and whether you own the land you farm? | "I grow cotton. It's my own land, about three acres." | Cash crop + Own it |
| How much land do you farm, roughly? | "About three acres." | 2–5 acres |
| Is your land irrigated, or does it depend on rainfall? | "It depends on rainfall, we don't have irrigation." | Rain-fed |
| *(silent check: income arithmetic — 3ac × ₹12,000–35,000 = ₹36,000–1,05,000 plausible; declared ₹3,50,000 falls well outside, on the high side)* | — | Failed → routed to year_recheck |
| Was last year normal for your farming, or was it better or worse than usual — drought, flood, pest? | "No, it was a normal year." | Normal *(no-op — softening only ever helps a too-low reading, and this mismatch is too-high)* |
| That figure looks higher than we'd expect for three acres of rain-fed cotton. Just to understand the full picture — does anyone in your household have another job, a pension, remittance from family working elsewhere, any government scheme payment, or rental income? | "Yes, my son works in Pune and sends money home every month." | Family member elsewhere (remittance) |

---

## Example 4 — Dilip Chaudhary

### 1. Header
**Dilip Chaudhary** · Case ref: `FARM-PATHA-DEMO-004` · Closed: [call end timestamp]

### 2. Final Outcome
**RED — Hard Stop**

### 3. Narrative summary
The applicant's declared income of ₹12,00,000 a year is roughly 3.75 times what two
irrigated acres of sugarcane would typically produce — a large, unambiguous gap.
Given the same fair opportunity as any applicant in this position to name another
household income source, he stated plainly that all of it comes from his farming and
there is nothing else. With no explanation offered for a real, substantial mismatch,
the case does not clear.

### 4. Structured fields
*(none — Red cases carry no structured fields; the case does not proceed)*

### 5. Question-by-question trail

| Question | Applicant said | Bucket confirmed |
|---|---|---|
| To help us understand your income better, could you tell me what you grow, and whether you own the land you farm? | "I grow sugarcane. It's my own land, about two acres." | Cash crop + Own it |
| How much land do you farm, roughly? | "About two acres." | Under 2 / 2–5 acres |
| Is your land irrigated, or does it depend on rainfall? | "Fully irrigated, sugarcane needs it." | Irrigated |
| *(silent check: income arithmetic — sugarcane-specific range, 2ac × ₹80,000–160,000 = ₹1,60,000–3,20,000 plausible; declared ₹12,00,000 is ~3.75x the top of the band)* | — | Failed → routed to year_recheck |
| Was last year normal for your farming, or was it better or worse than usual — drought, flood, pest? | "It was a fine year, nothing unusual." | Normal *(no-op, same reason as Bhagwan Singh)* |
| That figure looks considerably higher than we'd expect for two acres of sugarcane. Just to understand the full picture — does anyone in your household have another job, a pension, remittance from family working elsewhere, any government scheme payment, or rental income? | "No, that's all from my farming. There's nothing else." | No, that is my farming income alone |

---

## Notes for whoever builds this screen

- Zone 4's two Amber shapes are mutually exclusive per case — a case is either
  pending something or it isn't; never show both field sets, and never show an empty
  pending-verification field (e.g. "Documents required: None" is fine and expected,
  a blank field is not).
- Zone 5 should default collapsed on the agent's own screen (they were on the call,
  they don't need to re-read it), but should default *expanded* for a second
  reviewer opening the case cold.
- The narrative in zone 3 should be generated from the same structured data that
  populates zone 5, not written independently — keeps the two zones from ever
  silently disagreeing with each other as the tree evolves.
- Case reference format above (`FARM-PATHA-DEMO-00N`) is a placeholder — swap for
  whatever the real case-ID scheme ends up being.
