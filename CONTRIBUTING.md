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
- Ensure commits are meaningful and leave the codebase in a working state. Squash if requested during review.

## Development Workflow

- Start the dev server with `npm start`. This command also keeps the generated runtime environment file in sync.
- Use `npm run generate:env` to clear or refresh `src/environments/runtime-env.generated.ts` after changing environment overrides.
- Use the static mock Lunch Money API (`https://alpha.lunchmoney.dev/v2`) when you need realistic data without touching production.
- Keep pull requests small and iterative. When a change spans multiple subsystems, break it into reviewable chunks.

### Before You Commit

**Pre-commit hooks automatically run** on every commit via Husky, but you can (and should) run these checks manually during development to catch issues early:

```bash
# Run all quality checks at once
npm run lint        # Auto-fixes TypeScript, SCSS, and formatting
npm test            # Runs unit tests with coverage

# Or run individual checks
npm run lint:check  # Check without auto-fixing
npx tsc --noEmit    # Type check without building
```

**What happens on commit:**

1. **lint-staged** - Prettier formats staged files, ESLint fixes TypeScript/template issues
2. **tsc --noEmit** - Type checks entire codebase (no compilation)
3. **npm test** - Runs full unit test suite headlessly
4. **commitlint** - Validates commit message format (Conventional Commits)

**If pre-commit checks fail:**

- Review error messages carefully
- Fix the issues (many are auto-fixed by `npm run lint`)
- Stage fixed files with `git add`
- Try committing again

**Pro tips:**

- Run `npm run lint && npm test` before staging files to catch issues before the commit hook runs
- The VS Code settings include a 100-character ruler for commit messages to help you stay within limits
- **Check for security vulnerabilities** before pushing: `npm audit` (see Security Audit section below)

### Using the Mock API

For local development without touching production:

```bash
export NG_APP_LUNCHMONEY_API_BASE=/v2
export NG_APP_LUNCHMONEY_API_KEY=mock-api-key-12345
npm start
```

The dev server proxies `/v2` to `https://alpha.lunchmoney.dev` to avoid CORS errors.
Use any API key value that is 11+ characters to authenticate against the static mock server.

### Available Commands

- `npm start` - Development server with hot reload
- `npm test` - Run unit tests (headless, with coverage)
- `npm run test:watch` - Run unit tests in watch mode (with UI)
- `npm run test:e2e` - Run Playwright E2E tests
- `npm run lint` - Lint and auto-fix TypeScript + SCSS
- `npm run build` - Production build
- `npm run analyze` - Analyze bundle sizes

## Commit Message Format

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>: <description>

[optional body]
```

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`

**Examples**:

```bash
feat: add category sorting options
fix: prevent token expiration on refresh
docs: update README installation steps
refactor: simplify budget state management
```

Commitlint enforces this automatically on every commit.

- Keep commit body lines at or below 100 characters. The repository VS Code settings (`.vscode/settings.json`)
  add a 100-character ruler and wrap commit messages automatically in the Source Control view so you can spot
  issues before the Husky hook runs.

## Code Style & Architecture

### Angular Best Practices

**Signals for State**:

```typescript
export class ExampleComponent {
  // Input signals
  readonly data = input.required<string>();

  // Output functions
  readonly action = output<void>();

  // Computed state
  readonly displayValue = computed(() => this.data().toUpperCase());
}
```

**Modern Templates**:

```html
<!-- ✅ Use @if, @for -->
@if (isVisible()) {
<div>Content</div>
} @for (item of items(); track item.id) {
<div>{{ item.name }}</div>
}

<!-- ❌ Avoid *ngIf, *ngFor -->
```

**Dependency Injection**:

```typescript
export class ExampleService {
  private readonly http = inject(HttpClient);
  // Avoid constructor injection
}
```

### Key Conventions

- **Standalone components** - No NgModules
- **OnPush change detection** - Except root component
- **Signals** - For all state management
- **Strict TypeScript** - No `any` without justification
- **Functional inject()** - No constructor DI

### Testing

**Unit Tests** (alongside source files as `*.spec.ts`):

```typescript
describe('YourService', () => {
  let service: YourService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(YourService);
  });

  it('should work', () => {
    expect(service.getData()).toEqual(expected);
  });
});
```

**E2E Tests** (in `e2e/` directory):

```typescript
test('should display login page', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/.*login/);
});
```

**Coverage Requirements**: 80% minimum (statements, branches, functions, lines)

## Automated Quality Checks

### Pre-commit Hooks (Local)

Husky runs automatically on every commit (see `.husky/pre-commit`):

1. **lint-staged** - Formats and lints staged files:
   - `*.{ts,js,html}` → ESLint fix + Prettier format
   - `*.scss` → Stylelint fix + Prettier format
   - `*.{json,md,yml,yaml}` → Prettier format

2. **TypeScript type checking** - `tsc --noEmit` validates types across entire codebase

