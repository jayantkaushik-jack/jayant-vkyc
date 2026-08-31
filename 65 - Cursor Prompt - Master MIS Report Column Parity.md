# Cursor Prompt 65 — Master MIS Report: full column parity with the incumbent

Cross-checked our master report against SBM's incumbent (Perfios) master MIS export, column by column (screenshots in "SBM Master Report Screenshots", columns A–CT, ~98 columns). Our `MIS_ALL_COLUMNS` in `packages/shared/src/data/reportGenerators.ts` currently has only **35** columns. Bring it to **full parity**: rebuild `MIS_ALL_COLUMNS` to the exact ordered list below, keep the row values we already populate, and populate the new columns (seed/derive where we don't have real data, consistent with how the file already seeds via `hashId`/`hashRange`). Match the incumbent **header names and order exactly**.

## Target column list (exact order + names — this becomes `MIS_ALL_COLUMNS`)
1. S. No
2. Client ID
3. Customer ID
4. Customer Name
5. Application ID
6. Phone Number
7. Customer Type  *(e.g. INDIVIDUAL)*
8. Customer Status  *(NTB / ETB)*
9. DOB in PAN
10. DOB in Aadhaar
11. DOB in application form
12. Annual Income Details
13. Occupation details
14. Customer Device Country
15. Customer State
16. Customer Pincode
17. Customer City
18. Location Latitude
19. Location Longitude
20. Customer IP Address
21. Customer IP Risk  *(Safe / …)*
22. Customer IP Country
23. IP Latitude
24. IP Longitude
25. IP Address State
26. IP Address City
27. Customer Proxy detected
28. Customer VPN detected
29. Customer Bot detected
30. Customer Tor detected
31. Customer Device OS
32. Customer Browser Name
33. Customer Browser Version
34. Customer Device Type
35. Brand
36. Model  *(column AJ — header was not legible in the capture; values look like "K…". Confirm the exact header against the master sheet; likely device Model. Include it.)*
37. OS Version
38. Journey Type  *(VKYC)*
39. Customer Onboarding Timestamp
40. Customer Onboarding Type  *(direct / partner-assisted)*
41. Transaction ID
42. Session ID
43. Session Number
44. Latest session
45. Call Status
46. Call Type  *(live / scheduled)*
47. Session Start Time
48. Session End Time
49. Call End Time
50. Call Start Time
51. Customer Wait Time
52. Call Duration
53. Last Activity Timestamp
54. Last Activity Description
55. Agent Issue remark
56. Issue Category
57. Issue Description (if applicable)
58. Verification Failure Reason
59. Customer Blocked
60. Agent Status
61. Agent Remarks
62. Agent ID
63. Agent Name
64. Agent Verification Date
65. Agent Rejection Reason
66. Auditor Status
67. Auditor Remarks
68. Auditor Rejection Reason
69. Auditor ID
70. Auditor Name
71. Auditor Verification Date
72. Video available
73. Agent Callback
74. Auditor Callback
75. Product Type  *(e.g. ZET_SC_FD)*
76. Master Id
77. Channel Partner
78. Face Match Score with Aadhaar
79. Face Match Score with PAN
80. Customer Download Speed
81. Customer Upload Speed
82. Agent Download Speed
83. Agent Upload Speed
84. High Call Volume
85. Customer Current Address
86. Customer Permanent Address
87. PAN Name Match Score
88. PAN Father's Name Match Score
89. PAN DOB Match Status
90. Aadhaar Name Match Score
91. Aadhaar Address Match Score with Current Address
92. Aadhaar Address Match Score with Permanent Address
93. Aadhaar DOB Match Status
94. Customer Email in Application Form
95. Customer Aadhaar in Application Form
96. Customer PAN Number in Application Form
97. Live - Current Distance (in KMs)
98. Live - Permanent Distance (in KMs)

*(Keep our extra `CKYC Status` column at the end — it's a legitimate downstream field even though it isn't in these screenshots.)*

## What we already have (map/rename, don't duplicate)
These existing columns map to the target names — rename to the incumbent header and keep the row logic:

- `Customer Email` → **Customer Email in Application Form**
- `Aadhaar (Masked)` → **Customer Aadhaar in Application Form**
- `PAN (Application Form)` → **Customer PAN Number in Application Form**
- `Live↔Current Distance (km)` → **Live - Current Distance (in KMs)**
- `Live↔Permanent Distance (km)` → **Live - Permanent Distance (in KMs)**
- `Aadhaar Address Match Score (Current)` → **Aadhaar Address Match Score with Current Address**
- `Aadhaar Address Match Score (Permanent)` → **Aadhaar Address Match Score with Permanent Address**
- `Annual Income` → **Annual Income Details** · `Occupation` → **Occupation details**
- `State`/`Pincode`/`City` → **Customer State / Customer Pincode / Customer City**
- Keep as-is (already correct names): Transaction ID, Session ID, Session Number, Call Status, Agent ID/Name/Status/Remarks/Verification Date/Rejection Reason, Verification Failure Reason, Auditor Status, Customer Blocked, PAN DOB Match Status, Aadhaar Name Match Score, Aadhaar DOB Match Status, Customer Device Country.

## Fix two mislabeled columns (semantics wrong today)
- **Customer Onboarding Type**: today we set it to "New Customer"/"Existing to Bank (ETB)". That's the *customer status*, not the onboarding channel. Split correctly: **Customer Status** = NTB/ETB (from `customer.customerStatus`), and **Customer Onboarding Type** = the channel (direct / partner-assisted).
- **Call Type**: today we output `'V-CIP'`. The incumbent's Call Type is **live / scheduled**; the V-CIP/VKYC label belongs in the new **Journey Type** column. Set Call Type from whether the session was live or a booked slot, and Journey Type = "VKYC".

## Populating the new columns (guidance)
- Pull real values where the domain model already has them: Customer Name, Application ID (`customer.appId`), Phone Number, Customer Type, DOBs, addresses (current/permanent), Channel Partner (partner name), Product Type, Face Match Scores (`session.faceMatchAadhaar`/`faceMatchPan`), Agent/Auditor identity + verification dates + remarks + rejection reasons, Session/Call start/end times, Call Duration, Customer Wait Time, Issue category/description (from the reason taxonomy), Aadhaar/PAN match scores.
- Seed the device/network/IP telemetry deterministically (as the file already does for other fields): Location Lat/Long, IP Address + IP Lat/Long + IP State/City, IP Risk (Safe), IP Country, Proxy/VPN/Bot/Tor detected (No), Device OS, Browser Name/Version, Device Type, Brand, Model, OS Version, Download/Upload speeds (customer + agent), High Call Volume (Y/N), Video available.
- Client ID / Customer ID / Master Id: derive stable IDs from the existing call/customer ids. Agent Callback / Auditor Callback: seed (Received / Not sent).
- Keep everything consistent per row with the call's existing status/decision logic so a rejected/dropped row shows "—" where the incumbent would.

## Also update the data dictionary
Update `Reference - Report Catalog & Data Dictionary.md` (the Master / Detailed Call Report section) to list the full column set above with one-line descriptions, so the doc matches the report.

## Acceptance criteria
1. `MIS_ALL_COLUMNS` equals the ordered list above (+ CKYC Status), with exact incumbent header names.
2. Every new column is populated per row (real value where available, deterministic seed otherwise); no blank headers.
3. Customer Status vs Customer Onboarding Type, and Call Type vs Journey Type, are semantically correct.
4. The column picker in the Reports page still works against the expanded set; existing report generation/CSV export doesn't break.
5. The data dictionary reference doc reflects the full column list.
