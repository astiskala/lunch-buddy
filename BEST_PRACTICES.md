# Best Practices Implemented in Lunch Buddy

This document outlines the Angular best practices and modern patterns implemented in this application.

## 1. Dark Mode Support ✅

**Implementation:** CSS custom properties with `prefers-color-scheme` media query

The application supports both light and dark color schemes based on user's system preferences:
- CSS custom properties defined in `src/styles.scss` for consistent theming
- Primary color: `#FBB700` (golden yellow)
- Automatic theme switching using `@media (prefers-color-scheme: dark)`
- Smooth transitions between themes
- All components use CSS variables for colors instead of hardcoded values

**Example:**
```scss
:root {
  --color-primary: #fbb700;
  --color-bg-primary: #ffffff;
  --color-text-primary: #1a202c;
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-primary: #fbb700;
    --color-bg-primary: #121212;
    --color-text-primary: #e8e8e8;
  }
}
```

## 2. Standalone Components ✅
- ✅ All components are standalone (no NgModules)
- ✅ `standalone: true` is not explicitly set (it's the default in Angular 19+)
- ✅ Direct imports in component decorators

**Examples:**
- All components in `src/app/features/`
- All shared components

### 2. **Signal-Based State Management**
- ✅ Using `signal()` for reactive state
- ✅ Using `computed()` for derived state
- ✅ Using `input()` for component inputs instead of `@Input()`
- ✅ Using `output()` for component outputs instead of `@Output()`

**Examples:**
- `AuthService` - API key management with signals
- `BudgetService` - Central budget state with signals
- All dashboard components use signal inputs/outputs

### 3. **Dependency Injection with `inject()`**
- ✅ Using `inject()` function instead of constructor injection
- ✅ Cleaner, more functional approach

**Examples:**
```typescript
private readonly authService = inject(AuthService);
private readonly router = inject(Router);
```

### 4. **Modern Template Syntax**
- ✅ Using `@if`, `@for`, `@else` instead of `*ngIf`, `*ngFor`
- ✅ Using native control flow

**Examples:**
- All component templates use `@if` / `@else`
- Lists use `@for` with track expressions

### 5. **OnPush Change Detection**
- ✅ All components use `ChangeDetectionStrategy.OnPush`
- ✅ Optimizes performance by reducing change detection cycles

**Examples:**
```typescript
changeDetection: ChangeDetectionStrategy.OnPush
```

### 6. **Zoneless Change Detection**
- ✅ App configured with `provideZonelessChangeDetection()`
- ✅ Better performance, simpler mental model

**Location:** `src/app/app.config.ts`

### 7. **TypeScript Best Practices**
- ✅ Strict type checking enabled
- ✅ Comprehensive type definitions in `lunchmoney.types.ts`
- ✅ No use of `any` type (enforced by ESLint)

### 8. **Reactive Forms**
- ✅ Using FormsModule for form inputs
- ✅ Signal-based form state

**Examples:**
- Login page API key input
- Category preferences dialog

### 9. **HTTP Client with Interceptors**
- ✅ Custom HTTP interceptor for API authentication
- ✅ Uses `inject()` for dependency injection in functional interceptor

**Location:** `src/app/core/interceptors/lunchmoney.interceptor.ts`

### 10. **Router Guards with Functional API**
- ✅ Auth guard using `CanActivateFn`
- ✅ Protects dashboard route

**Location:** `src/app/core/guards/auth.guard.ts`

### 11. **Services with `providedIn: 'root'`**
- ✅ All services use singleton pattern
- ✅ Tree-shakeable

**Examples:**
- `AuthService`
- `LunchMoneyService`
- `BudgetService`

### 12. **LocalStorage for Persistence**
- ✅ API key stored in localStorage (not environment)
- ✅ Category preferences persisted
- ✅ Proper cleanup on logout

### 13. **Material Design Icons**
- ✅ Using `@angular/material` for icons
- ✅ No emoji dependencies
- ✅ Scalable, professional icons

### 14. **Comprehensive Testing**
- ✅ 48 passing unit tests
- ✅ Tests for all services and components
- ✅ Using Jasmine + Karma
- ✅ Test coverage for:
  - AuthService
  - Auth Guard
  - Login Component
  - Summary Hero
  - Category Card
  - Utility functions (budget, currency, date)

### 15. **ESLint Configuration**
- ✅ Angular ESLint rules
- ✅ TypeScript ESLint rules
- ✅ Accessibility rules for templates
- ✅ Style guide enforcement

**Configuration:** `.eslintrc.json`

### 16. **Accessibility**
- ✅ Keyboard navigation support
- ✅ ARIA labels on interactive elements
- ✅ Focus management
- ✅ Semantic HTML

**Examples:**
- Category cards have tabindex and keyboard handlers
- Buttons have proper aria-labels

### 17. **Code Organization**
- ✅ Feature-based folder structure
- ✅ Core services in `core/`
- ✅ Shared utilities in `shared/`
- ✅ Feature modules in `features/`

**Structure:**
```
src/app/
├── core/
│   ├── guards/
│   ├── interceptors/
│   ├── models/
│   └── services/
├── features/
│   ├── dashboard/
│   └── login/
└── shared/
    ├── services/
    └── utils/
```

### 18. **Environment Configuration**
- ✅ Separate dev and prod environments
- ✅ Optional API keys (not required for compilation)
- ✅ Type-safe environment objects

### 19. **Performance Optimizations**
- ✅ OnPush change detection
- ✅ Zoneless mode
- ✅ Lazy loading potential (routes configured)
- ✅ Computed signals for derived data
- ✅ Signal-based reactivity (no RxJS overhead for simple state)

### 20. **State Management Patterns**
- ✅ Centralized state in `BudgetService`
- ✅ Signal-based updates
- ✅ Immutable update patterns with `update()` and `set()`
- ✅ No global state library needed (signals sufficient)

## 📝 Scripts Available

```json
{
  "start": "ng serve",
  "build": "ng build",
  "test": "ng test",
  "lint": "ng lint"
}
```

## 📚 References

- [Angular Style Guide](https://angular.dev/style-guide)
- [Angular Signals](https://angular.dev/guide/signals)
- [Angular Components](https://angular.dev/essentials/components)
- [Dependency Injection](https://angular.dev/essentials/dependency-injection)
