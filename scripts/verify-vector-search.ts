
import { findSimilarNiche, saveNiche } from '../src/tools/vector';
import * as dotenv from 'dotenv';
import { Niche } from '../src/types/db-types';

dotenv.config();

async function test() {
    console.log("🧪 Testing Vector Search...");

    const testNiche: Niche = {
        name: "AI-Powered CRM for Solar Installers " + Date.now(),
        description: "A specialized CRM for companies installing solar panels, using AI to predict lead quality.",
        status: 'active'
    };

    try {
        console.log("Saving niche...");
        await saveNiche(testNiche);
        console.log("✅ Niche saved.");

        console.log("Searching for similar niche (exact match)...");
        const { niche, distance } = await findSimilarNiche(testNiche.name, 0.2);

        if (niche) {
            console.log(`✅ Found similar niche: ${niche.name}`);
            console.log(`📊 Distance: ${distance}`);
        } else {
            console.warn("❌ No similar niche found (even for exact match).");
        }

        console.log("Searching for similar niche (semantic match)...");
        const { niche: semanticMatch, distance: semDistance } = await findSimilarNiche("Software for Solar Panel companies", 0.3);

        if (semanticMatch) {
            console.log(`✅ Found semantic match: ${semanticMatch.name}`);
            console.log(`📊 Distance: ${semDistance}`);
        } else {
            console.warn("❌ No semantic match found.");
        }

    } catch (error) {
        console.error("❌ Test failed:", error);
    }
}

test();
