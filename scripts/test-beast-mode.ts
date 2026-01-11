
import dotenv from 'dotenv';
dotenv.config();

import { runBeastMode } from '../src/graph';

async function main() {
    const args = process.argv.slice(2);
    const testNiche = args[0] || "Solar Installers";
    console.log(`🔥 Testing Phantom Apollo in Beast Mode...`);
    console.log(`🎯 Target Niche: ${testNiche}`);

    try {
        const result = await runBeastMode(testNiche);

        console.log("\n--- TEST RESULT SUMMARY ---");
        console.log(`Niche: ${result.niche}`);
        console.log(`Status: ${result.status}`);
        console.log(`Score: ${result.scores?.overall}/10`);
        console.log(`Leads Processed: ${result.leads?.length || 0}`);

        if (result.painPoints && result.painPoints.length > 0) {
            console.log("\nTop Pain Points Found:");
            result.painPoints.slice(0, 3).forEach((p: any, i: number) => {
                console.log(`${i + 1}. ${p.problem} (Score: ${p.pain_score})`);
            });
        }

    } catch (error) {
        console.error("❌ Test Execution Failed:", error);
    }
}

main();
