module.exports = {
  'apps/api/**/*.ts': (files) => [
    `pnpm --filter @tirth-now/api exec eslint --fix --max-warnings=0 ${files.join(' ')}`,
    `prettier --write ${files.join(' ')}`,
  ],
  'packages/shared-types/**/*.ts': (files) => [
    `pnpm --filter @tirth-now/shared-types exec eslint --fix --max-warnings=0 ${files.join(' ')}`,
    `prettier --write ${files.join(' ')}`,
  ],
  '*.{json,yml,yaml,cjs,mjs,js}': 'prettier --write',
};
