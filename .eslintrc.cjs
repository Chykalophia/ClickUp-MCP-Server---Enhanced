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
    // stdout is the MCP stdio JSON-RPC channel: diagnostics must go to stderr.
    'no-console': ['error', { allow: ['warn', 'error'] }],
    'no-debugger': 'error',
    'no-alert': 'error',
    'no-duplicate-imports': 'error',
    'no-self-compare': 'error',
    'no-template-curly-in-string': 'error',
    'no-unreachable': 'error',
    // The base rule is not TypeScript-aware (flags parameter names in type
    // signatures, misses type-only usages); the @typescript-eslint rule is.
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    
    // Style consistency
    //
    // Prettier owns layout (`npm run format`; core's `version` hook runs it on
    // release), so these rules must agree with .prettierrc. This comma-dangle
    // form mirrors `trailingComma: 'es5'`: trailing commas in multiline
    // arrays/objects/imports/exports, never in function parentheses.
    'comma-dangle': ['error', {
      arrays: 'always-multiline',
      objects: 'always-multiline',
      imports: 'always-multiline',
      exports: 'always-multiline',
      functions: 'never'
    }],
    'quotes': ['error', 'single', { avoidEscape: true }],
    'semi': ['error', 'always'],
    // Indentation is prettier's job: ESLint's `indent` rule disagrees with
    // prettier on method-chain and ternary continuations.
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
        '@typescript-eslint/no-unused-vars': 'off',
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
