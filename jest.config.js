/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: "<rootDir>/tsconfig.base.json" }]
  },
  roots: ["<rootDir>/packages"],
  testMatch: ["**/test/**/*.test.ts", "**/test/**/*.test.tsx"],
  moduleNameMapper: {
    "^docsync-core$": "<rootDir>/packages/docsync-core/src/index.ts",
    "^docsync-core/(.*)$": "<rootDir>/packages/docsync-core/src/$1"
  },
  collectCoverageFrom: [
    "packages/*/src/**/*.ts",
    "!packages/docsync-vscode-extension/src/**",
    "!packages/docsync-cli/src/index.ts"
  ],
  projects: [
    {
      displayName: "node",
      testEnvironment: "node",
      testMatch: [
        "<rootDir>/packages/docsync-core/**/*.test.ts",
        "<rootDir>/packages/name-display-ui/**/resolveDisplayName.test.ts"
      ],
      transform: {
        "^.+\\.tsx?$": ["ts-jest", { tsconfig: "<rootDir>/tsconfig.base.json" }]
      }
    },
    {
      displayName: "jsdom",
      testEnvironment: "jsdom",
      testMatch: ["<rootDir>/packages/login-page-ui/**/*.test.ts", "<rootDir>/packages/login-page-ui/**/*.test.tsx"],
      transform: {
        "^.+\\.tsx?$": ["ts-jest", { tsconfig: "<rootDir>/packages/login-page-ui/tsconfig.test.json" }]
      },
      setupFilesAfterEnv: ["<rootDir>/packages/login-page-ui/src/test/setup.ts"],
      moduleNameMapper: {
        "\\.(css|scss)$": "<rootDir>/packages/login-page-ui/src/test/__mocks__/styleMock.js"
      }
    },
    {
      displayName: "jsdom-name-display",
      testEnvironment: "jsdom",
      testMatch: [
        "<rootDir>/packages/name-display-ui/**/*.test.ts",
        "<rootDir>/packages/name-display-ui/**/*.test.tsx"
      ],
      transform: {
        "^.+\\.tsx?$": ["ts-jest", { tsconfig: "<rootDir>/packages/name-display-ui/tsconfig.test.json" }]
      }
    }
  ]
};





