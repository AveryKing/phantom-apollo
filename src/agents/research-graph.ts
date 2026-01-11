import { StateGraph } from "@langchain/langgraph";
import { AgentState, researchStateChannels } from "../types";
import { researchPlanNode, researchExecuteNode, analyzeAndScoreNicheNode } from "./research-nodes";

/**
 * The Research Agent Workflow
 * 1. Plan (Discovery)
 * 2. Execute (Search)
 * 3. Analysis & Scoring
 * 4. End
 */
const workflow = new StateGraph<AgentState>({
    channels: researchStateChannels as any
})
    .addNode("plan", researchPlanNode as any)
    .addNode("execute", researchExecuteNode as any)
    .addNode("analyze", analyzeAndScoreNicheNode as any)
    .addEdge("__start__", "plan")
    .addEdge("plan", "execute")
    .addEdge("execute", "analyze")
    .addEdge("analyze", "__end__");

// Compile the graph
export const researchGraph = workflow.compile();

/**
 * Standalone runner for the Research Agent
 */
export async function runResearch(niche: string) {
    try {
        const initialState: AgentState = {
            niche,
            queries: [],
            searchResults: [],
            painPoints: [],
            scores: { marketSize: 0, competition: 0, willingnessToPay: 0, overall: 0 },
            researchNotes: "",
            status: 'researching',
            leads: [],
            messages: []
        };

        console.log(`🚀 Launching Research Agent for: ${niche}`);
        const finalState = await researchGraph.invoke(initialState as any);
        return finalState;
    } catch (error) {
        console.error('❌ [Research] Error running research:', error);
        throw error;
    }
}
