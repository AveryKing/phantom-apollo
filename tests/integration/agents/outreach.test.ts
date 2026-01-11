import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { closerNode } from '@/agents/outreach';
import { createMockState } from '../../utils/mock-data';
import { mockSupabase } from '../../mocks/api-mocks';

// Mock dependencies
vi.mock('@/tools/supabase', async () => {
    const mocks = await import('../../mocks/api-mocks');
    return {
        supabase: mocks.mockSupabase.createMockClient()
    };
});

vi.mock('@/tools/vertex-ai', () => ({
    generateGeminiStructured: vi.fn().mockResolvedValue({
        subject: "Unlock AI Growth",
        body: "Hi Decision Maker, saw your firm...",
        cta: "Let's chat?"
    }),
    generateGeminiText: vi.fn().mockResolvedValue("Mock Text Response")
}));

vi.mock('@/tools/discord', () => ({
    sendDiscordFollowup: vi.fn().mockResolvedValue(true)
}));

describe('Closer Agent (Outreach)', () => {
    it('should generate email drafts for leads', async () => {
        const initialState = createMockState({
            niche: 'B2B AI Automation',
            painPoints: [{ problem: 'lead gen', severity: 'high' }],
            leads: [{
                id: '123e4567-e89b-12d3-a456-426614174000',
                name: 'Test Target',
                company: 'Target Co',
                role: 'CEO',
                visual_analysis: 'Great website',
                visual_vibe_score: 8,
                niches: { id: 'niche-1', name: 'B2B' }
            }]
        });

        const result = await closerNode(initialState);

        expect(result.leads).toBeDefined();
        expect(result.leads.length).toBe(1);
        expect(result.leads[0].email_draft).toBeDefined();

        const draft = JSON.parse(result.leads[0].email_draft);
        expect(draft.subject).toBe("Unlock AI Growth");
    });

    it('should skip drafting if no leads present', async () => {
        const initialState = createMockState({
            niche: 'Empty Niche',
            leads: []
        });

        const result = await closerNode(initialState);
        expect(result.status).toBe('complete');
        // If status is complete, it might not return leads/messages depending on implementation
        // Check closerNode implementation: returns { status: 'complete' } if no leads.
    });
});
