# Agent Instructions

## Stack

- Framework: Angular 21 (standalone components, signals, zoneless change detection).
- Unit tests: Angular `@angular/build:unit-test` builder with Vitest.
- E2E tests: Playwright.

## Local Commands

- `npm start` - Run the Angular dev server.
- `npm run build` - Build production assets.
- `npm test` - Run unit tests with coverage.
- `npm run test:watch` - Run unit tests in watch mode.
- `npm run test:e2e` - Run Playwright E2E tests.
- `npm run lint` - Auto-fix ESLint, stylelint, and formatting issues.
- `npm run lint:check` - Run lint and formatting checks without modifying files.
- `npm run generate:env` - Regenerate `src/environments/runtime-env.generated.ts`.

## Coding Standards

- Prefer standalone components with `ChangeDetectionStrategy.OnPush`.
- Use signals APIs (`signal`, `computed`, `input`, `output`) for component state.
- Use dependency injection via `inject()`.
- Keep templates focused on rendering logic; move branching/data shaping into `.ts`.
- Keep logic in `.ts`, styles in `.scss`/`.css`, and markup in `.html`.
- Co-locate tests with implementation (`*.spec.ts`).

## Comment and Documentation Style

- Follow the Google TypeScript comments guidance.
- Keep comments sparse and high-signal.
- Delete comments that only restate code.
- Use sentence case and punctuation for inline comments.
- Prefer `@fileoverview` for true file-level docs.

## Workflow Notes

- Husky pre-commit runs `lint-staged`, `npx tsc --noEmit`, and `npm test`.
- Commit messages must follow Conventional Commits (enforced by commitlint).
- If scripts/workflow change, update `README.md` and `CONTRIBUTING.md`.
- If test setup changes, keep both `npm start` and `npm test` working.
