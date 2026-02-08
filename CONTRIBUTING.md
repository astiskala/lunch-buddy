# Contributing to Lunch Buddy

Thanks for helping improve Lunch Buddy. Keep changes focused, tested, and easy to review.

## Prerequisites

- Node.js `>=24.0.0`
- npm `10+`

## Quick Start

```bash
npm install
npm start
```

`npm start` regenerates runtime environment values automatically.

## Common Commands

- `npm start` - Dev server
- `npm run build` - Production build
- `npm test` - Unit tests (Vitest + coverage)
- `npm run test:watch` - Unit tests in watch mode
- `npm run test:e2e` - Playwright tests
- `npm run lint` - Auto-fix lint/style/format issues
- `npm run lint:check` - CI-style lint/style/format checks
- `npm run generate:env` - Regenerate `src/environments/runtime-env.generated.ts`

## Pre-PR Checklist

Run this before opening a pull request:

```bash
npm run lint:check
npx tsc --noEmit
npm test
npm run build
```

## Git Hooks and Commit Format

Husky runs these on pre-commit:

1. `npx lint-staged`
2. `npx tsc --noEmit --pretty`
3. `npm test`

Commit messages must follow [Conventional Commits](https://www.conventionalcommits.org/).
Commitlint enforces:

- Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`
- Header max length: `100`

## Mock API Development

For local development without using a production account:

```bash
export NG_APP_LUNCHMONEY_API_BASE=/v2
export NG_APP_LUNCHMONEY_API_KEY=mock-api-key-12345
npm start
```

The dev server proxies `/v2` to `https://alpha.lunchmoney.dev`.
Any key with length `>= 11` works with the mock API flow.

## Reporting Issues

When filing an issue, include:

- Repro steps
- Expected vs actual behavior
- Environment details (OS, browser, Node version)
- Whether you used mock API or production API

## Getting Help

- Questions/discussions: [GitHub Discussions](https://github.com/astiskala/lunch-buddy/discussions)
- Bugs: [GitHub Issues](https://github.com/astiskala/lunch-buddy/issues)
- Security: [SECURITY.md](./SECURITY.md)
