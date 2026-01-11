import { supabase } from '../tools/supabase';
import { captureScreenshot, analyzeWebsiteVibe } from '../tools/vision';
import { getGeminiModel, generateGeminiText } from '../tools/vertex-ai';
import { sendDiscordFollowup } from '../tools/discord';
import { uploadScreenshot } from '../tools/gcp';
import { Langfuse } from 'langfuse';
import dotenv from 'dotenv';

dotenv.config();

// Langfuse automatically reads from env vars: LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY, LANGFUSE_HOST
const langfuse = new Langfuse();

/**
 * Process a single lead: Visionary Analysis -> Outreach Drafting -> Save
 */
export async function processSingleLead(leadId: string, discordToken?: string) {
    const trace = langfuse.trace({
        name: 'process-single-lead',
        metadata: { leadId }
    });

    console.log(`🚀 [LeadProcessor] Starting processing for lead: ${leadId}`);

    // 1. Fetch Lead & Niche Context
    const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('*, niches(*)')
        .eq('id', leadId)
        .single();

    if (leadError || !lead) {
        console.error(`❌ [LeadProcessor] Lead not found: ${leadId}`, leadError);
        trace.update({ output: { error: leadError, message: 'Lead not found' } });
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
        let screenshotUrl = "";

        // Fetch Vision Prompt from Langfuse
        const visionPromptTemplate = await langfuse.getPrompt('visionary-analysis-rubric-v1');

        if (lead.linkedin_url && (lead.linkedin_url.includes('http') || lead.company)) {
            const targetUrl = lead.url || (lead.company?.includes('.') ? `https://${lead.company}` : null);

            if (targetUrl) {
                const visionSpan = trace.span({ name: 'vision_check', input: { url: targetUrl } });
                try {
                    const base64Image = await captureScreenshot(targetUrl);

                    // Visionary Analysis (Centralized)
                    const analysis = await analyzeWebsiteVibe(base64Image);

                    visualAnalysisResult = {
                        visual_vibe_score: analysis.modernityScore,
                        visual_analysis: analysis.verdict,
                        pain_points: [analysis.style, analysis.businessType]
                    };

                    // Upload to GCS for evidence
                    try {
                        screenshotUrl = await uploadScreenshot(base64Image, `${leadId}-${Date.now()}.webp`);
                        console.log(`🖼️ [LeadProcessor] Screenshot uploaded: ${screenshotUrl}`);
                    } catch (gcsError) {
                        console.error("⚠️ GCS Upload failed:", gcsError);
                    }

                    visionSpan.end({ output: analysis });
                    console.log(`🎨 [Visionary] Analyzed ${targetUrl}. Score: ${visualAnalysisResult.visual_vibe_score}`);
                } catch (e) {
                    console.warn(`⚠️ [Visionary] Skipped vision for ${lead.company}: ${e instanceof Error ? e.message : 'Unknown error'}`);
                    visionSpan.end({ output: { error: e instanceof Error ? e.message : 'Unknown error' } });
                }
            }
        }

        // --- STEP 2: CLOSER (Message Drafting) ---
        const draftingSpan = trace.span({ name: 'outreach-drafting', input: { niche: nicheName, visual: visualAnalysisResult.visual_analysis } });

        // Fetch Closer Prompt from Langfuse
        const closerPromptTemplate = await langfuse.getPrompt('closer-outreach-draft-v1');
        const draftingPrompt = closerPromptTemplate.compile({
            niche: nicheName,
            name: lead.name,
            company: lead.company,
            visual_analysis: visualAnalysisResult.visual_analysis
        });

        const draftText = await generateGeminiText(draftingPrompt);
        const cleanDraftJson = draftText.replace(/```json/g, '').replace(/```/g, '').trim();
        const draft = JSON.parse(cleanDraftJson);
        draftingSpan.end({ output: draft });

        // --- STEP 3: PERSIST RESULTS ---
        await supabase.from('leads').update({
            visual_vibe_score: visualAnalysisResult.visual_vibe_score,
            visual_analysis: visualAnalysisResult.visual_analysis,
            screenshot_url: screenshotUrl,
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
${screenshotUrl ? `🖼️ **Evidence:** [View Screenshot](${screenshotUrl})` : ''}
*Analysis complete. View in Langfuse for full trace.*`;

            await sendDiscordFollowup(discordToken, summary);
        }

        console.log(`✅ [LeadProcessor] Successfully processed lead: ${leadId}`);
        trace.update({ output: { success: true } });

    } catch (error) {
        console.error(`❌ [LeadProcessor] Processing failed for lead ${leadId}:`, error);
        trace.update({ output: { error: error instanceof Error ? error.message : 'Unknown fatal error' } });
        if (discordToken) {
            await sendDiscordFollowup(discordToken, `⚠️ **Processing Error:** Lead [${lead.name}] failed during vision/drafting.`);
        }
    } finally {
        try {
            await langfuse.flushAsync();
        } catch (flushError) {
            console.error('⚠️ [Langfuse] Failed to flush traces:', flushError);
            // Don't throw - we don't want Langfuse errors to break the flow
        }
    }
}