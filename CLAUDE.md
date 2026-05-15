# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Mizuki — an Astro 6 static blog theme (Svelte 5 islands, TailwindCSS 4, Stylus, Expressive Code, Pagefind search). Node >= 22, **pnpm only** (`preinstall` enforces this via `only-allow pnpm`).

## Commands

- `pnpm dev` — Astro dev server (runs `predev` → `scripts/sync-content.js` first)
- `pnpm build` — `update-anime.mjs` → `astro build` → `pagefind --site dist` → font compression
- `pnpm preview` — preview built site
- `pnpm check` — `astro check` (Astro + TS diagnostics)
- `pnpm type-check` — `tsc --noEmit --isolatedDeclarations`
- `pnpm lint` — `eslint ./src --fix`
- `pnpm format` — `prettier --write ./src`
- `pnpm new-post` — scaffold a post via `scripts/new-post.js`
- `pnpm sync-content` / `pnpm init-content` — content-repo sync (see below)
- `pnpm update-anime` / `update-bangumi` / `update-bilibili` — refresh external data JSON used by the anime/bangumi/bilibili pages
- `pnpm submit` — IndexNow submission

No test runner is configured; "tests" = `pnpm check` + `pnpm type-check` + `pnpm lint`.

## Content-separation architecture

Content can live either inline (`src/content/`, `public/images/`) or in a **separate content repo** synced by `scripts/sync-content.js`. The `predev`/`prebuild` hooks run this script unconditionally (`|| true` swallows failures).

Behavior is controlled by `.env` (see `.env.example`); the key switch is `ENABLE_CONTENT_SYNC` with `CONTENT_REPO_URL` / token vars. When disabled, content is read straight from `src/content/`. Full details: `docs/CONTENT_SEPARATION.md`, `docs/CONTENT_REPOSITORY.md`.

Implication: when investigating content rendering issues, check whether `src/content/posts/` is the source of truth or whether it was overwritten by a sync. Modifying posts locally in sync mode is volatile.

## Code layout (big picture)

- `src/pages/` — Astro routes. Dynamic catch-alls `[...page].astro` (pagination) and `[...permalink].astro` (post permalinks) plus feature pages (`anime`, `timeline`, `albums`, `projects`, `diary`, etc.) and feed endpoints (`rss.xml.ts`, `atom.xml.ts`, `og/`).
- `src/components/` — organized as `atoms / common / control / features / layout / misc / organisms / widgets / comment`. `index.ts` is the public barrel.
- `src/content.config.ts` + `src/content/` — Astro content collections (`posts`, `spec`).
- `src/plugins/` — custom remark/rehype plugins wired in `astro.config.mjs`.
- `src/i18n/`, `src/config.ts`, `src/constants/` — site-wide config and translations.
- `src/stores/` — Svelte stores for client-side state (theme, likes, etc.).
- `src/scripts/`, `src/styles/`, `src/utils/`, `src/types/` — supporting client code.
- `scripts/` (repo root) — Node build/maintenance scripts (content sync, anime/bangumi/bilibili fetchers, font compression with `fontmin`, IndexNow, post scaffolding).
- `astro.config.mjs` — integrations: `@astrojs/svelte`, `@astrojs/mdx`, `@astrojs/sitemap`, `@swup/astro`, `astro-expressive-code`, `astro-icon`, `@tailwindcss/vite`; remark/rehype plugin chain (math/katex, directive, sectionize, slug, autolink, external-links, custom plugins).

## Conventions

- Formatting: Prettier with `prettier-plugin-astro` + `prettier-plugin-svelte` (config in `.prettierrc`); tabs are used in `package.json` and source.
- ESLint flat config in `eslint.config.js` covers Astro, Svelte, TS, and uses `simple-import-sort` — let `pnpm lint` reorder imports rather than hand-sorting.
- Frontmatter conventions for posts are defined in `_frontmatter.json`.

## Deployment

`vercel.json` exists; `docs/DEPLOYMENT.md` and `docs/AUTO_BUILD_TRIGGER.md` document deployment + webhook-driven rebuilds. Pagefind index is generated at build time into `dist/` — serving must include it.
