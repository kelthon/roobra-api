---
status: Draft
intended-status: Accepted
date: 2026-08-28
recorded-at: 2026-09-18
source: docs/docker.md "Why the build output is flat" and "Stray *.tsbuildinfo files"; tsconfig.build.json; nest-cli.json — the legacy doc cited first was removed in the docs restructuring (see git history)
supersedes:
superseded-by:
---

# Build To A Flat `dist/` And Pin The Incremental Build Cache Inside It

## Context

`npm run start:prod` runs `node dist/main`, so the compiled entry point must be `dist/main.js`, not
`dist/src/main.js`. The base `tsconfig.json` uses `rootDir: "./"` because `prisma/seed.ts` and
`prisma.config.ts` live outside `src/` and are type-checked against the same config by editors and
tests.

With `rootDir` narrowed for builds, TypeScript's default location for the incremental cache
(`*.tsbuildinfo`) became unpredictable; it was observed at the repository root, both in local builds
and in the dev container (which bind-mounts the repo). A stale cache copied into the Docker context
can make `tsc` report "nothing changed" and emit an empty `dist/` while exiting `0`.

## Decision

1. `tsconfig.build.json` (used only by `nest build`) sets `rootDir: "./src"` and excludes `test`,
   spec files, `prisma` and `prisma.config.ts`. The base `tsconfig.json` keeps `rootDir: "./"`.
2. `tsconfig.build.json` pins `tsBuildInfoFile` to `./dist/tsconfig.build.tsbuildinfo`, so the cache
   is cleared by `deleteOutDir: true` in `nest-cli.json` on every build.
3. `*.tsbuildinfo` stays in both `.gitignore` and `.dockerignore` as a second line of defense.
4. `prisma/seed.ts` is not compiled: `prisma.config.ts` runs it directly with `tsx`.

## Alternatives Considered

- **Changing `rootDir` in the base `tsconfig.json`** — rejected: it would exclude `prisma/` files
  from editor and test type-checking.
- **Relying on the default cache location** — rejected: observed to misplace the file.

## Consequences

- Production and development builds share one layout, `dist/main.js`.
- Any new build-time-only file outside `src/` needs no build change, but any new runtime file outside
  `src/` would not be compiled and must be added deliberately.
