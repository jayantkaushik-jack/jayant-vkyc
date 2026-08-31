# Cursor Prompt — Admin: Users Page — Table Layout + Add Auditor / Add Admin

> Restructures the Users page from card grid to tables and completes the onboarding flows for all three roles. Reuse the existing Add Agent wizard patterns and shared UI. Agent app untouched.

---

## 1. Table layout (all three tabs)

Replace the card grid in each tab (`Agent / Auditor / Admin`) with a table:

- Columns: **ID** (employee ID, monospace) · **Name** (avatar + name) · **Email** · **Edit** (pencil CTA, right-aligned)
- Header above the table: count ("Total Agents: 67") + search (name/ID/email) + the role-appropriate "Add …" button
- Row click (outside the Edit CTA) still opens the profile view where one exists (agents → existing profile page; auditors/admins → a compact profile drawer with their fields)
- Pagination at 25 rows (agents); auditors/admins fit one page
- Data: agents/auditors already have IDs + emails; **add a small seeded set of 5 admins** to the generator (`AD00xx` IDs, name, email, role title, permissions per §3)

## 2. Add Auditor (new, 2-step wizard — assumptions)

Button on the Auditor tab. Steps:

1. **Profile**: Employee ID · Full Name · Photo upload placeholder · Email · Mobile · Reporting Manager (name + ID) · "VCIP Audit Trained" Y/N + training completion date
2. **Audit Scope & Schedule**: Languages (chips — needed to review recordings) · Partner scope (checkboxes, default all) · Product categories · **Daily audit capacity** (target cases/day, default 60) · Work plan (days, office timings) · "Can also take agent calls" Y/N (mirrors the agent wizard's inverse flag)

Done → new auditor appears in the table + roster data (deterministic mock ID if fields left blank). Edit Auditor = same wizard prefilled.

## 3. Add Admin (new, 2-step wizard — assumptions)

Button on the Admin tab. Steps:

1. **Profile**: Employee ID · Full Name · Email · Mobile · Role title (dropdown: `Operations Admin / Quality Lead / Super Admin`)
2. **Access & Permissions**: Access level (`View only` / `Manage`) · Module permissions (checkboxes: Dashboard, Customers, Partner Analytics, Rejection & Failure Reasons, Productivity, Users, Configure, Reports — default all for Super Admin, view-common for others) · Partner scope (All or selected partners)

Done → appears in the Admin table with a permissions summary chip (e.g., "Manage · All modules"). Edit Admin = same wizard prefilled. Permissions are cosmetic in the demo (no actual gating) — but render them in the profile drawer so the governance story is visible.

## 4. Consistency

- New auditors/admins persist in session state (survive navigation, not reload — consistent with how Add Agent behaves)
- Auditor count references elsewhere (Dashboard overview, Productivity auditor table) read from the same roster — adding an auditor increments them

## Acceptance

1. Three tabs render tables with ID/Name/Email/Edit; search works on all three; counts correct
2. Add Agent (existing), Add Auditor, Add Admin all complete and land the new user in the right table; Edit reopens prefilled
3. Auditor added → Dashboard auditor overview + Productivity auditor section counts update
4. Admin rows show permissions summary; profile drawer shows full scope
5. `npm run build` clean; nothing else touched
