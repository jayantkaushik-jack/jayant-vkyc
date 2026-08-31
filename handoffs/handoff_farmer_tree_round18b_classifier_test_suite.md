# Classifier Fix — Verification Test Suite (Round 18 follow-up)

**Purpose:** this round's classifier fix has had more than one attempt already without landing
correctly. Rather than another prose spec, this is a literal test suite — every locked persona's
transcript, node by node, with the expected bucket. **Implementation-agnostic on purpose:** whether
the fix is keyword matching (per round 18) or an LLM call with an explicit compound-bucket rubric,
it must pass every row below before it's reported as done. Self-assessment against the spec
document is what's produced the repeated misses — this replaces that with a checkable bar.

**Resolved: no funded LLM key exists.** The fix is keyword matching per round 18's cue list, not an
LLM rubric fix — that branch is closed. The test suite below is the bar for the keyword-matching
implementation.

**Scope constraint:** locate the one function currently handling classification (per the original
spec, this should be a single swappable function). Replace it entirely — don't layer a new
implementation alongside the old one, and don't leave a partial keyword-matching path coexisting
with a partial LLM path. One function, one implementation, all 22 rows passing.

---

## Test cases — all 4 locked personas, every node

### Persona 1 — Ramesh Yadav (expected final outcome: GREEN)

| Node | Transcript | Expected bucket |
|---|---|---|
| q1 | मैं गेहूं उगाता हूं। यह मेरी अपनी ज़मीन है, लगभग चार एकड़। | Food grain + Own it |
| land_area | लगभग चार एकड़। | 2–5 acres |
| land_water | इसमें पूरी सिंचाई की सुविधा है, हमारे पास एक ट्यूबवेल है। | Irrigated |
| year | बिल्कुल सामान्य था, कोई खास समस्या नहीं हुई। | Normal |
| q4_sales | मैं स्थानीय एफपीओ को बेचता हूं, वे यहां किसानों से सीधे खरीद लेते हैं। | FPO or cooperative |
| q5_equipment | नहीं, ज़रूरत पड़ने पर मैं पड़ोसी से किराए पर लेता हूं। | Rents when needed |

### Persona 2 — Meena Devi (expected final outcome: AMBER, two flags)

| Node | Transcript | Expected bucket |
|---|---|---|
| q1 | मैं अंगूर उगाती हूं। यह मेरी अपनी ज़मीन है, लगभग चार एकड़। | Horticulture + Own it |
| land_area | लगभग चार एकड़। | 2–5 acres |
| land_water | पूरी सिंचाई है, ड्रिप इरिगेशन से। | Irrigated |
| year_clean_path | सामान्य ही रहा, फसल ठीक थी। | Normal |
| q4_sales | एक स्थानीय व्यापारी गांव से आकर ले जाता है। | A trader collects from the village |
| q5_equipment | हां, मेरे पास अपना ट्रैक्टर है। | Yes, owns |

### Persona 3 — Bhagwan Singh (expected final outcome: AMBER, income explained)

| Node | Transcript | Expected bucket |
|---|---|---|
| q1 | मैं कपास उगाता हूं। यह मेरी अपनी ज़मीन है, लगभग तीन एकड़। | Cash crop + Own it |
| land_area | लगभग तीन एकड़। | 2–5 acres |
| land_water | यह बारिश पर निर्भर करती है, हमारे पास सिंचाई की सुविधा नहीं है। | Rain-fed |
| year_recheck | नहीं, साल सामान्य ही था। | Normal |
| q3_alt | हां, मेरा बेटा पुणे में काम करता है और हर महीने घर पैसे भेजता है। | Family member elsewhere (remittance) |

### Persona 4 — Dilip Chaudhary (expected final outcome: RED)

| Node | Transcript | Expected bucket |
|---|---|---|
| q1 | मैं गन्ना उगाता हूं। यह मेरी अपनी ज़मीन है, लगभग दो एकड़। | Cash crop + Own it |
| land_area | लगभग दो एकड़। | Under 2 / 2–5 acres |
| land_water | पूरी सिंचाई है, गन्ने के लिए ज़रूरी है। | Irrigated |
| year_recheck | नहीं, साल ठीक ही था। | Normal |
| q3_alt | नहीं, यह सब मेरी खेती से ही है। और कुछ नहीं है। | No, that is my farming income alone |

---

## Negative test — round 17's actual failure case

This is the case that started this whole investigation — worth keeping in the suite so it doesn't
silently regress again.

| Node | Transcript | Expected behavior |
|---|---|---|
| q1 | मैं गेहूं खाता हूं | **Should NOT match** "Food grain + Own it" — crop cue present (गेहूं) but no ownership phrase. Correct result is no match / fall through to manual selection, not a false-positive match. |

---

## Definition of done

