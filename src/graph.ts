
import { StateGraph, interrupt } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";
import { AgentState } from "./types";
import { Lead } from "./types/db-types";
import { researchStateChannels } from "./types/research-state";
import { researchPlanNode, researchExecuteNode, analyzeAndScoreNicheNode } from "./agents/research-nodes";
import { prospectingPlanNode, prospectingExecuteNode } from "./agents/prospecting";
import { visionNode } from "./agents/vision-agent";
import { closerNode } from "./agents/outreach";

/**
 * Master Business Development Graph (Discovery Phase)
 * 
 * Flow:
 * 1. Research (Discovery)
 * 2. Analyze (Scoring)
 * 3. Conditional: Proceed to Prospecting only if Niche is Validated
 * 4. Prospecting (Lead Gen + Queue Tasks for Async Processing)
 * 
 * Note: Vision analysis and outreach drafting happen asynchronously via Cloud Tasks.
 * See src/processors/lead-processor.ts for the async processing pipeline.
 */

// Channels for State Sync
const masterChannels = {
    ...researchStateChannels,
    leads: {
        reducer: (current: Lead[], next: Lead[]) => next || current,
        default: () => []
    },
    findings: (current: string | undefined, next: string | undefined) => next || current,
    discordToken: (current: string | undefined, next: string | undefined) => next || current,
    messages: {
        reducer: (x: BaseMessage[], y: BaseMessage[]) => {
            const combined = [...(x || []), ...(y || [])];
            const seen = new Set();
            return combined.filter(m => {
                const id = m.id;
                if (!id) return true;
                if (seen.has(id)) return false;
                seen.add(id);
                return true;
            });
        },
        default: () => []
    }
};

const workflow = new StateGraph<AgentState>({
    channels: masterChannels as any
})
    // Add Nodes
    .addNode("research_plan", researchPlanNode as any)
    .addNode("research_execute", researchExecuteNode as any)
    .addNode("research_analyze", analyzeAndScoreNicheNode as any)
    .addNode("human_approval", async (state: AgentState) => {
        console.log("");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("⏸️ [HITL] Waiting for user approval to proceed with prospecting...");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

        // This will pause the graph and wait for a value to be provided
        const userApproval = interrupt({
            question: "Research Complete. Proceed to prospecting leads?",
            niche: state.niche,
            market_score: `${state.scores.overall}/10`,
            top_pain_point: state.painPoints[0]?.problem || "General business growth"
        });

        console.log(`✅ [HITL] Received approval: ${userApproval}`);
        return { approved: !!userApproval };
    })
    .addNode("prospecting_plan", prospectingPlanNode as any)
    .addNode("prospecting_execute", prospectingExecuteNode as any)
    .addNode("visionary", visionNode as any)
    .addNode("closer", closerNode as any)

    // Define Edges
    .addEdge("__start__", "research_plan")
    .addEdge("research_plan", "research_execute")
    .addEdge("research_execute", "research_analyze")

    // Conditional Logic: Only prospect if the niche is "validated" AND approved by human
    .addConditionalEdges(
        "research_analyze",
        (state: any) => {
            if (state.status === 'validated') return "human_approval";
            return "__end__";
        }
    )

    .addEdge("human_approval", "prospecting_plan")
    .addEdge("prospecting_plan", "prospecting_execute")
    .addEdge("prospecting_execute", "visionary")
    .addEdge("visionary", "closer")
    .addEdge("closer", "__end__");

import { MemorySaver } from "@langchain/langgraph";

// Compile the graph with a checkpointer to support interrupts
const checkpointer = new MemorySaver();
export const graph = workflow.compile({ checkpointer });

import { RunnableConfig } from "@langchain/core/runnables";
import { withLangfuseTracing, flushLangfuse } from "./lib/tracing";

/**
 * Beast Mode Runner
 */
export async function runBeastMode(niche: string, discordToken?: string, config?: RunnableConfig) {
    console.log(`🚀 [BEAST MODE] Starting Discovery Pipeline for: ${niche}`);

    // Add Langfuse tracing and thread_id to the config
    const tracedConfig = {
        ...withLangfuseTracing(config, "beast-mode-discovery", {
            niche,
            discord_enabled: !!discordToken,
        }),
        configurable: {
            thread_id: config?.configurable?.thread_id || `beast-${Date.now()}`,
            ...config?.configurable
        }
    };

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
        finalState = await graph.invoke(initialState as any, tracedConfig) as unknown as AgentState;
    } catch (error) {
        console.error(`❌ [BEAST MODE] Pipeline failed:`, error);
        throw error;
    } finally {
        await flushLangfuse();
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