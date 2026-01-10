
import { getGeminiModel } from '../tools/vertex-ai';
import { findSimilarNiche, saveNiche } from '../tools/vector';
import { AgentState } from '../types';
import { HumanMessage } from '@langchain/core/messages';
import { Niche } from '../types/db-types';

/**
 * Node A: The Strategist
 * Generates Niche ideas and de-duplicates them against the vector database.
 */
export async function strategistNode(state: AgentState): Promise<Partial<AgentState>> {
    console.log('🧠 [Strategist] Generating niche ideas...');

    const model = getGeminiModel(false); // No grounding needed for brainstorming, pure creativity + knowledge

    // We want structured output: { niches: [{ name, description }] }
    // LangChain Google Vertex AI support for structured output via .withStructuredOutput() 
    // or we can just ask for JSON and parse it (Gemini is good at this).
    // For "1337 Edition" reliability, let's strictly prompt for JSON array.

    const prompt = `
    You are a B2B Business Strategist for 2026.
    Identify 5 emerging, high-potential B2B SaaS niches that are underserved.
    Focus on "boring" B2B verticals (e.g., logistics, compliance, waste management, specialized healthcare).
    
    Return a JSON object with this schema:
    {
      "niches": [
        { "name": "Title of Niche", "description": "Short explanation of the opportunity" }
      ]
    }
    
    Ensure the niches are specific, not generic.
    `;

    // Native SDK usage
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const content = response.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

    // Clean code fences if present
    const cleanJson = content.replace(/```json/g, '').replace(/```/g, '').trim();

    let generatedNiches: { name: string, description: string }[] = [];
    try {
        const parsed = JSON.parse(cleanJson);
        generatedNiches = parsed.niches || [];
    } catch (e) {
        console.error('Failed to parse Strategist output:', content);
        throw new Error('Strategist failed to generate valid JSON');
    }

    console.log(`🧠 [Strategist] Generated ${generatedNiches.length} candidates.`);

    const validNiches: Niche[] = [];

    for (const niche of generatedNiches) {
        // Semantic De-duplication
        const { distance } = await findSimilarNiche(niche.name);

        // If distance < 0.2 (Similarity > 0.8), it's too similar.
        if (distance < 0.2) {
            console.log(`♻️ [Duplicate] Skipping "${niche.name}" (Distance: ${distance.toFixed(4)})`);
            continue;
        }

        const newNiche: Niche = {
            name: niche.name,
            description: niche.description,
            status: 'active'
        };

        // Save to DB (Memory)
        try {
            await saveNiche(newNiche);
            console.log(`💾 [Saved] "${newNiche.name}"`);
            validNiches.push(newNiche);
        } catch (err) {
            console.warn(`Failed to save niche ${niche.name}, skipping. Error:`, err);
        }

        // Anti-Rate Limit Delay
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Update state with new findings context
    return {
        researchNotes: `Strategist identified ${validNiches.length} new niches: ${validNiches.map(n => n.name).join(', ')}`,
        // We might want to pass these niches to the downstream nodes, 
        // but the graph currently expects a single "niche" string in the state.
        // For the "Daily Hunt", we usually pick ONE niche to process per run.
        // Let's pick the first one to focus on for this run.
        niche: validNiches.length > 0 ? validNiches[0].name : state.niche
    };
}
