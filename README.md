# Lunch Buddy

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 20.3.5.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

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
4. Trigger the initial deploy; subsequent pushes to `main` will rebuild and deploy automatically.

Optional: enable Netlify deploy previews for pull requests to review changes before merging.
