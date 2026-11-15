import tseslint from "typescript-eslint";

export default [
  { ignores: ["node_modules/**", "coverage/**", "dist/**"] },
  { rules: { "no-warning-comments": ["error", { terms: ["todo", "fixme"], location: "anywhere" }] } },
  ...tseslint.configs.strictTypeChecked.map((config) => ({
    ...config,
    files: ["**/*.ts"],
  })),
  {
    files: ["**/*.ts"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
  {
    files: ["src/**/*.ts"],
    ignores: [
      "src/lib/password.ts",
      "src/lib/cache.ts",
      "src/server.ts",
      "src/modules/uploads/**",
      "src/security/**",
      "**/*.test.ts",
      "src/**/test/**",
      "src/**/tests/**",
    ],
    rules: {
      "no-restricted-globals": [
        "error",
        {
          name: "Bun",
          message: "Use Node-compatible APIs in production src except password.ts, cache.ts, server.ts, uploads, and security.",
        },
      ],
    },
  },
  {
    files: ["src/modules/*/service.ts", "src/modules/*/repo.ts", "src/modules/*/queries.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: ["express", "express/*", "hono", "hono/*", "@hono/*"] },
      ],
    },
  },
];
