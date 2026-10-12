import { baseConfig } from '@tirth-now/config/eslint/base';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default [
  ...baseConfig({
    tsconfigRootDir: import.meta.dirname,
    ignores: ['.next/**', 'out/**', 'next-env.d.ts', '*.mjs'],
  }),
  {
    languageOptions: { globals: { ...globals.browser } },
    plugins: { 'react-hooks': reactHooks },
    rules: { ...reactHooks.configs.recommended.rules },
  },
];
