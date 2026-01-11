
import { vertexAI, getEmbedding } from '../src/tools/vertex-ai';
import dotenv from 'dotenv';

dotenv.config();

async function test() {
    console.log('Testing Vertex AI Embeddings...');
    try {
        const text = "Autonomous business development agent";
        const vector = await getEmbedding(text);
        console.log(`✅ Embedding generated! Vector length: ${vector.length}`);
        console.log(`Sample values: ${vector.slice(0, 5)}...`);
    } catch (error) {
        console.error('❌ Failed to generate embedding:', error);
    }
}

test();
