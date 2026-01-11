import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runBeastMode } from '@/graph';
import { AgentState } from '@/types';

// mocks/api-mocks has our standardized mocks
// We want to override them slightly for E2E flow to ensure data passes through
// But mostly the standard mocks should work if they return valid data.

// We need to mock external tools to avoid real API calls
vi.mock('@/tools/supabase', async () => {
    const mocks = await import('../mocks/api-mocks');
    return {
        supabase: mocks.mockSupabase.createMockClient()
    };
});

vi.mock('@/tools/vertex-ai', async () => {
    return {
        getGeminiModel: vi.fn().mockReturnValue({
            generateContent: vi.fn().mockResolvedValue({
                response: { candidates: [{ content: { parts: [{ text: "{}" }] } }] }
            }),
        }),
        generateGeminiText: vi.fn().mockImplementation(async (prompt) => {
            if (prompt.includes("pain points")) return "- High customer churn\n- Manual data entry";
            if (prompt.includes("decision maker")) return "Operations Director";
            return "Mock Text Response";
        }),
        generateGeminiStructured: vi.fn().mockImplementation(async (prompt, schema) => {
            // Return structured data based on schema type to keep flow moving
            // Research Nodes
            const schemaStr = JSON.stringify(schema);

            if (schemaStr.includes("marketSize") && schemaStr.includes("painPoints")) {
                return {
                    painPoints: [
                        { problem: "Manual processes", severity: "high", description: "Too much paper", why_it_hurts: "Slow", pain_score: 9 }
                    ],
                    scores: {
                        marketSize: 8, competition: 5, willingnessToPay: 9, overall: 8
                    },
                    verdict: "Great niche",
                    status: "validated"
                };
            }

            if (schemaStr.includes("marketSize")) {
                return {
                    marketSize: 8, competition: 5, willingnessToPay: 9, overall: 7.5,
                    reasoning: "Good market"
                };
            }
            if (schemaStr.includes("painPoints")) {
                return {
                    painPoints: [
                        { problem: "Manual processes", severity: "high", description: "Too much paper" }
                    ]
                };
            }
            // Prospecting Nodes
            if (prompt.includes("Extract potential leads")) {
                return [
                    {
                        name: "E2E Lead",
                        company: "E2E Corp",
                        role: "Director",
                        linkedin_url: "https://linkedin.com/in/e2e",
                        context: "Found via E2E Test"
                    }
                ];
            }
            // Outreach Nodes
            if (prompt.includes("cold email")) {
                return {
                    subject: "E2E Outreach",
                    body: "Hi Director...",
                    cta: "Call me"
                };
            }
            return {};
        }),
        getEmbedding: vi.fn().mockResolvedValue(new Array(768).fill(0.1))
    };
});

vi.mock('@/tools/google-search', () => ({
    webSearch: vi.fn().mockResolvedValue("Mock Search Result String"),
    googleSearch: vi.fn().mockResolvedValue([
        { title: "E2E Result", link: "https://example.com", snippet: "E2E Snippet" }
    ])
}));

vi.mock('@/tools/cloud-tasks', () => ({
    dispatchLeadTask: vi.fn().mockResolvedValue("task-e2e-123")
}));

vi.mock('@/tools/vision', () => ({
    captureScreenshot: vi.fn().mockResolvedValue("base64"),
    analyzeWebsiteVibe: vi.fn().mockResolvedValue({
        modernityScore: 8,
        style: "Modern",
        verdict: "Good",
        technicalHealth: "Good",
        businessType: "SaaS"
    })
}));

// Mock LangGraph interrupt to auto-approve
vi.mock('@langchain/langgraph', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        // @ts-ignore
        ...actual,
        interrupt: vi.fn().mockReturnValue(true) // Auto-approve human loop
    };
});

describe('E2E Full Graph Flow', () => {
    it('should run the entire Beast Mode pipeline successfully', async () => {
        const niche = "B2B E2E Testing Services";

        // Invoke the runner
        // The mocked interrupt should auto-approve the transition from Research -> Prospecting
        const finalState = await runBeastMode(niche);

        // Verify Graph State Flow
        expect(finalState).toBeDefined();

        // 1. Research Phase Verification
        expect(finalState.painPoints).toBeDefined();
        expect(finalState.painPoints.length).toBeGreaterThan(0);
        expect(finalState.scores).toBeDefined();
        expect(finalState.status).toBe('validated'); // Should be validated if score > 7 (mock returns 7.5)

        // 2. Prospecting Phase Verification
        expect(finalState.leads).toBeDefined();
        expect(finalState.leads.length).toBeGreaterThan(0);
        expect(finalState.leads[0].name).toBe("E2E Lead");

        // 3. Vision/Closer Verification (since they are in the graph now per graph.ts logic ?)
        // Wait, graph.ts has: .addEdge("prospecting_execute", "visionary") .addEdge("visionary", "closer")
        // So they ARE synchronous in the graph for now?
        // Let's check graph.ts again.
        // Lines 95-97: .addEdge("prospecting_execute", "visionary").addEdge("visionary", "closer")
        // Yes, the current implementation in graph.ts runs them correctly! 
        // My previous context said they were async via Cloud Tasks, but the code shows direct edges.
        // The comment on line 21 says "Vision analysis... happen asynchronously via Cloud Tasks", 
        // but the code (lines 95-97) wires them directly?
        // Ah, `prospectingExecuteNode` might dispatch tasks *AND* the graph might continue?
        // If the graph continues to "visionary", then it runs properly.
        // Let's verify if `visionary` node ran by checking if visual score is present.

        // If the graph runs synchronous:
        expect(finalState.leads[0].visual_vibe_score).toBe(8);
        expect(finalState.leads[0].email_draft).toBeDefined();
    });
});
