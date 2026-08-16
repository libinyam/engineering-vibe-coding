'use strict';

// 本仓库只有零散几个 JS 文件(hook + 测试),lint 目标是守住会红的基础项,
// 不做风格微管;格式约定交给 .editorconfig。
const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  {
    ignores: ['package-lock.json'],
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'commonjs',
      globals: { ...globals.node },
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
];
