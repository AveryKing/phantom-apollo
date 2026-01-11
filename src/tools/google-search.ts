
import dotenv from 'dotenv';
dotenv.config();

export interface GoogleSearchResult {
    title: string;
    link: string;
    snippet: string;
    pagemap?: any;
}

/**
 * Robust Google Custom Search Tool
 * Handles 403/429 errors and formats output for LLM consumption.
 */
export async function googleSearch(query: string, numResults: number = 10): Promise<GoogleSearchResult[]> {
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID || process.env.GOOGLE_CX;

    if (!apiKey || !searchEngineId) {
        throw new Error("Missing Google Search Configuration (GOOGLE_SEARCH_API_KEY or GOOGLE_SEARCH_ENGINE_ID)");
    }

    // Clean query
    const cleanQuery = query.trim();
    if (!cleanQuery) return [];

    const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(cleanQuery)}`;
    console.log(`📡 [GoogleSearch] Fetching: ${url.replace(apiKey, 'REDACTED')}`);

    try {
        const response = await fetch(url);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[GoogleSearch] API Error: ${response.status} - ${errorText}`);

            if (response.status === 403) {
                throw new Error("Google Search API: Forbidden (Check API Key)");
            }
            if (response.status === 429) {
                throw new Error("Google Search API: Quota Exceeded");
            }
            throw new Error(`Google Search Failed: ${response.status}`);
        }

        const data = await response.json() as { items?: any[] };

        if (!data.items) {
            console.warn(`[GoogleSearch] No results found for query: "${cleanQuery}"`);
            return [];
        }

        return data.items.map((item) => ({
            title: item.title,
            link: item.link,
            snippet: item.snippet,
            pagemap: item.pagemap
        }));

    } catch (error) {
        console.error(`[GoogleSearch] Network/System Error:`, error);
        // Rethrow to let the agent handle the failure (e.g. fallback to internal knowledge)
        throw error;
    }
}
/**
 * Simple wrapper that returns search results as a formatted string.
 * Used for legacy support during migration.
 */
export async function webSearch(query: string): Promise<string> {
    const results = await googleSearch(query);
    if (results.length === 0) return "No results found.";
    return results.map(r => `Title: ${r.title}\nURL: ${r.link}\nSnippet: ${r.snippet}`).join("\n\n");
}
