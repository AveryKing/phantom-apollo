
import { strategistNode } from '../src/agents/strategist';
import { AgentState } from '../src/types';
import dotenv from 'dotenv';
import { supabase } from '../src/tools/supabase';

dotenv.config();

async function testStrategist() {
    console.log('🧪 Testing Strategist Node...');

    const mockState: AgentState = {
        niche: "",
        queries: [],
        searchResults: [],
        painPoints: [],
        scores: { marketSize: 0, competition: 0, willingnessToPay: 0, overall: 0 },
        researchNotes: "",
        status: 'researching',
        leads: []
    };

    try {
        const result = await strategistNode(mockState);
        console.log('✅ Strategist Result:', result);

        // Verify in DB
        const generatedNichesText = result.researchNotes || "";
        // Extract a name from the text or just check DB for recent niches

        const { data, error } = await supabase
            .from('niches')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1);

        if (data && data.length > 0) {
            console.log('✅ Latest Niche in DB:', data[0].name);
            console.log('   Embedding Length:', data[0].embedding?.length); // Should be 768 via pgvector string or array
        } else {
            console.warn('⚠️ No niches found in DB?');
        }

    } catch (error) {
        console.error('❌ Strategist Failed:', error);
    }
}

testStrategist();
