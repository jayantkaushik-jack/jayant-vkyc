# Reference — Karza Activity Log Events (verbatim from SBM video screenshots)

Complete event sequence for one successful VKYC call (App ID `SBM_CRL_5536362_9779`, agent Naved Sayyad, 08/06/2026). Chronological (ascending). Actors: **System** (shown as `-`), **Customer** (name `-`), **Agent** (named).

| # | Time | Actor (Role) | Action | Section |
|---|---|---|---|---|
| 1 | 15:45:11 | System | Customer was Added | — |
| 2 | 15:45:33 | Customer | Customer clicked on link | Customer |
| 3 | 15:45:34 | Customer | Customer landed on Terms and Conditions screen | Connecting Agent |
| 4 | 15:45:39 | Customer | Customer accepted Terms and Conditions | Connecting Agent |
| 5 | 15:45:39 | Customer | Customer landed on Instructions screen | Connecting Agent |
| 6 | 15:45:41 | Customer | Customer landed on Permissions screen | Connecting Agent |
| 7 | 15:45:53 | Customer | Customer granted pre-requisite permissions | Connecting Agent |
| 8 | 15:45:53 | Customer | Customer is ready to start call with agent | Connecting Agent |
| 9 | 15:45:54 | Customer | Customer is waiting for agent to initiate call | Connecting Agent |
| 10 | 15:45:55 | Agent | agentAssigned | Agent Dashboard |
| 11 | 15:45:56 | Agent | Location captured with latitude - 21.219763 and longitude - 72.860227 | Landing Page |
| 12 | 15:45:56 | Agent | Customer IP status - SAFE IP Address \| VPN and Proxy Not Detected \| Inside India | Landing Page |
| 13 | 15:46:36 | Agent | Initiated call with the customer App ID SBM_CRL_5536362_9779 | Landing Page |
| 14 | 15:47:31 | Agent | Viewed customer location | Left icon tray |
| 15 | 15:47:35 | Agent | Verified call instructions | Call Pre-requisite |
| 16 | 15:48:08 | Agent | Asked First Question | Check Liveliness |
| 17 | 15:48:14 | Agent | Reported Answer as Correct | Check Liveliness |
| 18 | 15:48:15 | Agent | Asked Second Question | Check Liveliness |
| 19 | 15:48:20 | Agent | Reported Answer as Correct | Check Liveliness |
| 20 | 15:48:21 | Agent | Asked Third Question | Check Liveliness |
| 21 | 15:48:31 | Agent | Reported Answer as Correct | Check Liveliness |
| 22 | 15:48:35 | Agent | Verified Live Location | Check Location |
| 23 | 15:48:35 | Agent | Captured Face | Capture Face |
| 24 | 15:48:38 | Agent | Captured Face Confirmed | Capture Face |
| 25 | 15:48:40 | Agent | Verified Captured Face | Capture Face |
| 26 | 15:48:42 | Agent | Reported face match with Aadhaar | Aadhaar Offline KYC |
| 27 | 15:48:46 | Agent | Verified Aadhaar Offline KYC Report | Aadhaar Offline KYC |
| 28 | 15:49:03 | Agent | Captured PAN Card | Capture PAN |
| 29 | 15:49:05 | Agent | Captured PAN Card Confirmed | Capture PAN |
| 30 | 15:49:08 | Agent | Reported face match with PAN card | Capture PAN |
| 31 | 15:49:12 | Agent | Confirmed PAN OCR output | Capture PAN |
| 32 | 15:49:20 | Agent | Verified PAN Capture Report | Capture PAN |
| 33 | 15:49:46 | Agent | Captured Sign | Capture Sign |
| 34 | 15:50:15 | Agent | Ended call with customer App ID SBM_CRL_5536362_9779 | Session |
| 35 | 15:50:23 | Agent | Approved KYC for customer App ID SBM_CRL_5536362_9779 | KYC Report |
| 36 | 15:50:23 | Agent | Initiated client data push | Data Saved |

Notes:
- Rows 23–24 timestamps partially illegible in source (`15:48:x5`); interpolated between adjacent events
- "Call No." column = call attempt number for the application (all `Call 1` here); a reattempt logs under `Call 2`
- Section values observed: Customer, Connecting Agent, Agent Dashboard, Landing Page, Left icon tray, Call Pre-requisite, Check Liveliness, Check Location, Capture Face, Aadhaar Offline KYC, Capture PAN, Capture Sign, Session, KYC Report, Data Saved
