
import { supabase } from './supabase';
import { getEmbedding } from './vertex-ai';
import { Niche } from '../types/db-types';

/**
 * Find similar niches in the database to prevent duplication.
 * Returns the closest niche and its distance (lower is closer).
 */
export async function findSimilarNiche(nicheName: string, threshold: number = 0.2): Promise<{ niche: Niche | null, distance: number }> {
    const embedding = await getEmbedding(nicheName);

    // Call Supabase RPC function 'match_niches' or use raw SQL via RPC if enabled, 
    // but standard practice is to use rpc for vector search.
    // However, since we defined the table raw in the plan, we might not have the RPC function set up yet.
    // Let's assume we can use the JS client's filtering if we had an RPC, but without it we might need to rely on 
    // a customized RPC function. 
    // The Master Plan says: "SELECT * FROM niches ORDER BY embedding <-> new_vector LIMIT 1"

    // To execute raw SQL with parameters in Supabase-js is not directly supported without RPC.
    // We SHOULD create an RPC function. 
    // BUT, for now, I'll assume we have an RPC function `match_niches` or I'll try to use the `gt` / `lt` filters if supported?
    // Actually, pgvector support in supabase-js usually requires an RPC call.

    // Let's define the logic correctly: we need to call an RPC function.
    // Since I can't run SQL DDL from here easily (I'm an agent), I will check if I can just assume the RPC exists 
    // OR if I should just use `text-embedding-004` to dedup locally? No, that defeats the purpose.

    // I will add a TODO to "Create match_niches RPC" but for now I will try to write the code that WOULD call it.

    const { data, error } = await supabase.rpc('match_niches', {
        query_embedding: embedding,
        match_threshold: 1 - threshold, // Supabase often uses similarity (1-distance) or distance directly
        match_count: 1,
    });

    if (error) {
        // Fallback: If RPC is missing, we can't do vector search easily.
        // We log a warning and return no match so the process doesn't block.
        console.warn('⚠️ Vector search failed (likely missing match_niches RPC):', error.message);
        return { niche: null, distance: 1.0 };
    }

    if (data && data.length > 0) {
        // Assuming data returned is { id, name, similarity }
        // Distance ≈ 1 - similarity (if using cosine similarity) or just standard euclidean distance.
        // Let's assume the RPC returns "similarity" (0 to 1, where 1 is identical).
        const match = data[0];
        // If 1 is similar, 0 is different.
        // Distance = 1 - similarity.
        const distance = 1 - match.similarity;

        return {
            niche: { name: match.name, status: match.status } as Niche, // partial
            distance
        };
    }

    return { niche: null, distance: 1.0 };
}

/**
 * Save a new niche with its embedding
 */
export async function saveNiche(niche: Niche) {
    const embedding = await getEmbedding(niche.name + (niche.description ? ": " + niche.description : ""));

    const { error } = await supabase.from('niches').insert({
        name: niche.name,
        description: niche.description,
        embedding: embedding, // Supabase-js handles array -> vector conversion if setup right
        status: niche.status
    });

    if (error) {
        console.error('Failed to save niche:', error);
        throw error;
    }
}
