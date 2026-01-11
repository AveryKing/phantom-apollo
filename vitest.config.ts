import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        include: ['tests/**/*.test.ts'],
        exclude: ['tests/e2e/**/*.test.ts', 'node_modules/**'], // Skip E2E by default
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html', 'json'],
            exclude: ['tests/**', 'node_modules/**', '**/*.config.ts']
        },
        setupFiles: ['./tests/setup.ts'],
        testTimeout: 10000, // 10s default
        hookTimeout: 30000,  // 30s for beforeAll/afterAll
        globals: true
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src')
        }
    }
});
