# Cursor Prompt — Agent Analytics: New Metrics + Composite Efficiency Score

> Adds three metrics and replaces the efficiency definition. Touches the data layer, selectors, and the Analytics page. Minimal diffs elsewhere; keep Accuracy exactly as is.

---

## 1. Data layer additions (`src/data/`)

Extend the call generator so every historical call record supports the new metrics:

- `routedAt` / `answeredAt` timestamps, and `answered: boolean` — ~4–8% of routed calls per agent are unanswered (rerouted after the 2-minute cap). Unanswered calls have no duration/decision
- `agentWaitSec`: seconds from routing-to-this-agent until answer, `5–115` for answered calls (never ≥120 — at 120 the call reroutes)
- `reviewTimeSec` already exists — verify it represents time from call end until the decision (approve/reject/unable) was submitted, range ~20–180s

Add config constants in `src/lib/constants.ts` (single source, used by selectors and tooltips):

```ts
export const EFFICIENCY_CONFIG = {
  rerouteCapSec: 120,
  callTimeBandSec: { min: 300, max: 480 },   // 5–8 min target band
  callTimeZeroSec: { below: 120, above: 900 }, // 0-score points: 2 min under / 15 min over
  reviewFloorSec: 30,
  reviewZeroSec: 180,
  onlineTargetHrs: 7.5,
  weights: { answer: 0.30, wait: 0.15, callTime: 0.15, review: 0.15, online: 0.25 },
};
```

## 2. New metric selectors (`src/data/selectors.ts`)

- **Call Drop Rate** = unanswered routed calls ÷ total routed calls × 100 (per agent, per date range)
- **Avg Wait Time** = mean `agentWaitSec` over answered calls (routing→answer; show as seconds)
- **Avg Review Time** = mean `reviewTimeSec` over decided calls

## 3. Composite Efficiency score (replaces calls-per-hour)

`getEfficiencyScore(agentId, range)` returning `{ score, components }`, all components 0–100 clamped:

- `S_answer = 100 − callDropRate`
- `S_wait = 100 × (1 − avgWaitSec / 120)`
- `S_callTime`: 100 if avgCallSec within [300, 480]; linear decay to 0 at 120s below-band and 900s above-band
- `S_review = 100 × (1 − (avgReviewSec − 30) / 150)`
- `S_online = 100 × min(1, avgDailyOnlineHrs / 7.5)` (from attendance data)
- `score = 0.30·S_answer + 0.15·S_wait + 0.15·S_callTime + 0.15·S_review + 0.25·S_online`, rounded to 1 decimal

All thresholds/weights read from `EFFICIENCY_CONFIG` — no magic numbers in the selector.

## 4. Analytics page (`PerformancePage.tsx`)

- **Efficiency hero card** now shows the composite score `NN.N / 100` with a band label + color: ≥85 `Excellent` (green), 70–84 `Good` (amber), <70 `Needs attention` (red). Update the ⓘ tooltip: "Weighted score: Answer rate 30%, Online time 25%, Wait 15%, Call time 15%, Review 15%"
- Add a **breakdown popover/expand** on the hero card: five rows, each with component name, its raw value (e.g., "Call Drop Rate 5.2%"), its 0–100 score, and weight — so the number is explainable to SBM
- Efficiency trend sparkline/chart recomputes from the composite per day
- **Detailed Metrics subsection**: add three new `StatCard`s — `Call Drop Rate` (%, red-tinted if >8%), `Avg Wait Time` (s), `Avg Review Time` (s) — each with ⓘ tooltips:
  - Call Drop Rate: "% of calls routed to you that went unanswered and were rerouted after 2 minutes"
  - Avg Wait Time: "Average time a customer waited after being routed to you before you answered"
  - Avg Review Time: "Average time from ending the call to submitting your decision"
- Agent Home's headline cards stay as they are (no new cards there), but if Home shows an efficiency value anywhere, it must be the composite score

## 5. Consistency

- The admin dashboard's data layer sees the same selectors (it will use them later — no admin UI work in this prompt)
- Remove the old calls-per-hour efficiency selector and its "Target: 6/hr" copy everywhere it appears; `grep -ri "6/hr\|calls/hr" src/` must return nothing

## Acceptance

1. Analytics shows Efficiency as `NN.N/100` with band color, tooltip, and a 5-row breakdown matching the config weights; changing a weight in `EFFICIENCY_CONFIG` visibly changes the score
2. Call Drop Rate, Avg Wait Time, Avg Review Time appear in Detailed Metrics with correct ranges (drop 4–8%, wait <120s, review 20–180s) and respond to date-range filters
3. Component scores are 0–100 clamped; no NaN when an agent has no calls in range (score shows `—`)
4. Old efficiency definition fully gone; `npm run build` clean
