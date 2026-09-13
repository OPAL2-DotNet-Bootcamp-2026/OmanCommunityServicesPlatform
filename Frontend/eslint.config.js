import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["dist/**", "node_modules/**"]
  },

  js.configs.recommended,

  {
    // Type-checked rules are scoped to the files tsconfig.json actually covers.
    // Applying them project-wide would make ESLint try to type-check its own
    // config file, which is not in the TypeScript project and fails to load.
    files: ["src/**/*.ts", "vite.config.ts"],
    extends: [...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      }
    },
    rules: {
      // TypeScript resolves globals itself; core no-undef only produces false
      // positives on DOM and browser types.
      "no-undef": "off",

      // The rules that keep the code portable to Angular. Breaking any of them
      // is what forces a rewrite later, so they are errors, not warnings.
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unsafe-assignment": "error",
      "@typescript-eslint/no-unsafe-member-access": "error",
      "@typescript-eslint/no-unsafe-call": "error",
      "@typescript-eslint/no-unsafe-return": "error",
      "@typescript-eslint/no-unsafe-argument": "error",

      // Prefer `import type` so the emitted bundle carries no dead imports.
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" }
      ],

      // Unused arguments are common in DOM handlers; allow the _ prefix the
      // existing code already uses for ignored catch bindings.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }
      ],

      "no-console": ["warn", { allow: ["warn", "error"] }],
      eqeqeq: ["error", "smart"]
    }
  },

  {
    // This config file itself, and any other plain JS tooling.
    files: ["**/*.js"],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: {
      globals: { console: "readonly", process: "readonly" }
    }
  }
);
