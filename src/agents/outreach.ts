import { generateGeminiStructured } from "../tools/vertex-ai";
import { AIMessage } from "@langchain/core/messages";
import { AgentState } from "../types";
import { supabase } from "../tools/supabase";
import { RunnableConfig } from "@langchain/core/runnables";

/**
 * Node D: The Closer
 * Generates personalized outreach emails based on research, lead data, and visual analysis.
 */
export async function closerNode(state: AgentState, config?: RunnableConfig) {
    const leads = state.leads || [];

    if (leads.length === 0) {
        console.warn("⚠️ [Closer] No leads found to draft outreach for.");
        return { status: 'complete' };
    }

    console.log("");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`✉️ [CLOSER] Node: Personalized Outreach Drafting`);
    console.log(`🎯 [TARGET] Drafting emails for ${leads.length} leads...`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    if (state.discordToken) {
        const { sendDiscordFollowup } = require("../tools/discord");
        await sendDiscordFollowup(state.discordToken, `✉️ **Closer:** Drafting personalized outreach for ${leads.length} prospects...`);
    }

    const updatedLeads = [];
    const painPointsSummary = state.painPoints?.slice(0, 3).map(p => p.problem).join(", ") || "business growth challenges";

    // Draft schema for structured output
    const draftSchema = {
        type: "OBJECT",
        properties: {
            subject: { type: "STRING", description: "Email subject line" },
            body: { type: "STRING", description: "Email body content" },
            cta: { type: "STRING", description: "Call to action" }
        },
        required: ["subject", "body", "cta"]
    };

    for (const lead of leads) {
        try {
            console.log(`✍️ [Closer] Drafting for: ${lead.name || lead.company}`);

            const visualContext = lead.visual_analysis || "No visual analysis available";
            const vibeScore = lead.visual_vibe_score || 5;

            const draftingPrompt = `
You are a world-class B2B sales copywriter specializing in cold outreach.

CONTEXT:
- Niche: ${state.niche}
- Top Pain Points in this market: ${painPointsSummary}
- Lead: ${lead.name || "Decision Maker"} at ${lead.company}
- Role: ${lead.role || "Leadership"}
- Visual Analysis: ${visualContext}
- Modernity Score: ${vibeScore}/10

TASK:
Write a personalized cold email that:
1. References their company's digital presence (use the visual analysis subtly)
2. Connects to ONE specific pain point from the market research
3. Offers a clear, low-friction next step (15-min call)
4. Keeps it under 100 words
5. Sounds human, not like AI

TONE: Professional but conversational. No buzzwords. No "I hope this email finds you well."

Return JSON with:
{
    "subject": "string (max 60 chars)",
    "body": "string (the email body)",
    "cta": "string (the specific ask)"
}
            `;

            const draft = await generateGeminiStructured<any>(draftingPrompt, draftSchema, false);

            console.log(`✅ [Closer] Draft created: "${draft.subject}"`);

            const updatedLead = {
                ...lead,
                email_draft: JSON.stringify(draft),
                context: {
                    ...(lead.context || {}),
                    draft_subject: draft.subject,
                    draft_body: draft.body,
                    draft_cta: draft.cta
                }
            };

            // Update in Database
            if (lead.id) {
                await supabase.from('leads').update({
                    email_draft: JSON.stringify(draft),
                    context: updatedLead.context
                }).eq('id', lead.id);

                // Also save to messages table for tracking
                await supabase.from('messages').insert({
                    lead_id: lead.id,
                    channel: 'email',
                    subject: draft.subject,
                    content: draft.body,
                    status: 'draft'
                });
            }

            updatedLeads.push(updatedLead);

        } catch (err) {
            console.error(`❌ [Closer] Failed to draft for ${lead.company}:`, err);
            updatedLeads.push(lead);
        }
    }

    if (state.discordToken) {
        const { sendDiscordFollowup } = require("../tools/discord");
        await sendDiscordFollowup(state.discordToken, `✅ **Drafting Complete:** ${updatedLeads.length} personalized emails ready for review.`);
    }

    return {
        leads: updatedLeads,
        messages: [new AIMessage(`✉️ Outreach drafting complete. I've created ${updatedLeads.length} personalized emails based on visual analysis and market research.`)]
    };
}
