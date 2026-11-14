// This is the configuration file for Knip:
// https://knip.dev/overview/configuration

// @ts-check

/** @type {import("knip").KnipConfig} */
const config = {
  ignore: [
    "eslint.config.mjs", // ESLint is provided by "complete-lint".
    "prettier.config.mjs", // Prettier is provided by "complete-lint".
    // @template-customization-start
    "src/kaitai/IsaacSaveFile.d.cts", // Types for the generated Kaitai Struct parser.
    "static/theme-init.js", // A blocking script that "static/index.html" loads.
    ".agents/**", // Agent skills.
    // @template-customization-end
  ],
  ignoreBinaries: [
    "tsx", // This is provided by "complete-lint".
  ],
  ignoreDependencies: [
    "complete-lint", // This is a linting meta-package.
    // @template-customization-start
    "@fontsource/rubik", // Copied into "dist" by "scripts/build.ts".
    // @template-customization-end
  ],
};

export default config;
