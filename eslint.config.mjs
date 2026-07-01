import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import ngeslint from 'angular-eslint';
import rxjsXPlugin from 'eslint-plugin-rxjs-x';
import prettierPlugin from 'eslint-plugin-prettier';
import eslintConfigPrettier from 'eslint-config-prettier';
import unusedImportsPlugin from 'eslint-plugin-unused-imports';
import sonarjsPlugin from 'eslint-plugin-sonarjs';
import boundariesPlugin from 'eslint-plugin-boundaries';
import unicornPlugin from 'eslint-plugin-unicorn';

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
      unicornPlugin.configs.recommended,
      eslintConfigPrettier,
    ],
    plugins: {
      'rxjs-x': rxjsXPlugin,
      prettier: prettierPlugin,
      'unused-imports': unusedImportsPlugin,
      boundaries: boundariesPlugin,
      unicorn: unicornPlugin,
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
      // Enhanced Unicorn rules for stricter code quality
      'unicorn/better-regex': 'error',
      'unicorn/catch-error-name': 'error',
      'unicorn/consistent-boolean-name': 'off', // Too strict
      'unicorn/consistent-class-member-order': 'off', // Too strict
      'unicorn/consistent-destructuring': 'error',
      'unicorn/consistent-function-scoping': 'off', // Too strict for complex patterns
      'unicorn/empty-brace-spaces': 'error',
      'unicorn/error-message': 'error',
      'unicorn/escape-case': 'error',
      'unicorn/expiring-todo-comments': 'warn',
      'unicorn/explicit-length-check': 'error',
      'unicorn/import-style': 'error',
      'unicorn/name-replacements': 'off', // Too strict on abbreviations
      'unicorn/new-for-builtins': 'error',
      'unicorn/no-abusive-eslint-disable': 'error',
      'unicorn/no-array-callback-reference': 'error',
      'unicorn/no-array-concat-in-loop': 'error',
      'unicorn/no-array-reduce': 'error',
      'unicorn/no-array-reverse': 'error',
      'unicorn/no-console-spaces': 'error',
      'unicorn/no-declarations-before-early-exit': 'off', // Too strict
      'unicorn/no-document-cookie': 'error',
      'unicorn/no-global-object-property-assignment': 'error',
      'unicorn/no-hex-escape': 'error',
      'unicorn/no-instanceof-array': 'error',
      'unicorn/no-invalid-remove-event-listener': 'error',
      'unicorn/no-keyword-prefix': 'off', // Disabled for test mocking
      'unicorn/no-lonely-if': 'error',
      'unicorn/no-negated-condition': 'error',
      'unicorn/no-negation-in-equality-check': 'error',
      'unicorn/no-nested-ternary': 'error',
      'unicorn/no-new-array': 'error',
      'unicorn/no-new-buffer': 'error',
      'unicorn/no-null': 'warn',
      'unicorn/no-object-as-default-parameter': 'error',
      'unicorn/no-process-exit': 'error',
      'unicorn/no-useless-fallback-in-spread': 'error',
      'unicorn/no-useless-length-check': 'error',
      'unicorn/no-useless-promise-resolve-reject': 'error',
      'unicorn/no-useless-spread': 'error',
      'unicorn/no-useless-switch-case': 'error',
      'unicorn/no-array-sort': 'error',
      'unicorn/no-break-in-nested-loop': 'warn', // Sometimes necessary
      'unicorn/no-unreadable-for-of-expression': 'warn', // Allow simple cases
      'unicorn/no-error-property-assignment': 'warn', // Sometimes necessary for tests
      'unicorn/no-await-expression-member': 'warn', // Allow in some cases
      'unicorn/no-non-function-verb-prefix': 'warn', // Allow in some cases
      'unicorn/prefer-add-event-listener': 'warn', // Allow onerror in some cases
      'unicorn/prefer-minimal-ternary': 'warn', // Allow 3-part ternaries
      'unicorn/prefer-number-is-safe-integer': 'warn', // Allow isFinite in some cases
      'unicorn/prefer-iterator-to-array': 'warn', // .toArray() not available on all iterators
      'unicorn/prefer-global-number-constants': 'off', // Conflicts with SonarQube (typescript:S7773) which requires Number.NaN
      'unicorn/number-literal-case': 'error',
      'unicorn/numeric-separators-style': 'warn',
      'unicorn/prefer-array-find': 'error',
      'unicorn/prefer-array-flat-map': 'error',
      'unicorn/prefer-array-flat': 'error',
      'unicorn/prefer-array-index-of': 'error',
      'unicorn/prefer-array-some': 'error',
      'unicorn/prefer-at': 'error',
      'unicorn/prefer-code-point': 'error',
      'unicorn/prefer-date-now': 'error',
      'unicorn/prefer-default-parameters': 'error',
      'unicorn/prefer-dom-node-append': 'error',
      'unicorn/prefer-dom-node-remove': 'error',
      'unicorn/prefer-dom-node-text-content': 'error',
      'unicorn/prefer-export-from': 'error',
      'unicorn/prefer-includes': 'error',
      'unicorn/prefer-logical-operator-over-ternary': 'error',
      'unicorn/prefer-math-min-max': 'error',
      'unicorn/prefer-math-trunc': 'error',
      'unicorn/prefer-modern-dom-apis': 'error',
      'unicorn/prefer-modern-math-apis': 'error',
      'unicorn/prefer-negative-index': 'error',
      'unicorn/prefer-node-protocol': 'error',
      'unicorn/prefer-number-properties': 'error',
      'unicorn/prefer-object-from-entries': 'error',
      'unicorn/prefer-optional-catch-binding': 'error',
      'unicorn/prefer-prototype-methods': 'error',
      'unicorn/prefer-query-selector': 'error',
      'unicorn/prefer-reflect-apply': 'error',
      'unicorn/prefer-regexp-test': 'error',
      'unicorn/prefer-set-has': 'error',
      'unicorn/prefer-string-replace-all': 'error',
      'unicorn/prefer-string-slice': 'error',
      'unicorn/prefer-string-starts-ends-with': 'error',
      'unicorn/prefer-string-trim-start-end': 'error',
      'unicorn/prefer-switch': 'error',
      'unicorn/prefer-ternary': 'error',
      'unicorn/prefer-top-level-await': 'warn', // Warn instead of error
      'unicorn/prefer-url-href': 'error',
      'unicorn/relative-url-style': 'error',
      'unicorn/require-array-join-separator': 'error',
      'unicorn/require-number-to-fixed-digits-argument': 'error',
      'unicorn/require-post-message-target-origin': 'error',
      'unicorn/string-content': 'warn',
      'unicorn/switch-case-braces': 'error',
      'unicorn/template-indent': 'warn',
      'unicorn/throw-new-error': 'error',
      // Disable overly strict sonarjs rules for test quality
      'sonarjs/prefer-specific-assertions': 'off', // Cosmetic for tests
      'sonarjs/no-floating-point-equality': 'warn', // Allow in some cases
      'sonarjs/no-trivial-assertions': 'warn', // Allow in tests
      'sonarjs/hooks-before-test-cases': 'warn', // Allow in some tests
      '@typescript-eslint/no-empty-function': [
        'error',
        { allow: ['arrowFunctions'] },
      ],
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
      unicorn: unicornPlugin,
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
      // Unicorn rules for JavaScript
      'unicorn/better-regex': 'error',
      'unicorn/catch-error-name': 'error',
      'unicorn/consistent-destructuring': 'error',
      'unicorn/empty-brace-spaces': 'error',
      'unicorn/error-message': 'error',
      'unicorn/escape-case': 'error',
      'unicorn/explicit-length-check': 'error',
      'unicorn/new-for-builtins': 'error',
      'unicorn/no-abusive-eslint-disable': 'error',
      'unicorn/no-array-callback-reference': 'error',
      'unicorn/no-console-spaces': 'error',
      'unicorn/no-hex-escape': 'error',
      'unicorn/no-global-object-property-assignment': 'error',
      'unicorn/no-instanceof-array': 'error',
      'unicorn/no-keyword-prefix': 'off', // Disabled for test mocking
      'unicorn/no-lonely-if': 'error',
      'unicorn/no-negated-condition': 'error',
      'unicorn/no-negation-in-equality-check': 'error',
      'unicorn/no-nested-ternary': 'error',
      'unicorn/no-new-array': 'error',
      'unicorn/no-new-buffer': 'error',
      'unicorn/no-null': 'warn',
      'unicorn/no-object-as-default-parameter': 'error',
      'unicorn/no-process-exit': 'error',
      'unicorn/no-useless-fallback-in-spread': 'error',
      'unicorn/no-useless-length-check': 'error',
      'unicorn/no-useless-spread': 'error',
      'unicorn/no-useless-switch-case': 'error',
      'unicorn/number-literal-case': 'error',
      'unicorn/prefer-array-find': 'error',
      'unicorn/prefer-array-flat-map': 'error',
      'unicorn/prefer-array-flat': 'error',
      'unicorn/prefer-array-index-of': 'error',
      'unicorn/prefer-array-some': 'error',
      'unicorn/prefer-code-point': 'error',
      'unicorn/prefer-date-now': 'error',
      'unicorn/prefer-default-parameters': 'error',
      'unicorn/prefer-export-from': 'error',
      'unicorn/prefer-includes': 'error',
      'unicorn/prefer-logical-operator-over-ternary': 'error',
      'unicorn/prefer-math-min-max': 'error',
      'unicorn/prefer-math-trunc': 'error',
      'unicorn/prefer-negative-index': 'error',
      'unicorn/prefer-number-properties': 'error',
      'unicorn/prefer-global-number-constants': 'off', // Conflicts with SonarQube (typescript:S7773) which requires Number.NaN
      'unicorn/prefer-object-from-entries': 'error',
      'unicorn/prefer-prototype-methods': 'error',
      'unicorn/prefer-regexp-test': 'error',
      'unicorn/prefer-set-has': 'error',
      'unicorn/prefer-spread': 'error',
      'unicorn/prefer-string-replace-all': 'error',
      'unicorn/prefer-string-slice': 'error',
      'unicorn/prefer-string-starts-ends-with': 'error',
      'unicorn/prefer-string-trim-start-end': 'error',
      'unicorn/prefer-switch': 'error',
      'unicorn/throw-new-error': 'error',
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
      unicorn: unicornPlugin,
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
      'unicorn/no-global-object-property-assignment': 'off',
    },
  },

  // Tests may reassign globals, model explicit null payloads, and shape Error
  // instances as part of environment and API mocking.
  {
    files: ['**/*.spec.ts', '**/*.integration.spec.ts', 'src/test/**/*.ts'],
    rules: {
      'unicorn/no-global-object-property-assignment': 'off',
      'unicorn/no-null': 'off',
      'unicorn/no-error-property-assignment': 'off',
      'unicorn/prefer-iterator-to-array': 'off',
    },
  },

  // These files intentionally preserve external null contracts from the API,
  // storage, or platform interfaces.
  {
    files: [
      'public/custom-service-worker.js',
      'src/app/core/services/auth.service.ts',
      'src/app/core/services/background-sync.service.ts',
      'src/app/core/services/diagnostics.service.ts',
      'src/app/core/interceptors/lunchmoney.interceptor.ts',
      'src/app/core/services/lunchmoney.service.ts',
      'src/app/core/services/offline.service.ts',
      'src/app/features/dashboard/category-card.component.ts',
      'src/app/features/dashboard/category-preferences-dialog.component.ts',
      'src/app/features/dashboard/custom-period-dialog.component.ts',
      'src/app/features/dashboard/dashboard-page.component.ts',
      'src/app/features/dashboard/recurring-expenses-panel.component.ts',
      'src/app/features/dashboard/summary-hero.component.ts',
      'src/app/shared/pipes/format-currency.pipe.ts',
      'src/app/shared/services/budget.service.ts',
      'src/app/shared/utils/budget.util.ts',
      'src/app/shared/utils/currency.util.ts',
      'src/app/shared/utils/date.util.ts',
      'src/app/shared/utils/lunchmoney-link.util.ts',
      'src/app/shared/utils/notification-guidance.util.ts',
      'src/app/shared/utils/recurring.util.ts',
      'src/app/shared/utils/text.util.ts',
      'src/environments/resolve-api-key.ts',
      'tools/write-pwa-version.js',
    ],
    rules: {
      'unicorn/no-null': 'off',
    },
  },

  // Service worker messaging uses the Worker postMessage signature rather than
  // the Window postMessage target-origin form this rule expects.
  {
    files: ['src/app/core/services/background-sync.service.ts'],
    rules: {
      'unicorn/require-post-message-target-origin': 'off',
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
    rules: {
      'unicorn/no-global-object-property-assignment': 'off',
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
