# Best Practices Implemented in Lunch Buddy

This document captures the conventions already in the codebase so new contributions stay aligned.

## UI & Theming

- CSS custom properties in `src/styles.scss` drive both palettes. The primary brand color is `#44958c` (teal) and the secondary accent is `#f0b800` (gold); dark mode redefines the same variables instead of duplicating component styles.
- Angular Material theming is configured once on `html` via `mat.theme`, and feature components import only the Material primitives they actually use.

```scss
:root {
  --color-primary: #44958c;
  --color-secondary: #f0b800;
  --color-bg-primary: #fff;
}
@media (prefers-color-scheme: dark) {
  :root {
    --color-bg-primary: #1e1e1e;
    --color-text-primary: #e8e8e8;
  }
}
```

## Component Architecture

- All feature and shared components are standalone and list their own `imports`; Angular 20’s default `standalone` flag keeps decorators concise.
- Templates use the new control-flow syntax (`@if`, `@for`) and favour class/style bindings over `ngClass`/`ngStyle`.
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
    new Date(this.monthStart()).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
  );
}
```

- Feature/shared components opt into `ChangeDetectionStrategy.OnPush`. The root `App` component keeps the default strategy so it can update host bindings that toggle offline styling without extra boilerplate.
- Dependency injection consistently uses the functional `inject()` API across services, guards, and interceptors (`BudgetService`, `AuthService`, `lunchmoneyInterceptor`, etc.).

## State, Persistence, and Background Work

- `BudgetService` centralises dashboard state with readonly signals, derives computed views, and persists user preferences in `localStorage`.
- `AuthService` stores the Lunch Money API key in the browser and keeps the background worker synchronised whenever credentials change.
- `BackgroundSyncService` pushes configuration to the service worker and registers periodic/background sync so budget alerts stay fresh even when the app is closed.
- Online status flows through `OfflineService`; `OfflineIndicatorComponent` reads the signal and announces connectivity changes via a `role="alert"` banner, while global styles add top padding when the banner appears.

## Networking & Offline Experience

- `lunchmoney.interceptor.ts` attaches the API key only for `*.lunchmoney.app` requests, falling back to environment-provided credentials if no stored key exists.
- `public/custom-service-worker.js` layers on top of Angular’s worker to:
  - cache Lunch Money API responses with a network-first strategy and a 10 s timeout,
  - prune obsolete caches during activation,
  - coordinate periodic budget checks and push notifications when categories go over budget.
- `ngsw-config.json` prefetches core assets and serves navigation requests with the `performance` (cache-first) strategy, so the app shell opens offline. API responses are cached under `dataGroups` for up to 24 hours.

## Performance & Quality Tooling

- `provideZonelessChangeDetection()` removes Zone.js overhead; derived values use `computed()` to avoid redundant work, and effects update data reactively.
- TypeScript runs in strict mode. ESLint (`npm run lint:ci`) and Stylelint (`npm run lint:styles:ci`) enforce Angular, TypeScript, and accessibility rules; Prettier maintains formatting.
- Unit tests cover core flows across services, guards, utilities, and UI widgets (e.g., `AuthService`, `BudgetService`, dashboard components, offline indicator, push notification service). Run them with `npm run test`.
- `.github/workflows/ci.yml` installs dependencies with Node 20, runs both lint suites, executes the Karma suite headlessly, and builds the production bundle.

## Accessibility & UX

- Interactive cards (`category-card.component.html`) expose `role="button"` plus keyboard handlers for Enter/Space, and their detail drawers use `role="region"` with descriptive `aria-label`s.
- The offline banner uses `role="alert"` so assistive tech announces connectivity loss, and status badges rely on text plus colour to communicate state.
- Layouts favour semantic headings and remain responsive via SCSS media queries, keeping templates uncluttered.

Keep future contributions aligned with these patterns—prefer signals, modern Angular syntax, and small standalone components with explicit imports.
