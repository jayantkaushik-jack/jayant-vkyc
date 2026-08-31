# Handoff 26 — Hindi translation for the Farmer Income Mismatch tree (questions + bucket labels)

**Status:** locked, ready to build. Continues from round 25 (unclear-bucket LLM/UX fix, unrelated
layer — round 25's own build should land independently of this one). **Scope: Farmer Income
Mismatch tree only** — questions and tap/bucket labels get Hindi. SIM Circle Mismatch and Premium
Address Risk are untouched this round. Sample transcripts and Case Summary / verdict `reasons` text
are also untouched — they're either already native Hindi (`sampleTranscript`) or out of scope per
this round's own line (verdict/reasons wording).

## 1. What this round actually is

Today, switching the agent-facing language dropdown (`SPEECH_LANGUAGES`, English/Hindi) only affects
which BCP-47 tag is passed to speech recognition — the question text and every tap/bucket label
stay in English regardless of the dropdown's setting. This round adds a real Hindi string for every
Farmer-tree question and every one of its taps, so that when the dropdown is set to Hindi, the agent
actually sees Hindi text on screen, not just a language hint fed to STT.

**Exact mechanism for how the two languages coexist on screen is left to Code's judgment** — e.g. a
new `questionHi`/`labelHi` field alongside the existing `question`/`label` on each node/tap,
displayed alongside the English (bilingual, both visible at once) or swapped based on the dropdown
(monolingual, toggles with the setting). Confirm with the user which display behavior they actually
want before locking that part in — this handoff supplies the *strings*, not the display mechanism.

## 2. The translated content — final, reviewed text

All English source strings below were pulled directly from the live `tree.ts` (not from memory) and
reviewed/corrected by the user before this handoff was written. **One string was substantively
reworded by the user during review — flagged in bold below — the rest are straight translations of
what's already live.**

### q1 — What do you grow, and is this land your own?

**Hindi:** आप क्या उगाते हैं, और क्या यह ज़मीन आपकी अपनी है?

| Tap id | English | Hindi |
|---|---|---|
| `food_grain_own` | Food grain (wheat, rice, pulses) + Own it | अनाज (गेहूं, चावल, दाल) + अपनी ज़मीन |
| `cash_crop_own` | Cash crop (cotton, sugarcane, spices) + Own it | नकदी फसल (कपास, गन्ना, मसाले) + अपनी ज़मीन |
| `horticulture_own` | Horticulture (grapes, pomegranate, mango, vegetables) + Own it | बागवानी (अंगूर, अनार, आम, सब्ज़ियां) + अपनी ज़मीन |
| `seasonal` | Different crops in different seasons | हर मौसम में अलग-अलग फसल |
| `livestock_or_aquaculture` | Livestock/dairy, poultry, fish or shrimp farming | पशुपालन/डेयरी, मुर्गी पालन, मछली या झींगा पालन |
| `tenancy_or_labour` | Works as farm labour, or leases land in/out | खेत मज़दूरी करते हैं, या ज़मीन किराए पर लेते/देते हैं |
| `unclear` | Other / Doesn't know / Unclear | अन्य / पता नहीं / स्पष्ट नहीं |

### land_area — How much land do you farm, roughly?

**Hindi:** आप लगभग कितनी ज़मीन पर खेती करते हैं?

| Tap id | English | Hindi |
|---|---|---|
| `land_under2` | Under 2 acres | 2 एकड़ से कम |
| `land_2to5` | 2 to 5 acres | 2 से 5 एकड़ |
| `land_5to10` | 5 to 10 acres | 5 से 10 एकड़ |
| `land_10to20` | 10 to 20 acres | 10 से 20 एकड़ |
| `land_over20` | Over 20 acres | 20 एकड़ से ज़्यादा |
| `unclear` | Other / Doesn't know / Unclear | अन्य / पता नहीं / स्पष्ट नहीं |

### land_water — Is your land irrigated, or does it depend on rainfall?

**Hindi:** क्या आपकी ज़मीन में सिंचाई की सुविधा है, या यह बारिश पर निर्भर है?

| Tap id | English | Hindi |
|---|---|---|
| `irrigated` | Irrigated — borewell, canal, or drip | सिंचित — बोरॵेल, नहर, या ड्रिप |
| `partly_irrigated` | Partly irrigated | आंशिक रूप से सिंचित |
| `rainfed` | Rain-fed | बारिश पर निर्भर |
| `unclear` | Other / Doesn't know / Unclear | अन्य / पता नहीं / स्पष्ट नहीं |

### year_clean_path — Would you say last year was normal for your farming, or better or worse than usual?

**Hindi:** क्या आप केंगे कि पिछला साल आपकी खेती के लिए सामान्य था, या हमेशा से बेहतर या खराब था?

| Tap id | English | Hindi |
|---|---|---|
| `normal` | Normal | सामान्य |
| `better` | Better than usual | हमेशा से बेहतर |
| `worse` | Worse (drought, flood, pest) | खराब (सूखा, बाढ़, कीट) |
| `varies` | Varies a lot year to year | हर साल अलग-अलग रहता है |
| `unclear` | Other / Doesn't know / Unclear | अन्य / पता नहीं / स्पष्ट नहीं |

### year_recheck — Was last year normal for your farming, or was it better or worse than usual — drought, flood, pest?

**Hindi:** क्या पिछला साल आपकी खेती के लिए सामान्य था, या हमेशा से बेहतर या खराब था — सूखा, बाढ़, कीट?

| Tap id | English | Hindi |
|---|---|---|
| `normal` | Normal | सामान्य |
| `better` | Better than usual | हमेशा से बेहतर |
| `worse` | Worse (drought, flood, pest) | खराब (सूखा, बाढ़, कीट) |
| `varies` | Varies a lot year to year | हर साल अलग-अलग रहता है |
| `unclear` | Other / Doesn't know / Unclear | अन्य / पता नहीं / स्पष्ट नहीं |

### q4_sales — Where do you usually sell what you grow?

**Hindi:** आप जो उगाते हैं, उसे आम तौर पर कहां बेचते हैं?

| Tap id | English | Hindi |
|---|---|---|
| `local_mandi` | Local mandi | स्थानीय मंडी |
| `trader_collects` | A trader collects from the village | व्यापारी गांव से लेकर जाता है |
| `mill_or_company` | Directly to a mill, dairy or company | सीधे मिल, डेयरी या कंपनी को |
| `contract_farming` | Contract farming with a named buyer | तय खरीदार के साथ ठेके पर खेती |
| `fpo_cooperative` | FPO or cooperative | एफपीओ या सहकारी समिति |
| `exports` | Exports | निर्यात |
| `retail_myself` | Sells retail myself | खुद खुदरा बेचता/बेचती हूं |
| `unclear` | Other / Doesn't know / Unclear | अन्य / पता नहीं / स्पष्ट नहीं |

### q5_equipment — Do you own a tractor or any other farm equipment?

**Hindi:** क्या आपके पास ट्रैक्टर या कोई अन्य कृषि उपकरण है?

| Tap id | English | Hindi |
|---|---|---|
| `owns` | Yes, owns | हां, अपना है |
| `rents` | Rents when needed | ज़रूरत पड़ने पर किराए पर लेते हैं |
| `shares` | Shares with family or neighbours | परिवार या पड़ोसियों के साथ बांटते हैं |
| `custom_hiring` | Uses custom-hiring services | कस्टम हायरिंग सेवा इस्तेमाल करते हैं |
| `not_needed` | Not needed at this scale | इस स्तर पर ज़रूरत नहीं |
| `unclear` | Other / Doesn't know / Unclear | अन्य / पता नहीं / स्पष्ट नहीं |

### q3_alt — reworded by the user this round, English AND Hindi both changing

**Original English (still what's live in `tree.ts` today):** "That figure looks higher than we
would expect for this land. Just to understand the full picture — does anyone in your household
have another job, a pension, remittance from family working elsewhere, any government scheme
payment, or rental income?"

**New English (replaces the above — user's explicit rewrite, confirmed final this round):**
"You'd mentioned your yearly income earlier — that seems a bit more than we'd expect for this land.
Is there anything else coming in — another job, pension, remittance, government scheme, or rental?"

**Why it changed (context for Code, not a request to second-guess it):** the original opened with
"That figure looks..." — which only makes sense if the applicant can see a number in front of them,
which they can't; it also read as a checklist naming the exact detection categories out loud. The
new version anchors to "you'd mentioned earlier" instead of an invisible figure, and shortens each
category to one or two words instead of a full clause. **This is an English-string change in
`tree.ts`, not just a translation addition** — update `q3_alt.question` itself to the new English
text above, then add the Hindi alongside it.

**New Hindi (translates the new English exactly, not the original):**
आपने पहले अपनी हिसाला आय बताई थी — यह इस ज़मीन के हिसाब से जितनी उम्मीद थी, उससे थोड़ी ज़्यादा ले
रही है। क्या और भी कुछ आय आती है — कोई और नौकरी, पेंशन, विदेश/बाहर से भेजा पैसा, सरकारी योजना, या
किराया?

**Taps/buckets for this node — unchanged, not touched by the rewording** (per explicit instruction:
"Don't change buckets those are great"):

| Tap id | English | Hindi |
|---|---|---|
| `household_total` | Household total | पूरे परिवार की कुल आय |
| `rental_income` | Rental from land leased out | किराए पर दी गई ज़मीन से आय |
| `side_business` | Side business | साथ में छोटा व्यापार |
| `dairy_alongside` | Dairy alongside | साथ में डेयरी |
| `sold_asset` | Sold an asset | कोई संपत्त बेची |
| `family_elsewhere` | Family member elsewhere (remittance) | परिवार का सदस्य बाहर काम करता है (पैसे भेजता है) |
| `farming_alone` | No, that is my farming income alone | नहीं, यह सिर्फ मेरी खेती की आय है |
| `unclear` | Other / Doesn't know / Unclear | अन्य / पता नहीं / स्पष्ट नहीं |

## 3. Where this lives in code

`apps/agent/src/features/agent/call/amber/tree.ts` — `farmerNodes`. Each `QuestionNode`'s `question`
field and each tap's `label` field need a Hindi counterpart per §1's mechanism (new field vs. runtime
swap — Code's call, confirm with user). **`q3_alt.question`'s English value itself also needs to
change** to the new wording in §2 before/while adding its Hindi — this is the one node where the
English source string itself is being edited, not just translated.

Classifier impact: `api/_classify-core.ts` builds its bucket list from
`taps.map((t) => \`- ${t.id}: ${t.definition ?? t.label}\`)` — confirm whether adding a Hindi label
field changes what gets sent to Haiku (it shouldn't, since `label`/`definition` in English should
stay the primary classification input; the Hindi field should be additive, for display only, not
substituted into the classifier prompt) — flag if the actual implementation makes this ambiguous.

## 4. Explicit non-changes

- Every other Farmer node's tap ids, routing, `definition` fields, `sampleTranscript` values: fully
  unchanged — sampleTranscripts are already native Hindi and don't need translation.
- q3_alt's tap/bucket list itself: unchanged, per explicit instruction — only the question text
  changes, not the seven buckets underneath it.
- SIM Circle Mismatch, Premium Address Risk: untouched, same scope discipline as rounds 22/23/25.
- Round 25's unclear-bucket LLM-suggestion/UX fix: separate, unrelated round — should be built and
  verified independently of this one.
- Verdict `reasons` text, Case Summary field labels, resolution-card copy: out of scope this round —
  this handoff covers question and tap-label strings only.

## 5. Open item for Code to confirm with the user before finalizing display mechanism

Per §1: whether the UI shows English and Hindi together (bilingual, always both visible) or swaps
fully based on the language dropdown (monolingual, toggles with the setting) is not decided in this
handoff — ask before building the display layer, since it changes the component structure
non-trivially (a toggle needs to reactively re-render every visible question/tap on dropdown change;
a bilingual dual-line render doesn't).