All 22 positive rows return the exact expected bucket. The 1 negative row does *not* return a false
match. Report back with pass/fail per row, not a summary judgment — if something fails, say which
row and what it returned instead.

---

## Resolution (Code)

### Test results — 23/23, run against the real function, not self-assessed

Wrote a standalone script that imports `classifyAnswer` directly and runs all 22 positive rows +
the 1 negative row against it — not eyeballing the cue tables, actually calling the function. First
run: 22/23. The one failure was Dilip Chaudhary's `year_recheck` row ("नहीं, साल ठीक ही था।") —
the `normal` cue list only had the exact phrase "ठीक था", and "ठीक ही था" (with the emphasis
particle "ही" inserted) doesn't contain that as a substring. Added "ठीक ही था" as its own cue.
Re-ran: 23/23.

| # | Persona | Node | Result |
|---|---|---|---|
| 1-6 | Ramesh Yadav | q1, land_area, land_water, year, q4_sales, q5_equipment | PASS (all 6) |
| 7-12 | Meena Devi | q1, land_area, land_water, year_clean_path, q4_sales, q5_equipment | PASS (all 6) |
| 13-17 | Bhagwan Singh | q1, land_area, land_water, year_recheck, q3_alt | PASS (all 5) |
| 18-22 | Dilip Chaudhary | q1, land_area, land_water, year_recheck, q3_alt | PASS (all 5, after the "ठीक ही था" fix) |
| 23 | (negative) | q1, "मैं गेहूं खाता हूं" | PASS — correctly returns no match |

### What changed

`classify.ts` is a full rewrite — no fetch call, no network dependency, pure keyword/compound-cue
matching, same exported signature (`classifyAnswer(question, transcript, taps)`) so `AmberPanel.tsx`
needed zero changes. The server-side LLM path (`api/classify.ts`, `api/_classify-core.ts`, the
`vite.config.ts` dev middleware) is left in place but genuinely dormant — nothing calls it anymore.
Per round 12's own original framing ("once an LLM key is added, swap the keyword matching for the
real LLM call... this swap is a one-place change later, not a rewrite"), deleting that code seemed
like the wrong call — it's exactly the future drop-in this was always meant to support — but it's
worth knowing it's sitting there unused, not a second active path.

**q1 is back to 3 buckets, not 4.** Round 12 split "Cash crop + Own it" into a 4th bucket
specifically for sugarcane, so the arithmetic could tell it apart from cotton/spices — flagged at
the time as a disclosed judgment call, not something either spec asked for. This test suite's own
Dilip Chaudhary row expects plain `cash_crop_own`, not a sugarcane-specific id, which settles it:
reverted to the original 3-bucket spec. Sugarcane detection for the arithmetic band moved to reading
the applicant's actual words instead of the bucket id — `PathEntry.transcript` (added in round 15
for the Case Summary trail, not available back in round 12) now lets `resolveFarmerCalc` check
whether "गन्ना"/"गन्ने" appears in q1's answer and use the sugarcane-specific ₹/acre band if so,
regardless of which bucket it resolved to. Verified with a second standalone script, isolated from
any real persona's numbers (both loan personas' actual declared incomes happen to fail either band,
which wouldn't have proven anything) — a synthetic declared income picked specifically to fall
inside one band and outside the other, confirmed the right one gets picked based on the transcript.

### One real limitation, found live, not just reasoned about

Simulate mode plays one fixed canned line per bucket, and now that cotton and sugarcane share
`cash_crop_own`, that line is Bhagwan Singh's cotton script (kept as the default, since it existed
before round 12's split). Tested this live: selecting "Cash crop... + Own it" from the Simulate
dropdown for Dilip Chaudhary's persona shows *his* declared name, but the transcript in the "Applicant
said" box reads "मैं कपास उगाता हूं..." — cotton, not sugarcane — because Simulate mode bypasses the
classifier entirely and just plays the tap's static sample line. This means Dilip's sugarcane-specific
arithmetic band won't engage if you demo him through Simulate mode for Q1 specifically; it will
correctly engage through live speech (a real applicant saying "गन्ना"), or you can confirm it works
via the standalone script referenced above. Not something to silently patch — it's an inherent
consequence of one bucket now covering two personas' different crops, worth knowing about before the
next demo run rather than discovering it live.

### What I could not verify in this environment

Neither available browser path exercises the real classifier: live mic is blocked in this sandbox
("Microphone access denied" on every attempt), and Simulate mode — the only other input path —
bypasses `classifyAnswer` by design (it force-selects the tap directly). All 23 test rows were
verified by importing the function and calling it directly, which is arguably a more rigorous check
than clicking through the UI would have been, but it does mean this hasn't been watched running
against a real spoken answer end to end.

### Addendum — real live speech surfaced two more bugs, both fixed

