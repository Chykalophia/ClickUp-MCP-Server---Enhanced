module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module'
  },
  plugins: [
    '@typescript-eslint'
  ],
  extends: [
    'eslint:recommended'
  ],
  root: true,
  env: {
    node: true,
    es6: true,
    jest: true
  },
  ignorePatterns: [
    'build/',
    'dist/',
    'coverage/',
    'node_modules/',
    '*.js',
    '*.d.ts'
  ],
  rules: {
    // Security rules
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-script-url': 'error',
    'no-unsafe-finally': 'error',
    'no-unsafe-negation': 'error',
    
    // Code quality
    'prefer-const': 'error',
    'no-var': 'error',
    'object-shorthand': 'error',
    'prefer-template': 'error',
    'no-useless-concat': 'error',
    
    // Error prevention
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-debugger': 'error',
    'no-alert': 'error',
    'no-duplicate-imports': 'error',
    'no-self-compare': 'error',
    'no-template-curly-in-string': 'error',
    'no-unreachable': 'error',
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    
    // Style consistency
    //
    // Prettier owns layout in this repo (`npm run format`, and core's `version`
    // lifecycle hook runs it on every release). These rules must therefore
    // agree with .prettierrc or the two tools fight: the previous
    // `comma-dangle: 'never'` contradicted prettier's `trailingComma: 'es5'`,
    // which alone accounted for 928 lint errors that `npm run format` would
    // immediately reintroduce.
    //
    // This object form mirrors `trailingComma: 'es5'` exactly — trailing commas
    // in multiline arrays/objects/imports/exports, never in function
    // parentheses.
    'comma-dangle': ['error', {
      arrays: 'always-multiline',
      objects: 'always-multiline',
      imports: 'always-multiline',
      exports: 'always-multiline',
      functions: 'never'
    }],
    'quotes': ['error', 'single', { avoidEscape: true }],
    'semi': ['error', 'always'],
    // Indentation is prettier's job. ESLint's `indent` rule cannot be
    // reconciled with prettier's output (it disagreed on 495 already-formatted
    // lines, mostly method-chain and ternary continuations).
    'indent': 'off',
    'max-len': ['warn', { code: 120, ignoreUrls: true }],
    
    // Best practices
    'eqeqeq': ['error', 'always'],
    'no-else-return': 'error',
    'no-empty-function': 'error',
    'no-multi-spaces': 'error',
    'no-new': 'error',
    'no-return-assign': 'error',
    'no-sequences': 'error',
    'no-throw-literal': 'error',
    'no-unneeded-ternary': 'error',
    'no-unused-expressions': 'error',
    'no-useless-call': 'error',
    'no-useless-return': 'error',
    'radix': 'error',
    'yoda': 'error'
  },
  overrides: [
    {
      files: ['**/*.test.ts', '**/*.spec.ts'],
      env: {
        jest: true
      },
      rules: {
        'no-unused-vars': 'off',
        'max-len': 'off'
      }
    },
    {
      files: ['src/tests/**/*'],
      rules: {
        'no-console': 'off'
      }
    }
  ]
};
