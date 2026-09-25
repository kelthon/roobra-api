---
status: Draft
intended-status: Accepted
date: 2026-09-25
recorded-at: 2026-10-07
source: 'commit "chore: migrate to NestJS 12, ESM, Vitest and oxlint" on branch chore/nestjs-migration'
supersedes:
superseded-by:
---

# Run As ES Modules, Test With Vitest And Lint With oxlint

## Context

The API was a CommonJS project on NestJS 11, tested with Jest through `ts-jest` and linted with ESLint
(`typescript-eslint` type-checked rules, `eslint-plugin-jest` and `eslint-plugin-prettier`).

NestJS 12 publishes its packages as ES modules only: `@nestjs/core`, `@nestjs/common`,
`@nestjs/config`, `@nestjs/testing`, `@nestjs/platform-express` and `@nestjs/passport` all declare
`"type": "module"`. Jest runs ES modules only behind Node's `--experimental-vm-modules` flag
([Jest documentation](https://jestjs.io/docs/ecmascript-modules)).

The API is new and has not been released, so a change of module format reaches no running
deployment and less code now than it would later.

## Decision

Upgrade to NestJS 12 and run the project as ES modules, test with Vitest and lint with oxlint:

- `package.json` declares `"type": "module"`, and `tsconfig.json` uses `module` and
  `moduleResolution` `nodenext`. Relative and alias imports (`src/...`, `common/...`) end in `.js`.
  Code that needs its own directory uses `import.meta.dirname`, since `__dirname` does not exist in
  an ES module.
- Vitest runs the unit specs (`vitest.config.ts`) and the e2e specs (`vitest.config.e2e.ts`), with
  globals enabled and the tsconfig path aliases resolved by `resolve.tsconfigPaths`.
- `npm run lint` runs `oxlint --type-aware` over `src/` and `test/`, checking only; the rules are in
  `.oxlintrc.json`. Prettier stays the formatter.
- `tsx` replaces `ts-node` for the Prisma seed and the scripts in `scripts/`.
- `npm run typecheck` (`tsc --noEmit`) checks the types of the whole project, specs, seeds and
  scripts included; `tsconfig.json` sets `noEmit`, and only `tsconfig.build.json`, used by
  `nest build`, emits to `dist/`.

## Alternatives Considered

- **Stay on NestJS 11 and migrate later** — the migration only grows with the code base and, after
  release, would also reach a running deployment.
- **Upgrade to NestJS 12 and keep the project in CommonJS** — ES modules keep the project in the
  module format NestJS 12 is published in.
- **Keep Jest, with its experimental ES module support** — Rationale not recorded.
- **Keep ESLint** — Rationale not recorded.

## Consequences

- Every new import of a local file needs the `.js` extension; `tsc` rejects a relative import
  without one.
- Specs use `vi` instead of `jest`, and import types such as `Mock` from `vitest`.
- The e2e specs no longer replace the generated Prisma client with a stub. They still need no
  database, because the client connects only on the first query and those specs never reach one.
- Lint no longer reports formatting: ESLint did through `eslint-plugin-prettier`, and oxlint does
  not. Formatting is enforced only by running Prettier.
- `npm run lint` no longer fixes anything (ESLint ran with `--fix`), so the CI lint job checks only.

## Implementation Status

Not enforced on 2026-10-07: no script or CI job runs a Prettier check, which is one of the pull
request checks in [the deploy ADR](./2026-09-30-deploy-from-main-through-ghcr-and-ssh.md).
`npm run format` formats by hand.
