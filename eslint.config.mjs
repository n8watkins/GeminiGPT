import next from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import reactHooks from "eslint-plugin-react-hooks";

const eslintConfig = [
  ...next,
  ...nextTypescript,
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      ".claude/**",
    ],
  },
  {
    // The React Compiler lint rules (react-hooks v6) are advisory for opting
    // into the compiler. This app does not use the compiler, and the patterns
    // they flag are pre-existing and intentional, so treat them as warnings
    // rather than blocking errors.
    plugins: { "react-hooks": reactHooks },
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
    },
  },
  {
    // Backend CommonJS modules and Node test/utility scripts.
    files: ["*.js", "*.cjs", "lib/**", "tests/**", "scripts/**"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
];

export default eslintConfig;
