# Dependency Modernization (2026)

Status and plan for bringing the workspace up to date after ~3.5 years without dependency updates.
Branch: `upgrade/modernize` (not yet pushed or merged into `main`).

## Current status

The planned upgrade is **done**. What's left is follow-up work (see [Remaining work](#remaining-work)).

| | Before | After |
|---|---|---|
| Nx | 15.5 | 23.2.1 |
| Angular / Material / CDK | 15.1 | 22.2.1 |
| TypeScript | 4.8 | 6.0 |
| NestJS | 9 | 11.2 (12 deferred, see decisions) |
| Mongoose | 6.8 | 9.10 |
| Jest / jest-preset-angular | 28 / 12.2 | 30 / 17 |
| Cypress | 12 | 15.21 |
| ESLint | 8 (`.eslintrc`) | 9 (flat `eslint.config.mjs`) |
| NGXS | 3.7 | 22 |
| imagekitio-angular / imagekit (server) | 1.0 / 4.1 | 5.1 / 6.0 |
| jwt-decode | 3 | 4 |
| Prettier | 2 | 3 |
| Node (local / Docker) | 18 / 16 | 24 LTS (`.nvmrc` = 24.21.0) / `node:24-alpine` |
| nginx (Docker) | 1.23.3 | 1.30.5 |
| Storybook | 6.5 (no stories) | removed |
| Nx Cloud | configured | removed (not used) |

### Verification at the end of the work

From a clean `npm ci` on Node 24.21.0 / npm 11:

- `npm test`: 29/29 unit tests pass (23 frontend, 6 API)
- `npm run build`: both apps build
- `npm run e2e`: 2/2 Cypress smoke tests pass (API and ImageKit are stubbed)
- `npm run lint`: clean (the 39 pre-existing errors were fixed afterwards)
- Frontend checked by hand in the browser after the Angular 17, 19 and 22 upgrades (home, movies with posters, search, side nav, login).

**Not verified:**

