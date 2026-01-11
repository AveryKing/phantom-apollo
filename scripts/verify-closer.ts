
import { closerNode } from '../src/agents/outreach';
import { AgentState } from '../src/types';
import dotenv from 'dotenv';

dotenv.config();

async function testCloser() {
    console.log("🧪 Starting Closer Verification...");

    // Mock state with leads that have visual analysis
    const mockState: AgentState = {
        niche: "AI-powered logistics platforms",
        queries: [],
        searchResults: [],
        painPoints: [
            { problem: "Manual route optimization is time-consuming", why_it_hurts: "Wastes hours daily", pain_score: 8 },
            { problem: "Lack of real-time visibility into shipments", why_it_hurts: "Customer complaints increase", pain_score: 7 },
            { problem: "High fuel costs due to inefficient routing", why_it_hurts: "Margins are shrinking", pain_score: 9 }
        ],
        scores: { marketSize: 8, competition: 6, willingnessToPay: 9, overall: 7.7 },
        researchNotes: "Growing market with strong demand for automation.",
        status: 'validated',
        leads: [
            {
                id: 'test-lead-1',
                niche_id: 'test-niche',
                name: 'Sarah Chen',
                company: 'FreightFlow Inc',
                role: 'VP of Operations',
                linkedin_url: 'https://linkedin.com/in/sarahchen',
                visual_vibe_score: 7,
                visual_analysis: 'Modern SaaS aesthetic with clear value proposition. Professional design with focus on efficiency metrics.',
                context: {
                    source: 'manual-test',
                    search_query: 'test query'
                }
            }
        ]
    };

    try {
        console.log("Step 1: Running Closer Node...");
        const result = await closerNode(mockState);

        console.log("\n📊 Closer Results:");
        console.log(`Leads processed: ${result.leads?.length || 0}`);

        if (result.leads && result.leads.length > 0) {
            const lead = result.leads[0];
            console.log(`\nDraft for ${lead.name}:`);

            if (lead.email_draft) {
                const draft = JSON.parse(lead.email_draft);
                console.log(`Subject: ${draft.subject}`);
                console.log(`\nBody:\n${draft.body}`);
                console.log(`\nCTA: ${draft.cta}`);
            }

            console.log("\n✅ Closer Verification PASSED!");
        } else {
            console.log("\n❌ Closer Verification FAILED (No leads returned)");
        }

    } catch (e) {
        console.error("\n❌ Closer Verification FAILED (Error during execution):", e);
    }
}

testCloser();
