/**
 * Static, slowly-illustrative aggregate — not a request to generate 10,000
 * real case records. Deliberately decoupled from however many actual
 * clickable cases exist in SAMPLE_QUEUE_ROWS (features/agent/call/amber/personas.ts);
 * a single source so this never needs hand-editing in more than one place.
 *
 * Round 30: moved here from QueuePage.tsx so AgentHomePage's offline empty
 * state (handoff §8.3 — "Bind this to the real amber count if one is
 * available") can read the same number instead of a second hardcoded literal.
 * Still not a real computed value — the handoff's own instruction was to bind
 * to a real source *if one is available*; this remains the only "amber count"
 * concept in the codebase, so binding to it is the most real this gets today.
 */
export const FUNNEL_TODAY = { scored: 10_000, green: 8_200, red: 1_400, amber: 400 };
