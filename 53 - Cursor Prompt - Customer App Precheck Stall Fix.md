# Cursor Prompt — Customer App: Pre-call Checks Stall (Root-Cause Fix)

> The journey hangs on "Pre-call checks" — the first item pulses forever. **Verified root cause (fix exactly this, no workarounds):** an infinite dispatch loop in the journey context resets the precheck timer before it can ever fire. Three compounding defects in `apps/customer`:
>
> 1. `CustomerJourneyContext`: every action function (`setPhase`, `setPrecheckIndex`, `setCameraSimulated`, …) is an inline closure created inside the `useMemo` keyed on `[state, …]` — so **every state change gives every action a new identity**
> 2. Reducer cases return a new state object even when the value is unchanged (e.g., `SET_CAMERA_SIMULATED` with the same value still spreads `{...state}`)
> 3. `JourneyRouter` runs `useEffect(() => setCameraSimulated(simulated), [simulated, setCameraSimulated])` — with (1) and (2), this dispatch → new state → new function identity → effect re-runs → dispatch… an endless loop; each cycle re-arms `PrechecksScreen`'s 500 ms timeout (its deps include the unstable `setPrecheckIndex`/`setPhase`), so it never fires

## Fix (all three layers)

1. **Stabilize action identities**: in `CustomerJourneyContext`, define every action with `useCallback` on `[]` (or `[dispatch]`) — `dispatch` from `useReducer` is stable. Build the context value as `useMemo(() => ({ ...state, ...actions }), [state, actions])` where `actions` itself is memoized once. No action's identity may ever depend on `state` (exception: `restartJourney` may depend on `state.token`)
2. **Reducer no-op bail-outs**: every case that sets a scalar returns `state` unchanged when the incoming value equals the current one (`if (state.cameraSimulated === action.value) return state;` — apply the same pattern to `SET_PERMISSIONS`, `SET_PRECHECK_INDEX`, `SET_PHASE`, `SET_LANGUAGE`, and any similar setter case)
3. **Effect hygiene**:
   - `JourneyRouter`: the camera-sync effect dispatches only when the value differs (`if (simulated !== cameraSimulated) setCameraSimulated(simulated)`) — belt-and-braces on top of (2)
   - `PrechecksScreen`: the timer effect's dependency array becomes `[precheckIndex]` only (the actions are stable after fix 1; remove `setPhase`/`setPrecheckIndex`/`logEvent` from deps)
   - Audit the app for other effects that depend on context action functions and dispatch unconditionally — same treatment

## Acceptance

1. Fresh journey: pre-call checks tick through all five items (~500 ms apart) and advance to the waiting screen — with camera granted, with camera denied (simulated), and in the `?demo=1` variant
2. React DevTools profiler (or a render counter): no continuous re-render loop on any screen at rest
3. Full happy path re-run end to end (landing → completion), plus one failure state and the reconnect simulation — all still work
4. `npm run build` clean; no other apps touched
