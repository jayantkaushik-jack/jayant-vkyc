# Cursor Prompt — Partner App: Fix Report Scoping Leak (Day-wise Calls Report)

> Scoping bug: in the partner app, the "Partner Day-wise Calls Report" generates rows for **all** partners. In the partner app every report must be hard-scoped to the logged-in partner. Fix at the scope layer, then audit all partner-app reports for the same leak.

---

## Fix

1. **Root cause**: the report-generation path calls the report selector without injecting the partner scope (the selector's partner parameter defaults to all). In the partner app, report generation must route through `usePartnerScope()` exactly like page queries — the partnerId is forced, not optional. Make the scope injection structural: the partner app's report service wraps every report selector call and always passes the session's partnerId; individual report types cannot omit it
2. **Audit all partner-app report types** for the same leak — Standard MIS, V-KYC Partner Summary, Customer Issues — in all three outputs: the **live row-count preview** in the filters modal, the **preview table**, and the **CSV**. All three must agree and contain only the partner's rows
3. **History entries** created before the fix (session state) may contain unscoped data — regenerate on preview if params lack the scope, or simply note that stale entries clear on reload (acceptable)
4. Verify the admin app's reports are unaffected (its partner filter stays user-selectable)

## Acceptance

1. Partner app as Paisabazaar: generate Day-wise Calls for 7D → every row is Paisabazaar-only (spot-check: totals match the partner Dashboard's numbers for the same days); row-count preview = preview table rows = CSV rows
2. Same generation as ZET login → ZET-only rows
3. MIS / Partner Summary / Issues reports pass the same check (one spot-check each)
4. Admin reports unchanged (partner filter works, All = all partners)
5. Grep: no report selector call in `apps/partner` without the scope wrapper
6. All apps build clean
