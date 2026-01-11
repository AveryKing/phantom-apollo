
import { supabase } from '../tools/supabase';
import { takeScreenshot } from '../tools/browser';
import { getGeminiModel, generateGeminiText } from '../tools/vertex-ai';
import { sendDiscordFollowup } from '../tools/discord';

/**
 * Process a single lead: Visionary Analysis -> Outreach Drafting -> Save
 */
export async function processSingleLead(leadId: string, discordToken?: string) {
    console.log(`🚀 [LeadProcessor] Starting processing for lead: ${leadId}`);

    // 1. Fetch Lead & Niche Context
    const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('*, niches(*)')
        .eq('id', leadId)
        .single();

    if (leadError || !lead) {
        console.error(`❌ [LeadProcessor] Lead not found: ${leadId}`, leadError);
        return;
    }

    const nicheName = lead.niches?.name || 'Unknown Niche';
    const nicheNotes = lead.niches?.description || '';

    try {
        // --- STEP 1: VISIONARY (Multimodal Analysis) ---
        let visualAnalysisResult = {
            visual_vibe_score: 5,
            visual_analysis: "Screenshot capture failed.",
            pain_points: [] as string[]
        };

        if (lead.linkedin_url && (lead.linkedin_url.includes('http') || lead.company)) {
            // If we have a website (stored in company or url fields usually, but let's check company field too if it looks like a URL)
            const targetUrl = lead.url || (lead.company?.includes('.') ? `https://${lead.company}` : null);

            if (targetUrl) {
                try {
                    const base64Image = await takeScreenshot(targetUrl);
                    const visionModel = getGeminiModel(false);

                    const visionPrompt = `
                        Analyze this landing page for lead: ${lead.name} at ${lead.company}.
                        1. Modernity Score (1-10).
                        2. Vibe: (Enterprise, Startup, or Local).
                        3. Key Value Prop.
                        
                        Output JSON:
                        {
                            "visual_vibe_score": number,
                            "visual_analysis": "string",
                            "pain_points": ["string"]
                        }
                    `;

                    const visionResult = await visionModel.generateContent({
                        contents: [{
                            role: 'user',
                            parts: [
                                { text: visionPrompt },
                                { inlineData: { mimeType: 'image/jpeg', data: base64Image } }
                            ]
                        }]
                    });

                    const visionText = visionResult.response.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
                    const cleanJson = visionText.replace(/```json/g, '').replace(/```/g, '').trim();
                    visualAnalysisResult = JSON.parse(cleanJson);

                    console.log(`🎨 [Visionary] Analyzed ${targetUrl}. Score: ${visualAnalysisResult.visual_vibe_score}`);
                } catch (e) {
                    console.warn(`⚠️ [Visionary] Skipped vision for ${lead.company_name}: ${e instanceof Error ? e.message : 'Unknown error'}`);
                }
            }
        }

        // --- STEP 2: CLOSER (Message Drafting) ---
        const draftingPrompt = `
            Draft a personalized outreach message for:
            Name: ${lead.name}
            Company: ${lead.company}
            Role: ${lead.role}
            Niche: ${nicheName}
            Niche Context: ${nicheNotes}
            Visual Context: ${visualAnalysisResult.visual_analysis}
            
            Tone: Professional, brief, non-salesy.
            Goal: Identify if they struggle with ${visualAnalysisResult.pain_points?.[0] || 'efficiency'}.
            
            Output JSON: { "subject": "...", "content": "..." }
        `;

        const draftText = await generateGeminiText(draftingPrompt);
        const cleanDraftJson = draftText.replace(/```json/g, '').replace(/```/g, '').trim();
        const draft = JSON.parse(cleanDraftJson);

        // --- STEP 3: PERSIST RESULTS ---
        await supabase.from('leads').update({
            visual_vibe_score: visualAnalysisResult.visual_vibe_score,
            visual_analysis: visualAnalysisResult.visual_analysis,
            context: {
                ...lead.context,
                visual_pain_points: visualAnalysisResult.pain_points,
                drafted_subject: draft.subject,
                drafted_content: draft.content
            }
        }).eq('id', leadId);

        // Save to messages table
        await supabase.from('messages').insert({
            lead_id: leadId,
            channel: 'email',
            subject: draft.subject,
            content: draft.content,
            status: 'draft'
        });

        // --- STEP 4: DISCORD NOTIFICATION ---
        if (discordToken) {
            const summary = `✨ **Lead Ready:** ${lead.name} (${lead.company})
**Visual Score:** ${visualAnalysisResult.visual_vibe_score}/10
**Draft Preview:** "${draft.subject}"
*Analysis complete. View in dashboard or check emails table.*`;

            await sendDiscordFollowup(discordToken, summary);
        }

        console.log(`✅ [LeadProcessor] Successfully processed lead: ${leadId}`);

    } catch (error) {
        console.error(`❌ [LeadProcessor] Processing failed for lead ${leadId}:`, error);
        if (discordToken) {
            await sendDiscordFollowup(discordToken, `⚠️ **Processing Error:** Lead [${lead.name}] failed during vision/drafting.`);
        }
    }
}
