import { HumanMessage } from "@langchain/core/messages";
import { googleSearch } from "../tools/google-search";
import { ResearchState } from "../types/research-state";
import { supabase } from "../tools/supabase";
import { getGeminiModel } from "../tools/vertex-ai";

/**
 * Node 1: Niche Discovery (Search)
 * Responsible for generating search queries and fetching raw data.
 * Uses Vertex AI with grounding to reduce hallucinations.
 */
export async function searchForNichesNode(state: ResearchState): Promise<Partial<ResearchState>> {
    console.log(`🔍 [ResearchAgent] Discovering pain points for niche: ${state.niche}`);

    // Use Vertex AI with grounding for better quality research
    const model = getGeminiModel(true);

    // 1. Generate intelligent search queries using LLM
    const prompt = `
    You are a business research analyst. I am researching the "${state.niche}" industry.
    Generate 3 specific search queries that would help me find people complaining about their daily business operations, software frustrations, or missing features in this niche.
    Focus on finding forums, Reddit threads, and industry-specific articles.
    Return ONLY the queries, one per line.
  `;

    try {
        const result = await model.generateContent(prompt);
        const queries = result.response.candidates?.[0]?.content?.parts?.[0]?.text
            ?.trim()
            .split('\n')
            .map((q: string) => q.replace(/^\d+\.\s*/, '').replace(/^"|"$/g, '').trim())
            .filter((q: string) => q.length > 0) || [];

        console.log(`📡 Generated ${queries.length} queries:`, queries);

        // 2. Execute Searches
        let allResults: string[] = [];
        for (const query of queries) {
            try {
                const results = await googleSearch(query, 5);
                const formattedResults = results.map(r => `Title: ${r.title}\nLink: ${r.link}\nSnippet: ${r.snippet}`).join('\n\n');
                allResults.push(`### RESULTS FOR: ${query}\n${formattedResults}`);
            } catch (err) {
                console.error(`❌ Search failed for query "${query}":`, err);
            }
        }

        if (allResults.length === 0) {
            return {
                status: 'failed',
                error: "No search results found for any generated queries."
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
 * Uses Vertex AI with grounding for better pain point extraction.
 */
export async function analyzeAndScoreNicheNode(state: ResearchState): Promise<Partial<ResearchState>> {
    console.log(`📊 [ResearchAgent] Analyzing results for: ${state.niche}`);

    // Use Vertex AI with grounding for pain point extraction
    const model = getGeminiModel(true);

    const prompt = `
    You are a startup validator. Analyze the search results below for the "${state.niche}" niche and extract common pain points.
    Then, score the niche on a scale of 1-10 for:
    1. Market Size (Are there many businesses with this problem?)
    2. Competition (Low is 10, High is 1. Are there few active solutions?)
    3. Willingness to Pay (Do businesses actively spend to solve this?)

    Search Results:
    ${state.searchResults.join('\n\n')}

    Return your output in EXACT JSON format:
    {
      "pain_points": [{"problem": "...", "why_it_hurts": "...", "pain_score": 8}],
      "analysis": "...",
      "scores": {
        "market_size": 7,
        "competition": 5,
        "willingness_to_pay": 8
      }
    }
  `;

    try {
        const response = await model.invoke([new HumanMessage(prompt)]);
        const content = response.content.toString();
        // Robust JSON Extraction
        const start = content.indexOf('{');
        const end = content.lastIndexOf('}');
        if (start === -1 || end === -1) throw new Error("Could not find JSON in LLM response");

        const data = JSON.parse(content.substring(start, end + 1));

        const scores = {
            marketSize: data.scores.market_size,
            competition: data.scores.competition,
            willingnessToPay: data.scores.willingness_to_pay,
            overall: Math.round((data.scores.market_size + (11 - data.scores.competition) + data.scores.willingness_to_pay) / 3)
        };

        const status = scores.overall >= 7 ? 'validated' : 'rejected';

        // 3. Persist to Database (Upsert by name)
        const { error: dbError } = await supabase.from('niches').upsert({
            name: state.niche,
            description: data.analysis,
            pain_points: data.pain_points,
            market_size_score: scores.marketSize,
            competition_score: scores.competition,
            willingness_to_pay_score: scores.willingnessToPay,
            overall_score: scores.overall,
            status: status
        }, { onConflict: 'name' });

        if (dbError) throw dbError;

        return {
            painPoints: data.pain_points,
            researchNotes: data.analysis,
            scores: scores,
            status: status,
            findings: data
        };

    } catch (error: any) {
        console.error("❌ Scoring node failed:", error);
        return { status: 'failed', error: error.message };
    }
}
