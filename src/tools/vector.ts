
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
    // Verify similarity using match_niches RPC (PostgreSQL + pgvector).
    // The RPC returns similarity (1 - distance).

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
