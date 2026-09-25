---
name: 'TypeScript Instructions'
description: 'TypeScript configuration, typing, and coding conventions for this repository.'
applyTo: '**/*.ts'
---

# TypeScript Instructions

This document describes the TypeScript configuration and best practices for this repository.

## TypeScript Configuration

- Configuration is defined in `tsconfig.json` and `tsconfig.build.json`.
- Target: ES2023
- Module system: ES modules (`"type": "module"` in `package.json`, `module` and `moduleResolution`
  set to `nodenext`).
- Strict type checking is enabled.

## Import Paths

- Relative and alias (`src/...`, `common/...`) imports end in `.js`, even though the file on disk is
  `.ts`: `import { AppModule } from 'src/app.module.js';`. Node's ES module loader does not add
  extensions, and `tsc` rejects a relative import without one.
- Package imports keep their package path (`@nestjs/common`).

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

- Test files are linted with the same oxlint rules as the rest of the code (`.oxlintrc.json`),
  except `typescript/unbound-method`: `expect(mock.method)` reads a mock's calls without invoking
  it, so the rule only reports false positives there.
- Typing in test files should be permissive; types are optional and only required when essential for testing correctness or clarity.

## Code Comments

Follow [Code Comments in `roobra-docs`'s coding guidelines](https://github.com/kelthon/roobra-docs/blob/main/guidelines/coding.md#code-comments):
a minimal JSDoc, written only when it says something the types and the names do not. In short:

- No doc comment on a function, method or class whose purpose and signature are already clear.
- A doc comment, when written, is complete: a one-line summary, `@param` for every parameter, then
  `@returns` (only when the result means more than its type) and `@throws` (whenever the caller must
  handle an error). Never a lone tag, and no types in tags.
- References to business rules, requirements and ADRs go on the class, controller or service, not on
  its methods. `@see` on a method only for counter-intuitive code, a deliberate trade-off or a
  workaround.

In this repository, a `@param` about one field of a DTO names it as `dto.field`
(`@param registerDto.email`).

## Documentation of Core Modules

- How a module works today is documented in this repository, in `docs/reference/`, and why it is built
  that way in `docs/adr/`. What other repositories must agree on is documented in `roobra-docs`.
- Documentation must explain both **why** (the rationale and purpose) and **how** (usage and implementation) for each core module, to provide clear guidance and examples for contributors.

For more details, see [guidelines/coding.md](https://github.com/kelthon/roobra-docs/blob/main/guidelines/coding.md) and [guidelines/testing.md](https://github.com/kelthon/roobra-docs/blob/main/guidelines/testing.md) in the `roobra-docs` repository.
