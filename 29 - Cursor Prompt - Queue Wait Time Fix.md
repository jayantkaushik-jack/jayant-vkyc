# Cursor Prompt — Admin: Queue "Waiting Since" Fix (Virtual Demo Clock)

> One fix in the Customer Queue tabs. Root cause: join times are seeded at 14:00–14:05 but "Waiting Since" is computed against the real current time, producing absurd values (e.g., 219 min) whenever the page is viewed later in the day. Fix with a virtual clock; keep the derived-wait consistency rule intact.

---

## Fix

1. **Virtual demo clock**: introduce a `demoNow` in the queue view — anchored to **14:05:00 today at page load** and ticking forward in real seconds from there. All queue timestamps and wait computations use `demoNow`, not the wall clock
2. Join times stay seeded within **14:00:00–14:04:45**. `Waiting Since = demoNow − joinTime` → initial waits land between 15s and 5min, ticking upward, and the earliest-join-longest-wait ordering holds automatically
3. **Cap at 5 minutes with queue churn**: when any waiting customer's wait would exceed **5:00**, simulate them being picked up — remove them from Waiting (they move to Live with a just-started In Call Time) and append a new waiting customer at the bottom with `joinTime = demoNow` (wait starts at 0:00 and a fresh name/App ID from the generator). The queue stays alive and no wait ever exceeds 5:00
4. Apply the same virtual clock to the **Live** tab's Start Time / In Call Time (calls started 14:00–14:05, durations ticking, rotating out to completion around the ~3-min average call length) and the **Scheduled** tab (scheduled times 14:00–14:05 relative to the same clock)
5. Tab counts (`Waiting (6)` etc.) update as customers churn

## Acceptance

1. Open the Customers page at any real-world time: every Waiting Since is between 0:00 and 5:00, ticking, ordered consistently with Join Time
2. Watch for 2–3 minutes: customers exceeding 5:00 disappear from Waiting, appear in Live, and fresh customers join the bottom; counts stay coherent
3. Live tab durations behave the same way against the virtual clock; no timestamp anywhere implies hours of waiting
4. `npm run build` clean; nothing else touched
