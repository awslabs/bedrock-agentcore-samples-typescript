import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Amplify generated files:
    ".amplify/**",
    "amplify_outputs.json",
    "tsconfig.tsbuildinfo",
    // Build artifacts:
    "**/dist/**",
    "**/node_modules/**",
  ]),
]);

export default eslintConfig;
