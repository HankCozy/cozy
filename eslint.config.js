import typescriptParser from '@typescript-eslint/parser';

export default [
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      parser: typescriptParser,
      ecmaVersion: 2018,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      'no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        ignoreRestSiblings: true
      }],
      'no-console': ['warn', { allow: ['error', 'warn'] }],
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },
  {
    ignores: [
      'node_modules/**',
      '.expo/**',
      'dist/**',
      'backend/src/generated/**',
      'backend/prisma/migrations/**',
      'backend/check_users.js',
      'backend/seed_fake_users.js',
      '**/*.config.js'
    ],
  },
];