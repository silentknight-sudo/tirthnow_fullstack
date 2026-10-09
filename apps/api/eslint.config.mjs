import { baseConfig } from '@tirth-now/config/eslint/base';
import { moduleBoundariesPlugin } from '@tirth-now/config/eslint/module-boundaries';

const VENDOR_SDKS = [
  'firebase-admin',
  'firebase-admin/*',
  'nodemailer',
  'razorpay',
  '@anthropic-ai/sdk',
  'openai',
  '@aws-sdk/*',
  '@google-cloud/*',
];

export default [
  ...baseConfig({ tsconfigRootDir: import.meta.dirname }),
  {
    files: ['src/**/*.ts'],
    plugins: { tn: moduleBoundariesPlugin },
    rules: { 'tn/module-boundaries': 'error' },
  },
  {
    // ADR-0003: only core/providers may talk to vendor SDKs.
    files: ['src/**/*.ts'],
    ignores: ['src/core/providers/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: VENDOR_SDKS.map((group) => ({
            group: [group],
            message: 'Use a provider interface from src/core/providers instead (ADR-0003).',
          })),
        },
      ],
    },
  },
  {
    // Seed and scripts are CLI programs.
    files: ['prisma/**/*.ts', 'scripts/**/*.ts'],
    rules: { 'no-console': 'off' },
  },
];
