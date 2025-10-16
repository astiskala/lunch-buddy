# Security Policy

Lunch Buddy is a browser-based Progressive Web App that connects to the Lunch Money API. This file documents how I manage security, which versions receive fixes, and what you should know when deploying or contributing.

## Supported Versions

| Branch / Version | Supported          | Notes                                  |
| ---------------- | ------------------ | -------------------------------------- |
| `main`           | :white_check_mark: | Actively developed; security fixes land here first. |

When a security fix is merged into `main`, publish a fresh production build (for Vercel this happens automatically on push). Older builds are considered unsupported.

## Reporting a Vulnerability

- **Preferred channel:** Open a private report through GitHub Security Advisories (Security → Advisories → Report a vulnerability).  
- **Alternative:** Email `lunch-buddy@adamstiskala.com` with a clear subject such as “Security report – Lunch Buddy”.  
- **Response window:** I aim to acknowledge new reports within 3 days and provide a remediation plan or status update within 10 days.  
- **Disclosure:** Please do not create public issues for suspected vulnerabilities until I publish a fix. If I cannot reproduce a report I will request additional detail; if a report is out-of-scope I will explain why.

When reporting, include:

- A concise description of the issue and potential impact.
- Steps to reproduce (commands, browser details, environment variables).
- Any mitigating factors you identified.
- Whether the issue has already been disclosed elsewhere.

I appreciate proof-of-concept code, but please avoid exfiltrating or modifying real user data.

## Dependency Management

- Use `npm ci` (enforced by CI) to install dependencies deterministically.
- Run `npm audit` (or `npm audit --production`) before releases and address high/critical findings promptly.
- Keep Angular, RxJS, and tooling aligned with the versions declared in `package.json`. Breaking security fixes may require major upgrades—plan accordingly.
- Vercel deployments build under Node.js 22 per the `engines.node` setting; match this version locally to avoid mismatch-related vulnerabilities.

## Secure Development Practices

- Run `npm run lint`, `npm run lint:styles:ci`, and `npm test` before submitting pull requests. CI blocks merges on lint/test failures.
- Never commit real Lunch Money API keys. Use the `NG_APP_` environment variables and the generated `src/environments/runtime-env.generated.ts` (regenerated via `npm run generate:env`) to keep secrets out of VCS.
- When adding third-party libraries, prefer well-maintained packages with clear security guidance; document any new network destinations in the CSP.

## Disclosure Process

1. Confirm the report and assess severity.
2. Create a private issue or security advisory draft with reproduction details.
3. Develop and test a fix on a private branch.
4. Notify the reporter once a fix is merged to `main` and a patched release/build is available.
5. Publish an advisory summarizing impact, fixed commit hash, and mitigation guidance.

## Contact

For security questions that are not vulnerability reports, email `lunch-buddy@adamstiskala.com`.
