// This is the configuration file for ESLint, the TypeScript linter:
// https://eslint.org/docs/latest/use/configure/

// @ts-check

import { completeConfigBase } from "eslint-config-complete";
import { defineConfig } from "eslint/config";

export default defineConfig(
  // https://github.com/complete-ts/complete/blob/main/packages/eslint-config-complete/src/base.js
  ...completeConfigBase,

  {
    rules: {
      // Insert changed or disabled rules here, if necessary.
      // @template-customization-start
      "no-param-reassign": "off",
      "complete/no-number-enums": "off",
      // @template-customization-end
    },
  },

  // @template-customization-start
  // Don't bother linting generated code.
  {
    ignores: [
      "src/kaitai/IsaacSaveFile.cjs",
      // Agent skills are not part of the app.
      ".agents/**",
      // A plain browser script that is not part of the TypeScript project.
      "static/theme-init.js",
    ],
  },

  // The tests are in a separate directory, so they need to import the code under test from "src".
  {
    files: ["test/**"],
    rules: {
      "@typescript-eslint/no-restricted-imports": "off",
    },
  },
  // @template-customization-end
);
