# Cursor Prompt — Vercel Deployment Config for Both Apps

> Small, deployment-only change set. No feature code, no behavior changes. The repo will be deployed as two Vercel projects (Root Directory `apps/agent` and `apps/admin`), so each app needs SPA rewrites and a build sanity pass.

---

## 1. SPA rewrites (fixes 404 on deep links like `/login`)

Create identical `vercel.json` in **both** `apps/agent/` and `apps/admin/`:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

## 2. Ignored build step helper (optional but include)

Add to each app's `package.json` a script Vercel can use to skip unaffected builds:

- `apps/agent`: `"vercel-ignore": "git diff --quiet HEAD^ HEAD -- ../../packages/shared ./ || exit 1"`
- `apps/admin`: same with its own path

(Exit 1 = "changed, build". Add a line to the root README's Vercel section explaining where to paste this: Project Settings → Git → Ignored Build Step.)

## 3. Production build sanity pass

- Run `npm run build:agent` and `npm run build:admin`; fix anything that fails in **production** mode only (typical culprits: case-sensitive import paths — Vercel's Linux build is case-sensitive unlike macOS; TS errors that dev mode tolerates; assets referenced by absolute local paths)
- Verify both `dist/` outputs include the shared static assets (logo, avatars, demo images) — they must be imported through the bundler (or present in each app's `public/`), **not** referenced by paths that only exist in the monorepo at dev time. Fix any asset that 404s in `vite preview`
- Run `npx vite preview` for each app and click through: agent (login → home → call flow start) and admin (login → dashboard → customers) — no console errors, no missing images

## 4. README

Update the root README's deployment section: the two-project Vercel setup (project names, Root Directory settings, the note that installs run at the repo root for workspaces), the vercel.json rewrites, HTTPS note (camera features work on Vercel by default), and the Ignored Build Step snippet.

## Acceptance

1. Both apps: `vercel.json` present; `npm run build` clean; `vite preview` serves `/login` (and any deep route) directly without 404
2. All images/assets load in preview builds for both apps (check logo, avatars, PAN/sign demo assets, recording poster)
3. No import-path casing mismatches (`git grep`-verify a couple of known components)
4. README documents the full Vercel setup; no app behavior changed
