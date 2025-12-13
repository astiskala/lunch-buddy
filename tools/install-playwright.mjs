#!/usr/bin/env node
/**
 * Ensures Playwright browsers are installed, while avoiding unsupported
 * system dependency installs inside certain CI environments (e.g. Vercel).
 */

import { spawnSync } from 'node:child_process';

const skipExplicitly =
  ['1', 'true'].includes(
    String(process.env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD ?? '').toLowerCase()
  ) || process.env.PLAYWRIGHT_SKIP_INSTALL === '1';

if (skipExplicitly) {
  console.log('Skipping Playwright browser download (explicit opt-out).');
  process.exit(0);
}

const isVercel = Boolean(process.env.VERCEL);
const isLinux = process.platform === 'linux';
const shouldInstallDeps = isLinux && !isVercel;

const runInstall = args =>
  spawnSync('npx', ['playwright', ...args], {
    stdio: 'inherit',
  });

const tryInstall = (args, allowFallback) => {
  const result = runInstall(args);

  if (result.error) {
    console.error('Failed to execute Playwright CLI:', result.error);
    process.exit(1);
  }

  if ((result.status ?? 0) === 0) {
    return;
  }

  if (allowFallback) {
    console.warn(
      'Playwright install with system dependencies failed; retrying without --with-deps.'
    );
    tryInstall(['install', 'chromium'], false);
    return;
  }

  process.exit(result.status ?? 1);
};

const initialArgs = shouldInstallDeps
  ? ['install', '--with-deps', 'chromium']
  : ['install', 'chromium'];

tryInstall(initialArgs, shouldInstallDeps);
