
import { captureScreenshot, analyzeWebsiteVibe } from '../src/tools/vision';
import dotenv from 'dotenv';

dotenv.config();

async function testVision() {
    console.log("🧪 Starting Vision Verification...");

    const testUrl = "https://langchain.com";

    try {
        console.log(`Step 1: Capturing screenshot for ${testUrl}...`);
        const screenshot = await captureScreenshot(testUrl);
        console.log(`✅ Screenshot captured successfully (Length: ${screenshot.length} chars)`);

        console.log("Step 2: Analyzing vibe with Gemini...");
        const analysis = await analyzeWebsiteVibe(screenshot);

        console.log("\n📊 Analysis Results:");
        console.log(JSON.stringify(analysis, null, 2));

        if (analysis.modernityScore && analysis.style) {
            console.log("\n✅ Vision Verification PASSED!");
        } else {
            console.log("\n❌ Vision Verification FAILED (Malformed analysis)");
        }

    } catch (e) {
        console.error("\n❌ Vision Verification FAILED (Error during execution):", e);
    }
}

testVision();
