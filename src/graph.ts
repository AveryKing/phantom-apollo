
import { StateGraph } from "@langchain/langgraph";
import { AgentState } from "./types";
import { researchStateChannels } from "./types/research-state";
import { searchForNichesNode, analyzeAndScoreNicheNode } from "./agents/research-nodes";
import { prospectingNode } from "./agents/prospecting";

/**
 * Master Business Development Graph (Discovery Phase)
 * 
 * Flow:
 * 1. Research (Discovery)
 * 2. Analyze (Scoring)
 * 3. Conditional: Proceed to Prospecting only if Niche is Validated
 * 4. Prospecting (Lead Gen + Queue Tasks)
 */

// Channels for State Sync
const masterChannels = {
    ...researchStateChannels,
    leads: (current: any[], next: any[]) => next || current,
    findings: (current: any, next: any) => next || current,
    discordToken: (current: any, next: any) => next || current,
};

const workflow = new StateGraph<AgentState>({
    channels: masterChannels as any
})
    // Add Nodes
    .addNode("research_search", searchForNichesNode as any)
    .addNode("research_analyze", analyzeAndScoreNicheNode as any)
    .addNode("prospecting", prospectingNode as any)

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

    .addEdge("prospecting", "__end__");

// Compile the graph
export const graph = workflow.compile();

/**
 * Beast Mode Runner
 */
export async function runBeastMode(niche: string, discordToken?: string) {
    console.log(`🚀 [BEAST MODE] Starting Discovery Pipeline for: ${niche}`);

    const initialState: AgentState = {
        niche,
        queries: [],
        searchResults: [],
        painPoints: [],
        scores: { marketSize: 0, competition: 0, willingnessToPay: 0, overall: 0 },
        researchNotes: "",
        status: 'researching',
        leads: [],
        discordToken: discordToken || undefined
    };

    if (discordToken) {
        const { sendDiscordFollowup } = require("./tools/discord");
        await sendDiscordFollowup(discordToken, `🚀 **Starting Hunt:** ${niche}\n\n*Initializing Discovery Agents...*`);
    }

    const finalState = await graph.invoke(initialState as any) as unknown as AgentState;

    console.log(`🏁 [BEAST MODE] Discovery Pipeline finished for: ${niche}`);
    console.log(`📊 Status: ${finalState.status}`);
    console.log(`👥 Leads Found: ${finalState.leads?.length || 0}`);

    if (discordToken) {
        const { sendDiscordFollowup } = require("./tools/discord");
        const summary = `🏁 **Discovery Complete**
**Status:** ${finalState.status.toUpperCase()}
**Leads Found:** ${finalState.leads?.length || 0}
**Next Steps:** Leads have been added to the task queue for AI vision and outreach drafting.`;
        await sendDiscordFollowup(discordToken, summary);
    }

    return finalState;
}
