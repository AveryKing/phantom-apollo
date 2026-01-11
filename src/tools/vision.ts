
import puppeteer from 'puppeteer';
import { getGeminiModel, retryOnRateLimit } from './vertex-ai';

/**
 * Captures a screenshot of a website and returns it as a base64 string.
 */
export async function captureScreenshot(url: string): Promise<string> {
    console.log(`📸 [Vision] Capturing screenshot for: ${url}`);

    // Launch browser with security flags for GCP compatibility
    const browser = await puppeteer.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu'
        ]
    });

    try {
        const page = await browser.newPage();

        // Set a standard desktop viewport
        await page.setViewport({ width: 1280, height: 800 });

        // Navigate with timeout
        await page.goto(url, {
            waitUntil: 'networkidle0',
            timeout: 30000
        });

        // Add a small delay for any animations to settle
        await new Promise(r => setTimeout(r, 1000));

        // Capture full page screenshot
        const screenshot = await page.screenshot({
            encoding: 'base64',
            type: 'webp',
            quality: 80
        });

        return screenshot as string;
    } catch (error) {
        console.error(`❌ [Vision] Failed to capture screenshot for ${url}:`, error);
        throw error;
    } finally {
        await browser.close();
    }
}

/**
 * Analyzes a screenshot using Gemini 2.0 Flash Multimodal
 */
export async function analyzeWebsiteVibe(screenshotBase64: string): Promise<any> {
    console.log(`🧠 [Vision] Analyzing website vibe with Gemini 2.0 Flash...`);

    const model = getGeminiModel(false); // Vision usually doesn't need grounding for the prompt itself

    const prompt = `
    Act as an expert Design Critic and Business Analyst. 
    Analyze this website screenshot and provide a detailed "Vibe Check."
    
    TASKS:
    1. Modernity Score (1-10): Is it a modern SaaS look or 2010 enterprise?
    2. Visual Style: (Enterprise, Startup, Legacy, Minimalist)
    3. Technical Health: Any obvious broken elements, blurry images, or "Copyright 2018" signs?
    4. Business Type: What are they primarily selling based on visual cues?
    
    Output valid JSON:
    {
        "modernityScore": number,
        "style": "string",
        "technicalHealth": "string",
        "businessType": "string",
        "verdict": "string"
    }
    `;

    const result = await retryOnRateLimit(() => model.generateContent({
        contents: [{
            role: 'user',
            parts: [
                {
                    inlineData: {
                        data: screenshotBase64,
                        mimeType: 'image/webp'
                    }
                },
                { text: prompt }
            ]
        }]
    }));

    const text = result.response.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

    // Clean potential markdown if Gemini returns it
    const cleanJson = text.replace(/```json\n?|\n?```/g, '').trim();

    try {
        return JSON.parse(cleanJson);
    } catch (e) {
        console.error("❌ [Vision] Failed to parse visual analysis JSON:", text);
        return {
            verdict: "Failed to analyze vibe",
            modernityScore: 5
        };
    }
}
