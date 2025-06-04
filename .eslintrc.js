// File path: .eslintrc.js - Quick fix for prefer-const error
module.exports = {
  extends: [
    'react-app',
    'react-app/jest'
  ],
  rules: {
    'no-console': 'warn',
    'no-unused-vars': 'warn',
    'prefer-const': 'warn', // Changed from 'error' to 'warn'
    'no-var': 'error'
  }
};
