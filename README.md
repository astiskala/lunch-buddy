# Lunch Buddy

Lunch Buddy is a progressive web app that visualises your Lunch Money budgets with real-time signals, offline caching, and push notifications when categories drift off track. Secure login, background sync, and a local mock API make it safe to explore production-like behaviour without touching real money.

## Feature Highlights

- Secure authentication flow stores the Lunch Money API key locally, mirrors the credential to the background worker, and supports quick sign-out.
- Dashboard surfaces expense and income categories, month progress, upcoming recurring charges, and per-category activity—including friendly offline hints when fresh data cannot be fetched.
- Category preferences dialog lets you reorder and hide categories, tweak warning thresholds, opt into push notifications, and decide whether uncleared transactions count toward the budget.
- Custom service worker extends Angular’s default worker to cache data, perform background refreshes, and raise native notifications when categories exceed targets.
- Mock Lunch Money API (`npm run mock:server`) serves realistic fixtures for `/me`, `/categories`, `/budgets`, `/recurring_expenses`, and `/transactions`, keeping development local-first.

## Architecture Overview

- Built on Angular 20 with standalone components, signal-based state, and modern template control flow (`@if`, `@for`).
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
# Terminal 1
npm run mock:server

# Terminal 2
export NG_APP_LUNCHMONEY_API_BASE=http://localhost:4600/v2
npm start
```

## Commands

- `npm start` - Development server
- `npm test` - Unit tests
- `npm run test:e2e` - E2E tests
- `npm run lint` - Lint and fix
- `npm run build` - Production build
- `npm run analyze` - Bundle analysis

## Development

- **Pre-commit hooks**: Automatically run formatting, type-checking, and tests on every commit
- **Code quality**: TypeScript strict mode, ESLint, Stylelint, Prettier
- **Testing**: Unit tests (Karma/Jasmine) + E2E tests (Playwright) with 80% coverage requirement
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
- **Code Quality**: SonarCloud analysis on every PR

### Test Coverage

Run `npm run test:coverage` to generate coverage reports. Minimum thresholds:

- Statements: 80%
- Branches: 80%
- Functions: 80%
- Lines: 80%

### Pre-commit Hooks

Husky enforces quality checks before commits:

- Prettier formatting via lint-staged
- TypeScript type checking
- Unit tests for changed files
- Conventional commit message format

See `DEVELOPMENT.md` for detailed testing guidelines.

## Continuous Integration

GitHub Actions (`.github/workflows/ci.yml`) validates every push and pull request targeting `main`:

1. **Dependency installation** with Node.js 22 and npm caching
2. **Linting** - TypeScript, templates, and SCSS
3. **Security audit** - npm audit for vulnerabilities
4. **Unit tests** - Headless Chrome with code coverage
5. **Coverage upload** - Results sent to Codecov
6. **SonarCloud analysis** - Code quality and security scanning
7. **Production build** - Verify bundle creation

### Quality Gates

- All linting must pass (zero warnings)
- All tests must pass
- No high/critical security vulnerabilities
- Code coverage thresholds maintained
- SonarCloud quality gate passed

On successful merge to `main`, semantic-release automatically:

- Generates changelog from conventional commits
- Updates version in package.json
- Creates GitHub release with notes
- Publishes git tags

## Deployment

Preconfigured `vercel.json` makes Vercel deployments straightforward:

1. Import the repository into Vercel and keep the detected Angular preset (`npm run build`, output `dist/lunch-buddy/browser`).
2. Define environment variables such as `NG_APP_LUNCHMONEY_API_KEY` (and other `NG_APP_*` overrides) in Vercel project settings.
3. Trigger a deploy; subsequent pushes to `main` publish automatically with the bundled security headers.

You can adapt the same build artefacts for other hosts—serve `dist/lunch-buddy/browser` behind a static file server that rewrites unmatched routes to `index.html`.

## Additional Documentation

- `DEVELOPMENT.md` – Comprehensive development guide with testing, debugging, and best practices
- `CONTRIBUTING.md` – Contribution workflow, coding conventions, and PR guidelines
- `SECURITY.md` – Responsible disclosure process for vulnerabilities
- `.github/pull_request_template.md` – PR checklist and standards
- `.github/ISSUE_TEMPLATE/` – Standardized bug reports and feature requests
