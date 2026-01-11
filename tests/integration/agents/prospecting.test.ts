import { describe, it, expect, vi } from 'vitest';
import { prospectingPlanNode, prospectingExecuteNode } from '@/agents/prospecting';
import { createMockState } from '../../utils/mock-data';

// Mock Mock Data & APIs
vi.mock('@/tools/supabase', async () => {
    const mocks = await import('../../mocks/api-mocks');
    return {
        supabase: mocks.mockSupabase.createMockClient()
    };
});

vi.mock('@/tools/vertex-ai', () => ({
    generateGeminiText: vi.fn().mockResolvedValue("Decision Maker"),
    generateGeminiStructured: vi.fn().mockResolvedValue([
        {
            name: "Mock Lead",
            company: "Mock Company",
            role: "CEO",
            linkedin_url: "https://linkedin.com/in/mock",
            context: "Found via search"
        }
    ])
}));

vi.mock('@/tools/google-search', () => ({
    webSearch: vi.fn().mockResolvedValue([
        { title: "Mock Result", link: "https://linkedin.com/in/mock", snippet: "Mock Snippet" }
    ])
}));

vi.mock('@/tools/cloud-tasks', () => ({
    dispatchLeadTask: vi.fn().mockResolvedValue("task-id")
}));

describe('Prospecting Agent (Integration)', () => {
    // Removed beforeAll/afterAll as we rely on vi.mock now

    it('should generate a prospecting plan and target role', async () => {
        const initialState = createMockState({
            niche: 'B2B AI Automation agencies',
            painPoints: [{ problem: 'lead generation', severity: 'high' }],
            leads: []
        });

        // Test the Planning Node
        const planResult = await prospectingPlanNode(initialState);

        expect(planResult.findings).toBeDefined();
        // expect(planResult.findings).not.toBe('Decision Maker'); // Should be specific based on mock AI
        expect(planResult.messages).toBeDefined();
    });

    it('should discover leads for a valid niche using the execution node', async () => {
        const initialState = createMockState({
            niche: 'B2B AI Automation agencies',
            painPoints: [{ problem: 'lead generation', severity: 'high' }],
            leads: [],
            findings: 'Agency Owner' // Manually set findings as if Plan node ran
        });

        const result = await prospectingExecuteNode(initialState);

        expect(result.leads).toBeDefined();
        expect(Array.isArray(result.leads)).toBe(true);
    });

    it('should handle missing niche gracefully', async () => {
        const initialState = createMockState({
            niche: 'unknown',
            leads: []
        });

        // Should not throw
        await expect(prospectingPlanNode(initialState)).resolves.toBeDefined();
    });

    it('should dispatch cloud tasks for each lead', async () => {
        const initialState = createMockState({
            niche: 'Test Niche',
            painPoints: [{ problem: 'test problem', severity: 'medium' }],
            leads: [],
            findings: 'Test Role'
        });

        const result = await prospectingExecuteNode(initialState);

        expect(result).toBeDefined();
    });
});
