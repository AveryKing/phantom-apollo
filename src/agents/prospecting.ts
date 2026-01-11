import { generateGeminiText, generateGeminiStructured } from "../tools/vertex-ai";
import { HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages";
import { webSearch } from "../tools/google-search";
import { supabase } from "../tools/supabase";
import { AgentState } from "../types";
import { dispatchLeadTask } from "../tools/cloud-tasks";
import { RunnableConfig } from "@langchain/core/runnables";

export async function prospectingNode(state: AgentState, config?: RunnableConfig) {
    console.log("");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`🎯 [PROSPECTING] Node: Lead Generation`);
    console.log(`🎯 [TARGET] Niche: ${state.niche}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`💭 [THOUGHT] Identifying decision makers and hunting for leads in ${state.niche}...`);

    // 1. Generate search queries for people
    const leadProblem = state.painPoints?.[0]?.problem || 'business growth';

    if (state.discordToken) {
        const { sendDiscordFollowup } = require("../tools/discord");
        await sendDiscordFollowup(state.discordToken, `🎯 **Prospecting:** Identifying key decision makers for *${state.niche}*...`);
    }

    const queryPrompt = `
    Based on the niche "${state.niche}", who would be the decision maker to buy a solution for:
    "${leadProblem}"?
    
    Return just the Job Title (e.g. "Agency Owner", "Head of Sales").
    `;

    const targetRole = await generateGeminiText(queryPrompt, true) || "Decision Maker"; // GROUNDING ENABLED!

    console.log(`🔍 Looking for candidates: ${targetRole.trim()}`);

    const nicheKeywords = state.niche.replace(/SaaS|Software|B2B/gi, '').trim();
    const searchStrategies = [
        // Strategy 1: Decision Maker on Socials
        `site:linkedin.com/in/ "${targetRole.trim()}" "${nicheKeywords}"`,
        `site:twitter.com "${targetRole.trim()}" "${nicheKeywords}"`,
        // Strategy 2: Niche Companies / Directories
        `list of ${nicheKeywords} companies`,
        `top ${nicheKeywords} businesses "website"`,
        // Strategy 3: Direct contact/About pages
        `"${nicheKeywords}" owner contact email`
    ];

    const searchResults = await Promise.all(
        searchStrategies.map(async (q) => {
            try {
                console.log(`📡 [Prospector] Searching: ${q}`);
                const result = await webSearch(q);
                return `\n--- Query: ${q} ---\n${result}\n`;
            } catch (e) {
                console.error(`Search failed for ${q}`, e);
                return "";
            }
        })
    );
    const rawLeads = searchResults.join("");

    console.log(`📊 [Prospector] Search complete. Data size: ${rawLeads.length} chars.`);

    // 2. Extract and structure lead data
    const extractionPrompt = `
    Extract potential leads from these search results.
    Target Role: ${targetRole}
    Niche: ${state.niche}
    
    Search Results:
    ${rawLeads}
    
    Return a list of VALID JSON objects. If you can't find a clear name/company, skip it. Limit to top 10 high-quality matches.
    [
        {
            "name": "Full Name",
            "company": "Company Name",
            "role": "extracted role",
            "linkedin_url": "url found in snippet",
            "context": "Any details from snippet about their specific situation"
        }
    ]
    `;

    const leadSchema = {
        type: "ARRAY",
        items: {
            type: "OBJECT",
            properties: {
                name: { type: "STRING", description: "Full Name of the lead" },
                company: { type: "STRING", description: "Name of the company" },
                role: { type: "STRING", description: "Job title or role" },
                linkedin_url: { type: "STRING", description: "LinkedIn profile URL if found" },
                context: { type: "STRING", description: "Brief context or pain points mentioned" }
            },
            required: ["name", "company", "role"]
        }
    };

    const leads = await generateGeminiStructured<any[]>(extractionPrompt, leadSchema);

    // 3. Save leads & Dispatch Tasks
    const savedLeads = [];

    // Get niche ID
    let { data: nicheData } = await supabase.from('niches').select('id').eq('name', state.niche).single();

    // Fallback: Create if not found (e.g. if research node DB save failed)
    if (!nicheData) {
        console.warn("Niche not found in DB (Recovery Mode). Creating now...");
        const { data: newNiche, error } = await supabase.from('niches').insert({
            name: state.niche,
            status: 'active',
            updated_at: new Date().toISOString()
        }).select('id').single();

        if (error || !newNiche) {
            console.error("Critical: Failed to create niche recovery record.", error);
            return { ...state, leads: [] };
        }
        nicheData = newNiche;
    }

    for (const lead of leads) {
        if (!lead.name || lead.name.includes("...")) continue; // Skip bad parses

        const { data, error } = await supabase.from('leads').upsert({
            niche_id: nicheData.id,
            name: lead.name,
            company: lead.company,
            role: lead.role,
            linkedin_url: lead.linkedin_url,
            context: { snippet: lead.context, target_role: targetRole },
            score: 7, // Default score for now
            stage: 'new'
        }, { onConflict: 'linkedin_url' }).select().single();

        if (data) {
            savedLeads.push(data);
            // Dispatch async task for Visionary/Closer processing
            try {
                await dispatchLeadTask(data.id, state.discordToken);
            } catch (err) {
                console.error(`Failed to dispatch lead ${data.id}:`, err);
            }
        }
    }

    console.log(`✅ Found and queued ${savedLeads.length} leads`);

    if (state.discordToken && savedLeads.length > 0) {
        const { sendDiscordFollowup } = require("../tools/discord");
        await sendDiscordFollowup(state.discordToken, `⛓️ **Task Queue:** ${savedLeads.length} leads added to the processing pipeline. 🤖 Throttled analysis starting...`);
    }

    return {
        ...state,
        leads: savedLeads,
        messages: [new AIMessage(`✅ Prospecting complete. I found ${savedLeads.length} leads matching the criteria. Tasks have been dispatched for vision analysis.`)]
    };
}
