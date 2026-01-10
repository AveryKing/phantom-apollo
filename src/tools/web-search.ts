
import * as dotenv from 'dotenv';
import { supabase } from './supabase';

dotenv.config();

const GOOGLE_SEARCH_API_KEY = (process.env.GOOGLE_SEARCH_API_KEY || process.env.GOOGLE_API_KEY || "").trim();
const GOOGLE_CX = (process.env.GOOGLE_CX || "").trim();

export async function webSearch(query: string) {
    if (!GOOGLE_SEARCH_API_KEY || !GOOGLE_CX) {
        throw new Error("Missing Google Search Configuration (GOOGLE_SEARCH_API_KEY or GOOGLE_CX)");
    }

    // Clean query - remove leading/trailing quotes, bullet points, numbers
    const cleanQuery = query.replace(/^["'-\s\d.)]+|["'\s]+$/g, '').trim();

    if (!cleanQuery) return "No results (empty query).";

    console.log(`🌐 Googling: "${cleanQuery}"`);

    const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_SEARCH_API_KEY}&cx=${GOOGLE_CX}&q=${encodeURIComponent(cleanQuery)}`;

    const response = await fetch(url);

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Google Search API failed: ${response.statusText} - ${err}`);
    }

    const data = await response.json() as { items?: any[] };

    if (!data.items) return "No results found.";

    return data.items.map((r: any) => `Title: ${r.title}\nURL: ${r.link}\nSnippet: ${r.snippet}`).join("\n\n");
}
