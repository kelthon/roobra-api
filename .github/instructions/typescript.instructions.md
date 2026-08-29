---
name: 'TypeScript Instructions'
description: 'TypeScript configuration, typing, and coding conventions for this repository.'
applyTo: '**/*.ts'
---

# TypeScript Instructions

This document describes the TypeScript configuration and best practices for this repository.

## TypeScript Configuration

- Configuration is defined in `tsconfig.json` and `tsconfig.build.json`.
- Target: Modern JavaScript (ES2020+)
- Module resolution: Node
- Strict type checking is enabled.

## Typing Rules and Best Practices

- Use explicit types for function signatures and exported values.
- Prefer interfaces for public contracts (e.g., service APIs, DTOs).
- Use `type` for unions, intersections, and utility types.
- Avoid `any`; use unknown or proper types.
- Use DTOs for data transfer between layers/modules.
- Organize models and DTOs in dedicated folders/files.

## Import/Export Conventions

- Use ES module syntax (`import`/`export`).
- Group imports by external, internal, and relative modules.
- Avoid default exports for consistency.

## Handling Libraries Without Type Definitions

- Use `@types/` packages when available.
- If not available, declare minimal types in a `types/` or `@types/` folder.

## TypeScript in Testing

- Write all tests in TypeScript.
- Use type-safe mocks and fixtures.
- Ensure type coverage in test files.

## Linting in Test Files

- Test files are skipped for ESLint strict rules to allow for more flexible test code patterns.
- Typing in test files should be permissive; types are optional and only required when essential for testing correctness or clarity.


## Documentation of Core Modules

- All core modules must be documented in the `roobra-docs` repository.
- Documentation must explain both **why** (the rationale and purpose) and **how** (usage and implementation) for each core module, to provide clear guidance and examples for contributors.

For more details, see [guidelines/coding.md](https://github.com/kelthon/ph-docs/blob/main/guidelines/coding.md) and [guidelines/testing.md](https://github.com/kelthon/ph-docs/blob/main/guidelines/testing.md) in the `roobra-docs` repository.
