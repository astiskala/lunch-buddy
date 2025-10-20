import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import ngeslint from 'angular-eslint';
import rxjsXPlugin from 'eslint-plugin-rxjs-x';
import prettierPlugin from 'eslint-plugin-prettier';
import eslintConfigPrettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    // Global ignores
    ignores: ['projects/**/*'],
  },
  // Base config for all files
  js.configs.recommended,

  // TypeScript files
  {
    files: ['**/*.ts'],
    extends: [...tseslint.configs.strictTypeChecked, ...ngeslint.configs.tsRecommended, eslintConfigPrettier],
    plugins: {
      'rxjs-x': rxjsXPlugin,
      prettier: prettierPlugin,
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
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
        },
      ],
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
    extends: [...ngeslint.configs.templateRecommended, ...ngeslint.configs.templateAccessibility, eslintConfigPrettier],
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

  // Mock server files (Node.js)
  {
    files: ['mock-server/**/*.js'],
    languageOptions: {
      globals: {
        // Node.js globals
        require: 'readonly',
        module: 'readonly',
        exports: 'writable',
        __dirname: 'readonly',
        __filename: 'readonly',
        process: 'readonly',
        console: 'readonly',

        // Built-ins
        Buffer: 'readonly',
        Error: 'readonly',

        // Standard globals
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        setImmediate: 'readonly',
        clearImmediate: 'readonly',
      },
    },
  },
);
