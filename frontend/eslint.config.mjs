import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Dev safeguards for code quality
      "max-lines-per-function": ["warn", {
        max: 300,
        skipBlankLines: true,
        skipComments: true,
        IIFEs: true
      }],
      "max-lines": ["warn", {
        max: 500,
        skipBlankLines: true,
        skipComments: true
      }],
      // Additional rules for maintainability
      "complexity": ["warn", 20],
      "max-depth": ["warn", 4],
      "max-nested-callbacks": ["warn", 3],
      "max-params": ["warn", 5],
      // Ensure no console logs in production
      "no-console": process.env.NODE_ENV === "production" ? "error" : "warn"
    }
  }
];

export default eslintConfig;
