module.exports = {
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/strict-type-checked",
    "plugin:@typescript-eslint/stylistic-type-checked",
    "plugin:jest/recommended",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: true,
  },
  plugins: ["@typescript-eslint", "unused-imports", "jest"],
  root: true,
  ignorePatterns: [
    "**/dist/**",
    "**/node_modules/",
    "**/node_modules/**",
    "**/build/**",
    "**/.aws-sam/**",
    ".eslintrc.js",
    ".eslintrc.cjs",
    "**/__generated__/",
    "**/__generated__/**",
    "**/*.js",
  ],
  rules: {
    "@typescript-eslint/no-unnecessary-condition": "error",
    "@typescript-eslint/no-misused-promises": "error",
    "@typescript-eslint/no-floating-promises": "error",
    "@typescript-eslint/no-unused-expressions": "error",
    "@typescript-eslint/no-unused-vars": [
      "error",
      {
        args: "none",
      },
    ],
    "@typescript-eslint/no-non-null-assertion": "off",
    "@typescript-eslint/ban-types": ["error", { types: { "{}": false } }],
    "unused-imports/no-unused-imports-ts": "error",
    "require-yield": "off",
    "prefer-const": "error",
    "@typescript-eslint/restrict-template-expressions": [
      "error",
      {
        allowNullish: true,
      },
    ],
    "@typescript-eslint/no-empty-function": "warn",
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          {
            group: ["node:test"],
            message: "Please use @jest/global instead.",
          },
          {
            importNames: ["graphql"],
            group: ["graphql"],
            message: "Please use @/typed-graphql.",
          },
          {
            importNames: ["RequestContext"],
            group: ["node-fetch"],
            message: "Did you mean to import it from @/RequestContext?",
          },
          {
            group: [
              "@/lambdaHandler",
              "**/lambdaHandler",
              "@/sqsHandler",
              "**/sqsHandler",
            ],
            message: "Do not import the entrypoint module.",
          },
        ],
      },
    ],
    "no-restricted-syntax": [
      "error",
      {
        selector: "CallExpression[callee.name='expect']",
        message: "Function expressions are not allowed in source files.",
      },
    ],
    "@typescript-eslint/consistent-type-definitions": ["error", "type"],
    "object-shorthand": ["error", "properties"],
  },
  overrides: [
    {
      files: ["**/tests/**/*.ts"],
      rules: {
        "no-restricted-syntax": "off",
        "@typescript-eslint/no-unsafe-assignment": "off",
      },
    },
  ],
};
