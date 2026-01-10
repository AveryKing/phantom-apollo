import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { googleSearch } from "../tools/google-search";
import { insertRecord } from "../tools/supabase";
import { AgentState } from "../types";

// Initialize LLM (Google AI Studio)
const model = new ChatGoogleGenerativeAI({
    model: "gemini-2.0-flash",
    maxOutputTokens: 2048,
    apiKey: process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_SEARCH_API_KEY
});

export async function researchNicheNode(state: AgentState) {
    console.log(`🔬 Starting research on: ${state.niche}`);

    // 1. Generate search queries
    const queryPrompt = `
    I want to research the "${state.niche}" industry to find their biggest painful problems that software could solve.
    Generate 3 distinct, specific search queries to find forums, reddit threads, or articles where people in this niche complain about their work.
    Return ONLY the 3 queries separated by newlines.
    `;

    const queryResponse = await model.invoke([new HumanMessage(queryPrompt)]);
    const queries = queryResponse.content.toString().split('\n').filter(q => q.trim().length > 0);

    console.log(`🔍 Searching for:`, queries);

    // 2. Perform searches
    let searchResults = "";
    let searchSuccess = false;
    for (const q of queries) {
        try {
            const results = await googleSearch(q, 5); // Fetch 5 results
            if (results && results.length > 0) {
                const resultsText = results.map(r => `Title: ${r.title}\nURL: ${r.link}\nSnippet: ${r.snippet}`).join("\n\n");
                searchResults += `\n--- Results for "${q}" ---\n${resultsText}\n`;
                searchSuccess = true;
            }
        } catch (e) {
            console.error(`Search failed for ${q}`, e);
        }
    }

    if (!searchSuccess) {
        console.warn("⚠️ All searches failed. Falling back to internal model knowledge for this niche.");
        searchResults = "No real-time search results available. Synthesize based on industry standards for this niche.";
    }

    // 3. Analyze findings
    const analysisPrompt = `
    You are a Business Research Agent. Analyze the following search results for the "${state.niche}" niche.
    
    Search Results:
    ${searchResults}
    
    Identify the top 3 specific "pain points" or problems they face.
    For each pain point, estimate a "pain_score" (1-10) based on how angry/frustrated people seem.
    
    Return a VALID JSON object with this structure (no markdown formatting):
    {
        "pain_points": [
            { "problem": "...", "why_it_hurts": "...", "pain_score": 8 }
        ],
        "overall_opportunity_score": 7,
        "summary": "..."
    }
    `;

    const analysisResponse = await model.invoke([
        new SystemMessage("You are a helpful research assistant that outputs valid JSON."),
        new HumanMessage(analysisPrompt)
    ]);

    const analysisText = analysisResponse.content.toString().replace(/```json/g, '').replace(/```/g, '').trim();

    let findings;
    try {
        findings = JSON.parse(analysisText);
    } catch (e) {
        console.error("Failed to parse JSON", analysisText);
        findings = { pain_points: [], overall_opportunity_score: 0, summary: "Failed to parse analysis" };
    }

    console.log(`✅ Research complete. Score: ${findings.overall_opportunity_score}`);

    // 4. Save to DB
    await insertRecord('niches', {
        name: state.niche,
        pain_points: findings,
        overall_score: findings.overall_opportunity_score,
        status: 'validated'
    });

    return { ...state, findings };
}
