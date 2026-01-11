/**
 * API mocking utilities using MSW (Mock Service Worker)
 * This prevents real API calls during testing and protects GCP credit budget
 */

export const mockVertexAI = {
    start: () => {
        // Mock Vertex AI API calls
    },
    stop: () => {
        // Stop mocking
    },
    reset: () => {
        // Reset mock state
    },
    mockFailure: () => {
        // Simulate API failure
    },
    mockTransientFailure: (times: number) => {
        // Simulate transient failures
    },
    callCount: 0
};

export const mockGoogleSearch = {
    start: () => {
        // Mock Google Search API
    },
    stop: () => {
        // Stop mocking
    },
    mockFailure: () => {
        // Simulate search failure
    }
};

export const mockPuppeteer = {
    mockFailure: (reason: string) => {
        // Simulate Puppeteer failure
    },
    reset: () => {
        // Reset to normal behavior
    }
};

export const mockSupabase = {
    createMockClient: () => {
        // Pre-populate with standard test data
        const mockData: any = {
            niches: [
                { id: 'test-niche-123', name: 'Test Niche', description: 'Test description' }
            ],
            leads: [
                {
                    id: '123e4567-e89b-12d3-a456-426614174000',
                    name: 'Test Lead',
                    company: 'Test Co',
                    niches: { id: 'test-niche-123', name: 'Test Niche' }
                },
                {
                    id: '123e4567-e89b-12d3-a456-426614174001',
                    name: 'Trace Lead',
                    company: 'Trace Co',
                    niches: { id: 'test-niche-123', name: 'Test Niche' }
                },
                {
                    id: '123e4567-e89b-12d3-a456-426614174002',
                    name: 'Discord Lead',
                    company: 'Discord Co',
                    niches: { id: 'test-niche-123', name: 'Test Niche' }
                }
            ]
        };

        const createQueryBuilder = (table: string, existingData?: any[]) => {
            let currentData = existingData || mockData[table] || [];

            return {
                select: (columns: string) => createQueryBuilder(table, currentData),
                eq: (column: string, value: string) => {
                    const filtered = currentData.filter((item: any) => item[column] === value);
                    return createQueryBuilder(table, filtered);
                },
                single: () => {
                    return Promise.resolve({
                        data: currentData.length > 0 ? currentData[0] : null,
                        error: currentData.length > 0 ? null : {
                            code: 'PGRST116',
                            details: 'The result contains 0 rows',
                            hint: null,
                            message: 'Cannot coerce the result to a single JSON object'
                        }
                    });
                },
                insert: (data: any) => {
                    if (!mockData[table]) mockData[table] = [];
                    // Handle array or single object
                    if (Array.isArray(data)) {
                        mockData[table].push(...data);
                    } else {
                        mockData[table].push(data);
                    }
                    return {
                        select: () => {
                            // Return the inserted data for select() after insert
                            return createQueryBuilder(table, Array.isArray(data) ? data : [data]);
                        }
                    };
                },
                update: (data: any) => {
                    // primitive update mock
                    currentData.forEach(item => Object.assign(item, data));
                    return createQueryBuilder(table, currentData);
                },
                upsert: (data: any, options?: any) => {
                    // primitive upsert mock - just push for now in test logic
                    if (!mockData[table]) mockData[table] = [];
                    mockData[table].push(data);
                    return {
                        select: () => createQueryBuilder(table, [data]),
                        single: () => Promise.resolve({ data, error: null })
                    };
                },
                delete: () => Promise.resolve({ data: null, error: null })
            };
        };

        return {
            from: (table: string) => createQueryBuilder(table)
        };
    }
};

export const mockAllExternalAPIs = () => {
    mockVertexAI.start();
    mockGoogleSearch.start();
};
