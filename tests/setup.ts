import { beforeAll, afterAll, afterEach } from 'vitest';

// Global test setup
beforeAll(() => {
    // Set test environment variables
    process.env.NODE_ENV = 'test';
    process.env.GOOGLE_CLOUD_PROJECT = 'test-project';
    process.env.SUPABASE_URL = 'http://localhost:54321';
    process.env.SUPABASE_ANON_KEY = 'test-anon-key';
    process.env.LANGFUSE_PUBLIC_KEY = 'test-public-key';
    process.env.LANGFUSE_SECRET_KEY = 'test-secret-key';
});

afterEach(() => {
    // Reset any global state between tests
});

afterAll(() => {
    // Clean up
});
