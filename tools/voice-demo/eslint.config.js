// @ts-check
import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';

export default [
  { ignores: ['node_modules/**', 'dist/**'] },
  js.configs.recommended,
  {
    files: ['**/*.ts', '**/*.mts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaVersion: 2020, sourceType: 'module' },
      globals: {
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        console: 'readonly',
        fetch: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        AbortController: 'readonly',
        MutationObserver: 'readonly',
        URLSearchParams: 'readonly',
        HTMLElement: 'readonly',
        HTMLAudioElement: 'readonly',
        HTMLVideoElement: 'readonly',
        MediaStream: 'readonly',
        MediaStreamTrack: 'readonly',
        Event: 'readonly',
        Intl: 'readonly',
      },
    },
    plugins: { '@typescript-eslint': tsPlugin },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      'no-undef': 'off', // TypeScript already resolves identifiers
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'error',

      // The whole point of the redaction layer is that nothing else prints.
      'no-console': 'error',
    },
  },
  {
    // The logger is the one module allowed to reach the console.
    files: ['src/logging.ts'],
    rules: { 'no-console': 'off' },
  },
  {
    // Build scripts are Node CLIs, not browser code.
    files: ['scripts/**/*.mjs', 'scripts/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { process: 'readonly', console: 'readonly' },
    },
    rules: { 'no-console': 'off' },
  },
  {
    files: ['test/**/*.ts'],
    languageOptions: {
      globals: {
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        vi: 'readonly',
      },
    },
    rules: { '@typescript-eslint/no-explicit-any': 'off' },
  },
];
