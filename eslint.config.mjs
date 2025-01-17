import globals from 'globals';
import pluginJs from '@eslint/js';
import tseslint from 'typescript-eslint';
import pluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import nodePlugin from 'eslint-plugin-n';

/** @type {import('eslint').Linter.Config[]} */
export default [
  { ignores: ['build/', 'node_modules/', 'reports/'] },
  { files: ['**/*.{js,mjs,cjs,ts}'] },
  { languageOptions: { globals: globals.node } },
  pluginJs.configs.recommended,
  nodePlugin.configs['flat/recommended-script'],
  ...tseslint.configs.recommended,
  pluginPrettierRecommended,
  {
    // eslint core rules
    rules: {
      complexity: ['error', 8],
      'no-console': 'error',
      eqeqeq: ['error', 'smart']
    }
  },
  {
    // eslint-plugin-n rules
    rules: {
      'n/no-process-env': 'error',
      'n/no-missing-import': [
        'error',
        {
          tryExtensions: ['.ts', '.d.ts']
        }
      ],
      'n/no-unsupported-features/node-builtins': [
        'error',
        {
          ignores: ['fetch']
        }
      ]
    }
  }
];
