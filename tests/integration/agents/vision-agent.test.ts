import { describe, it, expect, vi } from 'vitest';
import { visionNode } from '@/agents/vision-agent';
import { createMockState } from '../../utils/mock-data';

// Mock dependencies
vi.mock('@/tools/supabase', async () => {
    const mocks = await import('../../mocks/api-mocks');
    return {
        supabase: mocks.mockSupabase.createMockClient()
    };
});

vi.mock('@/tools/vision', () => ({
    captureScreenshot: vi.fn().mockResolvedValue('base64-screenshot-data'),
    analyzeWebsiteVibe: vi.fn().mockResolvedValue({
        modernityScore: 9,
        style: 'Minimalist',
        verdict: 'High-end tech company',
        technicalHealth: 'Excellent',
        businessType: 'SaaS'
    })
}));

vi.mock('@/tools/discord', () => ({
    sendDiscordFollowup: vi.fn().mockResolvedValue(true)
}));

describe('Visionary Agent (Vision)', () => {
    it('should analyze leads with valid URLs', async () => {
        const initialState = createMockState({
            niche: 'B2B Tech',
            leads: [{
                id: '123e4567-e89b-12d3-a456-426614174000',
                name: 'Tech Corp',
                company_name: 'Tech Corp', // vision agent mocks use company_name sometimes? Update logic if needed.
                // The code handles lead.company_name or lead.name.
                // The mock data usually has lead.name.
                // vision-agent.ts uses lead.company_name in logs/warnings, but lead.url for logic.
                // Let's ensure mock lead has url.
                url: 'https://example.com',
                company: 'Tech Corp'
            }]
        });

        const result = await visionNode(initialState); // type checks might complain about company_name if it's not on AgentState.lead type?
        // AgentState.leads type usually has flexible fields or strict fields.
        // Looking at vision-agent.ts: `lead.company_name` is accessed.
        // I need to ensure my mock lead has `company_name` or strict typing might fail if I were using TS check deeply.
        // But for runtime test, passing extra field is fine.

        expect(result.leads).toBeDefined();
        expect(result.leads[0].visual_vibe_score).toBe(9);
        expect(result.leads[0].visual_analysis).toBe('High-end tech company');
    });

    it('should skip analysis if no leads present', async () => {
        const initialState = createMockState({
            niche: 'Empty Niche',
            leads: []
        });

        const result = await visionNode(initialState);
        expect(result.status).toBe('complete');
    });

    it('should skip leads without valid URLs', async () => {
        const initialState = createMockState({
            niche: 'Local Biz',
            leads: [{
                id: '123e4567-e89b-12d3-a456-426614174000',
                name: 'No URL Corp',
                url: null
            }]
        });

        const result = await visionNode(initialState);
        expect(result.leads[0].visual_vibe_score).toBeUndefined();
    });
});
