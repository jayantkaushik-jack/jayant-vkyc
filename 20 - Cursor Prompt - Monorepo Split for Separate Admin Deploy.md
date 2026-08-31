# Cursor Prompt — Restructure into a Monorepo (Agent + Admin as Separate Apps)

> The repo currently contains **two working apps** — the agent app (`features/agent`) and the admin app (`features/admin`, built per Prompt 19) — in one Vite project. Restructure into **separate Vite projects sharing one code package**, deployable as two independent Vercel projects. This is a pure move-and-rewire refactor: **zero behavior changes in either app**.

---

## Target structure

```
/ (repo root)
├── package.json          # private, npm workspaces: ["apps/*", "packages/*"]
├── packages/shared/      # name: "@vkyc/shared"
│   ├── package.json      # exports: ./components/*, ./data, ./lib/*, ./assets/*
│   ├── tsconfig.json
│   └── src/
│       ├── components/   # ui/, report/KycReport, call/ (shared visual primitives)
│       ├── data/         # generate, selectors, adminSelectors, rng, types, index
│       ├── lib/          # avatar, captureUtils, format, cn, constants, demoAssets
│       └── assets/       # cashfree-logo.png, avatars/, demo/
└── apps/
    ├── agent/            # agent app
    │   ├── package.json  # depends on "@vkyc/shared": "workspace:*" (or file:)
    │   ├── vite.config.ts, index.html, public/
    │   └── src/          # app/routes, features/agent, agent-only components
    └── admin/            # admin app (same setup)
        └── src/          # app/routes, features/admin, admin-only components
```

## Rules for what goes where

- **`packages/shared`**: everything both apps use — `components/ui/*`, `components/report/KycReport`, layout primitives (logo, header pattern, sidebar primitives, desktop overlay), **`features/auth` (LoginPage + AuthContext — both apps log in the same way)**, the entire `data/` layer including `adminSelectors`, `lib/*`, static assets (logo, avatars, demo images). Static assets: export via the package (import URLs through Vite's asset handling) so each app bundles them; don't rely on one app's `public/`
- **`apps/agent`**: `features/agent`, agent-specific components (call room, guide overlay, progress rail, agent status cards), agent routes, `AgentContext`
- **`apps/admin`**: `features/admin`, `AdminLayout`/admin sidebar, admin routes. Route simplification: inside the admin app the `/admin` prefix is redundant — serve sections at `/`, `/live-ops`, `/customers`, … (and in the agent app, remove any `/admin` route remnants; each app owns its URL space on its own domain)
- If something is single-app today but plausibly shared tomorrow (e.g., `StatusPill`, table primitives), put it in shared now — moving later is costlier
- Audit for **accidental cross-imports** before moving: if any admin file imports from `features/agent` (or vice versa), the shared bit must move to `packages/shared`, not be re-exported across apps
- Update all imports to `@vkyc/shared/...` path aliases (configure `tsconfig` paths + Vite `resolve.alias` consistently in both apps). No deep relative imports across package boundaries

## Mechanics

1. Set up npm workspaces at the root (`npm` is fine; no need for pnpm/turbo at this scale). Root scripts: `dev:agent`, `dev:admin`, `build:agent`, `build:admin`
2. Move files with `git mv` to preserve history
3. `packages/shared` is consumed as **source** (no build step): apps' Vite/TS configs include it via alias — keep it simple, no compilation pipeline for the package
4. Tailwind: each app has its own config; `content` globs must include `../../packages/shared/src/**/*.{ts,tsx}` so shared components' classes aren't purged. Keep the theme tokens in ONE shared preset file (`packages/shared/tailwind-preset.ts`) that both apps' configs `presets: [...]` — the Cashfree theme is defined once
5. Add root `README.md`: how to run each app, and the Vercel setup (below) for reference

## Vercel (document in README; no code needed)

- Two Vercel projects importing the same git repo
- Project "vkyc-agent": Root Directory `apps/agent`; project "vkyc-admin": Root Directory `apps/admin`
- Framework preset Vite auto-detected; install runs at repo root (workspaces resolve)
- Each project gets its own domain; pushes rebuild only affected apps

## Acceptance

1. `npm install` at root, then `npm run dev:agent` → the agent app runs **byte-for-byte identical in behavior**: full regression (login → home → go online → call → all steps → approve → next call; analytics; knowledge docs; break/offline cards)
2. `npm run dev:admin` → full admin regression: all 9 sections render with computed data; Call History modals (timeline, activity log, KYC report, video) work; Workforce efficiency matches agent Analytics for the same agent; theming identical to before the split
3. `npm run build:agent` and `npm run build:admin` both pass clean
4. No file exists in two places (`git grep` for a moved filename shows one location); no `../../packages` relative imports — alias only
5. Git history preserved for moved files (`git log --follow` works on `KycReport.tsx`)
