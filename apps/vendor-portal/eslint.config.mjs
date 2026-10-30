import { baseConfig } from '@tirth-now/config/eslint/base';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default [
  ...baseConfig({
    tsconfigRootDir: import.meta.dirname,
    ignores: [
      '.next/**',
      'out/**',
      'next-env.d.ts',
      '*.mjs',
      '*.cjs',
      'playwright-report/**',
      'test-results/**',
    ],
  }),
  {
    languageOptions: { globals: { ...globals.browser } },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // React event handlers may be async; errors are caught inside them.
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: { attributes: false } },
      ],
    },
  },
];
