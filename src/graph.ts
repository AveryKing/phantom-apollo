
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

import { Langfuse } from "langfuse";
import dotenv from 'dotenv';

dotenv.config();

// Langfuse automatically reads from env vars: LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY, LANGFUSE_HOST
const langfuse = new Langfuse();

/**
 * Beast Mode Runner
 */
export async function runBeastMode(niche: string, discordToken?: string) {
    const trace = langfuse.trace({
        name: 'beast-mode-discovery',
        metadata: { niche }
    });

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

    let finalState: AgentState;
    try {
        finalState = await graph.invoke(initialState as any) as unknown as AgentState;
        trace.update({ output: { status: finalState.status, leadsFound: finalState.leads?.length || 0 } });
    } catch (error) {
        console.error(`❌ [BEAST MODE] Pipeline failed:`, error);
        trace.update({ output: { error: error instanceof Error ? error.message : 'Unknown pipeline error' } });
        throw error;
    } finally {
        try {
            await langfuse.flushAsync();
        } catch (flushError) {
            console.error('⚠️ [Langfuse] Failed to flush traces:', flushError);
            // Don't throw - we don't want Langfuse errors to break the flow
        }
    }

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