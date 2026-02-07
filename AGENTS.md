# Agent Instructions

## Stack Notes

- Framework: Angular 21 (standalone components, signals, zoneless change detection).
- Unit testing: Angular `@angular/build:unit-test` builder with Vitest.
- E2E testing: Playwright.

## Local Commands

- `npm start` - Run the Angular dev server.
- `npm start -- --port 4201` - Use when port `4200` is already in use.
- `npm test` - Run Vitest unit tests with coverage.
- `npm run test:watch` - Run Vitest in watch mode.
- `npm run test:e2e` - Run Playwright tests.
- `npm run lint` - Run lint/format fixers.
- `npm run build` - Production build.

## Testing Migration Context

- Karma and `source-map-explorer` were removed from this repository.
- Jasmine-style specs are supported via `/Users/adam/Source/lunch-buddy/src/test/vitest-jasmine-compat.ts`.
- App builds must not include test setup files. Keep `/Users/adam/Source/lunch-buddy/tsconfig.app.json` excluding `src/test/**/*.ts`.

## Change Expectations

- If you modify testing setup, keep `npm test` and `npm start` working.
- Update `README.md` and `CONTRIBUTING.md` when changing scripts or workflow.
