
import { supabase } from '../src/tools/supabase';
import { dispatchLeadTask } from '../src/tools/cloud-tasks';
import dotenv from 'dotenv';

dotenv.config();

async function run() {
    process.env.SIMULATE_TASKS = 'true';

    const nicheId = 'b033b32f-6319-4533-849c-68ccc8f5a9ac'; // Content Marketing Agencies

    console.log("🛠️ Inserting Test Lead...");

    const { data: lead, error } = await supabase.from('leads').insert({
        niche_id: nicheId,
        name: "Brett Williams",
        company: "Designjoy",
        role: "Founder",
        linkedin_url: `https://www.linkedin.com/in/brettwill100-${Date.now()}/`, // Avoid unique constraint if it exists
        url: "https://www.designjoy.co",
        stage: 'new'
    }).select().single();

    if (error || !lead) {
        console.error("❌ Failed to insert lead:", error);
        return;
    }

    console.log(`✅ Lead Created: ${lead.id}. Dispatching task...`);

    await dispatchLeadTask(lead.id, "mock-discord-token");
}

run().catch(console.error);
