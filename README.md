# Lunch Buddy

## Current Capabilities

- Secure login flow persists the Lunch Money API key locally, mirrors credentials to the background worker, and supports logging back out.
- Dashboard surfaces expense and income categories, month progress, upcoming recurring charges, and per-category activity—including offline hints when fresh data cannot be fetched.
- Category preferences dialog lets people reorder categories, hide items, adjust warning thresholds, opt into push notifications, and decide whether to include uncleared transactions.
- Custom service worker layers on top of Angular’s worker to keep cached data available offline, refresh budgets in the background, and raise native notifications when categories slip over budget.
- Mock Lunch Money API (`npm run mock:server`) provides realistic fixtures for local development without touching production data.

## Architecture Notes

- Angular 20 standalone components with signal-based state, `input()`/`output()` bindings, and modern control flow (`@if`, `@for`).
- `BudgetService` owns derived dashboard state, persists preferences in `localStorage`, and pushes updates to the background sync channel.
- `AuthService`, guards, and the HTTP interceptor rely on the functional `inject()` API and read runtime overrides from `NG_APP_*` environment variables when present.
- Offline UX is handled by `OfflineService` + `OfflineIndicatorComponent`, while global styles adjust layout when the banner is visible.
- Background sync and notifications are centralised in `BackgroundSyncService` so other features can reuse the same channel to the service worker.

## Quality & Tooling

- TypeScript runs in strict mode; ESLint (`npm run lint:ci`), Stylelint (`npm run lint:styles:ci`), and Prettier enforce the code style.
- Unit tests exercise authentication flows, guards, dashboard components, offline behaviour, background sync helpers, and utility modules. Run them with `npm run test`.
- GitHub Actions CI installs dependencies with Node 22, runs both lint suites, executes the Karma suite headlessly in Chrome, and builds the production bundle.
- The runtime environment file is generated automatically (`npm run generate:env`) so secrets stay out of source control, and Vercel inherits Node 22 from `package.json`’s `engines` field.

## Opportunities

1. Add an end-to-end harness (Playwright or Cypress) to cover the login flow and dashboard interactions.
2. Expand automated coverage for the service worker background sync workflow.
3. Integrate budget mutation flows once Lunch Money exposes the required write scopes.

## Development server

Start the dev server via the npm script so the generated runtime environment file stays up to date:

```bash
npm start
```

This runs the Angular CLI dev server and serves the app at `http://localhost:4200/`, hot-reloading as you modify source files.

On first load the app presents a login screen where you can paste your Lunch Money API key. If you prefer to pre-seed credentials (or override the API base URL) for local development, export `NG_APP_LUNCHMONEY_API_KEY` and/or `NG_APP_LUNCHMONEY_API_BASE` in your shell or define them in an `.env` file before running `npm start`. Those `NG_APP_*` variables are captured in `src/environments/runtime-env.generated.ts`; run `npm run generate:env` after unsetting overrides so the generated file returns to a clean state.

## Mock Lunch Money API

The project includes a lightweight mock implementation of the Lunch Money API for development and testing. It serves realistic sample data for the endpoints that Lunch Buddy consumes (`/me`, `/categories`, `/budgets`, `/recurring_expenses`, and `/transactions`).

To start the mock server:

```bash
npm run mock:server
```

By default it listens on `http://localhost:4600/v1`. You can change the port by exporting `MOCK_API_PORT` before running the command.

Point the Angular app at the mock server by exporting `NG_APP_LUNCHMONEY_API_BASE=http://localhost:4600/v1` (and optionally `NG_APP_LUNCHMONEY_API_KEY`) before launching `npm start`. When you are done with the mock configuration, run `npm run generate:env` to clear the generated runtime file.

The mock API feeds the app with month-to-date activity. Budgets scale with the current calendar progress, transactions are regenerated with realistic payees and amounts, and recurring expenses surface the next billing dates.

An API key is not required when using the mock API, but you may leave `NG_APP_LUNCHMONEY_API_KEY` set—requests without the Lunch Money domain simply omit the authorization header.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

To run the non-destructive style linting used by CI, execute:

```bash
npm run lint:styles:ci
```

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

## Continuous Integration

This project includes a GitHub Actions workflow in `.github/workflows/ci.yml` that runs on every push to `main` and on pull requests targeting `main`. The workflow performs the following steps:

- Install dependencies with `npm ci` using Node.js 20.
- Run Angular linting (`npm run lint:ci`) and style linting (`npm run lint:styles:ci`).
- Execute Karma unit tests headlessly in Chrome (`npm run test -- --watch=false --browsers=ChromeHeadlessNoSandbox --progress=false`).
- Build the production bundle (`npm run build`).

## Publishing to GitHub

1. Create an empty GitHub repository (e.g., `adam/lunch-buddy`) through the GitHub UI.
2. Add the new remote and push the existing history:

   ```bash
   git remote add origin git@github.com:<your-username>/<your-repo>.git
   git push -u origin main
   ```

   Replace `<your-username>/<your-repo>` with the repository you created.

Once pushed, the GitHub Actions workflow will start running automatically.

## Vercel Deployment

This repository ships with a `vercel.json` that prepares Vercel to:

- Build with `npm run build` and publish the static bundle in `dist/lunch-buddy/browser`.
- Serve the Angular SPA via a catch-all rewrite to `index.html`.
- Apply the strict security headers previously served from Netlify.

The `package.json` `engines.node` field requests Node.js 22 so the build environment matches local development. You can confirm or adjust this under **Project Settings → Build & Development Settings**.

To enable automatic deployments:

1. Sign in to [Vercel](https://vercel.com/) and choose **New Project → Import Git Repository**.
2. Connect your GitHub account and select the repository you pushed above.
3. Accept the detected settings, or explicitly set **Framework Preset** to `Angular`, **Build Command** to `npm run build`, and **Output Directory** to `dist/lunch-buddy/browser`. Vercel reads rewrites and headers from `vercel.json`.
4. In **Settings → Environment Variables**, add `NG_APP_LUNCHMONEY_API_KEY` with your Lunch Money API token so builds have access to the credential. Add any other `NG_APP_*` variables your deployment needs.
5. Trigger the initial deploy; subsequent pushes to `main` will build and deploy automatically.

Optional: enable Vercel preview deployments for pull requests to review changes before merging.
