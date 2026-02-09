import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    files: ['**/*.ts'],
    extends: [
      ...tseslint.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
    rules: {
      // Relax recommended rules for existing codebase
      '@typescript-eslint/no-explicit-any': 'off',
      // Allow @ts-nocheck only with a description explaining why
      '@typescript-eslint/ban-ts-comment': ['error', { 'ts-nocheck': 'allow-with-description' }],
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', caughtErrors: 'none' }],

      // Prefer modern APIs
      'prefer-const': 'error',
      'no-var': 'error',

      // Prefer Number.parseInt / Number.parseFloat over globals
      'no-restricted-globals': [
        'error',
        { name: 'parseInt', message: 'Use Number.parseInt(value, 10) instead.' },
        { name: 'parseFloat', message: 'Use Number.parseFloat(value) instead.' },
      ],

      // Mark never-reassigned members as readonly
      '@typescript-eslint/prefer-readonly': 'warn',

      // Prefer RegExp#exec() over String#match() when not using global flag
      '@typescript-eslint/prefer-regexp-exec': 'warn',

      // Prefer optional chaining (foo?.bar) over logical AND (foo && foo.bar)
      '@typescript-eslint/prefer-optional-chain': 'warn',
    },
  },
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/*.js',
      '**/*.mjs',
      '**/routes/batch/index.ts',
      '**/routes/batch/routes/**',
      '**/routes/extended-context.ts',
      '**/test-db.ts',
      '**/test*.ts',
    ],
  },
);
