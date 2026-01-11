import { generateGeminiText } from "../tools/vertex-ai";
import { googleSearch, GoogleSearchResult } from "../tools/google-search";
import { supabase } from "../tools/supabase";
import { AgentState } from "../types";

/**
 * Node 1: Niche Discovery (Search)
 * Responsible for generating search queries and fetching raw data.
 */
export async function searchForNichesNode(state: AgentState) {
    console.log(`🔍 [ResearchAgent] Discovering pain points for niche: ${state.niche}`);

    const prompt = `
    You are a business research analyst. I am researching the "${state.niche}" industry.
    Generate 3 specific search queries that would help me find people complaining about their daily business operations, software frustrations, or missing features in this niche.
    Focus on finding forums, Reddit threads, and industry-specific articles.
    
    IMPORTANT: Return the queries inside [QUERY] tags. Example:
    [QUERY] "logistics software" complaints forum [/QUERY]
  `;

    try {
        const rawText = await generateGeminiText(prompt);

        // Robust Extraction using [QUERY] tags or line-by-line fallback
        const queryMatches = rawText.match(/\[QUERY\](.*?)\[\/QUERY\]/gs);
        let queries: string[] = [];

        if (queryMatches) {
            queries = queryMatches.map(m => m.replace(/\[\/?QUERY\]/g, '').trim());
        }

        // Fallback Strategy: If extraction failed or returned too few, try line-based extraction
        if (queries.length < 2) {
            const lines = rawText
                .split('\n')
                .map(q => q.replace(/^\d+\.\s*/, '').replace(/^"|"$/g, '').trim())
                .filter(q => q.length > 5 && q.length < 150 && !q.toLowerCase().includes("here are"));
            queries = [...new Set([...queries, ...lines])].slice(0, 3);
        }

        // Secondary Fallback: If still empty, use Seed Queries based on niche
        if (queries.length === 0) {
            console.warn(`⚠️ LLM failed to generate queries for "${state.niche}". Using seed fallbacks.`);
            queries = [
                `"${state.niche}" problems frustrations forum`,
                `"${state.niche}" software complaints reddit`,
                `"${state.niche}" business operations challenges`
            ];
        }

        console.log(`📡 Final queries for "${state.niche}":`, queries);

        // 2. Execute Searches
        let allResults: string[] = [];
        for (const query of queries) {
            try {
                const results = await googleSearch(query, 5);
                if (results.length > 0) {
                    const formattedResults = results.map((r: GoogleSearchResult) => `Title: ${r.title}\nLink: ${r.link}\nSnippet: ${r.snippet}`).join('\n\n');
                    allResults.push(`### RESULTS FOR: ${query}\n${formattedResults}`);
                }
            } catch (err) {
                console.error(`❌ Search failed for query "${query}":`, err);
            }
        }

        if (allResults.length === 0) {
            console.warn(`🛑 No web results found for "${state.niche}". Using internal knowledge fallback.`);
            return {
                queries: queries,
                searchResults: ["No external results found. Use general industry knowledge for analysis."],
                status: 'analyzing'
            };
        }

        return {
            queries: queries,
            searchResults: allResults,
            status: 'analyzing'
        };

    } catch (error: any) {
        console.error("❌ Research node failed:", error);
        return {
            status: 'failed',
            error: error.message || "Unknown error in search node"
        };
    }
}

/**
 * Node 2: Analysis & Scoring
 * Extracts pain points and evaluates the niche viability.
 */
export async function analyzeAndScoreNicheNode(state: AgentState) {
    console.log(`📊 [ResearchAgent] Analyzing results for: ${state.niche}`);

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
        
        Output valid JSON only:
        {
            "painPoints": [{"problem": "string", "frequency": "high|medium|low", "pain_score": 1-10}],
            "scores": {"marketSize": 1-10, "competition": 1-10, "willingnessToPay": 1-10, "overall": 1-10},
            "verdict": "string",
            "status": "validated | rejected"
        }
        `;

    try {
        const content = await generateGeminiText(prompt);

        // Robust JSON Extraction Strategy
        let data;

        // Strategy 1: Look for markdown code blocks
        const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (codeBlockMatch) {
            try {
                data = JSON.parse(codeBlockMatch[1]);
            } catch (e) {
                console.warn("Found code block but failed to parse JSON, falling back to heuristic search.");
            }
        }

        // Strategy 2: Heuristic Search (Find first '{' that leads to valid JSON)
        if (!data) {
            let startIndex = content.indexOf('{');
            const endIndex = content.lastIndexOf('}');

            while (startIndex !== -1 && startIndex < endIndex) {
                try {
                    const potentialJson = content.substring(startIndex, endIndex + 1);
                    data = JSON.parse(potentialJson);
                    break; // Success!
                } catch (e) {
                    startIndex = content.indexOf('{', startIndex + 1);
                }
            }
        }

        if (!data) {
            throw new Error("Could not extract valid JSON from LLM response.");
        }

        // Normalize scores to ensure they exist
        const scores = {
            marketSize: data.scores?.marketSize || 5,
            competition: data.scores?.competition || 5,
            willingnessToPay: data.scores?.willingnessToPay || 5,
            overall: data.scores?.overall || 5
        };

        const status = data.status || (scores.overall >= 7 ? 'validated' : 'rejected');

        // 3. Persist to Database
        const { error: dbError } = await supabase.from('niches').upsert({
            name: state.niche,
            description: data.verdict || "N/A",
            pain_points: data.painPoints,
            market_size_score: scores.marketSize,
            competition_score: scores.competition,
            willingness_to_pay_score: scores.willingnessToPay,
            overall_score: scores.overall,
            status: status
        }, { onConflict: 'name' });

        if (dbError) console.error("Database Upsert Error:", dbError);

        return {
            painPoints: data.painPoints,
            researchNotes: data.verdict,
            scores: scores,
            status: status
        };

    } catch (error: any) {
        console.error("❌ Scoring node failed:", error);
        return { status: 'failed', error: error.message };
    }
}
