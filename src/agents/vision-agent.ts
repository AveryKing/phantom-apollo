
import { captureScreenshot, analyzeWebsiteVibe } from "../tools/vision";
import { AgentState } from "../types";
import { RunnableConfig } from "@langchain/core/runnables";
import { AIMessage } from "@langchain/core/messages";
import { supabase } from "../tools/supabase";

/**
 * Node: Visual Analysis (The Visionary)
 * Processes leads by visiting their websites and performing a "Vibe Check."
 */
export async function visionNode(state: AgentState, config?: RunnableConfig) {
    const leads = state.leads || [];

    if (leads.length === 0) {
        console.warn("⚠️ [Visionary] No leads found to analyze.");
        return { status: 'complete' };
    }

    console.log("");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`👁️ [VISIONARY] Node: Multimodal Vibe Check`);
    console.log(`🎯 [TARGET] Processing ${leads.length} leads...`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    if (state.discordToken) {
        const { sendDiscordFollowup } = require("../tools/discord");
        await sendDiscordFollowup(state.discordToken, `👁️ **Visionary:** Performing multimodal "Vibe Check" on ${leads.length} prospects...`);
    }

    const updatedLeads = [];

    // For now, we process sequentially to avoid overwhelming the system, 
    // but we limit to top 3 for speed in this demo phase.
    const leadsToProcess = leads.slice(0, 3);

    for (const lead of leadsToProcess) {
        const url = lead.url || lead.linkedin_url; // Fallback logic

        if (!url || !url.startsWith('http')) {
            console.warn(`⏩ Skipping lead ${lead.company_name}: No valid URL.`);
            updatedLeads.push(lead);
            continue;
        }

        try {
            console.log(`🖥️ [Visionary] Investigating: ${lead.company_name} (${url})`);

            // 1. Capture Screenshot
            const screenshot = await captureScreenshot(url);

            // 2. Multimodal Analysis
            const analysis = await analyzeWebsiteVibe(screenshot);

            console.log(`✅ [Visionary] Vibe for ${lead.company_name}: ${analysis.style} (Score: ${analysis.modernityScore}/10)`);

            const updatedLead = {
                ...lead,
                visual_vibe_score: analysis.modernityScore,
                visual_analysis: analysis.verdict,
                context: {
                    ...(lead.context || {}),
                    visualStyle: analysis.style,
                    technicalHealth: analysis.technicalHealth,
                    businessType: analysis.businessType
                }
            };

            // 3. Update in Database
            if (lead.id) {
                await supabase.from('leads').update({
                    visual_vibe_score: analysis.modernityScore,
                    visual_analysis: analysis.verdict,
                    context: updatedLead.context
                }).eq('id', lead.id);
            }

            updatedLeads.push(updatedLead);

        } catch (err) {
            console.error(`❌ [Visionary] Failed to analyze ${lead.company_name}:`, err);
            updatedLeads.push(lead);
        }
    }

    // Keep the rest of the leads that weren't processed
    const finalLeads = [...updatedLeads, ...leads.slice(3)];

    return {
        leads: finalLeads,
        messages: [new AIMessage(`👁️ Vibe Check complete for ${leadsToProcess.length} leads. I've assessed their digital maturity to tailor our approach.`)]
    };
}
