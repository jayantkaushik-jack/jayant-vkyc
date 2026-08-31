# Cursor Prompt — Data Fix: Product Types Must Match the Customer's Partner

> Root-cause data fix in the shared generator. Symptom: the partner app (logged in as Paisabazaar) shows Call History rows with product types from every partner (CRL_*, ZET_*, SMT_*). Cause: `productType` is assigned independently of the customer's partner. Fix the generator; no UI-level filtering patches.

---

## Fix

1. **Per-partner product catalogs** in the shared data: each partner gets its own product types with its own prefix —
   - Paisabazaar → `PBZ_*` (e.g., `PBZ_SC_CC`, `PBZ_PL_FD`)
   - Credilio → `CRL_*` (e.g., `CRL_SC_FD`, `CRL_KC_RS`)
   - Niyo → `NYO_*` (e.g., `NYO_SC_TX`, `NYO_GL_CC`)
   - ZET → `ZET_*` (e.g., `ZET_SC_FD`, `ZET_KC_RS`)
   - GENERAL → `SMT_*` (e.g., `SMT_CIP`, `SMT_SA_FD`)
2. The customer generator assigns `productType` **only from the customer's own partner's catalog**
3. **Audit App ID prefixes for the same consistency**: `SBM_<PARTNERCODE>_<digits>` must use the partner's code (`PBZ / CRL / NYO / ZET / SMT`) matching the customer's partner — fix any mismatch with the same mapping
4. Sweep for hardcoded product-type strings in UI/filters/reports (e.g., Product filter dropdowns, report columns, Customer Details chips) — they must list values from the catalogs, not literals
5. This is a reseed: verify nothing downstream breaks (Product filters in Call History/Reports now show partner-consistent options; admin views show all catalogs; partner app shows only its own)

## Acceptance

1. Partner app as Paisabazaar: every product type anywhere (Call History, queue rows, Customer Details, reports, CSVs) starts with `PBZ_`; App IDs read `SBM_PBZ_*`
2. Same check for one other partner (ZET)
3. Admin app: Product filter lists all five catalogs; every customer's productType prefix matches their partner column
4. No hardcoded product literals remain outside the catalog definition (`grep "CRL_SC_FD"` hits only the catalog/seed)
5. All apps build clean
