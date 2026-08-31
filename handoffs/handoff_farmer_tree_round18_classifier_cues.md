# Handoff: Farmer Tree Classifier — Round 18 (HIGH PRIORITY — blocking demo video)

**This is not new design work.** Every rule below was already specified in
`Farmer_Tree_PathA_Code_Input.md` (lines 114–251), handed to Code as part of the round 12 six-file
set. Code's own investigation confirms the actual build uses a generic LLM prompt with no rubric
instead — the spec was available, it wasn't followed. This file exists purely to make the existing
spec impossible to miss a second time: one place, every cue, ready to implement directly.

**The instruction from the source doc, restated:** build the classifier as keyword/phrase matching
now (no LLM key available), structured as one swappable function (`classifyAnswer(transcript,
buckets)`) so a real LLM call can drop in later without touching anything else. Do not build a
generic LLM prompt as a substitute for this — that was explicitly the fallback for *after* a key
exists, not the interim mechanism.

---

## q1 — crop + land relationship (compound bucket: crop cue AND ownership cue both required)

| Bucket | Matches when transcript contains |
|---|---|
| Food grain + Own it | गेहूं (wheat) / चावल (rice) / दाल (pulses) **+** an ownership phrase like "मेरी अपनी ज़मीन" |
| Cash crop + Own it | कपास (cotton) / गन्ना (sugarcane) / मसाले (spices) **+** the same ownership phrase |
| Horticulture + Own it | अंगूर (grapes) / अनार (pomegranate) / आम (mango) / सब्जी (vegetables) **+** the same ownership phrase |

**This answers round 17's open question directly:** the compound requirement (crop cue + ownership
cue) was always the intended design — confirmed here, not inferred. A crop word alone, with no
ownership phrase, should not resolve this bucket.

## land_area

Parse a number + एकड़ (acre) from the transcript, bucket into the matching range (Under 2 / 2–5 /
5–10 / 10–20 / Over 20). "पता नहीं" / "नहीं जानता" (don't know) → **Does not know** → Human Review.

## land_water

| Bucket | Matches when transcript contains |
|---|---|
| Irrigated | "पूरी सिंचाई," "ट्यूबवेल," "ड्रिप इरिगेशन" |
| Partly irrigated | "कुछ हिस्सा," "आंशिक सिंचाई" |
| Rain-fed | "बारिश पर निर्भर," "सिंचाई की सुविधा नहीं" |

## year_clean_path / year_recheck (same question, two entry points)

| Bucket | Matches when transcript contains |
|---|---|
| Normal | "सामान्य," "बिल्कुल सामान्य," "ठीक था" |
| Worse | सूखा (drought) / बाढ़ (flood) / कीट (pest) / general "खराब" |
| Better | "अच्छा रहा," "बेहतर" |

Routing differs by entry point (see the tree structure doc) — the matching rules themselves are
identical either way.

## q4_sales

| Bucket | Matches when transcript contains |
|---|---|
| A trader collects from the village | "व्यापारी गांव से आकर ले जाता है" |
| FPO or cooperative | "एफपीओ," "सहकारी समिति" |

(Remaining buckets — Local mandi, mill/dairy/company, Contract farming, Exports, Sells retail
myself — weren't given explicit cue phrases in the source doc; use straightforward literal-term
matching for these, e.g. "मंडी" for Local mandi, until real usage surfaces what applicants actually
say.)

## q5_equipment

| Bucket | Matches when transcript contains |
|---|---|
| Yes, owns | "मेरे पास अपना ट्रैक्टर है," "हां, मेरा अपना है" |
| Rents when needed | "किराए पर लेता हूं," "ज़रूरत पड़ने पर" |

(Shares/custom-hiring/not-needed buckets also weren't given explicit cues in the source — same note
as q4_sales above.)

## q3_alt — income fallback

| Bucket | Matches when transcript contains |
|---|---|
| Family member elsewhere (remittance) | "बेटा/बेटी...काम करता है," "पैसे भेजता है" |
| No, that is my farming income alone | "यह सब मेरी खेती से ही है," "और कुछ नहीं है" |

---

## Priority

Replace the current generic-LLM-prompt classifier with keyword matching per the tables above,
before the next demo video attempt. This isn't a partial fix — every node's cues are listed above
in full; nothing is being deferred to a follow-up round.
