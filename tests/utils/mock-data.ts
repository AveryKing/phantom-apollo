/**
 * Mock data factories for creating test fixtures
 */

export const createMockLead = (overrides?: any) => ({
    id: 'test-lead-123',
    company_name: 'Test Company',
    url: 'https://test.com',
    niche_id: 'test-niche-123',
    screenshot_url: null,
    visual_vibe_score: null,
    visual_analysis: null,
    pain_points: null,
    email_draft: null,
    evaluation_score: null,
    sent_to_discord: false,
    created_at: new Date().toISOString(),
    ...overrides
});

export const createMockNiche = (overrides?: any) => ({
    id: 'test-niche-123',
    name: 'Test Niche',
    description: 'A test niche for testing purposes',
    embedding: null,
    status: 'active',
    created_at: new Date().toISOString(),
    ...overrides
});

export const createMockState = (overrides?: any) => ({
    messages: [],
    niche: null,
    leads: [],
    approvals: {},
    currentNode: null,
    error: null,
    ...overrides
});
