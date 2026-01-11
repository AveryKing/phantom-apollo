
import { getGeminiModel } from "../tools/vertex-ai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { webSearch } from "../tools/web-search";
import { supabase } from "../tools/supabase";

const model = getGeminiModel(false);

import { AgentState } from "../types";

export async function prospectingNode(state: AgentState) {
    console.log(`🎯 Starting prospecting for: ${state.niche}`);

    // 1. Generate search queries for people
    // strategy: site:linkedin.com/in/ "Target Role" "Niche"
    const leadProblem = state.painPoints?.[0]?.problem || 'business growth';

    const queryPrompt = `
    Based on the niche "${state.niche}", who would be the decision maker to buy a solution for:
    "${leadProblem}"?
    
    Return just the Job Title (e.g. "Agency Owner", "Head of Sales").
    `;

    const roleResponse = await model.generateContent(queryPrompt);
    const targetRole = roleResponse.response.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "Decision Maker";

    const queries = [
        `site:linkedin.com/in/ "${targetRole}" "${state.niche}"`,
        `site:twitter.com "${targetRole}" "${state.niche}"`
    ];

    console.log(`🔍 Looking for candidates: ${targetRole}`);

    let rawLeads = "";
    for (const q of queries) {
        try {
            const result = await webSearch(q);
            rawLeads += `\n${result}\n`;
        } catch (e) {
            console.error(`Search failed for ${q}`, e);
        }
    }

    // 2. Extract and structure lead data
    const extractionPrompt = `
    Extract potential leads from these search results.
    Target Role: ${targetRole}
    Niche: ${state.niche}
    
    Search Results:
    ${rawLeads}
    
    Return a list of VALID JSON objects. If you can't find a clear name/company, skip it.
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

    const extractResponse = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: extractionPrompt + "\nYou are a data extraction engine. Output valid JSON only." }] }]
    });
    const extractText = extractResponse.response.candidates?.[0]?.content?.parts?.[0]?.text?.replace(/```json/g, '').replace(/```/g, '').trim() || "[]";

    let leads = [];
    try {
        leads = JSON.parse(extractText);
    } catch (e) {
        console.error("Failed to parse leads JSON", extractText);
    }

    // 3. Save leads
    const savedLeads = [];

    // Get niche ID
    const { data: nicheData } = await supabase.from('niches').select('id').eq('name', state.niche).single();
    if (!nicheData) {
        console.error("Niche not found in DB");
        return { ...state, leads: [] };
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

        if (data) savedLeads.push(data);
    }

    console.log(`✅ Found ${savedLeads.length} leads`);
    return { ...state, leads: savedLeads };
}
