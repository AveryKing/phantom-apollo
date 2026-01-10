import { StateGraph } from "@langchain/langgraph";
import { ResearchState, researchStateChannels } from "../types/research-state";
import { searchForNichesNode, analyzeAndScoreNicheNode } from "./research-nodes";

/**
 * The Research Agent Workflow
 * 1. Search (Discovery)
 * 2. Analysis & Scoring
 * 3. End
 */
const workflow = new StateGraph<ResearchState>({
    channels: researchStateChannels as any
})
    .addNode("search", searchForNichesNode as any)
    .addNode("analyze", analyzeAndScoreNicheNode as any)
    .addEdge("__start__", "search")
    .addEdge("search", "analyze")
    .addEdge("analyze", "__end__");

// Compile the graph
export const researchGraph = workflow.compile();

/**
 * Standalone runner for the Research Agent
 */
export async function runResearch(niche: string) {
    const initialState: ResearchState = {
        niche,
        queries: [],
        searchResults: [],
        painPoints: [],
        scores: { marketSize: 0, competition: 0, willingnessToPay: 0, overall: 0 },
        researchNotes: "",
        status: 'researching'
    };

    console.log(`🚀 Launching Research Agent for: ${niche}`);
    const finalState = await researchGraph.invoke(initialState as any);
    return finalState;
}
