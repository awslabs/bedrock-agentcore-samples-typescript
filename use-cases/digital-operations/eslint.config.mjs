import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    languageOptions: {
      globals: {
        fetch: "readonly",
        ReadableStream: "readonly",
        TextDecoderStream: "readonly",
        AbortSignal: "readonly",
        DOMParser: "readonly",
        ResizeObserver: "readonly",
        requestAnimationFrame: "readonly",
      },
    },
  },
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
