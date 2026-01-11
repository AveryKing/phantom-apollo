
import { visionaryNode } from '../src/agents/visionary';
import { AgentState } from '../src/types';
import { Lead } from '../src/types/db-types';
import dotenv from 'dotenv';

dotenv.config();

async function testVision() {
    console.log('🧪 Testing Visionary Node...');

    const realLead: Lead = {
        niche_id: 'test-niche-id',
        company_name: 'Vercel',
        url: 'https://vercel.com',
        sent_to_discord: false
    };

    const mockState: AgentState = {
        niche: "Web Development",
        queries: [],
        searchResults: [],
        painPoints: [],
        scores: { marketSize: 5, competition: 5, willingnessToPay: 5, overall: 5 },
        researchNotes: "Testing Vision Node",
        status: 'analyzing', // Valid status
        leads: [realLead]
    };

    try {
        const result = await visionaryNode(mockState);
        console.log('✅ Visionary Result:', JSON.stringify(result.leads, null, 2));
    } catch (error) {
        console.error('❌ Visionary Failed:', error);
    }
}

testVision();
