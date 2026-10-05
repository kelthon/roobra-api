# Contribution Guidelines

This document is the single source of truth for all standards, rules, and workflows in this repository. All contributors and automation tools (including Copilot and Gemini) must read and follow all instruction files in the `.github/instructions` directory before contributing or generating code/documentation.

## General Principles

- Always read all instruction files in `.github/instructions` before starting any contribution or using automation.
- Follow the existing documentation structure and formatting for consistency.
- Use clear and concise English in all code, comments, and documentation.
- Refer to the [formatting guidelines](https://github.com/kelthon/roobra-docs/blob/main/meta/formatting.md) for markdown and formatting standards.
- Adhere to the team [culture and values](https://github.com/kelthon/roobra-docs/blob/main/guidelines/culture.md) in all interactions.
- Documentation must explain "why" decisions are made, not just "how" to use or implement features.

## Project Context

This API is part of a digital comics reader platform for adults, with a focus on delivering high-quality, curated content and a seamless user experience for both end-users and content managers.

**Important:**
Before contributing, you must complete the following reading requirements:

**In this repository (`roobra-api`):**

- Read all instruction files in the `.github/instructions` directory, especially `instructions.md` (this file), to understand all standards, rules, and workflows.
- Read the local architecture summary in [architecture.instructions.md](./architecture.instructions.md) for technical context specific to this API.

**If you need additional context (e.g., business rules, flows, personas, or detailed architecture):**

- Consult the global documentation repository: [github.com/kelthon/roobra-docs](https://github.com/kelthon/roobra-docs) (locally checked out as `roobra-docs`; if you have it cloned as a sibling folder, it is available at `../roobra-docs`, but do not assume that path exists — it depends on how each contributor or agent has the workspace set up). Start with the `README.md` for navigation, then explore sections such as `architecture/`, `business/`, `management/`, and `guidelines/` as needed.

Reading the local instruction and architecture files is mandatory. Reading the global documentation is strongly recommended whenever you need more information or clarification.

For additional local documentation, see the other files in `.github/instructions/`.
  
## Language Standard

- All code and documentation generated for this repository must be written in formal, easy-to-understand English. This applies to both human and AI-generated content.
- Chat and discussion in issues, pull requests, or comments may be in any language preferred by contributors.
  
## Agents and Skills

- This repository uses custom agents and skills to automate and enhance development workflows. Agents are defined in `.github/agents` and skills in `.agents/skills` (the cross-tool location read by both GitHub Copilot and Gemini CLI).
- Agents include TestAgent (testing), DocAgent (documentation), RefactorAgent (refactoring), PlanningAgent (planning and task tracking), and HelpAgent (Q&A and onboarding). Refer to the respective markdown files for details on their responsibilities and usage.

## Commit Message Conventions

- Write commit messages in imperative mood (e.g., "add feature" not "added feature").
- Use English for all commit messages.
- Structure: `<type>: <short description>` (e.g., `feat: add JWT authentication`).
- Common types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`.

## Pull Request Workflow

1. Ensure your branch name is descriptive (e.g., `feature/`, `bugfix/`, `hotfix/`, `chore/`).
2. Link issues in the PR when applicable.
3. Clearly describe what was done and how to test it.
4. Request review from at least one collaborator.
5. Include test examples for new features or bug fixes when possible.

## Code Style and Formatting Rules

- Follow the linting and formatting tools defined in the project (e.g., ESLint, Prettier).
- Use descriptive variable and function names.
- Prefer pure functions and reusable components.
- Add clear comments for complex logic or modules.
- Apply SOLID and DRY principles.
- Separate responsibilities into modules and services.

## Pre-PR Checklist

- [ ] Code follows the repository's coding standards.
- [ ] All new features and bug fixes are covered by tests.
- [ ] Linting and formatting checks pass.
- [ ] Documentation is updated as needed.
- [ ] PR description is clear and complete.
- [ ] At least one reviewer is assigned.

---

For any questions or contributions, contact the project maintainers or submit a pull request with your proposed changes.
