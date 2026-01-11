import { generateGeminiText, generateGeminiStructured } from "../tools/vertex-ai";
import { HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages";
import { webSearch } from "../tools/google-search";
import { supabase } from "../tools/supabase";
import { AgentState } from "../types";
import { dispatchLeadTask } from "../tools/cloud-tasks";
import { RunnableConfig } from "@langchain/core/runnables";

/**
 * Node 3a: Prospecting Plan
 * Determines the target role and search strategies.
 */
export async function prospectingPlanNode(state: AgentState, config?: RunnableConfig) {
    console.log("💭 [THOUGHT] Creating prospecting strategy...");

    const leadProblem = state.painPoints?.[0]?.problem || 'business growth';
    const queryPrompt = `
    Based on the niche "${state.niche}", who would be the decision maker to buy a solution for:
    "${leadProblem}"?
    
    Return just the Job Title (e.g. "Agency Owner").
    `;

    try {
        const targetRole = await generateGeminiText(queryPrompt, true) || "Decision Maker";
        const nicheKeywords = state.niche.replace(/SaaS|Software|B2B/gi, '').trim();

        const strategies = [
            `site:linkedin.com/in/ "${targetRole.trim()}" "${nicheKeywords}"`,
            `list of ${nicheKeywords} companies`,
            `top ${nicheKeywords} businesses`
        ];

        return {
            findings: targetRole.trim(), // Reuse findings as target role temp storage
            messages: [new AIMessage(`🎯 **Strategy Set**: Targeting **${targetRole.trim()}** roles within the ${state.niche} sector. Searching for high-intent candidates...`)]
        };
    } catch (error: any) {
        return { status: 'failed', error: error.message };
    }
}

/**
 * Node 3b: Prospecting Execution
 * Executes searches and saves leads.
 */
export async function prospectingExecuteNode(state: AgentState, config?: RunnableConfig) {
    const targetRole = state.findings || "Decision Maker";
    const nicheKeywords = state.niche.replace(/SaaS|Software|B2B/gi, '').trim();

    const searchStrategies = [
        `site:linkedin.com/in/ "${targetRole}" "${nicheKeywords}"`,
        `list of ${nicheKeywords} companies`,
        `top ${nicheKeywords} businesses`
    ];

    const searchResults = await Promise.all(
        searchStrategies.map(async (q) => {
            try {
                const result = await webSearch(q);
                return `\n--- Query: ${q} ---\n${result}\n`;
            } catch (e) {
                return "";
            }
        })
    );
    const rawLeads = searchResults.join("");

    const extractionPrompt = `
    Extract potential leads from these search results.
    Target Role: ${targetRole}
    Niche: ${state.niche}
    ${rawLeads}
    Return valid JSON list only.
    `;

    const leadSchema = {
        type: "ARRAY",
        items: {
            type: "OBJECT",
            properties: {
                name: { type: "STRING" },
                company: { type: "STRING" },
                role: { type: "STRING" },
                linkedin_url: { type: "STRING" },
                context: { type: "STRING" }
            },
            required: ["name", "company", "role"]
        }
    };

    const leads = await generateGeminiStructured<any[]>(extractionPrompt, leadSchema);
    const savedLeads = [];

    let { data: nicheData } = await supabase.from('niches').select('id').eq('name', state.niche).single();
    if (!nicheData) return { ...state, leads: [] };

    for (const lead of leads) {
        if (!lead.name || lead.name.includes("...")) continue;
        const { data } = await supabase.from('leads').upsert({
            niche_id: nicheData.id,
            name: lead.name,
            company: lead.company,
            role: lead.role,
            linkedin_url: lead.linkedin_url,
            context: { snippet: lead.context, target_role: targetRole },
            score: 7,
            stage: 'new'
        }, { onConflict: 'linkedin_url' }).select().single();

        if (data) {
            savedLeads.push(data);
            try { await dispatchLeadTask(data.id, state.discordToken); } catch { }
        }
    }

    return {
        leads: savedLeads,
        messages: [new AIMessage(`✅ **Leads Identified**: Successfully extracted ${savedLeads.length} qualified prospects. Dispatched to the AI Visionary agent for visual validation.`)]
    };
}
