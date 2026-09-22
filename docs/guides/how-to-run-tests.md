# How To Run Tests

## Objective

Run the unit and end-to-end test suites locally, the same way CI does. For general testing
conventions and best practices (not specific to this repo), see `roobra-docs`'s
[guidelines/testing.md](https://github.com/kelthon/roobra-docs/blob/main/guidelines/testing.md).

## Prerequisites

- Node.js 24 and dependencies installed with `npm ci`.
- A `.env` that defines the variables required at startup (see
  [how to configure the environment](./how-to-configure-environment.md)). The e2e specs boot the whole
  `AppModule`.
- No database is needed: both jest configs replace `src/generated/prisma` with
  `src/__mocks__/prisma-client.mock.ts`.

## Steps

1. Run the unit tests (`src/**/*.spec.ts`):

   ```sh
   npm test
   ```

2. Run them in watch mode while developing, or with coverage (written to `coverage/`):

   ```sh
   npm run test:watch
   npm run test:cov
   ```

3. Run the end-to-end tests (`test/*.e2e-spec.ts`):

   ```sh
   npm run test:e2e
   ```

4. Run a single file or test by name:

   ```sh
   npx jest src/modules/auth/auth.service.spec.ts
   npx jest -t "refresh"
   ```

## Notes

- Because Prisma is stubbed, the e2e specs only cover behavior decided before any database access:
  routing, guards and request validation. Behavior that reads or writes data is covered by unit specs
  with mocked Prisma calls.
- Coverage ignores `*.module.ts`, `*.config.ts`, `src/generated` and `src/main.ts`.
- CI (`.github/workflows/deploy.yml`) runs `npm run test` and `npm run test:e2e` as one job.

## Troubleshooting

- **A spec fails with a `Cannot find module 'src/...'` error:** run jest through the npm scripts or
  with the project's config; the `src/` alias comes from `moduleNameMapper`.
- **An e2e spec fails during `compile()` with a missing configuration value:** define the variable
  in `.env`, see the prerequisites.
