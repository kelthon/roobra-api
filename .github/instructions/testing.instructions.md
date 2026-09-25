---
name: 'Testing Instructions'
description: 'Testing strategy, tools, and best practices for this repository.'
applyTo: '**/*.spec.ts,**/*.e2e-spec.ts,test/**/*'
---

# Testing Instructions

This document describes the testing strategy, tools, and best practices for this repository.

## Testing Framework and Tools

- **Frameworks**: Vitest (unit, integration, e2e), Supertest (API e2e)
- **Globals**: `describe`, `it`, `expect` and `vi` are globals; import types such as `Mock` from `vitest`
- **Mocks/Fakes**: Use for external dependencies

## How to Run Tests

- **Locally**: Use the project's test scripts (e.g., `npm test`, `npm run test:e2e`). See [how to run tests](../../docs/guides/how-to-run-tests.md).
- **In CI**: Tests are run automatically in the CI pipeline (see project configuration).

## Test Folder Organization

- `test/`: Contains all automated tests.
  - `*.e2e-spec.ts`: End-to-end tests
- `vitest.config.ts`: Unit and integration test configuration
- `vitest.config.e2e.ts`: E2E test configuration
- `src/`: May contain unit/integration tests alongside code (if co-located)

## Naming Conventions

- Test files: `*.spec.ts` for unit/integration, `*.e2e-spec.ts` for end-to-end
- Use descriptive test and suite names

## Coverage Strategy

- Cover all new features and bug fixes
- Prioritize unit tests, but include integration and e2e for critical flows
- Maintain minimum coverage as defined by the team
- Tests must cover happy cases, common issues, and critical system paths.

## Guidelines for Mocks and Fixtures

- Mock external dependencies (e.g., APIs, databases) in unit/integration tests
- Use fakes or fixtures for repeatable test data

---

Include test examples in pull requests whenever possible. For more details, see [guidelines/testing.md](https://github.com/kelthon/roobra-docs/blob/main/guidelines/testing.md) in the `roobra-docs` repository.