- API add movie (ImageKit upload) at runtime. Everything else in the API was checked against a throwaway DB (see remaining work).
- Docker images were not built (the Docker daemon wasn't running).

## Decisions made

- **Stay on NestJS 11.** `@nx/nest` 23.x (including the 23.3 beta) only supports `@nestjs/* < 12`. Revisit when a newer Nx supports Nest 12. Note: Nest 12 core packages are ESM-only.
- **Never run the API against the production DB.** Use a throwaway Mongo (Docker or mongodb-memory-server) for runtime testing.
- **No Nx Cloud.** Local task runner only.
- **Behavior kept the same across Angular default changes:**
  - zone.js change detection (`provideZoneChangeDetection()` in `main.ts`)
  - `ChangeDetectionStrategy.Eager` written out on every component (Angular 22 defaults to OnPush)
  - `provideHttpClient(withXhr(), withInterceptorsFromDi())` (Angular 22 defaults to fetch)
  - Material theme stays on the M2 APIs (`mat.m2-*`)
- **TypeScript 6:**
  - API uses `"strict": false` (TS 6 turns strict on by default)
  - `baseUrl` removed; `paths` are relative to the tsconfig that declares them
  - `moduleResolution`: `bundler` (base and frontend), `node16` (CommonJS API and spec configs)
- **Lint rules turned off on purpose** (`apps/ng-portfolio/eslint.config.mjs`), until the code is migrated: `prefer-standalone`, `prefer-inject`, `prefer-on-push-component-change-detection`.
- **Tailwind stays on 3.4.** v4 doesn't support Sass, and the styles use `@apply` 34 times across 12 SCSS files.
- **`@babel/core@^7` declared at the root** so Jest's Babel 7 plugins don't pick up Angular 22's hoisted Babel 8.
- **Frontend build output stays flat** (`outputPath.browser: ""`), so the Dockerfile and nginx config work unchanged with the esbuild builder.

## Remaining work

### Must do before deploying

- [ ] **Revoke the old Nx Cloud access token** in the Nx Cloud dashboard. It's removed from `nx.json` but is still in git history.
- [ ] Build the Docker images: `docker compose build`, then run them.
- [x] Run the API against a **throwaway** MongoDB (`mongodb-memory-server`, seeded with one user and two movies; `environment.ts` pointed at it temporarily). Passed: login (200 and 401), get (200 and 404), search (title, person + genre, sort, no filter), update (401 without a token; saved and `updatedDate` bumped with one). Add wasn't tested end to end: it uploads to ImageKit before saving, and the test config had no ImageKit keys.
- [ ] Push the branch and open a PR.

### Optional follow-ups

- [ ] NestJS 12, once `@nx/nest` supports it.
- [x] Fix the 39 pre-existing lint errors. Selector prefix now allows both `portfolio` and `dvoss` (the code uses both); NGXS actions are module exports imported as `* as MovieActions`.
- [ ] Convert components to standalone (`nx g @angular/core:standalone`), then `bootstrapApplication`; re-enable `prefer-standalone`.
- [ ] Constructor injection to `inject()` (`nx g @angular/core:inject`); re-enable `prefer-inject`.
- [ ] Move components to OnPush, then consider zoneless; re-enable the OnPush lint rule.
- [ ] Sass: replace `@import` with `@use` and the global functions (`map_merge`) with module ones. These go away in Dart Sass 3 (`npx sass-migrator module`).
- [ ] Tailwind 4: needs the SCSS `@apply` usage reworked first.
- [ ] Material M3 theme.
- [ ] Pre-existing bug: the movie search stays in its loading state forever when the API call fails (`MovieState.searchMovies` has no error handling).
- [ ] `npm audit`: 16 findings remain, all transitive.
  - Most are pinned exactly by `nx@23.2.1` (axios 1.18.1, brace-expansion 5.0.9, smol-toml 1.6.1). Wait for an Nx patch.
  - `uuid@8` comes through `imagekit` (moderate).

## How to resume

```bash
git checkout upgrade/modernize
nvm use 24.21.0          # nvm-windows; needs an admin/UAC prompt
npm ci
npm run lint; npm test; npm run build; npm run e2e
```

Useful environment settings when running Nx from scripts: `NX_DAEMON=false` (the daemon locks files in `node_modules` during installs on Windows) and `FORCE_COLOR=0`.

### Gotchas found during the upgrade

- **`nx migrate` + `npm install` ERESOLVE.** npm checks the new versions against old entries in `package-lock.json`. The fix that worked every time: `rm -rf node_modules package-lock.json && npm install`.
- **Nx provenance check.** `nx migrate` rejects releases published before Nx used npm provenance (e.g. 15.9.7). Jump to a version that has an attestation instead of setting `NX_SKIP_PROVENANCE_CHECK`.
- **Broken release.** `nx@19.8.15` depends on unpublished `@nrwl/*` shims; 19.8.14 was used.
- **Packages `nx migrate` doesn't bump.** NGXS (its major version follows Angular's), `zone.js` (sometimes), TypeScript for Angular 22 (`~6.0`), `ts-jest` (29.4.14 for Babel 8), and `@nestjs/schematics` (Nest 11+ needs Prettier 3).
- **Migration side effects.** Some migrations reformat code (decorator indentation, `app.module.ts`, `main.ts`). Review the diffs and restore the repo's style.
- **Deprecated Cypress executor.** `@nx/cypress:cypress` exited 0 without running Cypress. It was replaced by the `@nx/cypress/plugin` inferred targets, with `baseUrl` set in `cypress.config.ts`.
- **Leftover `@nrwl/js:node` executor.** The migrations missed the API's `serve` target, so `nx serve api` failed. Renamed to `@nx/js:node`.
- **`import * as cors` broke at runtime.** The API's `module: node16` implies `esModuleInterop`, so the namespace import wasn't callable (`TypeError: s is not a function` after Nest started). Changed to a default import. Namespace imports that only read properties (`mongoose.Schema`) are fine.
- **`nx serve api` uses the empty `environment.ts`.** There's no `development` configuration that swaps in `environment.dev.ts`, and this predates the upgrade. Use `--configuration=production` only for a quick boot check; the dev file points at the prod DB too.
- **Dev server cleanup on Windows.** Stopping a background `nx serve` doesn't kill its node/esbuild children. Kill them by command line before the next `npm install`.

## Commit history (oldest first)

1. `bfdf618` prep: remove Storybook, remove Nx Cloud token, fix eslint configs
2. `bbe8af6` repair broken spec scaffolds (+ ModalComponent destroy bug)
3. `00ce246` remove Nx Cloud
4. `533b9d2` Nx 16.10 / Angular 16.2 (+ NGXS 3.8, imagekitio-angular 5; both were View Engine builds)
5. `a9dd7a8` Nx 17.3 / Angular 17.1
6. `775238c` built-in control flow (`@if` / `@for`)
7. `ac0ed83` esbuild application builder
8. `c8dbae8` Nx 18.3 / Angular 17.3
9. `c92f6bb` Nx 19.8 / Angular 18.2
10. `db4bcfc` Nx 20.8 / Angular 19.2
11. `0d02ef8` Node 24 toolchain
12. `dab0f57` Nx 21.6 / Angular 20.3
13. `1f9b882` Nx 22.7 / Angular 21.2 (Jest 30)
14. `cf72473` Nx 23.2 / Angular 22.1 (TS 6, ESLint 9 flat config)
15. `c63467b` Mongoose 8, Prettier 3
16. `914e311` NestJS 11 (Express 5)
17. `d5ea7a6` Mongoose 9
18. `6a65e8b` jwt-decode 4, reflect-metadata 0.2, ts-node
19. `13e9e89` imagekit server SDK 6
20. `5abf21a` Docker: Node 24, nginx 1.30.5, `npm ci`
21. `8009ad1` drop deprecated `@nx/angular/tailwind` helper
22. `9ff4ccf` real e2e smoke test, fix e2e target, root npm scripts
23. `674b754` Angular 22.2.1 + audit fixes
