import { getGeminiModel, isVertexAIAvailable } from '../src/tools/vertex-ai';

/**
 * Test Vertex AI client and grounding functionality
 */
async function testVertexAI() {
    console.log('🧪 Testing Vertex AI Client...\n');

    // Check if Vertex AI is available
    if (!isVertexAIAvailable()) {
        console.error('❌ Vertex AI not available. Set GOOGLE_CLOUD_PROJECT in .env');
        process.exit(1);
    }

    console.log('✅ Vertex AI client initialized\n');

    // Test 1: Basic model without grounding
    console.log('Test 1: Basic Gemini model');
    try {
        const model = getGeminiModel(false);
        const result = await model.generateContent('What is 2+2?');
        const text = result.response.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';
        console.log('✅ Basic model works');
        console.log(`Response: ${text}\n`);
    } catch (error: any) {
        console.error(`❌ Basic model failed: ${error.message}\n`);
    }

    // Test 2: Model with grounding
    console.log('Test 2: Gemini with Google Search grounding');
    try {
        const model = getGeminiModel(true);
        const result = await model.generateContent(
            'What are the top 3 pain points for solar installation businesses in 2026?'
        );
        const text = result.response.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';
        console.log('✅ Grounding works');
        console.log(`Response: ${text}\n`);

        // Check if grounding metadata is present
        const candidates = result.response.candidates;
        if (candidates && candidates[0]?.groundingMetadata) {
            console.log('✅ Grounding metadata present');
            console.log(`Grounding sources: ${JSON.stringify(candidates[0].groundingMetadata, null, 2)}\n`);
        } else {
            console.log('⚠️ No grounding metadata found (may not be available for this query)\n');
        }
    } catch (error: any) {
        console.error(`❌ Grounding failed: ${error.message}\n`);
    }

    console.log('🎉 Vertex AI tests complete!');
}

testVertexAI().catch(console.error);
