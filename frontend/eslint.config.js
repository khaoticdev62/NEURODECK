import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: { 'react-hooks': reactHooks },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
    },
    rules: {
      // Core hooks rules (stable, non-compiler)
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      // Explicit any: already gated by noImplicitAny; flag remaining explicit uses as warnings only
      '@typescript-eslint/no-explicit-any': 'warn',
      // TypeScript's noUnusedLocals/noUnusedParameters already covers these
      '@typescript-eslint/no-unused-vars': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-require-imports': 'error',
      // Empty catch blocks are a deliberate pattern in this codebase (bridge error swallowing)
      'no-empty': ['error', { allowEmptyCatch: true }],
      // Terminal views use ANSI escape codes in regex patterns intentionally
      'no-control-regex': 'off',
      // Disable react-compiler rules — this codebase does not target React Compiler
      'react-hooks/static-components': 'off',
      'react-hooks/use-memo': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      'react-hooks/incompatible-library': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/globals': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/error-boundaries': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/set-state-in-render': 'off',
      'react-hooks/unsupported-syntax': 'off',
      'react-hooks/config': 'off',
      'react-hooks/gating': 'off',
    },
  },
  {
    // vite-env.d.ts uses triple-slash references as required by Vite's type augmentation pattern
    files: ['**/types/vite-env.d.ts'],
    rules: {
      '@typescript-eslint/triple-slash-reference': 'off',
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**', '*.config.*'],
  },
);
