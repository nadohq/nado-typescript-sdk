/** @type {import('ts-jest').JestConfigWithTsJest} **/
const config = {
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+.tsx?$': ['ts-jest', { useESM: true }],
  },
  testPathIgnorePatterns: [
    'apps/e2e',
  ],
};

export default config;
