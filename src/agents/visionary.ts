
import { AgentState } from '../types';
import { takeScreenshot } from '../tools/browser';
import { getGeminiModel } from '../tools/vertex-ai';
import { Lead } from '../types/db-types';

/**
 * Node C: The Visionary
 * Analyzes the visual "vibe" of a lead's website using Puppeteer + Gemini 2.0 Flash.
 */
export async function visionaryNode(state: AgentState): Promise<Partial<AgentState>> {
    const leads = state.leads || [];
    console.log(`👀 [Visionary] Analyzing ${leads.length} leads...`);

    const analyzedLeads: Lead[] = [];

    // We use a simplified sequential loop here. 
    // In a production "Day 4" scenario, this might be parallelized or batched,
    // but Puppeteer is heavy, so sequential is safer for Cloud Run memory limits.
    for (const lead of leads) {
        if (!lead.url) {
            console.log(`⚠️ [Visionary] Skipping ${lead.company_name} (No URL)`);
            analyzedLeads.push(lead);
            continue;
        }

        console.log(`👀 [Visionary] Processing: ${lead.company_name} (${lead.url})`);

        try {
            // 1. Capture Screenshot
            const base64Image = await takeScreenshot(lead.url);

            // 2. Analyze with Gemini
            const model = getGeminiModel(false);

            const prompt = `
            Act as a pretentious Design Critic and B2B Analyst.
            Analyze this landing page screenshot for:
            1. "Modernity Score" (1-10, where 1 is 90s HTML and 10 is Linear/Vercel aesthetic).
            2. "Vibe": Is this an Enterprise legacy company, a funded Startup, or a small local business?
            3. "Key Value Prop": What are they explicitly selling?
            
            Return JSON:
            {
                "visual_vibe_score": number, // 1-10
                "visual_analysis": "string summary",
                "pain_points": ["inferred pain point 1", "inferred pain point 2"] // Guess what their customers struggle with based on what they solve
            }
            `;

            // Construct Multimodal Request
            const result = await model.generateContent({
                contents: [
                    {
                        role: 'user',
                        parts: [
                            { text: prompt },
                            {
                                inlineData: {
                                    mimeType: 'image/jpeg',
                                    data: base64Image
                                }
                            }
                        ]
                    }
                ]
            });

            const response = await result.response;
            const text = response.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

            // Parse JSON
            const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const analysis = JSON.parse(cleanJson);

            // 3. Update Lead Data
            const updatedLead: Lead = {
                ...lead,
                screenshot_url: "base64_placeholder", // We don't save the full base64 to DB to save space, normally we upload to Storage. For now, placeholder.
                visual_vibe_score: analysis.visual_vibe_score,
                visual_analysis: analysis.visual_analysis,
                pain_points: analysis.pain_points // Enriching pain points from visual context
            };

            analyzedLeads.push(updatedLead);
            console.log(`✨ [Visionary] Score: ${analysis.visual_vibe_score}/10 - ${analysis.visual_analysis.substring(0, 50)}...`);

        } catch (error) {
            console.error(`❌ [Visionary] Failed to analyze ${lead.url}:`, error);
            // Push original lead if failed, maybe mark as error in a real system
            analyzedLeads.push(lead);
        }
    }

    return {
        leads: analyzedLeads,
        researchNotes: state.researchNotes + `\n\n[Visionary] Analyzed ${analyzedLeads.length} sites.`
    };
}
