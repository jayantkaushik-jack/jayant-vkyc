# Hosting & API Key Security — Resolution (Code)

Answers only the "Questions for Code" section — repo-level, directly checkable. The "Questions for
Cashfree's IT/security/DevOps team" section is explicitly out of scope for Code (no visibility into
Cashfree's infra or policies) and is not addressed here — those need to go to IT/security directly,
per the original doc's own framing.

---

## 1. Where does the build currently run?

**Confirmed: pure local dev only today, but the repo is scaffolded for a Vercel deployment that has
not actually been connected.** Two different things, worth keeping separate:

- No `.vercel/project.json` exists anywhere in the repo — there is no linked Vercel project. Nothing
  in the repo shows evidence of an actual live deployment (no CI, no deploy workflow, no recorded
  deployment URL).
- But `apps/agent/vercel.json` exists (a SPA-rewrite rule routing everything except `/api/*` to
  `index.html`), and a real Vercel serverless function is already written and ready:
  `apps/agent/api/classify.ts` + `apps/agent/api/_classify-core.ts` (the dormant LLM classifier
  referenced in the audit doc's §1d and §2 — not called by the client today, since `classify.ts`
  the *frontend* module was rewritten to keyword matching in round 18, but the *serverless function*
  of the same name under `api/` still exists and would run if deployed and called).

So: today, running this means `npm run dev` on a laptop — nothing else exists. But "deploy to
Vercel" is a small step away, not a from-scratch setup, since the config and the API route are
already in place.

## 2. Is there an existing plan/config for GFF specifically?

**No.** Searched every markdown file in the repo for "GFF" — it appears in exactly two places, both
just naming the source spec document or noting press-optics ("Mr. Holmes" branding), not describing
a hosting plan:
- `handoffs/handoff_amber_layer_fixes_round2.md:262` — citing the source doc title,
  `[GFF] MuleSentinel_Amber_Resolution_Layer_v3`.
- `handoffs/handoff_amber_layer_rounds9_10_combined.md:40` — a naming-risk note ("this goes in
  front of external stakeholders and press at GFF"), unrelated to infrastructure.

No GFF-specific `.env` file, staging config, or deployment note exists anywhere. Whatever "how this
runs at the event" plan exists, it hasn't been written into this repo yet.

## 3. How are secrets/environment variables currently managed?

**Raw `.env` file, gitignored — no secrets manager, no CI-injected secrets.**

- `.gitignore:7-9`: `.env`, `.env.*` are ignored; `.env.example` is explicitly un-ignored (`!.env.example`).
- `apps/agent/.env.example` documents exactly one variable: `ANTHROPIC_API_KEY`. Its own comment
  states the intended flow precisely: "Used server-side only — by the Vite dev middleware
  (vite.config.ts) for `npm run dev`, and read the same way by Vercel's own project env vars on a
  deployed build. The key never reaches the browser bundle either way."
- `apps/agent/api/_classify-core.ts:1-6` confirms this in code: it's explicitly documented as
  "Shared classification logic — imported by both the Vite dev middleware... and the Vercel
  serverless function... Runs server-side only in both cases, so the Anthropic key never reaches
  the client bundle."
- **No AssemblyAI key or reference exists anywhere in the repo** — not in `.env.example`, not in
  any source file. The hosting-security doc asks about both Anthropic and AssemblyAI, but only the
  Anthropic key has any wiring at all today; AssemblyAI isn't integrated into this build in any
  form yet, so there's nothing to secure on that front until/unless it's actually added.

Bottom line: if a personal key gets provisioned, `.env` locally + Vercel's own env var UI on deploy
is the only mechanism that exists in this repo — no secrets manager, no injected CI secret, nothing
more sophisticated.

## 4. Does the repo have secret-scanning or CI checks that might flag a new key?

**No — confirmed by absence, checked directly:**
- No `.github/workflows/` directory.
- No `.gitlab-ci.yml`, no `.circleci/`, no `Jenkinsfile`.
- No `.husky/` directory, no `lint-staged`/`pre-commit`/`husky` entries in either `package.json`.
- No `.gitleaks.toml`, `.secretlintrc*`, or trufflehog config anywhere in the repo.

So: nothing would automatically catch or flag a newly-added personal API key as a CI/security
finding — the only safeguard today is manual discipline (checking `git status`/`git diff` before
committing, `.gitignore` catching `.env` itself). This is worth knowing before assuming any
guardrail exists that doesn't.

---

## Summary for the policy questions (not answered here, just restating what to bring to IT/security)

The technical facts above sharpen what to actually ask Cashfree's IT/security team: today there is
no hosted deployment, no CI, and no secret-scanning — so a personal-account key would currently only
ever live in a local `.env` file or, if deployed, in Vercel's own environment-variable store, with no
automated check on either path. Worth surfacing that specific detail alongside the four policy
questions already listed, since "no guardrail exists yet" may itself be relevant to how IT wants to
answer them.
