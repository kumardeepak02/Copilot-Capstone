module.exports = {
  displayName: 'button-component',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/packages/button-component'],
  testMatch: ['<rootDir>/packages/button-component/src/**/*.test.ts', '<rootDir>/packages/button-component/src/**/*.test.tsx'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/packages/button-component/tsconfig.json',
      },
    ],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  setupFilesAfterEnv: ['<rootDir>/packages/button-component/src/test/setup.ts'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.types.ts',
    '!src/index.ts',
  ],
};
