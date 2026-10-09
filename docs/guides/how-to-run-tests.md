---
doc-status: draft
---

# How To Run Tests

## Objective

Run the unit and end-to-end test suites locally, the same way CI does. For general testing
conventions and best practices (not specific to this repo), see `roobra-docs`'s
[guidelines/testing.md](https://github.com/kelthon/roobra-docs/blob/main/guidelines/testing.md).

## Prerequisites

- Node.js 24 and dependencies installed with `npm ci`.
- The generated Prisma client (`npx prisma generate`); specs import its types and enums.
- No `.env`. The e2e specs boot the whole `AppModule`, which validates the environment at startup;
  `vitest.config.e2e.ts` sets placeholder values that pass the validation and override a local `.env`.
- No database is needed. Unit specs replace `PrismaService` with a mock, and the e2e specs never reach
  a query, so the Prisma client is created but never connects.

## Steps

1. Run the unit tests (`**/*.spec.ts`, configured in `vitest.config.ts`):

   ```sh
   npm test
   ```

2. Run them in watch mode while developing, or with coverage (written to `coverage/`):

   ```sh
   npm run test:watch
   npm run test:cov
   ```

3. Run the end-to-end tests (`**/*.e2e-spec.ts`, configured in `vitest.config.e2e.ts`):

   ```sh
   npm run test:e2e
   ```

4. Run a single file or test by name:

   ```sh
   npx vitest run src/modules/auth/auth.service.spec.ts
   npx vitest run -t "refresh"
   ```

## Notes

- The tests run on [Vitest](https://vitest.dev/) with `globals: true`, so `describe`, `it`, `expect`
  and `vi` need no import. Import types such as `Mock` from `vitest` (`import type { Mock } from
  'vitest'`); `vi` is a value, not a type namespace.
- The project is an ES module (`"type": "module"`): relative and `src/...` imports end in `.js`, even
  in specs.
- Because the e2e specs never reach the database, they only cover behavior decided before any query:
  routing, guards and request validation. Behavior that reads or writes data is covered by unit specs
  with mocked Prisma calls.
- Coverage uses Vitest's defaults; `vitest.config.ts` sets no exclusions.
- CI (`.github/workflows/deploy.yml`) runs `npm run test` and `npm run test:e2e` as one job.

## Troubleshooting

- **A spec fails with a `Cannot find module 'src/...'` error:** run Vitest from the repository root,
  through the npm scripts or `npx vitest`, so it picks up `vitest.config.ts`; the `src/` alias comes
  from `resolve.tsconfigPaths`. If the path is right, check that the import ends in `.js`.
- **An e2e spec fails with `Config validation error`:** a variable was added to
  `src/common/schemas/env.schema.ts` but not to the `env` block of `vitest.config.e2e.ts`; the error
  names it.
