# Contributing to Lunch Buddy

Thanks for helping improve Lunch Buddy! These guidelines outline the expectations for issues, pull requests, and day-to-day development so contributions stay smooth and consistent.

## Before You Start

- Review `README.md` for project goals, architecture notes, and local setup instructions.
- Check open issues or discussions to confirm the work has not already been started.
- For substantial changes, consider opening an issue first so the approach can be aligned before coding.

## Reporting Issues

- Search existing issues to avoid duplicates and add to the conversation when relevant.
- Include a clear description, steps to reproduce, expected vs. actual behavior, and any logs or screenshots that help illustrate the problem.
- Note your environment (OS, browser, Node.js version) and whether you were using the mock API or a production Lunch Money account.

## Submitting Pull Requests

- Fork or branch from `main` and keep your branch focused on a single change.
- Explain the problem, the solution, and any alternatives considered in the pull request description. Reference related issues.
- Update documentation and tests as needed—especially when behavior changes or new features ship.
- Run the local verification commands before pushing:
  - `npm run lint:ci`
  - `npm run lint:styles:ci`
  - `npm run test`
  - `npm run build` when build-impacting changes are introduced
- Ensure commits are meaningful and leave the codebase in a working state. Squash if requested during review.

## Development Workflow

- Start the dev server with `npm start`. This command also keeps the generated runtime environment file in sync.
- Use `npm run generate:env` to clear or refresh `src/environments/runtime-env.generated.ts` after changing environment overrides.
- Launch the mock Lunch Money API locally with `npm run mock:server` when you need realistic data without touching production.
- Keep pull requests small and iterative. When a change spans multiple subsystems, break it into reviewable chunks.

## Architecture & Code Style

These conventions were already in place—follow them for new code so the project stays consistent.

### Component Architecture

- All feature and shared components are standalone and list their own `imports`; Angular 20’s default `standalone` flag keeps decorators concise.
- Templates use the modern control-flow syntax (`@if`, `@for`) and favor class/style bindings over `ngClass`/`ngStyle`.
- Local state leans on signals, while component inputs/outputs use the `input()`/`output()` helpers to stay type-safe and ergonomic.

```ts
@Component({
  selector: 'summary-hero',
  imports: [CommonModule, MatIconModule, MatButtonModule],
  templateUrl: './summary-hero.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SummaryHeroComponent {
  readonly monthStart = input.required<string>();
  readonly customize = output<void>();
  readonly monthName = computed(() =>
    new Date(this.monthStart()).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    })
  );
}
```

- Feature and shared components opt into `ChangeDetectionStrategy.OnPush`. The root `App` component keeps the default strategy so it can update host bindings that toggle offline styling without extra boilerplate.
- Dependency injection consistently uses the functional `inject()` API across services, guards, and interceptors (`BudgetService`, `AuthService`, `lunchmoneyInterceptor`, etc.).

### State, Persistence, and Background Work

- `BudgetService` centralizes dashboard state with readonly signals, derives computed views, and persists user preferences in `localStorage`.
- `AuthService` stores the Lunch Money API key in the browser and keeps the background worker synchronized whenever credentials change.
- `BackgroundSyncService` pushes configuration to the service worker and registers periodic/background sync so budget alerts stay fresh even when the app is closed.
- Online status flows through `OfflineService`; `OfflineIndicatorComponent` reads the signal and announces connectivity changes via a `role="alert"` banner, while global styles add top padding when the banner appears.

### Networking & Offline Experience

- `lunchmoney.interceptor.ts` attaches the API key only for `*.lunchmoney.app` requests, falling back to environment-provided credentials if no stored key exists.
- `public/custom-service-worker.js` layers on top of Angular’s worker to:
  - cache Lunch Money API responses with a network-first strategy and a 10 s timeout,
  - prune obsolete caches during activation,
  - coordinate periodic budget checks and push notifications when categories go over budget.
- `ngsw-config.json` prefetches core assets and serves navigation requests with the `performance` (cache-first) strategy, so the app shell opens offline. API responses are cached under `dataGroups` for up to 24 hours.

### Performance & Quality Tooling

- `provideZonelessChangeDetection()` removes Zone.js overhead; derived values use `computed()` to avoid redundant work, and effects update data reactively.
- TypeScript runs in strict mode. ESLint (`npm run lint:ci`) and Stylelint (`npm run lint:styles:ci`) enforce Angular, TypeScript, and accessibility rules; Prettier maintains formatting.
- Unit tests cover core flows across services, guards, utilities, and UI widgets (e.g., `AuthService`, `BudgetService`, dashboard components, offline indicator, push notification service). Run them with `npm run test`.
- `.github/workflows/ci.yml` installs dependencies with Node 20, runs both lint suites, executes the Karma suite headlessly, and builds the production bundle.

## Communication

- Open questions, design proposals, or larger refactors can be shared via issues or discussions so maintainers and other contributors can weigh in early.
- When in doubt, ask—maintainers would rather help ahead of time than request large changes during review.
