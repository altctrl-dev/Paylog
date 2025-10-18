/**
 * lint-staged configuration
 *
 * Runs TypeScript type-check once per commit (without staged file arguments)
 * and then lints the staged TypeScript files.
 */
module.exports = {
  '*.{ts,tsx}': [
    () => 'tsc --noEmit -p tsconfig.json',
    'eslint --fix',
  ],
};
