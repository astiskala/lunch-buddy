import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import ngeslint from 'angular-eslint';
import rxjsXPlugin from 'eslint-plugin-rxjs-x';
import prettierPlugin from 'eslint-plugin-prettier';
import eslintConfigPrettier from 'eslint-config-prettier';
import unusedImportsPlugin from 'eslint-plugin-unused-imports';

export default tseslint.config(
  {
    // Global ignores
    ignores: [
      'projects/**/*',
      'playwright.config.ts',
      'e2e/**/*',
      'dist/**/*',
      'coverage/**/*',
      'playwright-report/**/*',
      'test-results/**/*',
      '**/.angular/**/*',
    ],
  },
  // Base config for all files
  js.configs.recommended,

  // TypeScript files
  {
    files: ['**/*.ts'],
    extends: [
      ...tseslint.configs.strictTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
      ...ngeslint.configs.tsRecommended,
      eslintConfigPrettier,
    ],
    plugins: {
      'rxjs-x': rxjsXPlugin,
      prettier: prettierPlugin,
      'unused-imports': unusedImportsPlugin,
    },
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
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
    },
  },

  // JavaScript files
  {
    files: ['**/*.js'],
    extends: [eslintConfigPrettier],
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      'prettier/prettier': 'error',
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
