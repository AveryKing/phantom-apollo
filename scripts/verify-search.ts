
import { googleSearch } from '../src/tools/google-search';

async function verifyGoogleSearch() {
    console.log("🧪 Testing Google Search Tool...");

    if (!process.env.GOOGLE_SEARCH_API_KEY) {
        console.warn("⚠️  Skipping test: No API Key found in env.");
        return;
    }

    try {
        const results = await googleSearch("LangChain vs LangGraph", 3);
        console.log(`✅ Success! Found ${results.length} results.`);
        if (results.length > 0) {
            console.log("First Result:", results[0].title);
        }
    } catch (error) {
        console.error("❌ Test Failed:", error);
        process.exit(1);
    }
}

verifyGoogleSearch();
