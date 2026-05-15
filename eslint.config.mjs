import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import ngeslint from 'angular-eslint';
import rxjsXPlugin from 'eslint-plugin-rxjs-x';
import prettierPlugin from 'eslint-plugin-prettier';
import eslintConfigPrettier from 'eslint-config-prettier';
import unusedImportsPlugin from 'eslint-plugin-unused-imports';
import sonarjsPlugin from 'eslint-plugin-sonarjs';
import boundariesPlugin from 'eslint-plugin-boundaries';

// Files that need type-aware linting but live outside the TS project graph.
// Every block that initializes `projectService` must declare the same list —
// typescript-eslint creates a single project-service instance per process and
// uses whichever block's config is registered first.
const ALLOW_DEFAULT_PROJECT = [
  'public/*.js',
  'tools/*.js',
  'tools/*.mjs',
  'karma.conf.js',
  'e2e/*.ts',
];

export default tseslint.config(
  {
    // Global ignores
    ignores: [
      'projects/**/*',
      'playwright.config.ts',
      'dist/**/*',
      'coverage/**/*',
      'playwright-report/**/*',
      'test-results/**/*',
      '**/.angular/**/*',
    ],
  },
  // Base config for all files
  js.configs.recommended,

  // TypeScript files (excludes e2e — those are linted by a non-type-checked
  // block below since they live outside the project graph).
  {
    files: ['**/*.ts'],
    ignores: ['e2e/**/*.ts'],
    extends: [
      ...tseslint.configs.strictTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
      ...ngeslint.configs.tsRecommended,
      sonarjsPlugin.configs.recommended,
      eslintConfigPrettier,
    ],
    plugins: {
      'rxjs-x': rxjsXPlugin,
      prettier: prettierPlugin,
      'unused-imports': unusedImportsPlugin,
      boundaries: boundariesPlugin,
    },
    linterOptions: {
      noInlineConfig: false,
      reportUnusedDisableDirectives: 'error',
    },
    languageOptions: {
      parserOptions: {
        projectService: { allowDefaultProject: ALLOW_DEFAULT_PROJECT },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    settings: {
      'boundaries/elements': [
        { type: 'core', pattern: 'src/app/core/**' },
        { type: 'shared', pattern: 'src/app/shared/**' },
        { type: 'features', pattern: 'src/app/features/**' },
      ],
      'boundaries/ignore': ['**/*.spec.ts'],
    },
    rules: {
      ...rxjsXPlugin.configs.recommended.rules,
      'prettier/prettier': 'error',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'error',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      'no-unused-vars': 'off',
      'no-undef': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-expect-error': 'allow-with-description',
          'ts-ignore': true,
          'ts-nocheck': true,
          'ts-check': false,
          minimumDescriptionLength: 10,
        },
      ],
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'app',
          style: 'camelCase',
        },
      ],
      '@angular-eslint/no-output-native': 'error',
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: ['app', 'dashboard', 'summary', 'category', 'recurring'],
          style: 'kebab-case',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/unified-signatures': 'off', // Disabled due to bug with TypeScript 5.9+
      '@angular-eslint/prefer-standalone': 'error',
      '@angular-eslint/use-lifecycle-interface': 'error',
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          rules: [
            // features can import from core, shared, and other features
            {
              from: [{ type: 'features' }],
              allow: [
                { to: { type: 'core' } },
                { to: { type: 'shared' } },
                { to: { type: 'features' } },
              ],
            },
            // core can import from shared and other core
            {
              from: [{ type: 'core' }],
              allow: [{ to: { type: 'shared' } }, { to: { type: 'core' } }],
            },
            // shared can import from other shared only
            {
              from: [{ type: 'shared' }],
              allow: [{ to: { type: 'shared' } }],
            },
          ],
        },
      ],
    },
  },

  // JavaScript files — use the TS parser with default-project type info so
  // we can run the type-aware rules that catch the patterns SonarQube flags.
  {
    files: ['**/*.js'],
    extends: [sonarjsPlugin.configs.recommended, eslintConfigPrettier],
    plugins: {
      prettier: prettierPlugin,
      '@typescript-eslint': tseslint.plugin,
    },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: { allowDefaultProject: ALLOW_DEFAULT_PROJECT },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      'prettier/prettier': 'error',
      // Catches `x && x.y` / `!x || !x.y` patterns the TS path already lints.
      '@typescript-eslint/prefer-optional-chain': 'error',
      // Catches regex-based endsWith/startsWith checks.
      '@typescript-eslint/prefer-string-starts-ends-with': 'error',
    },
  },

  // Playwright e2e tests — TS but outside the typed project graph.
  {
    files: ['e2e/**/*.ts'],
    extends: [
      js.configs.recommended,
      sonarjsPlugin.configs.recommended,
      eslintConfigPrettier,
    ],
    plugins: {
      prettier: prettierPlugin,
      '@typescript-eslint': tseslint.plugin,
    },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: { allowDefaultProject: ALLOW_DEFAULT_PROJECT },
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        URL: 'readonly',
        URLSearchParams: 'readonly',
        document: 'readonly',
        window: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        indexedDB: 'readonly',
        navigator: 'readonly',
        console: 'readonly',
        fetch: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
      },
    },
    rules: {
      'prettier/prettier': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/prefer-string-starts-ends-with': 'error',
    },
  },

  // HTML files
  {
    files: ['**/*.html'],
    extends: [
      ...ngeslint.configs.templateRecommended,
      ...ngeslint.configs.templateAccessibility,
      eslintConfigPrettier,
    ],
    rules: {},
  },

  // Service Worker files
  {
    files: ['public/custom-service-worker.js'],
    languageOptions: {
      globals: {
        // Service Worker specific globals
        importScripts: 'readonly',
        skipWaiting: 'readonly',

        // Web APIs available in Service Workers
        caches: 'readonly',
        clients: 'readonly',
        registration: 'readonly',

        // Standard Web APIs
        console: 'readonly',
        fetch: 'readonly',
        Request: 'readonly',
        Response: 'readonly',
        Headers: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        AbortController: 'readonly',

        // Timers
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',

        // IndexedDB
        indexedDB: 'readonly',
        IDBDatabase: 'readonly',
        IDBTransaction: 'readonly',
        IDBRequest: 'readonly',

        // Date and Math
        Date: 'readonly',
        Math: 'readonly',

        // JSON and other built-ins
        JSON: 'readonly',
        Promise: 'readonly',
        Array: 'readonly',
        Object: 'readonly',
        Set: 'readonly',
        Map: 'readonly',
        Number: 'readonly',
        String: 'readonly',
        Intl: 'readonly',
      },
    },
  },

  // Karma configuration (Node.js)
  {
    files: ['karma.conf.js'],
    languageOptions: {
      globals: {
        require: 'readonly',
        module: 'readonly',
        exports: 'writable',
        __dirname: 'readonly',
        process: 'readonly',
      },
    },
  },

  // Tooling scripts (CommonJS)
  {
    files: ['tools/**/*.js'],
    languageOptions: {
      globals: {
        require: 'readonly',
        module: 'readonly',
        exports: 'writable',
        __dirname: 'readonly',
        process: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
      },
    },
  },

  // Tooling scripts (ESM)
  {
    files: ['tools/**/*.mjs'],
    languageOptions: {
      globals: {
        console: 'readonly',
        process: 'readonly',
      },
    },
  }
);
