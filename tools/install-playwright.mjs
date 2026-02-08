#!/usr/bin/env node
/**
 * @fileoverview Installs Playwright browsers while avoiding unsupported system
 * dependency installs in CI environments such as Vercel.
 */

import { spawnSync } from 'node:child_process';
import { accessSync, constants } from 'node:fs';

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

// Vercel build images do not expose a stable npx path and do not need the
// Playwright runtime, so skip installation entirely.
if (isVercel) {
  console.log('Skipping Playwright browser download on Vercel builds.');
  process.exit(0);
}

// Resolve the absolute npx path to avoid PATH-related security issues.
// Check common fixed installation paths without relying on PATH.
// Prioritize standard Linux paths used by CI environments such as Vercel.
const getNpxPath = () => {
  const commonPaths = [
    '/usr/bin/npx', // Standard Linux path (Vercel, most CI)
    '/usr/local/bin/npx', // Common Linux alternative
    '/opt/homebrew/bin/npx', // macOS Apple Silicon (Homebrew)
  ];

  for (const path of commonPaths) {
    try {
      accessSync(path, constants.X_OK);
      return path;
    } catch {
      continue;
    }
  }

  throw new Error('npx executable not found in common paths');
};

const npxPath = getNpxPath();

const runInstall = args =>
  spawnSync(npxPath, ['playwright', ...args], {
    stdio: 'inherit',
    shell: false,
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
