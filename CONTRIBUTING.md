# Contributing to Lunch Buddy

Lunch Buddy is a small, self-maintained project. Contributions are welcome. If
you’d like to help, the best way is to keep changes focused and easy to review.

## Before You Start

- Skim the README for local setup.
- Check existing issues/discussions to avoid duplicating work.
- If you’re unsure about scope/approach, open an issue first.

## Reporting Issues

- Search existing issues to avoid duplicates and add to the conversation when
  relevant.
- Include a clear description, steps to reproduce, expected vs. actual behavior,
  and any logs or screenshots that help illustrate the problem.
- Note your environment (OS, browser, Node.js version) and whether you were
  using the mock API or a production Lunch Money account.

## Submitting Pull Requests

- Fork or branch from `main` and keep your branch focused on a single change.
- Explain the problem, the solution, and any alternatives considered in the pull
  request description. Reference related issues.
- Update tests and docs when behavior changes.
- Use Conventional Commits for commit messages.

## Development Workflow

### Quick start

```bash
npm install
npm start
```

- `npm start` also keeps the generated runtime environment file in sync.
- If you change environment overrides, use `npm run generate:env` to refresh
  `src/environments/runtime-env.generated.ts`.
- If port `4200` is already in use, run `npm start -- --port 4201`.

### Before you open a PR

Pre-commit hooks will run automatically, but it helps to run the basics
yourself:

```bash
npm run lint
npx tsc --noEmit
npm test
```

If you changed dependencies, also run:

```bash
npm audit
```

### Using the Mock API

For local development without touching production:

```bash
export NG_APP_LUNCHMONEY_API_BASE=/v2
export NG_APP_LUNCHMONEY_API_KEY=mock-api-key-12345
npm start
```

The dev server proxies `/v2` to `https://alpha.lunchmoney.dev` to avoid CORS
errors. Use any API key value that is 11+ characters to authenticate against the
static mock server.

### Available Commands

- `npm start` - Development server with hot reload
- `npm test` - Run unit tests (headless, with coverage)
- `npm run test:watch` - Run unit tests in watch mode
- `npm run test:e2e` - Run Playwright E2E tests
- `npm run lint` - Lint and auto-fix TypeScript + SCSS
- `npm run build` - Production build

## Commit Message Format

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>: <description>

[optional body]
```

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`,
`ci`, `chore`

**Examples**:

```bash
feat: add category sorting options
fix: prevent token expiration on refresh
docs: update README installation steps
refactor: simplify budget state management
```

Commitlint enforces this automatically on every commit.

- Keep commit body lines at or below 100 characters. The repository VS Code
  settings (`.vscode/settings.json`) add a 100-character ruler and wrap commit
  messages automatically in the Source Control view so you can spot issues
  before the Husky hook runs.

## Style notes

Match existing patterns in the codebase:

- Standalone components + modern control flow (`@if`, `@for`)
- Signals for state (`signal`, `computed`, `input`, `output`)
- Dependency injection via `inject()`
- `ChangeDetectionStrategy.OnPush` in most components

When adding behavior, prefer adding/adjusting unit tests (co-located as
`*.spec.ts`).

## Communication

- Open questions, design proposals, or larger refactors can be shared via issues
  or discussions so maintainers and other contributors can weigh in early.
- When in doubt, ask—maintainers would rather help ahead of time than request
  large changes during review.

## Getting Help

- **Questions**: Open a
  [discussion](https://github.com/astiskala/lunch-buddy/discussions)
- **Bugs**: Create an [issue](https://github.com/astiskala/lunch-buddy/issues)
- **Security**: See [SECURITY.md](./SECURITY.md)

## Resources

- [Angular Documentation](https://angular.dev)
- [Signals Guide](https://angular.dev/guide/signals)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Playwright Testing](https://playwright.dev)
