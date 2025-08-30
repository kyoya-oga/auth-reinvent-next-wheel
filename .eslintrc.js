/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'security', 'prettier'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:security/recommended',
    'plugin:prettier/recommended'
  ],
  ignorePatterns: ['node_modules/', 'dist/', '.next/', 'coverage/'],
  rules: {
    'prettier/prettier': 'error'
  }
};

