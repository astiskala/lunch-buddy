# Lunch Buddy

Lunch Buddy is a progressive web app that visualises your Lunch Money budgets with real-time signals, offline caching, and push notifications when categories drift off track. Secure login, background sync, and the Lunch Money mock API make it safe to explore production-like behaviour without touching real money.

## Feature Highlights

- Secure authentication flow stores the Lunch Money API key locally, mirrors the credential to the background worker, and supports quick sign-out.
- Dashboard surfaces expense and income categories, month progress, upcoming recurring charges, and per-category activity—including friendly offline hints when fresh data cannot be fetched.
- Category preferences dialog lets you reorder and hide categories, explains how at-risk status is determined by month progress, opt into push notifications, and decide whether uncleared transactions count toward the budget.
- Custom service worker extends Angular’s default worker to cache data, perform background refreshes, and raise native notifications when categories exceed targets.
- Static mock Lunch Money API (`https://alpha.lunchmoney.dev/v2`) supports safe testing with production-shaped data.

## Architecture Overview

- Built on Angular 21 with standalone components, signal-based state, and modern template control flow (`@if`, `@for`).
- `BudgetService` derives reactive dashboard state, persists user preferences to `localStorage`, and coordinates with the background sync channel.
- `AuthService`, guards, and the HTTP interceptor rely on the functional `inject()` API and respect runtime overrides supplied via `NG_APP_*` variables.
- Offline UX flows through `OfflineService` and an `OfflineIndicatorComponent` banner; global styles shift layout whenever connectivity changes.
- `BackgroundSyncService` and a custom `public/custom-service-worker.js` handle cache pruning, periodic budget checks, and notification delivery.
- Zone-less change detection (via `provideZonelessChangeDetection()`) keeps renders lightweight while signals and `computed()` avoid redundant work.

## Getting Started

### Prerequisites

- Node.js 22+ and npm 10+

### Install and Run

```bash
npm install
npm start  # Dev server at http://localhost:4200
```

### Optional: Configure Environment

```bash
export NG_APP_LUNCHMONEY_API_KEY=<your-token>
npm start
```

Or enter your API key in the login screen—it's stored securely in your browser.

## Mock API for Development

```bash
export NG_APP_LUNCHMONEY_API_BASE=/v2
export NG_APP_LUNCHMONEY_API_KEY=mock-api-key-12345
npm start
```

The dev server proxies `/v2` to `https://alpha.lunchmoney.dev` to avoid CORS errors.
Use any API key value that is 11+ characters to authenticate against the static mock server.

## Commands

- `npm start` - Development server
- `npm test` - Unit tests
- `npm run test:e2e` - E2E tests
- `npm run lint` - Lint and fix
- `npm run build` - Production build
- `npm run analyze` - Bundle analysis

## Angular MCP Server

- Angular CLI v21 ships with a Model Context Protocol server (`ng mcp`). Use it so AI copilots can query workspace-aware tools instead of shelling out.
- Quick health check: `npm run mcp:check` starts the MCP server in local-only mode and verifies it sees this workspace.
- Example MCP host config (set `cwd` to your clone path):

```json
{
  "mcpServers": {
    "angular-cli": {
      "command": "npm",
      "args": ["exec", "--", "ng", "mcp"],
      "cwd": "/Users/adam/Source/lunch-buddy",
      "env": {
        "NG_CLI_ANALYTICS": "false"
      }
    }
  }
}
```

Add `--read-only` to the args to register only read-only tools, or `--local-only` to disable tools that need internet access (e.g., documentation search).

## Development

### Getting Started

```bash
npm install          # Install dependencies (also sets up Husky hooks)
npm start            # Start dev server (http://localhost:4200)
```

### Before Every Commit

**Pre-commit hooks automatically run** (via Husky) to ensure code quality:

```bash
# Run these manually to catch issues early:
npm run lint    # Auto-fix linting & formatting
npm test        # Run unit tests with coverage
npx tsc --noEmit # Type check without building
```

**What runs automatically on commit:**

1. Prettier formatting on staged files
2. ESLint + Stylelint auto-fixes
3. TypeScript type checking (`tsc --noEmit`)
4. Full unit test suite
5. Commit message validation (Conventional Commits)

**If commit fails**, fix the reported issues and try again. Most linting issues are auto-fixed by `npm run lint`.

### Code Quality & Testing

- **TypeScript**: Strict mode with comprehensive type checking
- **Linting**: ESLint (TypeScript/templates) + Stylelint (SCSS) + Prettier
- **Testing**: Unit tests (Karma/Jasmine) + E2E tests (Playwright)
- **Coverage**: 80% minimum (statements, branches, functions, lines)
- **CI/CD**: Automated testing, linting, security audits, and builds on every push

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines and architecture details.

## Deployment

Ready for Vercel (see `vercel.json`):

1. Import repository
2. Set `NG_APP_LUNCHMONEY_API_KEY` environment variable
3. Deploy

Works with any static host—serve `dist/lunch-buddy/browser` with fallback to `index.html`.

## Documentation

