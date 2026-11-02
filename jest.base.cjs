/**
 * Shared Jest baseline extended by `apps/api`.
 * @type {import('jest').Config}
 */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  testEnvironment: 'node',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['src/**/*.ts', '!src/main.ts', '!src/generated/**'],
  coverageDirectory: './coverage',
  coverageReporters: ['text', 'lcov', 'json-summary'],
  passWithNoTests: true,
};
