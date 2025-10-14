# Lunch Buddy

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 20.3.5.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

Before starting the server, provide your Lunch Money API key via an environment variable named `NG_APP_LUNCHMONEY_API_KEY`. You can export it in your shell or create an `.env` file at the project root with `NG_APP_LUNCHMONEY_API_KEY=<your-api-key>` so the Angular CLI loads it automatically.

## Mock Lunch Money API

The project includes a lightweight mock implementation of the Lunch Money API for development and testing. It serves realistic sample data for the endpoints that Lunch Buddy consumes (`/me`, `/categories`, `/budgets`, `/recurring_expenses`, and `/transactions`).

To start the mock server:

```bash
npm run mock:server
```

By default it listens on `http://localhost:4600/v1`. You can change the port by exporting `MOCK_API_PORT` before running the command.

Point the Angular app at the mock by overriding the base URL when you start the dev server:

```bash
NG_APP_LUNCHMONEY_API_BASE=http://localhost:4600/v1
npm start
```

`npm start` (and other Angular CLI scripts) automatically capture any `NG_APP_*` variables that are present when the command begins and writes them to `src/environments/runtime-env.generated.ts`. If you temporarily override the API base or key, run `npm run generate:env` afterward to clear the generated file before committing.

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

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

## Continuous Integration

This project includes a GitHub Actions workflow in `.github/workflows/ci.yml` that runs on every push to `main` and on pull requests targeting `main`. The workflow performs the following steps:

- Install dependencies with `npm ci` using Node.js 20.
- Run Angular linting (`npm run lint`) and style linting (`npm run lint:styles:ci`).
- Execute Karma unit tests headlessly in Chrome (`npm run test -- --watch=false --browsers=ChromeHeadless --progress=false`).
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

## Netlify Deployment

This repository ships with a `netlify.toml` that instructs Netlify to:

- Build with `npm run build`.
- Serve the SPA from `dist/lunch-buddy/browser`.
- Use Node.js 20 (`NODE_VERSION=20`).
- Redirect all routes to `index.html` for Angular router support.

To enable automatic deployments:

1. Sign in to [Netlify](https://app.netlify.com/) and choose **Add new site → Import an existing project**.
2. Connect your GitHub account and select the repository you pushed above.
3. Accept the detected build settings (command `npm run build`, publish directory `dist/lunch-buddy/browser`), or adjust to match `netlify.toml`.
4. In **Site settings → Environment variables**, add `NG_APP_LUNCHMONEY_API_KEY` with your Lunch Money API token so builds have access to the credential.
5. Trigger the initial deploy; subsequent pushes to `main` will rebuild and deploy automatically.

Optional: enable Netlify deploy previews for pull requests to review changes before merging.
