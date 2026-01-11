
import { VertexAI, HarmCategory, HarmBlockThreshold, GenerateContentRequest, Tool } from '@google-cloud/vertexai';
import { VertexAIEmbeddings } from "@langchain/google-vertexai";
import dotenv from 'dotenv';

// Type definitions for better type safety
export interface GeminiModelOptions {
    temperature?: number;
    maxOutputTokens?: number;
    responseMimeType?: string;
    responseSchema?: Record<string, unknown>;
}

export interface GeminiModelConfig {
    model: string;
    safetySettings: Array<{
        category: HarmCategory;
        threshold: HarmBlockThreshold;
    }>;
    generationConfig: {
        temperature: number;
        maxOutputTokens: number;
        responseMimeType?: string;
        responseSchema?: Record<string, unknown>;
    };
    tools?: Tool[];
}

export type GeminiContent = string | GenerateContentRequest;

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
 * @param options - Additional generation config options
 */
export function getGeminiModel(enableGrounding: boolean = false, options: GeminiModelOptions = {}) {
    if (!vertexAI) {
        throw new Error('Vertex AI not initialized. Set GOOGLE_CLOUD_PROJECT in .env');
    }

    const modelConfig: GeminiModelConfig = {
        model: 'gemini-2.0-flash-001', // Standard 2.0 Flash model
        safetySettings: [
            {
                category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
            }
        ],
        generationConfig: {
            temperature: options.temperature ?? 0.7,
            maxOutputTokens: options.maxOutputTokens ?? 8192,
            responseMimeType: options.responseMimeType,
            responseSchema: options.responseSchema
        }
    };

    // Add grounding if requested
    if (enableGrounding) {
        modelConfig.tools = [{
            googleSearch: {} // Google Search grounding tool
        } as Tool];
    }

    return vertexAI.getGenerativeModel(modelConfig);
}

/**
 * Robust wrapper for generating text with Gemini, including 429 retries
 */
export async function generateGeminiText(promptOrContent: GeminiContent, enableGrounding: boolean = false): Promise<string> {
    console.log(`🤖 [Gemini] Calling Text Generation (Grounding: ${enableGrounding})...`);
    const model = getGeminiModel(enableGrounding);
    return retryOnRateLimit(() => model.generateContent(promptOrContent).then(res => res.response.candidates?.[0]?.content?.parts?.[0]?.text || ""));
}

/**
 * Robust wrapper for generating structured JSON with Gemini
 */
export async function generateGeminiStructured<T>(promptOrContent: GeminiContent, schema: Record<string, unknown>, enableGrounding: boolean = false): Promise<T> {
    console.log(`🤖 [Gemini] Calling Structured Generation (Grounding: ${enableGrounding})...`);
    const model = getGeminiModel(enableGrounding, {
        responseMimeType: 'application/json',
        responseSchema: schema
    });

    const result = await retryOnRateLimit(() => model.generateContent(promptOrContent));
    const text = result.response.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

    try {
        return JSON.parse(text) as T;
    } catch (e) {
        console.error("❌ Failed to parse Gemini structured output:", text);
        throw e;
    }
}

/**
 * Generic retry logic for rate limits
 */
export async function retryOnRateLimit<T>(fn: () => Promise<T>): Promise<T> {
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
        try {
            return await fn();
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
