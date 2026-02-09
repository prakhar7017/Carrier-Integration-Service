module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts', '**/*.unit.test.ts', '**/integration.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/**/*.unit.test.ts',
    '!src/**/integration.test.ts',
    '!src/**/*.d.ts',
    '!src/__fixtures__/**',
    '!src/example.ts'
  ]
};