3. **Unit tests** - `npm test` runs full test suite headlessly with coverage

4. **Commit message validation** - `commitlint` enforces Conventional Commits format (see `.husky/commit-msg`)

**If pre-commit fails:**

```bash
# Check what failed
git status  # See which files need fixing

# Fix linting issues
npm run lint

# Fix type errors
npx tsc --noEmit  # Shows all type errors

# Fix test failures
npm run test:watch  # Interactive test runner

# Stage fixes and retry
git add .
git commit -m "fix: your message"
```

### CI Pipeline (GitHub Actions)

Runs on every push and pull request to `main` (see `.github/workflows/ci.yml`):

**Build and Test Job:**

1. ✅ **ESLint** - `ng lint --fix=false` (no auto-fixing in CI)
2. ✅ **Stylelint** - Checks all SCSS files with zero warnings
3. ✅ **Security audit** - `npm audit --audit-level=high` fails on high/critical vulnerabilities
4. ✅ **Unit tests** - Full suite with ChromeHeadless (Node 22)
5. ✅ **Coverage upload** - Results sent to Codecov
6. ✅ **Production build** - `npm run build` verifies successful bundle creation

**E2E Tests Job** (separate workflow `.github/workflows/e2e.yml`):

- Runs on pull requests only
- Uses Playwright for multi-browser testing
- Includes accessibility checks with @axe-core

**Release Job** (only on main branch):

- Runs semantic-release after successful build
- Auto-generates changelog from conventional commits
- Creates GitHub releases and tags
- Updates package.json version

**All checks must pass before merging.** If CI fails but pre-commit passed, it's usually due to:

- **Security vulnerabilities** in dependencies (most common - see below)
- Missing test coverage for new code
- E2E test failures (run `npm run test:e2e` locally)
- Build issues specific to production mode

### Security Audit Failures (Common CI Issue)

**The CI pipeline runs `npm audit --audit-level=high`** which fails if any high or critical vulnerabilities are found. Pre-commit hooks don't check this, so you might not see issues until CI runs.

**To prevent CI failures, check for vulnerabilities before pushing:**

```bash
# Check for vulnerabilities
npm audit

# Fix automatically (updates package-lock.json)
npm audit fix

# If automatic fixes aren't available, try force updates
npm audit fix --force  # ⚠️ May introduce breaking changes

# Review what changed
git diff package-lock.json

# Commit the security fixes
git add package-lock.json
git commit -m "fix: update dependencies to resolve security vulnerabilities"
```

**Best practice:** Run `npm audit` before pushing any PR. If CI fails with security audit errors, run `npm audit fix` locally, test that everything still works, and push the updated `package-lock.json`.

## Architecture & Code Style

These conventions were already in place—follow them for new code so the project stays consistent.

### Component Architecture

- All feature and shared components are standalone and list their own `imports`; Angular 20's default `standalone` flag keeps decorators concise.
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

- `lunchmoney.interceptor.ts` attaches the API key only for `*.lunchmoney.dev` (and previous `*.lunchmoney.app`) requests, falling back to environment-provided credentials if no stored key exists.
- `public/custom-service-worker.js` layers on top of Angular's worker to:
  - cache Lunch Money API responses with a network-first strategy and a 10 s timeout,
  - prune obsolete caches during activation,
  - coordinate periodic budget checks and push notifications when categories go over budget.
- `ngsw-config.json` prefetches core assets and serves navigation requests with the `performance` (cache-first) strategy, so the app shell opens offline. API responses are cached under `dataGroups` for up to 24 hours.

### Performance & Quality Tooling

- `provideZonelessChangeDetection()` removes Zone.js overhead; derived values use `computed()` to avoid redundant work, and effects update data reactively.
- TypeScript runs in strict mode. ESLint (`npm run lint`) and Stylelint enforce Angular, TypeScript, and accessibility rules; Prettier maintains formatting.
- Unit tests cover core flows across services, guards, utilities, and UI widgets (e.g., `AuthService`, `BudgetService`, dashboard components, offline indicator, push notification service). Run them with `npm run test`.
- `.github/workflows/ci.yml` installs dependencies with Node 20, runs both lint suites, executes the Karma suite headlessly, and builds the production bundle.

## Communication

- Open questions, design proposals, or larger refactors can be shared via issues or discussions so maintainers and other contributors can weigh in early.
- When in doubt, ask—maintainers would rather help ahead of time than request large changes during review.

## Getting Help

- **Questions**: Open a [discussion](https://github.com/astiskala/lunch-buddy/discussions)
- **Bugs**: Create an [issue](https://github.com/astiskala/lunch-buddy/issues)
- **Security**: See [SECURITY.md](./SECURITY.md)

## Resources

- [Angular 20 Documentation](https://angular.dev)
- [Signals Guide](https://angular.dev/guide/signals)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Playwright Testing](https://playwright.dev)