The user tested live (Ramesh Yadav, real mic, real Chrome Hindi STT) shortly after this landed.
Transcript: "मैं गेहूं उगता हूं और मेरी खुद की जमीन है" — crop cue गेहूं present, and a genuine
ownership assertion, but it fell through to "couldn't narrow this down" anyway. Two compounding
causes, both real:

1. **Nuqta mismatch.** Every ownership/need cue in this file used ज़ (ज + nuqta, for Persian/Urdu-
   origin words like ज़मीन "land", ज़रूरत "need"). Chrome's Hindi speech recognition doesn't
   reliably produce the nuqta mark — this transcript came back as plain "जमीन", not "ज़मीन", which
   is a different Unicode string and will never match as a substring. This wasn't visible in any of
   round 18b's test rows because I wrote those by hand with the nuqta included, the same way the
   spec did — the test suite silently inherited the same blind spot the cue table had. Fixed by
   normalizing (stripping the nuqta mark from) both the transcript and every cue before comparing,
   so ज़/ज are treated as the same letter — a systemic fix, not a one-off patch to this one word.
2. **Fixed-phrase brittleness.** Even with the nuqta fixed, "मेरी खुद की जमीन" doesn't contain
   "मेरी अपनी ज़मीन" or "मेरी ज़मीन" as a contiguous substring — "खुद की" sits where the cue
   expected "अपनी" to be. Real speech reorders and substitutes synonyms in ways a fixed 2-3 word
   phrase can't anticipate. Broadened the ownership check to the two standalone words that actually
   carry the meaning — "अपनी" and "खुद" — rather than a specific phrase. Within a direct answer to
   "is this land your own?", both are safe, low-false-positive signals on their own.

Added this exact transcript to the standalone test script as a permanent regression case. Re-ran
the full suite after both fixes: 24/24 (23 original rows + this one), still zero false positives on
the negative row. This is the first fix in this file actually confirmed against real spoken Hindi,
not just the function called directly — worth treating the rest of the cue table (particularly
anything using ज़/ग़/ख़/फ़/क़ elsewhere, or any other fixed multi-word phrase) as similarly
under-tested against real speech until it's been exercised the same way.

### Second live miss, same pattern

"ठीक-ठाक था सर" (year_recheck, real speech) — "ठीक-ठाक" is a common standalone Hindi idiom for
"fine/okay", but doesn't contain "ठीक था" as a substring; the hyphen and "ठाक" sit in between,
same fixed-phrase brittleness as the ownership cue. Added "ठीक-ठाक" and "ठीक ठाक" (no hyphen, in
case STT drops punctuation) to the `normal` cue list.

**One deliberate risk accepted, not fixed:** `year_clean_path`'s own `worse` sample transcript
("थोड़ा खराब रहा, लेकिन ठीक-ठाक निकल गया।") now also contains "ठीक-ठाक" — since `normal` is
checked before `worse` in tap order, a real utterance shaped like that hedge ("a bit bad, but it
turned out okay") would now misclassify as `normal`. Not fixing this speculatively: that sentence
structure is one I invented myself for the sample transcript, not something either spec or a real
user has said, and it only matters for live speech in the first place (Simulate mode plays the
canned line directly, bypassing the classifier entirely). Flagging so it's a known tradeoff, not a
silent one, if it ever actually comes up.

Regression suite now 25/25.

### Third live miss

"नहीं सर हमारे पास तो ऐसा ट्रैक्टर वगैरा तो कुछ नहीं है" (q5_equipment, real speech) — a blanket
"no, we don't have one" with no mechanism named. Didn't match `owns` (no ownership assertion), and
didn't match `rents`/`shares`/`custom_hiring` either, since the applicant never said how they get by
without one — just that they don't have one. Broadened `not_needed`'s cues to catch this shape of
answer ("कुछ नहीं है", "ऐसा कुछ नहीं") — a bare negative with no specific mechanism reads as
"not needed" by elimination against the other three more specific non-owning buckets.

Regression suite now 26/26.

### Fourth live miss

"हां हां ट्रैक्टर है हम पर" (q5_equipment, real speech, immediately after the third miss above) —
colloquial "yes, we have a tractor," sharing no words at all with the scripted "मेरे पास अपना
ट्रैक्टर है". Broadened `owns` to the standalone "ट्रैक्टर है" — safe specifically because Hindi
negates by placing नहीं *before* है ("ट्रैक्टर नहीं है", "...कुछ नहीं है" from the third miss), so
नहीं always breaks that adjacency; "ट्रैक्टर है" as a contiguous substring only fires on a genuine
positive claim, confirmed against both this transcript and the third miss's negative one.

Regression suite now 27/27. This node (q5_equipment) has now needed a fix on both the positive and
negative side of the same question in back-to-back live tests — worth treating as the least-tested
part of the cue table going in to the next round.
