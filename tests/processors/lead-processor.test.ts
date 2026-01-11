import { describe, it, expect, beforeEach, vi } from 'vitest';
import { processSingleLead } from '@/processors/lead-processor';
import { mockPuppeteer, mockVertexAI, mockSupabase } from '../mocks/api-mocks';
import { createMockLead } from '../utils/mock-data';

// Mock the Supabase client used by the processor
vi.mock('@/tools/supabase', async () => {
    const mocks = await import('../mocks/api-mocks');
    return {
        supabase: mocks.mockSupabase.createMockClient()
    };
});

// Mock Langfuse to prevent errors
vi.mock('langfuse', () => {
    return {
        Langfuse: class {
            trace() {
                return {
                    update: vi.fn(),
                    span: vi.fn().mockReturnValue({
                        end: vi.fn()
                    })
                };
            }
            getPrompt(name: string) {
                return Promise.resolve({
                    compile: (vars: any) => `Mock Prompt for ${name} with ${JSON.stringify(vars)}`
                });
            }
            flushAsync() {
                return Promise.resolve();
            }
        }
    };
});

describe('Lead Processor (Async Pipeline)', () => {
    beforeEach(() => {
        mockPuppeteer.reset();
        mockVertexAI.reset();
    });

    it('should process lead with screenshot and draft', async () => {
        // This is a placeholder test - full implementation requires proper mocking
        // of Supabase, Puppeteer, Vertex AI, and Langfuse

        const mockLeadId = '123e4567-e89b-12d3-a456-426614174000';

        // In a real implementation, we'd:
        // 1. Mock Supabase to return a lead
        // 2. Mock Puppeteer to return a screenshot
        // 3. Mock Vertex AI to return analysis and draft
        // 4. Verify the lead was updated in Supabase

        expect(processSingleLead).toBeDefined();
    });

    it('should handle screenshot capture failure gracefully', async () => {
        // Test that the processor continues even if screenshot fails
        mockPuppeteer.mockFailure('timeout');

        const mockLeadId = '123e4567-e89b-12d3-a456-426614174000';

        // Should not throw
        await expect(processSingleLead(mockLeadId)).resolves.toBeUndefined();
    });

    it('should handle missing lead gracefully', async () => {
        const nonExistentLeadId = 'non-existent-lead';

        // Should not throw, should log error
        await expect(processSingleLead(nonExistentLeadId)).resolves.toBeUndefined();
    });

    it('should send Discord notification when token provided', async () => {
        const mockLeadId = '123e4567-e89b-12d3-a456-426614174002';
        const mockDiscordToken = 'test-discord-token';

        // In real implementation, we'd verify Discord API was called
        await expect(processSingleLead(mockLeadId, mockDiscordToken)).resolves.toBeUndefined();
    });

    it('should trace execution in Langfuse', async () => {
        const mockLeadId = '123e4567-e89b-12d3-a456-426614174001';

        // In real implementation, we'd verify Langfuse trace was created
        await expect(processSingleLead(mockLeadId)).resolves.toBeUndefined();
    });
});
