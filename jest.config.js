// Standalone Jest config (not next/jest) so ts-jest can transform JSX/TSX
// directly. Tests live under __tests__/**.

module.exports = {
    testEnvironment: 'jest-environment-jsdom',
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
    },
    testMatch: [
        '**/__tests__/**/*.test.ts',
        '**/__tests__/**/*.test.tsx',
    ],
    transform: {
        '^.+\\.(ts|tsx|js|jsx)$': [
            'ts-jest',
            {
                tsconfig: {
                    jsx: 'react-jsx',
                    esModuleInterop: true,
                    isolatedModules: true,
                    allowJs: true,
                    target: 'es2019',
                    module: 'commonjs',
                    baseUrl: '.',
                    paths: { '@/*': ['*'] },
                },
                diagnostics: false,
            },
        ],
    },
    transformIgnorePatterns: [
        'node_modules/(?!(uncrypto|@upstash|axios)/)',
    ],
    collectCoverageFrom: [
        'app/**/*.{js,jsx,ts,tsx}',
        'lib/**/*.{js,jsx,ts,tsx}',
        'components/**/*.{js,jsx,ts,tsx}',
        '!**/*.d.ts',
        '!**/node_modules/**',
        '!**/.next/**',
    ],
    maxWorkers: 1,
    globalTeardown: '<rootDir>/__tests__/globalTeardown.ts',
    testTimeout: 30000,
}
