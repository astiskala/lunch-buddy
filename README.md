# Lunch Buddy

Lunch Buddy is a progressive web app (PWA) that visualises your Lunch Money
budgets to help you keep category budgets on track as you progress through the
month.

Lunch Buddy is accessible at https://lunch-buddy.app.

## Feature Highlights

- Secure authentication flow stores the Lunch Money API key locally, mirrors the
  credential to the background worker, and supports quick sign-out.
- Dashboard surfaces expense and income categories, month progress, upcoming
  recurring charges, and per-category activity—including.
- Category preferences dialog lets you reorder and hide categories, opt into
  push notifications, and decide whether uncleared transactions count toward the
  budget.
- Offline support (with cached data), background refreshes, and native
  notifications when categories exceed targets.

## Architecture Overview

- Built on Angular 21 with standalone components, signal-based state, and modern
  template control flow (`@if`, `@for`).
- `BudgetService` derives reactive dashboard state, persists user preferences to
  `localStorage`, and coordinates with the background sync channel.
- `AuthService`, guards, and the HTTP interceptor rely on the functional
  `inject()` API and respect runtime overrides supplied via `NG_APP_*`
  variables.
- Offline UX flows through `OfflineService` and an `OfflineIndicatorComponent`
  banner; global styles shift layout whenever connectivity changes.
- `BackgroundSyncService` and a custom `public/custom-service-worker.js` handle
  cache pruning, periodic budget checks, and notification delivery.
- Zone-less change detection (via `provideZonelessChangeDetection()`) keeps
  renders lightweight while signals and `computed()` avoid redundant work.

## Getting Started

### Prerequisites

- Node.js 22+ and npm 10+

### Install and Run

```bash
npm install
npm start  # Dev server at http://localhost:4200
```

### Optional: Configure Environment

To enable all features, you can provide several optional environment variables.

#### Diagnostics & Troubleshooting

Lunch Buddy includes an optional diagnostic logging mode to help troubleshoot issues.
Logs are stored server-side in Redis (Upstash) and are automatically deleted after 7 days.

1.  **Provision Redis**: In Vercel Marketplace, add the **Upstash Redis** integration to your project.
2.  **Environment Variables**:
    - `UPSTASH_REDIS_REST_URL`: Provided automatically by the integration.
    - `UPSTASH_REDIS_REST_TOKEN`: Provided automatically by the integration.
    - `DIAGNOSTICS_ADMIN_TOKEN`: A secret string used to retrieve logs via the CLI.
3.  **Fetch Logs**:
    ```bash
    DIAGNOSTICS_ADMIN_TOKEN=your_secret node tools/fetch-logs.mjs <supportCode>
    ```

#### API Proxies

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

The dev server proxies `/v2` to `https://alpha.lunchmoney.dev` to avoid CORS
errors. Use any API key value that is 11+ characters to authenticate against the
static mock server.

## Commands

- `npm start` - Development server
- `npm test` - Unit tests
- `npm run test:e2e` - E2E tests
- `npm run lint` - Lint and fix
- `npm run build` - Production build
- `npm run analyze` - Bundle analysis

## Contributing

This is a small, self-maintained project. Issues and PRs are welcome.

- See [CONTRIBUTING.md](./CONTRIBUTING.md) for the workflow and local checks.
- Security issues: please follow [SECURITY.md](./SECURITY.md) instead of opening
  a public issue.

## Deployment

Ready for Vercel (see `vercel.json`): set `NG_APP_LUNCHMONEY_API_KEY` and
deploy. For other static hosts, serve `dist/lunch-buddy/browser` with an
`index.html` fallback.
