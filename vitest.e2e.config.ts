import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        include: ['tests/e2e/**/*.test.ts'],
        exclude: ['node_modules/**', 'dist/**'],
        setupFiles: ['./tests/setup.ts'],
        testTimeout: 30000,
        globals: true
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src')
        }
    }
});
