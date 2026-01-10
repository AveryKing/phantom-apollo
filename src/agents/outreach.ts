
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { OutreachState } from "../types/outreach-types";
import { AgentState } from "../types";
import { insertRecord } from "../tools/supabase";

// Initialize LLM for Outreach
const model = new ChatGoogleGenerativeAI({
    model: "gemini-2.0-flash",
    maxOutputTokens: 1024,
    apiKey: process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_SEARCH_API_KEY
});

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

    const nicheContext = state.findings?.summary || `Niche focusing on ${state.niche} pain points.`;

    for (const lead of leads) {
        try {
            console.log(`📝 Drafting for: ${lead.name} (${lead.company})`);

            // 1. Prepare Drafting State
            const outreachState: OutreachState = {
                leadId: lead.id,
                context: {
                    name: lead.name,
                    company: lead.company,
                    role: lead.role,
                    recent_activity: lead.context?.snippet
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
                    subject: result.draft.subject || `Quick question for ${lead.name}`,
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
        const response = await model.invoke([
            new SystemMessage("You are a professional outreach drafting agent specializing in personalized B2B messages."),
            new HumanMessage(prompt)
        ]);

        const text = response.content.toString().replace(/```json/g, '').replace(/```/g, '').trim();
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
