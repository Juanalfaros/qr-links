import { defineConfig, globalIgnores } from 'eslint/config';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintPluginAstro from 'eslint-plugin-astro';
import reactHooks from 'eslint-plugin-react-hooks';

export default defineConfig(
  globalIgnores(['dist/**', '.astro/**', 'node_modules/**', 'worker-configuration.d.ts', '.wrangler/**']),
  js.configs.recommended,
  tseslint.configs.recommended,
  eslintPluginAstro.configs.recommended,
  {
    // Only the two classic hooks rules — the plugin's "recommended" preset
    // also bundles React Compiler-readiness rules (e.g. set-state-in-effect,
    // incompatible-library) that flag legitimate patterns this codebase uses
    // (syncing state from the DOM/props in an effect, TanStack Table) and
    // only matter if we adopt the React Compiler, which we don't.
    files: ['**/*.tsx'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
  {
    // Plain browser scripts served as-is (not bundled/type-checked by Astro
    // or Vite), so they need the DOM globals declared by hand instead of
    // relying on the tsconfig-driven lib types the rest of the app gets.
    files: ['public/**/*.js'],
    languageOptions: {
      globals: { document: 'readonly', window: 'readonly' },
    },
  },
  {
    // Standalone Node CLI scripts (run via `node`, not bundled by Astro/Vite).
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      globals: { process: 'readonly', console: 'readonly' },
    },
  },
);
