import { generateGeminiText, generateGeminiStructured } from "../tools/vertex-ai";
import { googleSearch, GoogleSearchResult } from "../tools/google-search";
import { supabase } from "../tools/supabase";
import { AgentState } from "../types";
import { AIMessage } from "@langchain/core/messages";
import { withLangfuseTracing } from "../lib/tracing";
import { RunnableConfig } from "@langchain/core/runnables";

/**
 * Node 1a: Research Planning
 * Generates the strategic search plan.
 */
export async function researchPlanNode(state: AgentState, config?: RunnableConfig) {
    console.log("💭 [THOUGHT] Creating strategic search queries...");

    const prompt = `
    You are a business research analyst researching the "${state.niche}" industry.
    Generate 3 simple, effective search queries to find business problems or software frustrations.
    
    IMPORTANT: Return the queries inside [QUERY] tags.
  `;

    try {
        const rawText = await generateGeminiText(prompt, true);
        const queryMatches = rawText.match(/\[QUERY\](.*?)\[\/QUERY\]/gs);
        let queries: string[] = [];

        if (queryMatches) {
            queries = queryMatches.map(m => m.replace(/\[\/?QUERY\]/g, '').trim()).filter(q => q.length > 3);
        }

        if (queries.length === 0) {
            queries = [`"${state.niche}" problems frustrations forum`, `"${state.niche}" software complaints reddit`];
        }

        return {
            queries: queries,
            messages: [new AIMessage(`🎯 **Target Acquired:** Initiating deep-dive research into **${state.niche}**.\n\nI've generated ${queries.length} strategic search vectors to identify high-value pain points.`)]
        };
    } catch (error: any) {
        return { status: 'failed', error: error.message };
    }
}

/**
 * Node 1b: Research Execution
 * Executes the searches and gathers raw data.
 */
export async function researchExecuteNode(state: AgentState, config?: RunnableConfig) {
    console.log(`📡 [RESEARCH] Executing ${state.queries.length} searches...`);

    const searchPromises = state.queries.map(async (query) => {
        try {
            const results = await googleSearch(query, 5);
            if (results.length > 0) {
                const formattedResults = results.map((r: GoogleSearchResult) => `Title: ${r.title}\nLink: ${r.link}\nSnippet: ${r.snippet}`).join('\n\n');
                return `### RESULTS FOR: ${query}\n${formattedResults}`;
            }
        } catch (err) {
            console.error(`❌ Search failed for query "${query}":`, err);
        }
        return null;
    });

    const results = await Promise.all(searchPromises);
    const allResults = results.filter((r): r is string => r !== null);

    return {
        searchResults: allResults,
        status: 'analyzing' as const,
        messages: [new AIMessage(`🔍 **Web Search Complete**: Analyzed ${allResults.length} data sources across the web. Mapping industry friction points...`)]
    };
}

/**
 * Node 2: Analysis & Scoring
 * Extracts pain points and evaluates the niche viability.
 */
export async function analyzeAndScoreNicheNode(state: AgentState, config?: RunnableConfig) {
    console.log("");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`📊 [RESEARCH] Node: Analysis & Scoring`);
    console.log(`🎯 [TARGET] Niche: ${state.niche}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`💭 [THOUGHT] Processing ${state.searchResults.length} research findings to identify high-value pain points...`);

    if (state.discordToken) {
        const { sendDiscordFollowup } = require("../tools/discord");
        const count = state.searchResults.length;
        await sendDiscordFollowup(state.discordToken, `📊 **Analyzing:** Processing ${count} data points for market viability...`);
    }

    const prompt = `
        Analyze these research findings for the niche: "${state.niche}"
        
        Findings:
        ${state.searchResults.join('\n\n')}
        
        Tasks:
        1. Identify the top 3 specific pain points.
        2. Score the niche (1-10) on:
           - Market Size (Is this a large enough industry?)
           - Competition (Are there too many existing solutions?)
           - Willingness to Pay (Are these critical, expensive problems?)
        3. Provide a brief "Verdict" on whether we should proceed.
        
        Output valid JSON only. If search results are missing or limited, use your internal general knowledge of the logistics and SaaS industry to provide a best-effort analysis. DO NOT apologize or ask for more instructions.
        
        {
            "painPoints": [{"problem": "string", "frequency": "high|medium|low", "pain_score": 1-10}],
            "scores": {"marketSize": 1-10, "competition": 1-10, "willingnessToPay": 1-10, "overall": 1-10},
            "verdict": "string",
            "status": "validated | rejected"
        }
        `;

    const researchSchema = {
        type: "OBJECT",
        properties: {
            painPoints: {
                type: "ARRAY",
                items: {
                    type: "OBJECT",
                    properties: {
                        problem: { type: "STRING" },
                        why_it_hurts: { type: "STRING" },
                        pain_score: { type: "NUMBER" }
                    },
                    required: ["problem", "why_it_hurts", "pain_score"]
                }
            },
            scores: {
                type: "OBJECT",
                properties: {
                    marketSize: { type: "NUMBER" },
                    competition: { type: "NUMBER" },
                    willingnessToPay: { type: "NUMBER" },
                    overall: { type: "NUMBER" }
                },
                required: ["marketSize", "competition", "willingnessToPay", "overall"]
            },
            verdict: { type: "STRING" },
            status: { type: "STRING", enum: ["validated", "rejected"] }
        },
        required: ["painPoints", "scores", "verdict", "status"]
    };

    try {
        const data = await generateGeminiStructured<any>(prompt, researchSchema, true); // GROUNDING ENABLED!

        // Normalize scores to ensure they exist
        const scores = {
            marketSize: data.scores?.marketSize || 5,
            competition: data.scores?.competition || 5,
            willingnessToPay: data.scores?.willingnessToPay || 5,
            overall: data.scores?.overall || 5
        };

        const status = data.status || (scores.overall >= 7 ? 'validated' : 'rejected');

        // 3. Persist to Database (Ensure integers)
        const { error: dbError } = await supabase.from('niches').upsert({
            name: state.niche,
            description: data.verdict || "N/A",
            pain_points: data.painPoints,
            market_size_score: Math.round(scores.marketSize),
            competition_score: Math.round(scores.competition),
            willingness_to_pay_score: Math.round(scores.willingnessToPay),
            overall_score: Math.round(scores.overall),
            status: status
        }, { onConflict: 'name' });

        if (dbError) console.error("Database Upsert Error:", dbError);

        return {
            painPoints: data.painPoints,
            researchNotes: data.verdict,
            scores: scores,
            status: status,
            messages: [new AIMessage(`📊 Analysis complete. Score: ${scores.overall}/10. Status: ${status}. Proceeding to next phase...`)]
        };

    } catch (error: any) {
        console.error("❌ Scoring node failed:", error);
        return { status: 'failed', error: error.message };
    }
}
