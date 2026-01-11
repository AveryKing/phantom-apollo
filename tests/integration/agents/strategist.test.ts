import { describe, it, expect, vi } from 'vitest';
import { strategistNode } from '@/agents/strategist';
import { createMockState } from '../../utils/mock-data';

// Mock dependencies
vi.mock('@/tools/vertex-ai', () => ({
    getGeminiModel: vi.fn().mockReturnValue({
        generateContent: vi.fn().mockResolvedValue({
            response: {
                candidates: [{
                    content: {
                        parts: [{
                            text: JSON.stringify({
                                niches: [
                                    { name: "Niche A", description: "Desc A" },
                                    { name: "Niche B", description: "Desc B" }
                                ]
                            })
                        }]
                    }
                }]
            }
        })
    })
}));

vi.mock('@/tools/vector', () => ({
    findSimilarNiche: vi.fn().mockResolvedValue({ niche: null, distance: 0.8 }), // Not similar
    saveNiche: vi.fn().mockResolvedValue(true)
}));

describe('Strategist Agent', () => {
    it('should generate and save unique niches', async () => {
        const initialState = createMockState({
            niche: 'Initial Niche'
        });

        const result = await strategistNode(initialState);

        expect(result.niche).toBe('Niche A');
        expect(result.researchNotes).toContain('Niche A');
        expect(result.researchNotes).toContain('Niche B');
    });

    it('should handle invalid JSON from AI gracefully', async () => {
        // Override mock for this test
        const vertex = await import('@/tools/vertex-ai');
        // @ts-ignore
        vertex.getGeminiModel.mockReturnValue({
            generateContent: vi.fn().mockResolvedValue({
                response: {
                    candidates: [{
                        content: {
                            parts: [{ text: "INVALID JSON" }]
                        }
                    }]
                }
            })
        });

        const initialState = createMockState({});

        await expect(strategistNode(initialState)).rejects.toThrow('Strategist failed to generate valid JSON');
    });
});
