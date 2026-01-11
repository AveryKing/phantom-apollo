import { generateGeminiStructured } from "../tools/vertex-ai";
import { HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages";
import { OutreachState } from "../types/outreach-types";
import { AgentState } from "../types";
import { insertRecord } from "../tools/supabase";
import { RunnableConfig } from "@langchain/core/runnables";

/**
 * Main Outreach Node for LangGraph.
 * Iterates through discovered leads and generates research-backed drafts.
 */
export async function outreachNode(state: AgentState, config?: RunnableConfig): Promise<Partial<AgentState>> {
    const leads = state.leads || [];
    if (leads.length === 0) {
        console.warn("⚠️ No leads found for outreach.");
        return state;
    }

    console.log("");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`✉️ [OUTREACH] Node: Message Drafting`);
    console.log(`🎯 [TARGET] Niche: ${state.niche}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`💭 [THOUGHT] Processing ${leads.length} leads to generate personalized research-backed outreach...`);

    const nicheContext = state.researchNotes || `Niche focusing on ${state.niche} pain points.`;

    for (const lead of leads) {
        try {
            console.log(`📝 Drafting for: ${lead.name || 'Unknown'} @ ${lead.company || 'Unknown'}`);

            // 1. Prepare Drafting State
            const outreachState: OutreachState = {
                leadId: lead.id || 'unknown',
                context: {
                    name: lead.name || 'there',
                    company: lead.company || 'your company',
                    role: lead.role || "Decision Maker",
                    recent_activity: lead.linkedin_url || lead.url
                },
                channel: 'email',
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
                    subject: result.draft.subject || `Quick question for ${lead.company}`,
                    content: result.draft.content,
                    status: 'draft'
                });
            }
        } catch (error) {
            console.error(`❌ Failed to draft for lead ${lead.id}:`, error);
        }
    }

    return {
        ...state,
        messages: [new AIMessage(`✉️ Outreach complete. Drafted ${leads.length} personalized messages based on the identified pain points.`)]
    };
}

/**
 * Core drafting logic using Gemini.
 */
async function draftMessageLogic(state: OutreachState): Promise<Partial<OutreachState>> {
    console.log(`🤖 [Gemini] Calling Structured Generation for Outreach...`);

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
    `;

    const schema = {
        type: "OBJECT",
        properties: {
            subject: { type: "STRING" },
            content: { type: "STRING" }
        },
        required: ["subject", "content"]
    };

    try {
        const draft = await generateGeminiStructured<any>(prompt, schema);

        return {
            draft,
            status: 'completed'
        };
    } catch (error) {
        console.error("Gemini Drafting Error:", error);
        throw error;
    }
}
