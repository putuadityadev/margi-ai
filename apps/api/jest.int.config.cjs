const baseConfig = require('../../jest.base.cjs');

/** @type {import('jest').Config} */
module.exports = {
  ...baseConfig,
  rootDir: '.',
  testRegex: 'test/.*\\.int-spec\\.ts$',
};
