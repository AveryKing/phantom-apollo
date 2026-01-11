
import { VertexAI, HarmCategory, HarmBlockThreshold } from '@google-cloud/vertexai';
import { VertexAIEmbeddings } from "@langchain/google-vertexai";
import dotenv from 'dotenv';

dotenv.config();

const projectId = process.env.GOOGLE_CLOUD_PROJECT;
const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';

if (!projectId) {
    console.warn('⚠️ GOOGLE_CLOUD_PROJECT not found in .env. Vertex AI features will be unavailable.');
}

/**
 * Centralized Vertex AI client for all agents
 */
export const vertexAI = projectId ? new VertexAI({
    project: projectId,
    location: location
}) : null;

/**
 * Get Gemini model with optional grounding support
 * @param enableGrounding - Enable Google Search grounding to reduce hallucinations
 */
export function getGeminiModel(enableGrounding: boolean = false) {
    if (!vertexAI) {
        throw new Error('Vertex AI not initialized. Set GOOGLE_CLOUD_PROJECT in .env');
    }

    const modelConfig: any = {
        model: 'gemini-2.0-flash-exp', // Reverted to experimental but now with robust retries
        safetySettings: [
            {
                category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
            }
        ],
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048
        }
    };

    // Add grounding if requested
    if (enableGrounding) {
        modelConfig.tools = [{
            google_search: {}
        }];
    }

    return vertexAI.getGenerativeModel(modelConfig);
}

/**
 * Robust wrapper for generating text with Gemini, including 429 retries
 */
export async function generateGeminiText(promptOrContent: any, enableGrounding: boolean = false): Promise<string> {
    const model = getGeminiModel(enableGrounding);

    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
        try {
            const result = await model.generateContent(promptOrContent);
            return result.response.candidates?.[0]?.content?.parts?.[0]?.text || "";
        } catch (error: any) {
            attempts++;
            const isRateLimit = error.message?.includes('429') || error.code === 429 || error.status === 429;

            if (isRateLimit && attempts < maxAttempts) {
                const waitTime = Math.pow(2, attempts) * 1000 + (Math.random() * 1000); // jitter
                console.warn(`⏳ [Gemini Rate Limit] Pause for ${Math.round(waitTime)}ms... (Attempt ${attempts}/${maxAttempts})`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            } else {
                console.error("❌ Gemini Call Failed:", error);
                throw error;
            }
        }
    }
    throw new Error('Max retry attempts exceeded for Gemini generation.');
}

/**
 * Helper to check if Vertex AI is available
 */
export function isVertexAIAvailable(): boolean {
    return vertexAI !== null;
}

/**
 * Generate embeddings for text using text-embedding-004
 * Returns a 768-dimensional vector
 */
export async function getEmbedding(text: string): Promise<number[]> {
    if (!projectId) {
        throw new Error('Vertex AI not initialized');
    }

    const embeddings = new VertexAIEmbeddings({
        model: "text-embedding-004",
        maxRetries: 1 // We handle retries manually for better control
    });

    // Manual Exponential Backoff
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
        try {
            const result = await embeddings.embedQuery(text);
            return result;
        } catch (error: any) {
            attempts++;
            const isRateLimit = error.message?.includes('429') || error.code === 429 || error.status === 429;

            if (isRateLimit && attempts < maxAttempts) {
                // Wait 2s, 4s, 8s, 16s...
                const waitTime = Math.pow(2, attempts) * 1000;
                console.warn(`⏳ [Rate Limit] Pause for ${waitTime}ms... (Attempt ${attempts}/${maxAttempts})`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            } else {
                throw error;
            }
        }
    }
    throw new Error('Max retry attempts exceeded for embedding generation.');
}