- [CONTRIBUTING.md](./CONTRIBUTING.md) - Development guide and architecture
- [SECURITY.md](./SECURITY.md) - Security policy

## Testing & Quality

### Code Quality Tools

- **TypeScript**: Strict mode with comprehensive type checking
- **ESLint**: Angular-specific rules with Prettier integration
- **Stylelint**: SCSS best practices enforcement
- **Commitlint**: Conventional commit format validation

### Testing Strategy

- **Unit Tests**: Karma + Jasmine with 80% coverage thresholds
- **E2E Tests**: Playwright with multi-browser support and accessibility checks
- **Coverage Reporting**: Integrated with Codecov

### Test Coverage

Run `npm test` to generate coverage reports. Minimum thresholds:

- Statements: 80%
- Branches: 80%
- Functions: 80%
- Lines: 80%

### Pre-commit Hooks

Husky enforces quality checks before commits (configured in `.husky/pre-commit` and `.husky/commit-msg`):

**Automatic checks on every commit:**

- **lint-staged** - Auto-formats and fixes staged files (ESLint, Stylelint, Prettier)
- **Type checking** - `tsc --noEmit` validates TypeScript across entire codebase
- **Unit tests** - Full test suite runs headlessly with coverage validation
- **Commit message** - Must follow Conventional Commits format (feat, fix, docs, etc.)

**Troubleshooting commit failures:**

```bash
# If lint-staged fails:
npm run lint                    # Auto-fix most issues
git add .                       # Stage the fixes

# If type checking fails:
npx tsc --noEmit --pretty      # See all type errors

# If tests fail:
npm run test:watch             # Interactive test runner
npm test                       # Run full suite

# If commit message fails:
# Use format: "type: description" (e.g., "feat: add new feature")
# Valid types: feat, fix, docs, style, refactor, perf, test, build, ci, chore

# Check for security vulnerabilities (before pushing)
npm audit              # Check for vulnerabilities
npm audit fix          # Auto-fix and update package-lock.json
```

**To bypass hooks** (not recommended): `git commit --no-verify`

See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed development guidelines.

## Continuous Integration

GitHub Actions validates every push and pull request. **Pre-commit hooks ensure local quality**, while CI enforces the same checks in the cloud.

### CI Pipeline (`.github/workflows/ci.yml`)

**Every push/PR to `main` runs:**

1. **Dependency installation** - Node.js 22 with npm cache
2. **Linting** - ESLint (TypeScript/templates) + Stylelint (SCSS)
3. **Security audit** - `npm audit --audit-level=high` (fails on high/critical vulnerabilities)
4. **Unit tests** - ChromeHeadless with code coverage
5. **Coverage upload** - Results sent to Codecov
6. **Production build** - Verifies successful bundle creation

### E2E Tests (`.github/workflows/e2e.yml`)

**Runs on pull requests only:**

- Playwright tests across Chrome, Firefox, Safari
- Accessibility testing with @axe-core
- Login flow and dashboard validation

### Quality Gates

**Must pass to merge:**

- ✅ All linting (zero warnings)
- ✅ All unit and E2E tests
- ✅ No high/critical security vulnerabilities
- ✅ 80% code coverage maintained
- ✅ Production build succeeds

**If CI fails but local pre-commit passed:**

**Most common: Security vulnerabilities**

```bash
npm audit              # Check what's vulnerable
npm audit fix          # Fix automatically (updates package-lock.json)
git add package-lock.json
git commit -m "fix: resolve security vulnerabilities"
git push
```

**Other CI failures:**

- E2E failures: run `npm run test:e2e` to reproduce
- Coverage drops: add tests for new code
- Build failures: run `npm run build` to test production mode

**Note:** The CI security audit runs `npm audit --audit-level=high`, blocking merges if high/critical vulnerabilities exist. Pre-commit hooks don't check this, so always run `npm audit` before pushing.

### Automated Releases

On successful merge to `main`, semantic-release automatically:

- Analyzes conventional commits to determine version bump
- Generates CHANGELOG.md from commit messages
- Updates package.json version
- Creates GitHub release with notes
- Publishes git tags

## Deployment

Preconfigured `vercel.json` makes Vercel deployments straightforward:

1. Import the repository into Vercel and keep the detected Angular preset (`npm run build`, output `dist/lunch-buddy/browser`).
2. Define environment variables such as `NG_APP_LUNCHMONEY_API_KEY` (and other `NG_APP_*` overrides) in Vercel project settings.
3. Trigger a deploy; subsequent pushes to `main` publish automatically with the bundled security headers.

You can adapt the same build artefacts for other hosts—serve `dist/lunch-buddy/browser` behind a static file server that rewrites unmatched routes to `index.html`.

## Additional Documentation

- `CONTRIBUTING.md` – Contribution workflow, coding conventions, and PR guidelines
- `SECURITY.md` – Responsible disclosure process for vulnerabilities
- `.github/pull_request_template.md` – PR checklist and standards
- `.github/ISSUE_TEMPLATE/` – Standardized bug reports and feature requests
