// @ts-check
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import angular from "angular-eslint";

export default tseslint.config(
  {
    // legacy/ is the pre-Angular app, kept only until every page is ported.
    ignores: ["dist/**", "node_modules/**", ".angular/**", "out-tsc/**", "legacy/**"]
  },

  js.configs.recommended,

  {
    files: ["src/**/*.ts"],
    extends: [...tseslint.configs.recommendedTypeChecked, ...angular.configs.tsRecommended],
    processor: angular.processInlineTemplates,
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      }
    },
    rules: {
      "no-undef": "off",

      // Untyped data is where bugs hide; these stay errors, as before the move.
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unsafe-assignment": "error",
      "@typescript-eslint/no-unsafe-member-access": "error",
      "@typescript-eslint/no-unsafe-call": "error",
      "@typescript-eslint/no-unsafe-return": "error",
      "@typescript-eslint/no-unsafe-argument": "error",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports", disallowTypeAnnotations: false }
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }
      ],

      // Selectors carry the project prefix so they never clash with HTML or libraries.
      "@angular-eslint/component-selector": [
        "error",
        { type: "element", prefix: "ocsp", style: "kebab-case" }
      ],
      "@angular-eslint/directive-selector": [
        "error",
        { type: "attribute", prefix: "ocsp", style: "camelCase" }
      ],

      // Angular's Validators.required & co. are static and safe to pass around;
      // this rule cannot tell, and flags every reactive form.
      "@typescript-eslint/unbound-method": "off",

      "no-console": ["warn", { allow: ["warn", "error"] }],
      eqeqeq: ["error", "smart"]
    }
  },

  {
    files: ["src/**/*.html"],
    extends: [...angular.configs.templateRecommended, ...angular.configs.templateAccessibility]
  },

  {
    files: ["**/*.js"],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: {
      globals: { console: "readonly", process: "readonly" }
    }
  }
);
