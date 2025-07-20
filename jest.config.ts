import type {Config} from 'jest';
import { use } from 'react';
import { createDefaultPreset, createDefaultEsmPreset } from "ts-jest";

const tsJestTransformCfg = createDefaultEsmPreset().transform;

const config: Config = {
  verbose: true,
  transform : {
    ...tsJestTransformCfg,
  },
  testEnvironment: "jsdom",
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  // globals: {
  //   'ts-jest': {
  //     useESM: true
  //   }
  // },
  // setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  // moduleNameMapping: {
  //   '^(\\.{1,2}/.*)\\.js$': '$1',
  // },
  // transformIgnorePatterns: [
  //   'node_modules/(?!(p-queue|usehooks-ts|eventemitter3)/)'
  // ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/setupTests.ts',
    '!src/__tests__/**',
    '!src/__mocks__/**'
  ],
};

export default config;

// module.exports = {
//   preset: 'ts-jest',
//   testEnvironment: 'jsdom',
//   roots: ['<rootDir>/src'],
//   testMatch: [
//     '**/__tests__/**/*.+(ts|tsx|js)',
//     '**/*.(test|spec).+(ts|tsx|js)'
//   ],
//   transform: {
//     '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
//   },
//   setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
//   moduleNameMapping: {
//     '^@/(.*)$': '<rootDir>/src/$1',
//     '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
//   },
//   moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json'],
//   collectCoverageFrom: [
//     'src/**/*.{js,jsx,ts,tsx}',
//     '!src/index.js',
//     '!src/**/*.d.ts',
//     '!src/setupTests.ts',
//     '!src/__tests__/**',
//   ],
//   // Mock external dependencies
//   moduleNameMapping: {
//     '^react$': '<rootDir>/src/__mocks__/react.js',
//     '^@spotify/web-api-ts-sdk$': '<rootDir>/src/__mocks__/spotify-sdk.js',
//   },
// };
