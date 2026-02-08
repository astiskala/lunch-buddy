# Lunch Buddy

Lunch Buddy is an Angular PWA for tracking Lunch Money budget progress across the month.

Production app: https://lunch-buddy.app

## What It Does

- Shows expense and income category progress.
- Includes recurring expense projections and per-category activity.
- Supports category preferences (ordering, visibility, notification settings).
- Works offline with cached data and background sync support.

## Tech Stack

- Angular 21 (standalone components + signals + zoneless change detection)
- Vitest (via Angular unit-test builder)
- Playwright (E2E)
- Custom service worker for caching and background workflows

## Getting Started

### Prerequisites

- Node.js `>=24.0.0`
- npm `10+`

### Install and Run

```bash
npm install
npm start
```

Dev server: http://localhost:4200

## Runtime Environment Variables

These are optional and can be provided with `NG_APP_*` keys:

- `NG_APP_LUNCHMONEY_API_BASE` - Base URL for Lunch Money API (or `/v2` for mock API)
- `NG_APP_LUNCHMONEY_API_KEY` - Default API key for local/dev usage

Values are baked into `src/environments/runtime-env.generated.ts` via `npm run generate:env`.

## Mock API Development

```bash
export NG_APP_LUNCHMONEY_API_BASE=/v2
export NG_APP_LUNCHMONEY_API_KEY=mock-api-key-12345
npm start
```

Notes:

- `/v2` is proxied to `https://alpha.lunchmoney.dev` during local dev.
- Mock login accepts keys with length `>= 11`.

## Diagnostics (Optional)

Diagnostics endpoints use Upstash Redis and optional admin retrieval tooling.

Required server env vars:

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `DIAGNOSTICS_ADMIN_TOKEN` (required to retrieve logs)

Optional for MCP setup tooling:

- `DIAGNOSTICS_WRITE_SECRET`

Fetch logs locally:

```bash
DIAGNOSTICS_ADMIN_TOKEN=your_secret node tools/fetch-logs.mjs <supportCode>
```

`tools/fetch-logs.mjs` uses `VERCEL_URL` if present, otherwise `http://localhost:3000`.

## Commands

- `npm start` - Start dev server
- `npm run build` - Build production assets
- `npm test` - Run unit tests with coverage
- `npm run test:watch` - Run unit tests in watch mode
- `npm run test:e2e` - Run Playwright tests
- `npm run lint` - Auto-fix lint/style/format issues
- `npm run lint:check` - Run lint/style/format checks
- `npm run generate:env` - Regenerate runtime env module

## Security and API Key Storage

When entered in the login screen, the Lunch Money API key is stored in browser `localStorage`.

## Contributing

- See [CONTRIBUTING.md](./CONTRIBUTING.md) for workflow and checks.
- Report security issues through [SECURITY.md](./SECURITY.md), not public issues.

## Deployment

This project is configured for Vercel (`vercel.json`), but can be deployed as static assets on other hosts.

- Build output directory: `dist/lunch-buddy`
- Ensure SPA routing falls back to `index.html`
