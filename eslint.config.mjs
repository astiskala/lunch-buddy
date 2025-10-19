import js from "@eslint/js";
import tseslint from "typescript-eslint";
import ngeslint from "angular-eslint";
import rxjsXPlugin from "eslint-plugin-rxjs-x";

export default tseslint.config(
  {
    // Global ignores
    ignores: ["projects/**/*"],
  },
  // Base config for all files
  js.configs.recommended,

  // TypeScript files
  {
    files: ["**/*.ts"],
    extends: [
      ...tseslint.configs.strictTypeChecked,
      ...ngeslint.configs.tsRecommended,
    ],
    plugins: {
      "rxjs-x": rxjsXPlugin,
    },
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      ...rxjsXPlugin.configs.recommended.rules,
      "@angular-eslint/directive-selector": [
        "error",
        {
          type: "attribute",
          prefix: "app",
          style: "camelCase",
        },
      ],
      "@angular-eslint/no-output-native": "error",
      "@angular-eslint/component-selector": [
        "error",
        {
          type: "element",
          prefix: ["app", "dashboard", "summary", "category", "recurring"],
          style: "kebab-case",
        },
      ],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
        },
      ],
      "@angular-eslint/prefer-standalone": "error",
      "@angular-eslint/use-lifecycle-interface": "error",
    },
  },

  // Spec files
  {
    files: ["**/*.spec.ts"],
    rules: {
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/unbound-method": "off",
    },
  },

  // HTML files
  {
    files: ["**/*.html"],
    extends: [
      ...ngeslint.configs.templateRecommended,
      ...ngeslint.configs.templateAccessibility,
    ],
    rules: {},
  }
);
