
import { StateGraph } from "@langchain/langgraph";
import { AgentState } from "./types";
import { researchStateChannels } from "./types/research-state";
import { searchForNichesNode, analyzeAndScoreNicheNode } from "./agents/research-nodes";
import { prospectingNode } from "./agents/prospecting";
import { outreachNode } from "./agents/outreach";
import { feedbackLoopNode } from "./agents/feedback-node";

/**
 * Master Business Development Graph
 * 
 * Flow:
 * 1. Research (Discovery)
 * 2. Analyze (Scoring)
 * 3. Conditional: Proceed to Prospecting only if Niche is Validated
 * 4. Prospecting (Lead Gen)
 * 5. Outreach (Message Delivery)
 */

// Channels for State Sync
const masterChannels = {
    ...researchStateChannels,
    leads: (current: any[], next: any[]) => next || current,
    findings: (current: any, next: any) => next || current,
};

const workflow = new StateGraph<AgentState>({
    channels: masterChannels as any
})
    // Add Nodes
    .addNode("research_search", searchForNichesNode as any)
    .addNode("research_analyze", analyzeAndScoreNicheNode as any)
    .addNode("prospecting", prospectingNode as any)
    .addNode("outreach", outreachNode as any)
    .addNode("feedback", feedbackLoopNode as any)

    // Define Edges
    .addEdge("__start__", "research_search")
    .addEdge("research_search", "research_analyze")

    // Conditional Logic: Only prospect if the niche is "validated"
    .addConditionalEdges(
        "research_analyze",
        (state: any) => {
            if (state.status === 'validated') return "prospecting";
            return "__end__";
        }
    )

    .addEdge("prospecting", "outreach")
    .addEdge("outreach", "feedback")
    .addEdge("feedback", "__end__");

// Compile the graph
export const graph = workflow.compile();

/**
 * Beast Mode Runner
 */
export async function runBeastMode(niche: string) {
    console.log(`🚀 [BEAST MODE] Starting full pipeline for: ${niche}`);

    const initialState: AgentState = {
        niche,
        queries: [],
        searchResults: [],
        painPoints: [],
        scores: { marketSize: 0, competition: 0, willingnessToPay: 0, overall: 0 },
        researchNotes: "",
        status: 'researching',
        leads: []
    };

    const finalState = await graph.invoke(initialState as any) as unknown as AgentState;

    console.log(`🏁 [BEAST MODE] Pipeline finished for: ${niche}`);
    console.log(`📊 Status: ${finalState.status}`);
    console.log(`👥 Leads Processed: ${finalState.leads?.length || 0}`);

    return finalState;
}
