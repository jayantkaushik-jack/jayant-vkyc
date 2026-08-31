# Cursor Prompt — Admin: Customers Page Changes (Queue Tabs + Call History)

> Changes to the admin Customers page. Minimal diffs; agent app untouched. The Activity Log event catalog is embedded below — implement it exactly.

---

## A. Customer Queue → Waiting tab

1. Remove the language tag next to customer names
2. Remove the **Agent Availability** column
3. Remove the **Type** column
4. **Waiting Since**: evenly distributed values between **15s and 5min** across rows (live-ticking from those seeds)
5. All **Join Time** timestamps between **14:00 and 14:05** today

## B. Customer Queue → Live tab

1. Remove the language tag and the **Agent Availability** and **Type** columns
2. Rename column **Join Time → Start Time**; timestamps between **14:00 and 14:05** today
3. Rename **Waiting Since → In Call Time** (live-ticking call durations)

## C. Customer Queue → Scheduled tab

1. Remove the **Agent Availability** and **Type** columns
2. **Waiting Since**: evenly distributed between **15s and 2min**
3. Timestamps between **14:00 and 14:05** today
4. Add column **Scheduled Time** (upcoming slots today, e.g., 14:30, 15:00, 15:30)

## D. Call History

1. **Remove the `Direct (Live)` / `Assigned` segregation entirely**: delete the sub-tabs (`All / Direct (Live) / Assigned`) and any origination-type filter tied to them — Call History is a single flat list. Keep the **Call No.** concept in the data and in the Activity Log modal (attempt number per application; reattempts log under Call 2)
2. **Action bar**: remove `Send Weblink` and `Book a Slot`. Remaining five CTAs — `View Details · Activity Log · View Video · View Report · Report Issue` — evenly spaced and **centered** in the expanded row (flex row, `justify-center` with consistent `gap`, icons + labels aligned)
3. **View Details modal** — rebuild to mirror the reference layout (screenshot in project folder) and show **all data received via the Create User API**:
   - Header: title "Customer Details", top-right edit/delete icons (non-functional, cosmetic) + close. Sub-header row: `Application Type: INDIVIDUAL | Customer ID: SBM_CRL_6_XXXXXXX_XXXX | Application ID: SBM_CRL_XXXXXXX_XXXX`
   - Two side-by-side panels:
     - **Personal Details** (blue section title): Full Name, Date of Birth, Gender, Mobile Number, Email Address, Current Address, Permanent Address, Customer Status (NTB/ETB), Product Type
     - **As per Aadhaar** (blue section title): Full Name, Date of Birth, Gender, Address
   - Below, collapsed accordions for the remaining Create User API objects: **PAN Details** (name fields, printed name, father's name, PAN no, DOB, source, verified), **Income & Employment** (type, occupation, organization, annual income, monthly income), **Account** (branch, account status, account number), **Call Allocation** (applicant priority, redirect link)
   - Keep the existing Application Timeline as a final collapsed accordion at the bottom (don't delete it)
   - Extend the customer mock model with any of these fields it lacks (income, account, allocation) — realistic values
4. **Activity Log modal**: continuous **scroll** (max-height, sticky header row) — remove pagination. Populate each call's log from the exact event catalog below (section E): correct actors, action strings, sections, and plausible inter-event gaps; App IDs interpolated per customer. Events with dynamic values (lat/long, App ID) use that call's actual data
5. **View Report modal**: remove the `Recording` tab and the "Call Report" header text — clicking View Report opens the report content directly (shared `KycReport` + auditor block as-is). `View Video` CTA stays and keeps opening the player modal
6. **Fix search**: debug the Call History search — likely causes: search state not wired into the filtered dataset, or matching only one field. Requirement: case-insensitive substring match across **Customer Name, App ID, Agent Name, Auditor Name**, composing with the remaining filters; results update as you type; clearing restores the list. Add a "No results for '<query>'" empty state

## E. Activity Log event catalog (verbatim — also saved as "Reference - Karza Activity Log Events.md" in the project folder)

Sequence per successful call; actors: System (`-`), Customer (name `-`), Agent (named). Times are offsets from the call's own start:

| Actor | Action | Section |
|---|---|---|
| System | Customer was Added | — |
| Customer | Customer clicked on link | Customer |
| Customer | Customer landed on Terms and Conditions screen | Connecting Agent |
| Customer | Customer accepted Terms and Conditions | Connecting Agent |
| Customer | Customer landed on Instructions screen | Connecting Agent |
| Customer | Customer landed on Permissions screen | Connecting Agent |
| Customer | Customer granted pre-requisite permissions | Connecting Agent |
| Customer | Customer is ready to start call with agent | Connecting Agent |
| Customer | Customer is waiting for agent to initiate call | Connecting Agent |
| Agent | agentAssigned | Agent Dashboard |
| Agent | Location captured with latitude - <lat> and longitude - <lng> | Landing Page |
| Agent | Customer IP status - SAFE IP Address \| VPN and Proxy Not Detected \| Inside India | Landing Page |
| Agent | Initiated call with the customer App ID <appId> | Landing Page |
| Agent | Viewed customer location | Left icon tray |
| Agent | Verified call instructions | Call Pre-requisite |
| Agent | Asked First Question | Check Liveliness |
| Agent | Reported Answer as Correct | Check Liveliness |
| Agent | Asked Second Question | Check Liveliness |
| Agent | Reported Answer as Correct | Check Liveliness |
| Agent | Asked Third Question | Check Liveliness |
| Agent | Reported Answer as Correct | Check Liveliness |
| Agent | Verified Live Location | Check Location |
| Agent | Captured Face | Capture Face |
| Agent | Captured Face Confirmed | Capture Face |
| Agent | Verified Captured Face | Capture Face |
| Agent | Reported face match with Aadhaar | Aadhaar Offline KYC |
| Agent | Verified Aadhaar Offline KYC Report | Aadhaar Offline KYC |
| Agent | Captured PAN Card | Capture PAN |
| Agent | Captured PAN Card Confirmed | Capture PAN |
| Agent | Reported face match with PAN card | Capture PAN |
| Agent | Confirmed PAN OCR output | Capture PAN |
| Agent | Verified PAN Capture Report | Capture PAN |
| Agent | Captured Sign | Capture Sign |
| Agent | Ended call with customer App ID <appId> | Session |
| Agent | Approved KYC for customer App ID <appId> | KYC Report |
| Agent | Initiated client data push | Data Saved |

For rejected/unable calls, truncate the sequence at the failure point and replace the final three rows accordingly (e.g., "Rejected KYC for customer App ID <appId>"). Rows render **descending** (latest first), like the reference.

## Acceptance

1. Three queue tabs match specs A–C exactly (columns, renames, time windows, distributions, Scheduled Time column)
2. Call History: single flat list (no Direct/Assigned sub-tabs anywhere); five centered CTAs; Call No. still visible in the Activity Log
3. View Details shows the two-panel layout + all four accordions + timeline; every Create User API object represented with data
4. Activity Log scrolls (no pagination) and replays the full catalog in order with correct actors/sections and per-call dynamic values
5. View Report opens the report directly (no tabs, no header text); View Video still works
6. Search matches name/App ID/agent/auditor case-insensitively across tabs, live as-you-type, with empty state
7. `npm run build` clean; agent app untouched
