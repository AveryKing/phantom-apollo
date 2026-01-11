
import { getGeminiModel } from "../tools/vertex-ai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { OutreachState } from "../types/outreach-types";
import { AgentState } from "../types";
import { insertRecord } from "../tools/supabase";

// Initialize LLM for Outreach
const model = getGeminiModel(false);

/**
 * Main Outreach Node for LangGraph.
 * Iterates through discovered leads and generates research-backed drafts.
 */
export async function outreachNode(state: AgentState): Promise<Partial<AgentState>> {
    const leads = state.leads || [];
    if (leads.length === 0) {
        console.warn("⚠️ No leads found for outreach.");
        return state;
    }

    console.log(`🤖 Processing outreach for ${leads.length} leads in niche: ${state.niche}`);

    const nicheContext = state.researchNotes || `Niche focusing on ${state.niche} pain points.`;

    for (const lead of leads) {
        try {
            console.log(`📝 Drafting for: ${lead.company_name} (${lead.url})`);

            // 1. Prepare Drafting State
            const outreachState: OutreachState = {
                leadId: lead.id || 'unknown',
                context: {
                    name: lead.company_name, // Using company name as proxy for lead name if generic
                    company: lead.company_name,
                    role: "Decision Maker", // Default
                    recent_activity: lead.url
                },
                channel: 'email', // Defaulting to email for first version
                nicheContext,
                status: 'analyzing'
            };

            // 2. Generate the Draft
            const result = await draftMessageLogic(outreachState);

            if (result.draft) {
                // 3. Save to Supabase 'messages' table
                await insertRecord('messages', {
                    lead_id: lead.id,
                    channel: outreachState.channel,
                    subject: result.draft.subject || `Quick question for ${lead.company_name}`,
                    content: result.draft.content,
                    status: 'draft'
                });
            }
        } catch (error) {
            console.error(`❌ Failed to draft for lead ${lead.id}:`, error);
        }
    }

    return state;
}

/**
 * Core drafting logic using Gemini.
 * Extracted from the Node to allow for testing and recursive calls.
 */
async function draftMessageLogic(state: OutreachState): Promise<Partial<OutreachState>> {
    const prompt = `
        You are a world-class sales copywriter.
        Lead: ${state.context.name}
        Role: ${state.context.role}
        Company: ${state.context.company}
        Search Snippet: ${state.context.recent_activity || 'None'}
        Niche Context/Pain Points: ${state.nicheContext}
        Channel: ${state.channel}

        Task: Draft a hyper-personalized outreach message.
        - Reference their role/company or the specific snippet provided.
        - Address a pain point from the niche context.
        - Be concise: Under 100 words.
        - Tone: Professional, helpful, curious. NOT salesy.
        - Call to Action: A low-friction question.

        Output ONLY a valid raw JSON object:
        {
            "subject": "...",
            "content": "..."
        }
    `;

    try {
        const response = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: "You are a professional outreach drafting agent specializing in personalized B2B messages.\n" + prompt }] }]
        });

        const text = response.response.candidates?.[0]?.content?.parts?.[0]?.text?.replace(/```json/g, '').replace(/```/g, '').trim() || "{}";
        const draft = JSON.parse(text);

        return {
            draft,
            status: 'completed'
        };
    } catch (error) {
        console.error("Gemini Drafting Error:", error);
        throw error;
    }
}
