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

- Node.js 22 or newer (see `package.json`→`engines`)
- npm 10+ (ships with current Node releases)

### Install dependencies

```bash
npm install
```

### Configure your environment

1. Generate the runtime environment file before your first run:
   ```bash
   npm run generate:env
   ```
2. (Optional) Export Lunch Money credentials so the app can authenticate without prompting:
   ```bash
   export NG_APP_LUNCHMONEY_API_KEY=<your-token>
   export NG_APP_LUNCHMONEY_API_BASE=https://dev.lunchmoney.app/v1   # optional override
   ```
   These variables are convenience shortcuts during development—the app also supports entering your API key in the login screen, where it is stored safely in local browser storage. You can skip the environment export entirely if you prefer that flow. After unsetting or changing overrides, rerun `npm run generate:env` to refresh `src/environments/runtime-env.generated.ts`.

### Run the web app

```bash
npm start
```

The dev server runs at `http://localhost:4200/` with hot reload. On first load you will be prompted for your Lunch Money API key; the key is stored client-side and synchronised with the background worker.

## Mock Lunch Money API

Launch the bundled mock server for deterministic fixtures:

```bash
npm run mock:server
```

- Default base URL: `http://localhost:4600/v1` (override with `MOCK_API_PORT`).
- When using the mock, point the Angular app at it:
  ```bash
  export NG_APP_LUNCHMONEY_API_BASE=http://localhost:4600/v1
  npm start
  ```
- The fixtures simulate current-month budgets, recurring expenses, and transactions without requiring an API key. Run `npm run generate:env` after swapping back to real credentials.

## Useful npm Scripts

- `npm run lint:ci` – Angular + TypeScript linting (read-only).
- `npm run lint:styles:ci` – Stylelint with zero-warning threshold.
- `npm run test` – Karma unit tests in headless Chrome.
- `npm run build` – Production bundle written to `dist/lunch-buddy/browser`.
- `npm run watch` – Continuous build pipeline for integration environments.
- `npm run generate:env` – Regenerate runtime environment file from current `NG_APP_*` variables.
- `npm run mock:server` – Start the local Lunch Money mock API.

## Development Workflow Notes

- Keep pull requests scoped; the reactive architecture makes incremental changes safer and easier to review.
- Prefer signals and the `input()`/`output()` helpers for component APIs so typing stays strict.
- Background work and notifications should go through `BackgroundSyncService` to avoid competing service-worker channels.
- Accessibility matters: interactive cards expose keyboard handlers, state changes rely on text + colour, and the offline banner uses `role="alert"`. Carry these patterns forward for new UI.

## Testing & Quality

- TypeScript runs in strict mode; ESLint, Stylelint, and Prettier enforce consistency.
- Unit tests cover authentication, guards, dashboard widgets, offline flows, and notification helpers.
- Add or update tests whenever behaviour changes—see `CONTRIBUTING.md` for expectations.
- Consider end-to-end coverage (Playwright or Cypress) for the login flow and category management; this remains an open roadmap item.

## Continuous Integration

GitHub Actions (`.github/workflows/ci.yml`) validates every push and pull request targeting `main`:

- Uses Node.js 22 with cached npm dependencies.
- Runs `npm run lint:ci` and `npm run lint:styles:ci`.
- Executes unit tests in headless Chrome via `npm run test -- --browsers=ChromeHeadlessNoSandbox --progress=false`.
- Builds the production bundle with `npm run build`.
- On pushes to `main`, a follow-up job runs `semantic-release` to publish changelog entries and version tags.

## Deployment

Preconfigured `vercel.json` makes Vercel deployments straightforward:

1. Import the repository into Vercel and keep the detected Angular preset (`npm run build`, output `dist/lunch-buddy/browser`).
2. Define environment variables such as `NG_APP_LUNCHMONEY_API_KEY` (and other `NG_APP_*` overrides) in Vercel project settings.
3. Trigger a deploy; subsequent pushes to `main` publish automatically with the bundled security headers.

You can adapt the same build artefacts for other hosts—serve `dist/lunch-buddy/browser` behind a static file server that rewrites unmatched routes to `index.html`.

## Additional Documentation

- `CONTRIBUTING.md` – Contribution workflow, coding conventions, and best practices.
- `SECURITY.md` – Responsible disclosure process for vulnerabilities.
