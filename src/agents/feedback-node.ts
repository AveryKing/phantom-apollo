
import { safeSelect, insertRecord } from "../tools/supabase";
import { AgentState } from "../types";
import { supabase } from "../tools/supabase";

/**
 * Node: Feedback Loop
 * Analyzes the performance of the current niche based on lead reactions 
 * and historical message data to optimize future runs.
 */
export async function feedbackLoopNode(state: AgentState): Promise<Partial<AgentState>> {
    console.log(`🔄 [FeedbackLoop] Analyzing performance for niche: ${state.niche}`);

    try {
        // 1. Fetch the niche ID
        const { data: nicheData } = await supabase
            .from('niches')
            .select('id, overall_score')
            .eq('name', state.niche)
            .single();

        if (!nicheData) {
            console.warn("⚠️ Niche not found in DB, skipping feedback loop.");
            return state;
        }

        // 2. Aggregate statistics for this niche
        // We want to see how many leads are in which stages
        const { data: leadStats } = await supabase
            .from('leads')
            .select('stage')
            .eq('niche_id', nicheData.id);

        if (!leadStats || leadStats.length === 0) {
            console.log(`ℹ️ No historical lead data for "${state.niche}" yet. Skipping optimization.`);
            return state;
        }

        const totalLeads = leadStats.length;
        const neutralOrBetter = leadStats.filter(l =>
            ['interested', 'replied', 'converted'].includes(l.stage)
        ).length;
        const rejections = leadStats.filter(l => l.stage === 'not_interested').length;

        const engagementRate = (neutralOrBetter / totalLeads) * 100;
        const rejectionRate = (rejections / totalLeads) * 100;

        console.log(`📊 Stats for ${state.niche}: Engagement ${engagementRate.toFixed(1)}%, Rejection ${rejectionRate.toFixed(1)}%`);

        // 3. Optimization Logic
        let updatedScore = nicheData.overall_score;
        let updatedStatus = 'active';

        if (rejectionRate > 50 && totalLeads >= 5) {
            console.log(`📉 High rejection rate detected. Downgrading niche.`);
            updatedScore = Math.max(1, (updatedScore || 5) - 1);
        }

        if (engagementRate > 20 && totalLeads >= 5) {
            console.log(`📈 Good engagement detected. Niche remains strong.`);
            updatedScore = Math.min(10, (updatedScore || 5) + 1);
        }

        // If score drops below threshold, we might reject the niche entirely for future runs
        if (updatedScore < 4) {
            updatedStatus = 'rejected';
            console.log(`❌ Niche "${state.niche}" performance is too low. Marking as REJECTED.`);
        }

        // 4. Update the DB
        await supabase.from('niches').update({
            overall_score: updatedScore,
            status: updatedStatus,
            research_notes: `[Auto-Feedback] Engagement: ${engagementRate.toFixed(1)}%, Rejections: ${rejectionRate.toFixed(1)}%`
        }).eq('id', nicheData.id);

        return {
            ...state,
            status: updatedStatus as any
        };

    } catch (error) {
        console.error("❌ Feedback loop failed:", error);
        return state;
    }
}
